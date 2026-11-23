from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = APP_DIR.parent          # .../tengu-forge/backend
PROJECT_ROOT = BACKEND_ROOT.parent     # .../tengu-forge

# Where scripts will live. This directory is created on startup.
SCRIPTS_ROOT = BACKEND_ROOT / "scripts"

# Where JSON data lives
DATA_DIR = BACKEND_ROOT / "data"

# Backend config file (for API key, etc.)
CONFIG_PATH = DATA_DIR / "config.json"

# JSON store paths
SCRIPTS_STORE_PATH = DATA_DIR / "scripts.json"
RUNS_STORE_PATH = DATA_DIR / "runs.json"
HTTP_ACTIONS_STORE_PATH = DATA_DIR / "http_actions.json"
