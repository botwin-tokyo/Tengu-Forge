from typing import List

from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import verify_api_key
from ..models import HTTPAction, HTTPActionCreate
from ..services.http_sender import send
from ..services.http_actions_service import (
    create_http_action,
    change_http_action,
    list_http_actions,
)

router = APIRouter(prefix="/http-actions", tags=["http-actions"])


@router.get("", response_model=List[HTTPAction])
def get_http_actions(_: None = Depends(verify_api_key)):
    return list_http_actions()


@router.post("", response_model=HTTPAction)
def create_http_action_endpoint(
    payload: HTTPActionCreate,
    _: None = Depends(verify_api_key),
):
    return create_http_action(payload)


@router.put("/{action_id}", response_model=HTTPAction)
def update_http_action(action_id: str, payload: HTTPActionCreate, _: None = Depends(verify_api_key)):
    return change_http_action(action_id, payload)


@router.delete("/{action_id}", status_code=204)
def delete_http_action(action_id: str, _: None = Depends(verify_api_key)):
    change_http_action(action_id, None)


@router.post("/{action_id}/send")
async def send_http_action(action_id: str, _: None = Depends(verify_api_key)):
    for action in list_http_actions():
        if action.id == action_id:
            return await send(action)
    raise HTTPException(404, "HTTP action not found")
