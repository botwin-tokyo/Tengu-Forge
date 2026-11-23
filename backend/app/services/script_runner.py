import os
import selectors
import signal
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import BoundedSemaphore

from fastapi import HTTPException

from .process_isolation import isolated_command
from ..config import SCRIPTS_ROOT
from ..models import RunResult, RunStatus, Script

TIME_LIMIT = 30
OUTPUT_LIMIT = 128 * 1024
slots = BoundedSemaphore(4)


def capture(cmd, cwd, env):
    """Bound the combined output and lifetime, including inherited child pipes."""
    deadline = time.monotonic() + TIME_LIMIT
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    remaining = OUTPUT_LIMIT
    with subprocess.Popen(cmd, cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, start_new_session=True) as process:
        reason = ""
        try:
            with selectors.DefaultSelector() as reader:
                reader.register(process.stdout, selectors.EVENT_READ, "stdout")
                reader.register(process.stderr, selectors.EVENT_READ, "stderr")
                while reader.get_map() and not reason:
                    wait = deadline - time.monotonic()
                    if wait <= 0:
                        raise subprocess.TimeoutExpired(cmd, TIME_LIMIT)
                    for key, _ in reader.select(wait):
                        chunk = os.read(key.fd, 8192)
                        if not chunk:
                            reader.unregister(key.fd)
                            continue
                        buffers[key.data].extend(chunk[:remaining])
                        if len(chunk) > remaining:
                            reason = "Output limit exceeded."
                            break
                        remaining -= len(chunk)
            if not reason:
                process.wait(timeout=max(0, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            reason = "Run timed out."
        finally:
            # A script may exit while a spawned child is still running.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
    stdout, stderr = (buffers[k].decode(errors="replace") for k in ("stdout", "stderr"))
    return (1 if reason else process.returncode), stdout, (stderr + "\n" + reason if reason else stderr)


def run_script(script: Script, args: dict, env_overrides: dict | None = None) -> RunResult:
    if script.type != "python" or not script.filePath:
        raise HTTPException(422, "Registry entry must identify a Python script")
    root = SCRIPTS_ROOT.resolve()
    path = (root / script.filePath).resolve()
    cwd = (root / (script.workingDirectory or ".")).resolve()
    if not path.is_relative_to(root) or not cwd.is_relative_to(root) or not path.is_file() or not cwd.is_dir():
        raise HTTPException(422, "Invalid script file or working directory in registry")

    params = {param.name: param for param in script.arguments}
    if args.keys() - params.keys():
        raise HTTPException(422, "Unknown script argument")
    values = {}
    for name, param in params.items():
        value = args.get(name, param.default)
        if value is None or value == "":
            if param.required:
                raise HTTPException(422, "Missing required argument")
            continue
        if not isinstance(value, (str, int, float, bool)) or "\x00" in str(value):
            raise HTTPException(422, "Invalid argument value")
        if param.options and str(value) not in param.options:
            raise HTTPException(422, "Invalid argument option")
        values[name] = value
    overrides = env_overrides or {}
    if overrides.keys() - set(script.allowedEnv) or any(not k.isidentifier() or "\x00" in v for k, v in overrides.items()):
        raise HTTPException(422, "Invalid or undeclared environment override")

    flags = []
    for name, value in values.items():
        text = str(value).lower() if isinstance(value, bool) else str(value)
        flags.extend([f"--{name}", text])
    cmd = isolated_command(root, path, cwd, script.interpreter, flags, overrides)
    env = {"PATH": os.defpath, "LANG": "C"}
    start = datetime.now(timezone.utc)
    clock = time.monotonic()
    if not slots.acquire(blocking=False):
        raise HTTPException(429, "Runner is busy")
    try:
        code, stdout, stderr = capture(cmd, cwd, env)
    except OSError:
        raise HTTPException(422, "Could not start the registered interpreter")
    finally:
        slots.release()

    sensitive = bool(overrides) or any(params[name].secret for name in values)
    return RunResult(id=str(uuid.uuid4()), scriptId=script.id,
                     status=RunStatus.SUCCESS if code == 0 else RunStatus.ERROR,
                     stdout="[output withheld]" if sensitive else stdout,
                     stderr="[output withheld]" if sensitive else stderr,
                     startTime=start.isoformat(), duration=int(time.monotonic() - clock), exitCode=code,
                     arguments={k: "[redacted]" if params[k].secret else v for k, v in values.items()},
                     envOverrides={k: "[redacted]" for k in overrides})
