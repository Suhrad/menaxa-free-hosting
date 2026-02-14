from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import logging
import re
import asyncio
from typing import Dict, Any, List
import urllib.parse
import requests
from bs4 import BeautifulSoup
import random  # Add random module import

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# Render free tier has tight memory limits; keep heavy datasets lazy by default.
LOW_MEMORY_MODE = env_bool("LOW_MEMORY_MODE", True)
PRELOAD_HEAVY_DATA = env_bool("PRELOAD_HEAVY_DATA", False)
# Use your own proxy domain here (e.g. Cloudflare Worker URL). Keep provider URL out of app config.
UPSTREAM_DATA_BASE_URL = (
    os.getenv("UPSTREAM_DATA_BASE_URL")
    or ""
).rstrip("/")
CURRENT_YEAR_SYNC_MAX_AGE_HOURS = int(os.getenv("CURRENT_YEAR_SYNC_MAX_AGE_HOURS", "6"))
UPSTREAM_PROXY_TOKEN = os.getenv("UPSTREAM_PROXY_TOKEN", "").strip()


def get_feed_root_dir() -> Path:
    """
    Canonical local data directory for third-party feed snapshots.
    """
    return Path("data/external_feed")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Global cache for rekt data
rekt_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Global cache for EOL data
eol_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Global cache for leaks data
leaks_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Global cache for news data
news_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Global cache for phishing scam data
phishing_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Global cache for CVE data
cve_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

# Small bounded cache used only in low-memory mode for per-year CVE reads.
cve_year_cache: Dict[str, List[Dict[str, Any]]] = {}
cve_year_cache_order: List[str] = []
MAX_CVE_YEARS_IN_MEMORY = 2

# Global cache for Web3 releases data
web3_releases_cache: Dict[str, Any] = {
    "data": None,
    "last_updated": None,
    "last_file": None
}

def parse_description(description):
    """Parse HTML description and extract specific sections"""
    if not description:
        return {}
    
    # Remove HTML tags and clean up the text
    description = re.sub(r'<[^>]+>', '', description)
    description = re.sub(r'\s+', ' ', description).strip()
    
    return {}


def parse_news_datetime(value: Any) -> datetime | None:
    """Parse news date values from ISO or RFC2822 strings into UTC datetimes."""
    if not isinstance(value, str) or not value.strip():
        return None

    raw = value.strip()

    # ISO-like timestamps (with optional trailing Z)
    try:
        iso_value = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # RFC2822/HTTP-date style timestamps
    try:
        dt = parsedate_to_datetime(raw)
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def get_latest_rekt_file():
    """Get the most recent rekt database JSON file"""
    try:
        data_dir = Path("data/rekt_db")
        logger.info(f"Looking for files in directory: {data_dir.absolute()}")
        
        if not data_dir.exists():
            logger.error(f"Directory not found: {data_dir}")
            raise HTTPException(status_code=404, detail="No rekt database files found")
        
        # Prefer timestamped snapshots when available.
        json_files = list(data_dir.glob("rekt_db_*.json"))
        if not json_files:
            # Fallback to stable file for fresh deploys where snapshots may be absent.
            stable_file = data_dir / "rekt_db.json"
            if stable_file.exists():
                logger.info(f"Using stable rekt file fallback: {stable_file}")
                return stable_file
            logger.error("No rekt database files found in directory")
            raise HTTPException(status_code=404, detail="No rekt database files found")
        
        # Use file modification time to avoid filename-format edge cases.
        latest_file = max(json_files, key=lambda x: x.stat().st_mtime)
        logger.info(f"Found latest file: {latest_file}")
        return latest_file
    except Exception as e:
        logger.error(f"Error in get_latest_rekt_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding latest file: {str(e)}")

