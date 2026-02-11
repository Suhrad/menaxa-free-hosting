#!/usr/bin/env python3

import requests
import json
import os
from pathlib import Path

def download_scam_db():
    """Download scam database and save it to file"""
    url = "https://raw.githubusercontent.com/scamsniffer/scam-database/refs/heads/main/blacklist/domains.json"
    output_path = "./data/phishing-scam-db.json"
    
    try:
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Download the JSON file
        print(f"Downloading scam database from {url}")
        response = requests.get(url)
        response.raise_for_status()
        
        # Parse JSON to ensure it's valid
        data = response.json()
        
        # Save to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully saved scam database to {output_path}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading scam database: {str(e)}")
        return False
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON data: {str(e)}")
        return False
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    download_scam_db()


