import fcntl
import json
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import List, Type, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


@contextmanager
def store_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.with_suffix(".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as tmp:
        try:
            json.dump(value, tmp, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
            os.replace(tmp.name, path)
        finally:
            Path(tmp.name).unlink(missing_ok=True)


def load_list(path: Path, model: Type[T]) -> List[T]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError(f"Expected a JSON array in {path.name}")
    return [model.model_validate(item) for item in raw]


def save_list(path: Path, items: List[T]) -> None:
    write_json(path, [item.model_dump() for item in items])
