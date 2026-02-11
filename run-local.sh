#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"

if lsof -i :"$FRONTEND_PORT" >/dev/null 2>&1; then
  echo "Port $FRONTEND_PORT is already in use. Falling back to 3002."
  FRONTEND_PORT=3002
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:$BACKEND_PORT ..."
(
  cd "$BACKEND_DIR"
  if [[ -x "$BACKEND_PYTHON" ]]; then
    "$BACKEND_PYTHON" api.py
  else
    python3 api.py
  fi
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:$FRONTEND_PORT ..."
cd "$ROOT_DIR"
npm run dev -- -p "$FRONTEND_PORT"
