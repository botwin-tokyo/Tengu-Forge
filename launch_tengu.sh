#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")"
python=backend/.venv/bin/python
if [[ ! -x "$python" || ! -x node_modules/.bin/vite ]]; then
  echo "Install the Python and npm dependencies using the README first." >&2
  exit 1
fi
if [[ ! -f backend/data/config.json ]]; then
  "$python" -m backend.app.services.config_service
fi
"$python" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
api_pid=$!
node_modules/.bin/vite --host 127.0.0.1 --port 8080 --strictPort &
ui_pid=$!
cleanup() {
  kill "$api_pid" "$ui_pid" 2>/dev/null || true
  wait "$api_pid" "$ui_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM
echo "Open http://127.0.0.1:8080 when Vite is ready. Press Ctrl+C here to stop both servers."
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$ui_pid" 2>/dev/null; do sleep 1; done
exit 1