def get_latest_eol_file():
    """Get the EOL data JSON file"""
    try:
        eol_file = get_feed_root_dir() / "eol.json"
        logger.info(f"Looking for EOL file: {eol_file.absolute()}")
        
        if not eol_file.exists():
            logger.error(f"EOL file not found: {eol_file}")
            raise HTTPException(status_code=404, detail="EOL data file not found")
        
        return eol_file
    except Exception as e:
        logger.error(f"Error in get_latest_eol_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding EOL file: {str(e)}")

def get_leaks_file():
    """Get the leaks data JSON file"""
    try:
        leaks_file = get_feed_root_dir() / "leak.json"
        logger.info(f"Looking for leaks file: {leaks_file.absolute()}")
        
        if not leaks_file.exists():
            logger.error(f"Leaks file not found: {leaks_file}")
            raise HTTPException(status_code=404, detail="Leaks data file not found")
        
        return leaks_file
    except Exception as e:
        logger.error(f"Error in get_leaks_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding leaks file: {str(e)}")

def get_news_file():
    """Get the news data JSON file"""
    try:
        news_file = get_feed_root_dir() / "newsen.json"
        logger.info(f"Looking for news file: {news_file.absolute()}")
        
        if not news_file.exists():
            logger.error(f"News file not found: {news_file}")
            raise HTTPException(status_code=404, detail="News data file not found")
        
        return news_file
    except Exception as e:
        logger.error(f"Error in get_news_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding news file: {str(e)}")

def get_phishing_file():
    """Get the phishing scam database JSON file"""
    try:
        phishing_file = Path("data/phishing-scam-db.json")
        logger.info(f"Looking for phishing file: {phishing_file.absolute()}")
        
        if not phishing_file.exists():
            logger.error(f"Phishing file not found: {phishing_file}")
            raise HTTPException(status_code=404, detail="Phishing data file not found")
        
        return phishing_file
    except Exception as e:
        logger.error(f"Error in get_phishing_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding phishing file: {str(e)}")

def get_cve_files(year: str = None):
    """Get CVE data JSON files for a specific year or all years"""
    try:
        cve_dir = get_feed_root_dir() / "cve"
        logger.info(f"Looking for CVE files in directory: {cve_dir.absolute()}")
        
        if not cve_dir.exists():
            logger.error(f"Directory not found: {cve_dir}")
            raise HTTPException(status_code=404, detail="No CVE data files found")
        
        # Get JSON files based on year parameter
        if year:
            json_files = list(cve_dir.glob(f"{year}.json"))
            if not json_files:
                logger.error(f"No CVE data found for year {year}")
                raise HTTPException(status_code=404, detail=f"No CVE data found for year {year}")
        else:
            json_files = list(cve_dir.glob("*.json"))
            if not json_files:
                logger.error("No JSON files found in CVE directory")
                raise HTTPException(status_code=404, detail="No CVE data files found")
        
        return json_files
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_cve_files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding CVE files: {str(e)}")


def sync_cve_year_file(year: int, force: bool = False) -> bool:
    """
    Ensure local CVE year file exists and is reasonably fresh by pulling from CyberMonit.
    Returns True when file was updated, False otherwise.
    """
    try:
        if not UPSTREAM_DATA_BASE_URL:
            logger.info("UPSTREAM_DATA_BASE_URL not configured; skipping upstream CVE sync")
            return False

        cve_dir = get_feed_root_dir() / "cve"
        cve_dir.mkdir(parents=True, exist_ok=True)
        target = cve_dir / f"{year}.json"

        if target.exists() and not force:
            age_seconds = datetime.now().timestamp() - target.stat().st_mtime
            if age_seconds < CURRENT_YEAR_SYNC_MAX_AGE_HOURS * 3600:
                return False

        url = f"{UPSTREAM_DATA_BASE_URL}/{year}.json"
        headers = {"User-Agent": "menaxa-backend/1.0"}
        if UPSTREAM_PROXY_TOKEN:
            headers["X-Upstream-Token"] = UPSTREAM_PROXY_TOKEN
        resp = requests.get(url, timeout=90, headers=headers)
        if resp.status_code != 200:
            logger.warning(f"Could not sync CVE year {year}: HTTP {resp.status_code}")
            return False

        parsed = resp.json()
        if not isinstance(parsed, list):
            parsed = [parsed]

        with open(target, "w", encoding="utf-8") as f:
            json.dump(parsed, f, ensure_ascii=False)

        logger.info(f"Synced CVE year file from upstream: {target}")
        return True
    except requests.RequestException as e:
        logger.warning(f"CVE sync skipped for year {year}: Request error {str(e)}")
        return False
    except Exception as e:
        logger.warning(f"CVE sync skipped for year {year}: {str(e)}")
        return False

