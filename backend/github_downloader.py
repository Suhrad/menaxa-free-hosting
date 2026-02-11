#!/usr/bin/env python3

import argparse
import os
import subprocess
from datetime import datetime

def get_dirname(repo_name: str) -> str:
    """Generate directory name without timestamp"""
    # Convert repo name to lowercase and remove .git if present
    return repo_name.lower().replace('.git', '')

def clone_github_repo(repo_url: str, base_output_dir: str) -> int:
    """Clone a GitHub repository to the specified output directory"""
    try:
        # Extract repo name from URL and clean it
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        
        # Create output directory without timestamp
        output_path = os.path.join(base_output_dir, get_dirname(repo_name))

        # Create output directory if it doesn't exist
        os.makedirs(output_path, exist_ok=True)

        print(f"Cloning {repo_url} to {output_path}")
        
        # Run git clone command
        result = subprocess.run(['git', 'clone', repo_url, output_path], 
                              capture_output=True,
                              text=True)
        
        if result.returncode != 0:
            print(f"Error cloning repository: {result.stderr}")
            return 1
            
        print(f"Successfully cloned to {output_path}")
        return 0

    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

def main():
    parser = argparse.ArgumentParser(description='Clone GitHub repository to local directory')
    parser.add_argument('-u', '--url', required=True,
                      help='GitHub repository URL (e.g. https://github.com/username/repo)')
    parser.add_argument('-o', '--output', default='data',
                      help='Base output directory (default: data)')

    args = parser.parse_args()
    
    # Create base output directory if it doesn't exist
    os.makedirs(args.output, exist_ok=True)
    
    return clone_github_repo(args.url, args.output)

if __name__ == "__main__":
    exit(main())

