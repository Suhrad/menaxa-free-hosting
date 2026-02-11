#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path
from datetime import datetime


def run(cmd: list[str], cwd: Path) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd),
            text=True,
            capture_output=True,
            check=True,
        )
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        output = (e.stdout or "") + ("\n" + e.stderr if e.stderr else "")
        return False, output.strip()


def main() -> int:
    base = Path(__file__).parent
    python_bin = base / ".venv" / "bin" / "python"
    if not python_bin.exists():
        python_bin = Path(sys.executable)

    jobs = [
        ("phishing_url_collector.py", [str(python_bin), "phishing_url_collector.py"]),
        ("scam-db.py", [str(python_bin), "scam-db.py"]),
        ("github_releases_pull.py", [str(python_bin), "github_releases_pull.py"]),
        ("rekt_db_pull.py", [str(python_bin), "rekt_db_pull.py"]),
        ("cybermonit.py", [str(python_bin), "cybermonit.py"]),
    ]

    print(f"[{datetime.now().isoformat()}] Starting latest data pull")
    failures = 0
    for name, cmd in jobs:
        print(f"\n--- Running {name}")
        ok, output = run(cmd, base)
        if ok:
            print("OK")
        else:
            failures += 1
            print("FAILED")
        if output:
            print(output[:4000])

    print(f"\nCompleted with {failures} failed job(s)")
    print("If backend is already running, call: curl -X POST http://127.0.0.1:8000/refresh/all")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
