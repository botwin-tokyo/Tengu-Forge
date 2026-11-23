"""Local operator provisioning: python -m backend.app.services.config_service."""
import getpass
import hashlib
import hmac
import json
import secrets

from ..config import CONFIG_PATH
from ..storage.json_store import write_json


def set_api_key(key: str) -> None:
    if len(key.strip()) < 16:
        raise ValueError("Use a key of at least 16 characters")
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(key.encode(), salt=salt, n=16384, r=8, p=1)
    write_json(CONFIG_PATH, {"salt": salt.hex(), "digest": digest.hex()})


def matches_key(candidate: str) -> bool:
    try:
        config = json.loads(CONFIG_PATH.read_text())
        if not isinstance(config, dict):
            return False
        if "digest" in config:
            digest = hashlib.scrypt(candidate.encode(), salt=bytes.fromhex(config["salt"]),
                                    n=16384, r=8, p=1)
            return hmac.compare_digest(digest, bytes.fromhex(config["digest"]))
        # Existing installations keep working until the operator rotates locally.
        old = config.get("apiKey")
        return isinstance(old, str) and bool(old.strip()) and hmac.compare_digest(old.encode(), candidate.encode())
    except (OSError, ValueError, KeyError, TypeError):
        return False


if __name__ == "__main__":
    key = getpass.getpass("New Tengu API key (at least 16 characters): ").strip()
    if key != getpass.getpass("Confirm key: ").strip():
        raise SystemExit("Keys do not match")
    set_api_key(key)
    print("API key saved.")
