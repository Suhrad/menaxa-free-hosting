# script to fetch data and save it to json file 

import requests
import json
import os
import argparse
from datetime import datetime

# Keep real provider URL in environment variables, not in source code.
BASE_URL = os.getenv("UPSTREAM_DATA_BASE_URL", "").rstrip("/")

def fetch_and_save_file(file_path, output_dir):
    """Fetch a file from the configured upstream data host and save it locally."""
    url = f"{BASE_URL}/{file_path}"
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Save the file
        output_path = os.path.join(output_dir, file_path)
        
        # Parse as JSON to validate
        try:
            json_data = response.json()
            
            # Save the JSON response
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=4, ensure_ascii=False)
            print(f"✓ Downloaded: {file_path}")
            
        except json.JSONDecodeError as e:
            print(f"✗ Failed to parse JSON: {file_path}")
            print(f"JSON Error: {str(e)}")
            print("\nDebug info:")
            print(f"Status code: {response.status_code}")
            print(f"Content type: {response.headers.get('content-type', 'unknown')}")
            print(f"Content length: {len(response.content)}")
            print(f"First 100 bytes: {response.content[:100]}")
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to download: {file_path} (Network error: {str(e)})")
    except Exception as e:
        print(f"✗ Failed to download: {file_path} (Unknown error: {str(e)})")

def main():
    parser = argparse.ArgumentParser(description='Fetch external data feed and save to JSON files')
    parser.add_argument('-o', '--output', default='./data/external_feed',
                      help='Output directory for saved files')
    args = parser.parse_args()

    if not BASE_URL:
        print("✗ Missing UPSTREAM_DATA_BASE_URL environment variable")
        raise SystemExit(1)

    print(f"Starting download to: {args.output}")
    print("-" * 50)

    # Create cve subdirectory
    cve_dir = os.path.join(args.output, 'cve')
    os.makedirs(cve_dir, exist_ok=True)

    # List of CVE year files (dynamic; includes current year automatically)
    current_year = datetime.utcnow().year
    cve_files = [f"{year}.json" for year in range(2002, current_year + 1)]
    
    # List of other files
    other_files = [
        "ransomware.json",
        "ddos-old.json",
        "eol.json",
        "leak.json",
        "newsen.json"
    ]

    # Fetch and save CVE files to cve subdirectory
    for file_name in cve_files:
        fetch_and_save_file(file_name, cve_dir)
    
    # Fetch and save other files to main directory
    for file_name in other_files:
        fetch_and_save_file(file_name, args.output)
    
    print("-" * 50)
    print("Download completed")

if __name__ == "__main__":
    main()
