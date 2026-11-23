import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from ..config import HTTP_ACTIONS_STORE_PATH
from ..models import HTTPAction, HTTPActionCreate
from ..storage.json_store import load_list, save_list, store_lock


def list_http_actions() -> list[HTTPAction]:
    return load_list(HTTP_ACTIONS_STORE_PATH, HTTPAction)


def create_http_action(data: HTTPActionCreate) -> HTTPAction:
    action = HTTPAction(**data.model_dump(), id=str(uuid.uuid4()), createdAt=datetime.now(timezone.utc).isoformat())
    with store_lock(HTTP_ACTIONS_STORE_PATH):
        actions = list_http_actions()
        actions.append(action)
        save_list(HTTP_ACTIONS_STORE_PATH, actions)
    return action


def change_http_action(action_id: str, data: HTTPActionCreate | None):
    with store_lock(HTTP_ACTIONS_STORE_PATH):
        actions = list_http_actions()
        for index, existing in enumerate(actions):
            if existing.id == action_id:
                updated = None
                if data is None:
                    actions.pop(index)
                else:
                    updated = HTTPAction(**data.model_dump(), id=existing.id, createdAt=existing.createdAt)
                    actions[index] = updated
                save_list(HTTP_ACTIONS_STORE_PATH, actions)
                return updated
    raise HTTPException(404, "HTTP action not found")
