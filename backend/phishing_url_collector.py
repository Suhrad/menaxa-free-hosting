#!/usr/bin/env python3

import argparse
import requests
import os
from urllib.parse import urlparse

# Phishing URL sources
SOURCES = [
    'https://phishunt.io/feed.txt',
    'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt'
]

def is_valid_url(url: str) -> bool:
    """Check if the URL is valid"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def fetch_urls(source_url: str) -> set:
    """Fetch URLs from a source"""
    try:
        response = requests.get(source_url, timeout=10)
        response.raise_for_status()
        # Split by newlines and filter valid URLs
        urls = {url.strip() for url in response.text.split('\n') if url.strip() and is_valid_url(url.strip())}
        return urls
    except Exception as e:
        print(f"Error fetching from {source_url}: {str(e)}")
        return set()

def load_existing_urls(file_path: str) -> set:
    """Load existing URLs from file"""
    if not os.path.exists(file_path):
        return set()
    
    try:
        with open(file_path, 'r') as f:
            return {line.strip() for line in f if line.strip() and is_valid_url(line.strip())}
    except Exception as e:
        print(f"Error reading existing URLs: {str(e)}")
        return set()

def save_urls(urls: set, file_path: str, new_urls: set = None):
    """Save URLs to file with new URLs at the top"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'w') as f:
            # Write new URLs first if provided
            if new_urls:
                for url in new_urls:
                    f.write(f"{url}\n")
                # Add a separator if there are existing URLs
                if urls - new_urls:
                    f.write("\n")
            # Write remaining URLs
            for url in urls - (new_urls or set()):
                f.write(f"{url}\n")
    except Exception as e:
        print(f"Error saving URLs: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Collect phishing URLs from multiple sources')
    parser.add_argument('-o', '--output', default='./data/phishing_urls/urls.txt',
                      help='Output file path (default: ./data/phishing_urls/urls.txt)')
    
    args = parser.parse_args()
    
    # Load existing URLs
    existing_urls = load_existing_urls(args.output)
    print(f"Loaded {len(existing_urls)} existing URLs")
    
    # Fetch new URLs from all sources
    all_new_urls = set()
    for source in SOURCES:
        print(f"Fetching URLs from {source}")
        new_urls = fetch_urls(source)
        all_new_urls.update(new_urls)
        print(f"Found {len(new_urls)} URLs from {source}")
    
    # Find new unique URLs
    new_unique_urls = all_new_urls - existing_urls
    print(f"Found {len(new_unique_urls)} new unique URLs")
    
    if new_unique_urls:
        # Combine existing and new URLs
        all_urls = existing_urls | new_unique_urls
        print(f"Total unique URLs: {len(all_urls)}")
        
        # Save all URLs with new ones at the top
        save_urls(all_urls, args.output, new_unique_urls)
        print(f"Saved URLs to {args.output}")
    else:
        print("No new URLs found")

if __name__ == "__main__":
    main()