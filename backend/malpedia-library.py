#!/usr/bin/env python3

import argparse
import requests
import json
import os
import bibtexparser
from bibtexparser.bparser import BibTexParser
from bibtexparser.customization import convert_to_unicode

MALPEDIA_URL = 'https://malpedia.caad.fkie.fraunhofer.de/library/download'

def download_bib_file(output_dir):
    """Download bib file from Malpedia"""
    response = requests.get(MALPEDIA_URL)
    if response.status_code == 200:
        bib_path = os.path.join(output_dir, 'bib', 'malpedia.bib')
        with open(bib_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        return bib_path
    else:
        raise Exception(f"Failed to download bib file: {response.status_code}")

def convert_bib_to_json(bib_path, output_dir):
    """Convert bib file to JSON"""
    # Configure parser to handle 'online' entry type
    parser = BibTexParser()
    parser.ignore_nonstandard_types = False
    parser.customization = convert_to_unicode
    
    with open(bib_path, 'r', encoding='utf-8') as bibtex_file:
        bib_database = bibtexparser.load(bibtex_file, parser=parser)
    
    # Convert entries to a more JSON-friendly format
    entries = []
    for entry in bib_database.entries:
        # Clean up the entry data
        cleaned_entry = {}
        for key, value in entry.items():
            # Remove curly braces from values and clean up
            cleaned_value = value.replace('{', '').replace('}', '').strip()
            cleaned_entry[key] = cleaned_value
        entries.append(cleaned_entry)
    
    json_path = os.path.join(output_dir, 'json', 'malpedia.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    return json_path

def create_output_structure(base_output_dir):
    """Create the output directory structure"""
    output_dir = os.path.join(base_output_dir, 'malpedia')
    bib_dir = os.path.join(output_dir, 'bib')
    json_dir = os.path.join(output_dir, 'json')
    
    os.makedirs(bib_dir, exist_ok=True)
    os.makedirs(json_dir, exist_ok=True)
    
    return output_dir

def main():
    parser = argparse.ArgumentParser(description='Download and process Malpedia library data')
    parser.add_argument('--output', '-o', default='data',
                      help='Base output directory (default: data)')
    parser.add_argument('--convert', '-c', action='store_true',
                      help='Convert bib file to JSON')
    
    args = parser.parse_args()

    try:
        # Create output directory structure
        output_dir = create_output_structure(args.output)
        print(f"Created output structure in {output_dir}")

        print(f"Downloading bib file from {MALPEDIA_URL}")
        bib_path = download_bib_file(output_dir)
        print(f"Saved bib file to {bib_path}")

        if args.convert:
            print("Converting bib file to JSON")
            json_path = convert_bib_to_json(bib_path, output_dir)
            print(f"Saved JSON file to {json_path}")

    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
