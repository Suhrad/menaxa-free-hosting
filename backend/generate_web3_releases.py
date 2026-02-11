#!/usr/bin/env python3
import json
import os
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_release_type(tag_name: str, body: str) -> str:
    """Determine if a release is major, minor, or patch"""
    tag_parts = tag_name.lstrip('v').split('.')
    if not tag_parts[0].isdigit():
        return "other"
    
    # Check for beta/alpha/rc in tag
    if any(x in tag_name.lower() for x in ['alpha', 'beta', 'rc', 'dev']):
        return "pre-release"
    
    # Check body for keywords indicating release type
    body_lower = body.lower() if body else ""
    if "security" in body_lower or "vulnerability" in body_lower or "fix" in body_lower:
        return "security"
    elif "breaking" in body_lower or "major" in body_lower:
        return "major"
    elif "feature" in body_lower or "minor" in body_lower:
        return "minor"
    else:
        return "patch"

def process_release_files():
    """Process Web3 framework release files and generate combined data"""
    releases_dir = Path("../public/data/releases")
    output_dir = Path("data")
    output_file = output_dir / "web3-releases.json"
    
    logger.info("📡 Processing Web3 framework releases...")
    processed_data: List[Dict] = []
    
    try:
        # Process each JSON file in the releases directory
        for json_file in releases_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Get the framework name from the filename (without .json)
                    framework_name = json_file.stem
                    
                    # Process the releases data
                    if isinstance(data, list):
                        for release in data:
                            if not release.get("tag_name"):
                                continue
                                
                            # Extract relevant information
                            release_info = {
                                "name": release.get("name") or release.get("tag_name", ""),
                                "author": release.get("author", {}).get("login", ""),
                                "created_at": release.get("created_at", ""),
                                "release_url": release.get("html_url", ""),
                                "framework": framework_name,
                                "release_type": get_release_type(
                                    release.get("tag_name", ""),
                                    release.get("body", "")
                                ),
                                "tag_name": release.get("tag_name", ""),
                                "body": release.get("body", "")[:500] if release.get("body") else "",  # Limit body length
                                "draft": release.get("draft", False),
                                "prerelease": release.get("prerelease", False)
                            }
                            
                            # Only include non-draft releases
                            if not release_info["draft"]:
                                processed_data.append(release_info)
                        
                        logger.info(f"✅ Processed releases for {framework_name}")
                    
            except Exception as e:
                logger.error(f"❌ Error processing {json_file.name}: {str(e)}")
                continue
        
        # Sort all releases by creation date (newest first)
        processed_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Save processed data
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump({
                "total_releases": len(processed_data),
                "frameworks": list(set(r["framework"] for r in processed_data)),
                "releases": processed_data
            }, f, indent=2)
        
        logger.info(f"🎉 Done! Processed {len(processed_data)} total releases across {len(set(r['framework'] for r in processed_data))} frameworks")
        
    except Exception as e:
        logger.error(f"❌ Failed to process releases: {str(e)}")

if __name__ == "__main__":
    process_release_files() 