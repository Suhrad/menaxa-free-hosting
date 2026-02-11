#!/usr/bin/env python3
import requests
import json
import argparse
import os
from datetime import datetime
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def parse_arguments():
    parser = argparse.ArgumentParser(description='Collects ransomware data from Ransomware.live API')
    parser.add_argument('-o', '--output', default='./data/ransomware-live-data',
                      help='Output directory path (default: ./data/ransomware-live-data)')
    parser.add_argument('-r', '--retries', type=int, default=3,
                      help='Number of retry attempts (default: 3)')
    return parser.parse_args()

def create_session(retries=3):
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def fetch_api_data(endpoint, session, retries=3):
    base_url = "https://api.ransomware.live/v2"
    url = f"{base_url}/{endpoint}"
    headers = {
        'Accept': 'application/json'
    }
    
    for attempt in range(retries):
        try:
            response = session.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff
                print(f"⚠️ Attempt {attempt + 1} failed for {endpoint}. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"❌ Failed to fetch {endpoint} data after {retries} attempts: {str(e)}")
                return None

def save_data(data, output_path, filename):
    if not data:
        return False
        
    os.makedirs(output_path, exist_ok=True)
    file_path = os.path.join(output_path, filename)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"✅ Successfully saved data to {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to save data: {str(e)}")
        return False

def main():
    args = parse_arguments()
    
    # Define endpoints to fetch
    endpoints = {
        'groups': 'groups',
        'all_cyberattacks': 'allcyberattacks',
        'recent_cyberattacks': 'recentcyberattacks'
    }
    
    print("📡 Fetching Ransomware.live data...")
    
    # Create a session with retry logic
    session = create_session(args.retries)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    for name, endpoint in endpoints.items():
        print(f"\nFetching {name} data...")
        data = fetch_api_data(endpoint, session, args.retries)
        if data:
            filename = f"ransomware_{name}_{timestamp}.json"
            save_data(data, args.output, filename)
    
    print(f"\n🎉 Done! Data saved to {args.output}")

if __name__ == "__main__":
    main() 