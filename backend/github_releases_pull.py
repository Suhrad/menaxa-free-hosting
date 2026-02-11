import requests
import json
import os
import time
from datetime import datetime
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# List of repositories to track
REPOSITORIES = [
    "algorand/go-algorand",
    "ava-labs/avalanchego",
    "bnb-chain/bsc",
    "ethereum/go-ethereum",
    "near/nearcore",
    "OpenZeppelin/cairo-contracts",
    "OpenZeppelin/openzeppelin-contracts",
    "rust-lang/rust",
    "solana-labs/solana",
    "ethereum/solidity",
    "MystenLabs/sui",
    "vyperlang/vyper",
    "aptos-labs/aptos-core",
    "ethereum-optimism/optimism"
]

def calculate_days_since_launch(created_at):
    """Calculate days since the release was created"""
    try:
        created_date = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ")
        days_since = (datetime.utcnow() - created_date).days
        return days_since
    except Exception as e:
        logger.error(f"Error calculating days since launch: {str(e)}")
        return None

def fetch_github_releases(repo, headers):
    """Fetch release data for a GitHub repository"""
    url = f"https://api.github.com/repos/{repo}/releases"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        releases = response.json()
        
        # Process and clean the release data
        processed_releases = []
        for release in releases:
            created_at = release.get("created_at")
            processed_release = {
                "name": release.get("name") or release.get("tag_name"),
                "author": repo.split("/")[0],
                "created_at": created_at,
                "days_since_launch": calculate_days_since_launch(created_at) if created_at else None,
                "html_url": release.get("html_url")
            }
            processed_releases.append(processed_release)
        
        return processed_releases
    except Exception as e:
        logger.error(f"Error fetching releases for {repo}: {str(e)}")
        return []

def fetch_all_releases(output_dir="./data/cybermonit", github_token=None):
    """Fetch releases for all tracked repositories"""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Web3-Release-Tracker"
    }
    
    if github_token:
        headers["Authorization"] = f"token {github_token}"
    
    all_releases = []
    
    for repo in REPOSITORIES:
        logger.info(f"Fetching releases for {repo}")
        releases = fetch_github_releases(repo, headers)
        all_releases.extend(releases)
        time.sleep(1)  # Rate limiting
    
    # Sort releases by creation date
    all_releases.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Create output directory if it doesn't exist
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save to file with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"web3_releases_{timestamp}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "last_updated": datetime.now().isoformat(),
            "total_records": len(all_releases),
            "data": all_releases
        }, f, indent=2)
    
    logger.info(f"Saved {len(all_releases)} releases to {output_file}")
    
    # Also save to a static filename for the API
    static_output = output_dir / "web3-releases.json"
    with open(static_output, 'w', encoding='utf-8') as f:
        json.dump({
            "last_updated": datetime.now().isoformat(),
            "total_records": len(all_releases),
            "data": all_releases
        }, f, indent=2)
    
    logger.info(f"Saved releases to static file {static_output}")

    # Keep legacy path in sync for compatibility with older tooling.
    legacy_static_output = Path("./data/web3-releases.json")
    legacy_static_output.parent.mkdir(parents=True, exist_ok=True)
    with open(legacy_static_output, 'w', encoding='utf-8') as f:
        json.dump({
            "last_updated": datetime.now().isoformat(),
            "total_records": len(all_releases),
            "data": all_releases
        }, f, indent=2)
    logger.info(f"Saved releases to legacy static file {legacy_static_output}")
    return output_file

if __name__ == "__main__":
    # Get GitHub token from environment variable
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        logger.warning("No GITHUB_TOKEN environment variable found. API rate limits will be restricted.")
    
    fetch_all_releases(github_token=github_token) 
