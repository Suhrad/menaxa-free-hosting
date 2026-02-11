#!/usr/bin/env python3
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

def run_command(command):
    """Run a shell command and print its output."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            text=True,
            capture_output=True
        )
        print(f"Command '{command}' completed successfully")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running command '{command}':")
        print(e.stderr)
        sys.exit(1)

def format_time(seconds):
    """Format seconds into hours, minutes, seconds."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def update_data():
    """Run all data update scripts."""
    script_dir = Path(__file__).parent.absolute()
    
    print("\nRunning data update at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 50)
    
    # Run the phishing URL collector
    print("\nRunning phishing URL collector...")
    run_command(f"python3 {script_dir}/phishing_url_collector.py")
    
    # Run the cybermonit script
    print("\nRunning cybermonit...")
    run_command(f"python3 {script_dir}/cybermonit.py")
    
    # Run the rekt database pull script
    #print("\nRunning rekt database pull...")
    #run_command(f"python3 {script_dir}/rekt_db_pull.py")
    
    # Run the scam database download script
    print("\nRunning scam database download...")
    run_command(f"python3 {script_dir}/scam-db.py")
    
    print("\nData update completed successfully!")
    print("=" * 50)

def main():
    # Set the interval to 2 hours (in seconds)
    interval = 2 * 60 * 60
    # interval = 2  # For testing purposes
    
    print("Data Update Scheduler Started")
    print("Scripts will run every 2 hours")
    print("Press Ctrl+C to exit")
    
    try:
        while True:
            # Calculate next run time
            next_run = datetime.now() + timedelta(seconds=interval)
            
            # Show countdown until next run
            while datetime.now() < next_run:
                remaining = (next_run - datetime.now()).total_seconds()
                print(f"\rNext update in: {format_time(int(remaining))}", end="")
                time.sleep(1)
            
            # Run the update
            update_data()
            
    except KeyboardInterrupt:
        print("\n\nScheduler stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()

