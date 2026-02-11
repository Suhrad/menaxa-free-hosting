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
    parser = argparse.ArgumentParser(description='Collects ransomware wallet data from Ransomwhe.re API')
    parser.add_argument('-o', '--output', default='./data/ransomwhe-re-data',
                      help='Output directory path (default: ./data/ransomwhe-re-data)')
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

def fetch_api_data(session, retries=3):
    url = "https://api.ransomwhe.re/export"
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': 'https://ransomwhe.re',
        'Referer': 'https://ransomwhe.re/'
    }
    
    for attempt in range(retries):
        try:
            response = session.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff
                print(f"⚠️ Attempt {attempt + 1} failed. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"❌ Failed to fetch data after {retries} attempts: {str(e)}")
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
    
    print("📡 Fetching Ransomwhe.re data...")
    
    # Create a session with retry logic
    session = create_session(args.retries)
    
    # Fetch data from API
    data = fetch_api_data(session, args.retries)
    
    if data:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ransomwhe_re_wallets_{timestamp}.json"
        save_data(data, args.output, filename)
    
    print(f"\n🎉 Done! Data saved to {args.output}")

if __name__ == "__main__":
    main()



