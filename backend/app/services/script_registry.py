from typing import List, Optional

from ..config import SCRIPTS_STORE_PATH
from ..models import Script
from ..storage.json_store import load_list, save_list


def list_scripts() -> List[Script]:
    """
    Return all scripts known to the backend.
    Currently loaded from a JSON file in backend/data/scripts.json.
    """
    return load_list(SCRIPTS_STORE_PATH, Script)


def get_script(script_id: str) -> Optional[Script]:
    """
    Find a script by its ID, or return None.
    """
    scripts = list_scripts()
    for script in scripts:
        if script.id == script_id:
            return script
    return None


def save_scripts(scripts: List[Script]) -> None:
    """
    Persist the full script list.
    Not used yet by the UI, but leaves the door open for editing scripts from the frontend.
    """
    save_list(SCRIPTS_STORE_PATH, scripts)
