from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..dependencies import verify_api_key
from ..models import RunResult, Script
from ..services.run_history_service import append_run, list_runs_for_script
from ..services.script_registry import get_script, list_scripts
from ..services.script_runner import run_script

router = APIRouter(prefix="/scripts", tags=["scripts"])


@router.get("", response_model=List[Script])
def get_scripts(_: None = Depends(verify_api_key)):
    return list_scripts()


@router.get("/{script_id}/runs", response_model=List[RunResult])
def get_script_runs(
    script_id: str,
    _: None = Depends(verify_api_key),
):
    return list_runs_for_script(script_id)


class RunRequest(BaseModel):
    arguments: Dict[str, object] = Field(default_factory=dict)
    env: Dict[str, str] = Field(default_factory=dict)


@router.post("/{script_id}/run", response_model=RunResult)
def run_script_endpoint(
    script_id: str,
    payload: RunRequest,
    _: None = Depends(verify_api_key),
):
    script = get_script(script_id)
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found",
        )

    result = run_script(script, payload.arguments, payload.env or None)
    append_run(result)
    return result
