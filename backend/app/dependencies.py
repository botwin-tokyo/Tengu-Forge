from typing import Optional

from fastapi import Header, HTTPException

from .services.config_service import matches_key


def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    if not x_api_key or not matches_key(x_api_key):
        raise HTTPException(status_code=401, detail="Valid API key required")
