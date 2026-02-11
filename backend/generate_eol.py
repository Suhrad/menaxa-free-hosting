#!/usr/bin/env python3
import requests
import json
import argparse
from datetime import datetime
import os
import concurrent.futures
from tqdm import tqdm

def parse_arguments():
    parser = argparse.ArgumentParser(description='Collects end-of-life data from endoflife.date API')
    parser.add_argument('-o', '--output', default='./data/eol_feed.json',
                      help='Output file path (default: ./data/eol_feed.json)')
    parser.add_argument('-w', '--workers', type=int, default=10,
                      help='Number of parallel workers (default: 10)')
    return parser.parse_args()

def fetch_products():
ALL_PRODUCTS_URL = "https://endoflife.date/api/all.json"
print("📡 Fetching all products from endoflife.date...")
try:
    product_res = requests.get(ALL_PRODUCTS_URL, timeout=10)
    product_res.raise_for_status()
        return product_res.json()
except Exception as e:
    print(f"❌ Failed to fetch product list: {str(e)}")
        return []

def process_product(product, BASE_PRODUCT_URL):
    try:
        res = requests.get(f"{BASE_PRODUCT_URL}{product}.json", timeout=10)
        res.raise_for_status()
        entries = res.json()

        versions = []

        for entry in entries:
            if not entry.get("eol"):
                continue

            eol_date = entry.get("eol")
            try:
                eol_dt = datetime.strptime(eol_date, "%Y-%m-%d")
                is_expired = eol_dt < datetime.now()
            except Exception:
                is_expired = False

            versions.append({
                "cycle": entry.get("cycle"),
                "eol": entry.get("eol"),
                "releaseDate": entry.get("releaseDate"),
                "latest": entry.get("latest"),
                "latestReleaseDate": entry.get("latestReleaseDate"),
                "lts": entry.get("lts", False),
                "status": "expired" if is_expired else "active"
            })

        if versions:
            versions.sort(key=lambda x: x.get("releaseDate") or "", reverse=True)
            return {
                "product": product,
                "versions": versions
            }
        return None

    except Exception as e:
        print(f"❌ Failed to fetch {product}: {str(e)}")
        return None

def main():
    args = parse_arguments()
    BASE_PRODUCT_URL = "https://endoflife.date/api/"
    
    products = fetch_products()
    all_grouped = []

    print(f"🔄 Processing {len(products)} products with {args.workers} parallel workers...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        # Create a list of futures
        futures = [executor.submit(process_product, product, BASE_PRODUCT_URL) for product in products]
        
        # Use tqdm to show progress
        for future in tqdm(concurrent.futures.as_completed(futures), total=len(products), desc="Processing products"):
            result = future.result()
            if result:
                all_grouped.append(result)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)

# Save data
    with open(args.output, "w", encoding="utf-8") as f:
    json.dump(all_grouped, f, indent=2)

    print(f"\n🎉 Done! {len(all_grouped)} products saved to {args.output}")

if __name__ == "__main__":
    main()