def filter_record(record):
    """Filter a record to only include specified fields"""
    try:
        # Support both legacy source shape (scam_type object) and normalized shape (string).
        scam_type_raw = record.get("scam_type")
        if isinstance(scam_type_raw, dict):
            scam_type = scam_type_raw.get("type")
        else:
            scam_type = scam_type_raw

        if isinstance(scam_type, str) and scam_type.strip().lower() == "honeypot":
            return None
            
        return {
            "project_name": record.get("project_name"),
            "name_categories": record.get("name_categories"),
            "website_link": record.get("website_link"),
            "funds_lost": record.get("funds_lost"),
            "scam_type": scam_type,
            "date": record.get("date"),
            "root_cause": record.get("root_cause"),
            "quick_summary": record.get("quick_summary"),
            "details": record.get("details"),
            "block_data": record.get("block_data"),
            "proof_link": record.get("proof_link"),
            "chain": record.get("chain"),
            "token_name": record.get("token_name"),
            "token_address": record.get("token_address")
        }
    except Exception as e:
        logger.error(f"Error filtering record: {str(e)}")
        return None

def sort_key(record):
    """Helper function to handle None values in date field for sorting"""
    date = record.get("date")
    if date is None:
        return ""  # Return empty string for None dates to sort them last
    return date

def sanitize_description(description: str, domain: str = None) -> Dict[str, Any]:
    """
    Sanitize HTML description by removing tags but preserving links in a references array
    
    Args:
        description: HTML description text
        domain: Domain of the record to avoid duplicate references
        
    Returns:
        Dict with cleaned text and references list
    """
    if not description:
        return {"text": "", "references": []}
    
    # Parse HTML with BeautifulSoup
    soup = BeautifulSoup(description, 'html.parser')
    
    # Extract all links
    references = []
    for i, link in enumerate(soup.find_all('a')):
        href = link.get('href')
        if href:
            # Check if the link domain matches the record domain to avoid duplicates
            link_domain = None
            try:
                parsed_url = urllib.parse.urlparse(href)
                link_domain = parsed_url.netloc
            except:
                pass
                
            # Skip if the link domain matches the record domain
            if domain and link_domain and domain in link_domain:
                link.replace_with(link.text)
                continue
                
            # Replace link with reference marker
            marker = f"[{i+1}]"
            link.replace_with(f"{link.text} {marker}")
            
            # Add to references
            references.append(href)
    
    # Get cleaned text
    cleaned_text = soup.get_text()
    # Remove extra whitespace
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return {
        "text": cleaned_text,
        "references": references
    }

async def refresh_rekt_data():
    """Refresh the rekt data cache"""
    try:
        latest_file = get_latest_rekt_file()
        logger.info(f"Refreshing cache from file: {latest_file}")
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data or not isinstance(data, dict):
            logger.error("Invalid rekt JSON format: expected object")
            return

        # Support both formats:
        # 1) Legacy puller: {"items":[...]}
        # 2) Normalized snapshots: {"data":[...]}
        records = data.get("items")
        if not isinstance(records, list):
            records = data.get("data")
        if not isinstance(records, list):
            logger.error("Invalid rekt JSON format: missing 'items' or 'data' array")
            return

        # Filter the records to only include specified fields
        filtered_records = []
        for record in records:
            filtered_record = filter_record(record)
            if filtered_record:
                filtered_records.append(filtered_record)
        
        # Sort records by date in descending order (newest first)
        filtered_records.sort(key=sort_key, reverse=True)
        
        # Update cache
        rekt_cache["data"] = filtered_records
        rekt_cache["last_updated"] = datetime.fromtimestamp(latest_file.stat().st_mtime).isoformat()
        rekt_cache["last_file"] = latest_file
        rekt_cache["total_records"] = len(filtered_records)
        
        logger.info(f"Cache refreshed with {len(filtered_records)} records")
    except Exception as e:
        logger.error(f"Error refreshing cache: {str(e)}")

