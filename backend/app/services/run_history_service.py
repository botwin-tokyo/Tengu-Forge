from typing import List

from .script_registry import get_script
from ..config import RUNS_STORE_PATH
from ..models import RunResult
from ..storage.json_store import load_list, save_list, store_lock


def list_all_runs() -> List[RunResult]:
    return load_list(RUNS_STORE_PATH, RunResult)


def list_runs_for_script(script_id: str) -> List[RunResult]:
    runs = list_all_runs()
    # Filter by script and sort newest-first by startTime
    script_runs = [r for r in runs if r.scriptId == script_id]
    # Older releases persisted raw inputs and output. Apply the current registry
    # policy to API reads as well, without rewriting the operator's archive.
    script = get_script(script_id)
    for run in script_runs:
        secret_names = {p.name for p in script.arguments if p.secret} if script else set(run.arguments)
        if run.envOverrides or secret_names.intersection(run.arguments):
            run.arguments = {k: "[redacted]" if k in secret_names else v for k, v in run.arguments.items()}
            run.envOverrides = dict.fromkeys(run.envOverrides, "[redacted]")
            run.stdout = run.stderr = "[output withheld]"
    script_runs.sort(key=lambda r: r.startTime, reverse=True)
    return script_runs


def append_run(result: RunResult) -> None:
    with store_lock(RUNS_STORE_PATH):
        runs = list_all_runs()
        runs.append(result)
        save_list(RUNS_STORE_PATH, runs)
