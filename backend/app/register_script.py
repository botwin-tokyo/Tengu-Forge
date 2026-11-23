"""Register one trusted local script definition from a JSON file."""
import argparse
from pathlib import Path

from .config import SCRIPTS_STORE_PATH
from .models import Script
from .services.script_registry import list_scripts, save_scripts
from .storage.json_store import store_lock


def register(script: Script) -> None:
    with store_lock(SCRIPTS_STORE_PATH):
        existing = list_scripts()
        if any(entry.id == script.id for entry in existing):
            raise ValueError("Script ID already exists")
        save_scripts([*existing, script])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("definition", type=Path)
    args = parser.parse_args()
    register(Script.model_validate_json(args.definition.read_text()))