async def refresh_eol_data():
    """Refresh the EOL data cache"""
    try:
        eol_file = get_latest_eol_file()
        logger.info(f"Refreshing EOL cache from file: {eol_file}")
        
        with open(eol_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            logger.error("Invalid data format in EOL JSON file")
            return
        
        # Update cache
        eol_cache["data"] = data
        eol_cache["last_updated"] = datetime.fromtimestamp(eol_file.stat().st_mtime).isoformat()
        eol_cache["last_file"] = eol_file
        eol_cache["total_records"] = len(data) if isinstance(data, list) else 1
        
        logger.info(f"EOL cache refreshed with {eol_cache['total_records']} records")
    except Exception as e:
        logger.error(f"Error refreshing EOL cache: {str(e)}")

async def refresh_leaks_data():
    """Refresh the leaks data cache"""
    try:
        leaks_file = get_leaks_file()
        logger.info(f"Refreshing leaks cache from file: {leaks_file}")
        
        with open(leaks_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            logger.error("Invalid data format in leaks JSON file")
            return
        
        # Process each leak record to remove _pl fields and sanitize descriptions
        cleaned_data = []
        for item in data:
            # Remove _pl fields
            cleaned_item = {k: v for k, v in item.items() if not k.endswith('_pl')}
            
            # Sanitize description
            if "description" in cleaned_item:
                sanitized = sanitize_description(cleaned_item["description"], cleaned_item.get("domain"))
                cleaned_item["description"] = sanitized["text"]
                if sanitized["references"]:
                    cleaned_item["references"] = sanitized["references"]
            
            cleaned_data.append(cleaned_item)
        
        # Update cache
        leaks_cache["data"] = cleaned_data
        leaks_cache["last_updated"] = datetime.fromtimestamp(leaks_file.stat().st_mtime).isoformat()
        leaks_cache["last_file"] = leaks_file
        leaks_cache["total_records"] = len(cleaned_data)
        
        logger.info(f"Leaks cache refreshed with {leaks_cache['total_records']} records")
    except Exception as e:
        logger.error(f"Error refreshing leaks cache: {str(e)}")

async def refresh_news_data():
    """Refresh the news data cache"""
    try:
        news_file = get_news_file()
        logger.info(f"Refreshing news cache from file: {news_file}")
        
        with open(news_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            logger.error("Invalid data format in news JSON file")
            return

        items = data.get("data") if isinstance(data, dict) else data
        if not isinstance(items, list):
            logger.error("Unexpected news data format: expected a list")
            return

        # Drop obviously future-dated posts (scheduled events/feed anomalies).
        now_utc = datetime.now(timezone.utc)
        future_cutoff = now_utc + timedelta(hours=24)
        filtered_items = []
        dropped_future = 0

        for item in items:
            pub_dt = parse_news_datetime(item.get("pubDate")) if isinstance(item, dict) else None
            if pub_dt and pub_dt > future_cutoff:
                dropped_future += 1
                continue
            filtered_items.append(item)

        # Update cache
        news_cache["data"] = filtered_items
        news_cache["last_updated"] = datetime.fromtimestamp(news_file.stat().st_mtime).isoformat()
        news_cache["last_file"] = news_file
        news_cache["total_records"] = len(filtered_items)
        
        logger.info(
            f"News cache refreshed with {news_cache['total_records']} records "
            f"(dropped {dropped_future} future-dated entries)"
        )
    except Exception as e:
        logger.error(f"Error refreshing news cache: {str(e)}")

async def refresh_phishing_data():
    """Refresh the phishing data cache"""
    try:
        phishing_file = get_phishing_file()
        logger.info(f"Refreshing phishing cache from file: {phishing_file}")

        if LOW_MEMORY_MODE:
            # Do not hold hundreds of thousands of domains in memory.
            phishing_cache["data"] = None
            phishing_cache["last_updated"] = datetime.fromtimestamp(phishing_file.stat().st_mtime).isoformat()
            phishing_cache["last_file"] = phishing_file
            phishing_cache["total_records"] = None
            logger.info("Phishing cache metadata refreshed in low-memory mode (data stays on disk)")
            return

        with open(phishing_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not data:
            logger.error("Invalid data format in phishing JSON file")
            return

        phishing_cache["data"] = data
        phishing_cache["last_updated"] = datetime.fromtimestamp(phishing_file.stat().st_mtime).isoformat()
        phishing_cache["last_file"] = phishing_file
        phishing_cache["total_records"] = len(data)

        logger.info(f"Phishing cache refreshed with {phishing_cache['total_records']} records")
    except Exception as e:
        logger.error(f"Error refreshing phishing cache: {str(e)}")

async def refresh_cve_data():
    """Refresh the CVE data cache"""
    try:
        if LOW_MEMORY_MODE:
            # Keep only metadata; load CVEs per-request by year.
            cve_files = get_cve_files()
            years = sorted([f.stem for f in cve_files], reverse=True)
            cve_cache["data"] = None
            cve_cache["last_updated"] = datetime.now().isoformat()
            cve_cache["last_file"] = cve_files[-1] if cve_files else None
            cve_cache["total_records"] = None
            cve_cache["available_years"] = years
            cve_year_cache.clear()
            cve_year_cache_order.clear()
            logger.info(f"CVE metadata refreshed in low-memory mode across {len(years)} years")
            return

        cve_files = get_cve_files()
        logger.info(f"Refreshing CVE cache from {len(cve_files)} files")
        
        all_cve_data = {}
        for cve_file in cve_files:
            year = cve_file.stem  # Get year from filename (e.g., "2024" from "2024.json")
            with open(cve_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Convert single object to list if needed
                if not isinstance(data, list):
                    data = [data]
                
                # Filter out rejected CVEs
                filtered_data = []
                for item in data:
                    # Skip if description contains "Rejected reason"
                    if "description" in item and isinstance(item["description"], str) and "Rejected reason" in item["description"]:
                        continue
                    
                    # Skip if severity is "brak" or "none"
                    if item.get("severity") in ["brak", "none"] or item.get("severity_en") in ["brak", "none"]:
                        continue
                    
                    # Skip if score is null and severity is not set
                    if item.get("score") is None and not item.get("severity"):
                        continue
                    
                    filtered_data.append(item)
                
                if filtered_data:
                    # Sort by publishedDate in descending order (newest first)
                    filtered_data.sort(
                        key=lambda x: x.get("publishedDate", ""),
                        reverse=True
                    )
                    all_cve_data[year] = filtered_data
        
        if not all_cve_data:
            logger.error("No valid CVE data found in files")
            return
        
        # Sort years in descending order (newest first)
        sorted_years = sorted(all_cve_data.keys(), reverse=True)
        sorted_data = {year: all_cve_data[year] for year in sorted_years}
        
        # Update cache
        cve_cache["data"] = sorted_data
        cve_cache["last_updated"] = datetime.now().isoformat()
        cve_cache["last_file"] = cve_files[-1]  # Use the last modified file
        cve_cache["total_records"] = sum(len(data) for data in sorted_data.values())
        cve_cache["available_years"] = sorted_years
        
        logger.info(f"CVE cache refreshed with {cve_cache['total_records']} records across {len(sorted_data)} years")
    except Exception as e:
        logger.error(f"Error refreshing CVE cache: {str(e)}")


def load_phishing_domains_from_disk() -> List[str]:
    phishing_file = get_phishing_file()
    with open(phishing_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="Invalid phishing data format")
    return data


def _filter_cve_items(data: Any) -> List[Dict[str, Any]]:
    if not isinstance(data, list):
        data = [data]

    filtered_data: List[Dict[str, Any]] = []
    for item in data:
        if "description" in item and isinstance(item["description"], str) and "Rejected reason" in item["description"]:
            continue
        if item.get("severity") in ["brak", "none"] or item.get("severity_en") in ["brak", "none"]:
            continue
        if item.get("score") is None and not item.get("severity"):
            continue
        filtered_data.append(item)

    filtered_data.sort(key=lambda x: x.get("publishedDate", ""), reverse=True)
    return filtered_data


def load_cve_year_data(year: str) -> List[Dict[str, Any]]:
    if year in cve_year_cache:
        return cve_year_cache[year]

    files = get_cve_files(year=year)
    with open(files[0], 'r', encoding='utf-8') as f:
        raw = json.load(f)
    year_data = _filter_cve_items(raw)

    cve_year_cache[year] = year_data
    cve_year_cache_order.append(year)
    if len(cve_year_cache_order) > MAX_CVE_YEARS_IN_MEMORY:
        evicted = cve_year_cache_order.pop(0)
        cve_year_cache.pop(evicted, None)

    return year_data

def get_web3_releases_file():
    """Get the Web3 releases JSON file"""
    try:
        feed_root = get_feed_root_dir()
        candidates = [
            feed_root / "web3-releases.json",
            Path("data/web3-releases.json"),
        ]

        existing_files = [p for p in candidates if p.exists()]
        if not existing_files:
            logger.error("Web3 releases file not found in any known location")
            raise HTTPException(status_code=404, detail="Web3 releases data file not found")

        releases_file = max(existing_files, key=lambda p: p.stat().st_mtime)
        logger.info(f"Using Web3 releases file: {releases_file.absolute()}")
        return releases_file
    except Exception as e:
        logger.error(f"Error in get_web3_releases_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding Web3 releases file: {str(e)}")

async def refresh_web3_releases_data():
    """Refresh the Web3 releases data cache"""
    try:
        releases_file = get_web3_releases_file()
        logger.info(f"Refreshing Web3 releases cache from file: {releases_file}")
        
        with open(releases_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logger.info(f"Loaded JSON data: {str(data.keys())}")
        
        if not data:
            logger.error("Invalid data format in Web3 releases JSON file - data is empty")
            return
            
        # Handle the current JSON structure which has 'releases' instead of 'data'
        if "data" in data:
            releases_data = data["data"]
            # Update cache with the releases data
            web3_releases_cache["data"] = releases_data
            web3_releases_cache["last_updated"] = datetime.now().isoformat()
            web3_releases_cache["last_file"] = releases_file
            web3_releases_cache["total_records"] = data.get("total_records", len(releases_data))
            
            logger.info(f"Web3 releases cache refreshed with {web3_releases_cache['total_records']} records")
        else:
            logger.error(f"Missing 'data' key in JSON. Available keys: {str(data.keys())}")
            return
            
    except Exception as e:
        logger.error(f"Error refreshing Web3 releases cache: {str(e)}")
        logger.exception("Full traceback:")

@app.on_event("startup")
async def startup_event():
    """Initialize cache on startup"""
    sync_cve_year_file(datetime.now().year)
    await refresh_rekt_data()
    await refresh_eol_data()
    await refresh_leaks_data()
    await refresh_news_data()
    if PRELOAD_HEAVY_DATA:
        await refresh_phishing_data()
        await refresh_cve_data()
    else:
        logger.info("Skipping heavy cache preload (phishing/cve) to reduce memory usage")
        # Still initialize metadata to keep endpoint responses consistent.
        await refresh_phishing_data()
        await refresh_cve_data()
    await refresh_web3_releases_data()
    # Start background task to refresh cache periodically (every 5 minutes)
    asyncio.create_task(periodic_refresh())

async def periodic_refresh():
    """Periodically refresh the cache"""
    while True:
        await asyncio.sleep(300)  # 5 minutes
        sync_cve_year_file(datetime.now().year)
        await refresh_rekt_data()
        await refresh_eol_data()
        await refresh_leaks_data()
        await refresh_news_data()
        if PRELOAD_HEAVY_DATA:
            await refresh_phishing_data()
        await refresh_cve_data()
        await refresh_web3_releases_data()

@app.get("/web3-threats")
async def get_rekt_data():
    """Get the latest rekt database data from cache"""
    if rekt_cache["data"] is None:
        raise HTTPException(status_code=503, detail="Data not yet loaded")
    
    return {
        "last_updated": rekt_cache["last_updated"],
        "total_records": rekt_cache["total_records"],
        "data": rekt_cache["data"]
    }

@app.get("/eol")
async def get_eol_data():
    """Get the latest EOL data from cache"""
    if eol_cache["data"] is None:
        raise HTTPException(status_code=503, detail="EOL data not yet loaded")
    
    return {
        "last_updated": eol_cache["last_updated"],
        "total_records": eol_cache["total_records"],
        "data": eol_cache["data"]
    }

@app.get("/leaks")
async def get_leaks_data():
    """Get the latest leaks data from cache"""
    if leaks_cache["data"] is None:
        raise HTTPException(status_code=503, detail="Leaks data not yet loaded")
    
    return {
        "last_updated": leaks_cache["last_updated"],
        "total_records": leaks_cache["total_records"],
        "data": leaks_cache["data"]
    }

@app.get("/news")
async def get_news_data():
    """Get the latest news data from cache"""
    if news_cache["data"] is None:
        raise HTTPException(status_code=503, detail="News data not yet loaded")
    
    return {
        "last_updated": news_cache["last_updated"],
        "total_records": news_cache["total_records"],
        "data": news_cache["data"]
    }

@app.get("/get-web3-scam-domains")
async def get_web3_scam_domains():
    """Get 5 random domains from phishing scam database"""
    domains_source = phishing_cache["data"] if phishing_cache["data"] is not None else load_phishing_domains_from_disk()
    if not domains_source:
        raise HTTPException(status_code=503, detail="Phishing data not yet loaded")

    domains = random.sample(domains_source, min(5, len(domains_source)))
    
    return {
        "last_updated": phishing_cache["last_updated"],
        "total_records": len(domains),
        "data": domains
    }

@app.get("/search")
async def search_domain(domain: str):
    """Search for a domain in the phishing scam database"""
    domains_source = phishing_cache["data"] if phishing_cache["data"] is not None else load_phishing_domains_from_disk()
    if not domains_source:
        raise HTTPException(status_code=503, detail="Phishing data not yet loaded")

    domain_exists = any(d.lower() == domain.lower() for d in domains_source)
    
    return {
        "domain": domain,
        "exists": domain_exists,
        "last_updated": phishing_cache["last_updated"]
    }

@app.post("/web3-threats/refresh")
async def refresh_data(background_tasks: BackgroundTasks):
    """Manually trigger a cache refresh"""
    background_tasks.add_task(refresh_rekt_data)
    return {"message": "Cache refresh initiated"}

@app.post("/refresh/all")
async def refresh_all_data(background_tasks: BackgroundTasks):
    """Manually trigger a refresh of all data caches"""
    background_tasks.add_task(refresh_rekt_data)
    background_tasks.add_task(refresh_eol_data)
    background_tasks.add_task(refresh_leaks_data)
    background_tasks.add_task(refresh_news_data)
    background_tasks.add_task(refresh_phishing_data)
    background_tasks.add_task(refresh_cve_data)
    background_tasks.add_task(refresh_web3_releases_data)
    return {"message": "All cache refreshes initiated"}

@app.get("/get-cves")
async def get_cves_data(year: str = None, page: int = 1, page_size: int = 100):
    """Get CVE data from cache, optionally filtered by year and paginated"""
    current_year = str(datetime.now().year)
    # Keep current year file fresh enough for daily updates.
    if year == current_year or year is None:
        sync_cve_year_file(datetime.now().year)

    if cve_cache.get("available_years") is None and cve_cache["data"] is None:
        raise HTTPException(status_code=503, detail="CVE data not yet loaded")
    
    # Validate pagination parameters
    if page < 1:
        raise HTTPException(status_code=400, detail="Page number must be greater than 0")
    if page_size < 1 or page_size > 1000:
        raise HTTPException(status_code=400, detail="Page size must be between 1 and 1000")
    
    if year:
        if LOW_MEMORY_MODE:
            try:
                get_cve_files(year=year)
            except HTTPException as exc:
                if exc.status_code == 404:
                    raise HTTPException(status_code=404, detail=f"No CVE data found for year {year}")
                raise
            year_data = load_cve_year_data(year)
        else:
            if year not in cve_cache["data"]:
                raise HTTPException(status_code=404, detail=f"No CVE data found for year {year}")
            year_data = cve_cache["data"][year]

        if len(year_data) == 0:
            raise HTTPException(status_code=404, detail=f"No CVE data found for year {year}")
        total_records = len(year_data)
        total_pages = (total_records + page_size - 1) // page_size
        
        if page > total_pages:
            raise HTTPException(status_code=400, detail=f"Page {page} does not exist. Total pages: {total_pages}")
        
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_records)
        paginated_data = year_data[start_idx:end_idx]
        
        return {
            "last_updated": cve_cache["last_updated"],
            "year": year,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
            "data": paginated_data
        }
    
    if LOW_MEMORY_MODE:
        years = sorted([f.stem for f in get_cve_files()], reverse=True)
        cve_cache["available_years"] = years
        offset = (page - 1) * page_size
        remaining_skip = offset
        paginated_data: List[Dict[str, Any]] = []
        total_records = 0

        for y in years:
            year_data = load_cve_year_data(y)
            year_len = len(year_data)
            total_records += year_len

            if len(paginated_data) >= page_size:
                continue

            if remaining_skip >= year_len:
                remaining_skip -= year_len
                continue

            start = remaining_skip
            take = min(page_size - len(paginated_data), year_len - start)
            paginated_data.extend(year_data[start:start + take])
            remaining_skip = 0

        total_pages = (total_records + page_size - 1) // page_size if total_records else 0
        if page > max(total_pages, 1):
            raise HTTPException(status_code=400, detail=f"Page {page} does not exist. Total pages: {total_pages}")
    else:
        # Handle pagination for all years
        all_data = []
        for year_data in cve_cache["data"].values():
            all_data.extend(year_data)

        total_records = len(all_data)
        total_pages = (total_records + page_size - 1) // page_size

        if page > total_pages:
            raise HTTPException(status_code=400, detail=f"Page {page} does not exist. Total pages: {total_pages}")

        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_records)
        paginated_data = all_data[start_idx:end_idx]
    
    return {
        "last_updated": cve_cache["last_updated"],
        "total_records": total_records,
        "total_pages": total_pages,
        "current_page": page,
        "page_size": page_size,
        "available_years": cve_cache.get("available_years", []),
        "data": paginated_data
    }

@app.get("/web3-releases")
async def get_web3_releases():
    """Get Web3 framework release data"""
    if web3_releases_cache["data"] is None:
        raise HTTPException(status_code=503, detail="Web3 releases data not yet loaded")
    
    return {
        "last_updated": web3_releases_cache["last_updated"],
        "total_records": len(web3_releases_cache["data"]),
        "data": web3_releases_cache["data"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
