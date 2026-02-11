# rekt db pull

import requests
import json
import time
import argparse
import os
from datetime import datetime
from datetime import timezone

def ensure_dir(directory):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def get_output_path(base_dir):
    """Generate output path with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = os.path.join(base_dir, "rekt_db")
    ensure_dir(output_dir)
    return os.path.join(output_dir, f"rekt_db_{timestamp}.json")

def fetch_rekt_data(output_dir="./data"):
    base_url = "https://api.de.fi/v1/rekt/list"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }

    # Make initial request to get total records
    params = {
        "sortField": "fundsLost",
        "sort": "desc",
        "sortDirection": "desc",
        "limit": 100,
        "page": 1
    }

    try:
        # Get initial response to determine total pages
        response = requests.get(base_url, headers=headers, params=params)
        response.raise_for_status()
        initial_data = response.json()
        
        total_records = initial_data['total']
        total_pages = (total_records + 99) // 100  # Round up division
        
        print(f"Total records: {total_records}")
        print(f"Total pages to fetch: {total_pages}")

        # Store all items
        all_items = []
        all_items.extend(initial_data['items'])

        # Fetch remaining pages
        for page in range(2, total_pages + 1):
            params['page'] = page
            print(f"Fetching page {page}/{total_pages}")
            
            try:
                response = requests.get(base_url, headers=headers, params=params)
                response.raise_for_status()
                page_data = response.json()
                all_items.extend(page_data['items'])
                
                # Add a small delay to avoid rate limiting
                time.sleep(0.5)
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching page {page}: {str(e)}")
                continue

        # Create final JSON structure
        final_data = {
            "items": all_items,
            "total": total_records
        }

        # Generate output path and save to file
        output_path = get_output_path(output_dir)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)

        print(f"\nSuccessfully saved {len(all_items)} records to {output_path}")

    except requests.exceptions.RequestException as e:
        print(f"Primary source failed ({str(e)}). Falling back to DefiLlama hacks API...")
        return fetch_rekt_data_fallback(output_dir)


def fetch_rekt_data_fallback(output_dir="./data"):
    """Fallback source for Web3 exploit data when api.de.fi is unavailable."""
    fallback_url = "https://api.llama.fi/hacks"
    try:
        response = requests.get(fallback_url, timeout=60)
        response.raise_for_status()
        hacks = response.json()
        if not isinstance(hacks, list):
            raise ValueError("Unexpected fallback response format")

        converted_items = []
        for hack in hacks:
            date_epoch = hack.get("date")
            if isinstance(date_epoch, (int, float)):
                date_str = datetime.fromtimestamp(date_epoch, tz=timezone.utc).strftime("%Y-%m-%d")
            else:
                date_str = None

            classification = hack.get("classification")
            converted_items.append({
                "project_name": hack.get("name"),
                "name_categories": hack.get("targetType"),
                "website_link": hack.get("source"),
                "funds_lost": hack.get("amount"),
                "scam_type": {"type": classification} if classification else None,
                "date": date_str,
                "root_cause": hack.get("technique"),
            })

        final_data = {
            "items": converted_items,
            "total": len(converted_items),
            "source": "defillama_fallback",
            "fetched_at": datetime.now().isoformat(),
        }

        output_path = get_output_path(output_dir)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)

        print(f"Fallback saved {len(converted_items)} records to {output_path}")
        return output_path
    except Exception as e:
        print(f"Fallback source failed: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Fetch and save rekt database records')
    parser.add_argument('-o', '--output', 
                      default='./data',
                      help='Output directory path (default: ./data)')
    
    args = parser.parse_args()
    fetch_rekt_data(args.output)

if __name__ == "__main__":
    main()
