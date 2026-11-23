"""Preview or explicitly remove payloads from one or more run-history files."""
import argparse
import json
from pathlib import Path

from .config import RUNS_STORE_PATH
from .models import RunResult
from .storage.json_store import store_lock, write_json


def scrub(path: Path, apply: bool) -> int:
    if not path.is_file() or path.is_symlink():
        raise ValueError("Expected a regular history JSON file")
    def process():
        records = json.loads(path.read_text())
        if not isinstance(records, list):
            raise ValueError("Expected a history array")
        changed = 0
        clean = []
        for item in records:
            run = RunResult.model_validate(item)
            # Historical schemas did not reliably classify secrets. Keep run
            # metadata only; dropping unknown fields also avoids carrying leaks.
            safe = run.model_copy(update={"arguments": {}, "envOverrides": {}, "stdout": "", "stderr": ""}).model_dump()
            changed += safe != item
            clean.append(safe)
        if apply and changed:
            write_json(path, clean)
        return changed
    if apply:
        with store_lock(path):
            return process()
    return process()


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--apply", action="store_true", help="Irreversibly strip arguments, environment and output")
    cli.add_argument("files", type=Path, nargs="*", default=[RUNS_STORE_PATH])
    args = cli.parse_args()
    for file in args.files:
        try:
            print(f"{file}: {scrub(file, args.apply)} record(s) {'scrubbed' if args.apply else 'would change'}")
        except (OSError, ValueError):
            cli.exit(1, f"{file}: unreadable or invalid history; no change to this file\n")
