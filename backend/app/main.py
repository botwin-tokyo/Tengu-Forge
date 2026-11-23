from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import HTTP_ACTIONS_STORE_PATH, RUNS_STORE_PATH, SCRIPTS_ROOT, SCRIPTS_STORE_PATH
from .models import Script, ScriptArgument
from .routes.health import router as health_router
from .routes.http_actions import router as http_actions_router
from .routes.scripts import router as scripts_router
from .storage.json_store import save_list, store_lock


@asynccontextmanager
async def lifespan(app: FastAPI):
    SCRIPTS_ROOT.mkdir(parents=True, exist_ok=True)
    hello = Script(id="hello-world", name="Hello World", category="Examples",
                   description="Greet a name using the bundled Python example.",
                   filePath="hello_world.py", arguments=[ScriptArgument(name="name", label="Name", default="world")])
    for path, initial in [(SCRIPTS_STORE_PATH, [hello]), (RUNS_STORE_PATH, []), (HTTP_ACTIONS_STORE_PATH, [])]:
        with store_lock(path):
            if not path.exists():
                save_list(path, initial)
    yield


app = FastAPI(title="Tengu Forge API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://{host}:{port}" for host in ("127.0.0.1", "localhost") for port in (8080, 4173)],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-API-Key"],
)
app.include_router(health_router)
app.include_router(scripts_router)
app.include_router(http_actions_router)
