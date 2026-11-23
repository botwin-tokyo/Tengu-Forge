"""OS-enforced, read-only script execution. No unsandboxed fallback."""
import json
import os
import sys
import sysconfig
from pathlib import Path

from fastapi import HTTPException

# Apply registry-approved values only after the trusted interpreter and OS
# sandbox are running. Do not feed loader variables to the sandbox launcher.
BOOT = """
import json, os, runpy, sys
env, script, *args = sys.argv[1:]
os.environ.update(json.loads(env))
sys.argv = [script, *args]
sys.path.insert(0, os.path.dirname(script))
runpy.run_path(script, run_name='__main__')
"""

MAC_POLICY = """
(version 1)
(deny default)
(allow process-exec (literal (param "PYTHON")))
(allow file-read-metadata)
(allow file-read* (literal "/") (literal (param "PYTHON"))
                  (subpath (param "STDLIB"))
                  (literal (param "LIBPYTHON"))
                  (subpath (param "SCRIPTS"))
                  (subpath "/System/Library") (subpath "/usr/lib")
                  (literal "/dev/null") (literal "/dev/urandom") (literal "/dev/random"))
(allow file-map-executable (literal (param "PYTHON")) (literal (param "LIBPYTHON")) (subpath (param "STDLIB")) (subpath "/System/Library") (subpath "/usr/lib"))
(allow sysctl-read)
"""


def isolated_command(root: Path, path: Path, cwd: Path, interpreter, flags, overrides):
    python = Path(sys.executable).resolve()
    if interpreter and Path(interpreter).resolve() != python:
        raise HTTPException(422, "Use the sandbox's Python interpreter")
    options = ["-I", "-S", "-B", "-c", BOOT, json.dumps(overrides)]
    if sys.platform == "darwin" and os.access("/usr/bin/sandbox-exec", os.X_OK):
        lib = Path(sysconfig.get_config_var("LIBDIR") or sys.base_prefix)
        dylib = lib / (sysconfig.get_config_var("LDLIBRARY") or "libpython.dylib")
        return ["/usr/bin/sandbox-exec", "-D", f"PYTHON={python}",
                "-D", f"LIBPYTHON={dylib.resolve()}", "-D", f"STDLIB={Path(sysconfig.get_path('stdlib')).resolve()}",
                "-D", f"SCRIPTS={root}", "-p", MAC_POLICY, str(python), *options, str(path), *flags]
    if sys.platform.startswith("linux") and os.access("/usr/bin/bwrap", os.X_OK):
        cmd = ["/usr/bin/bwrap", "--die-with-parent", "--unshare-all", "--cap-drop", "ALL",
               "--new-session", "--ro-bind", "/usr/bin/python3", "/usr/bin/python3"]
        for name in ("/usr/lib", "/usr/lib64", "/lib", "/lib64"):
            if os.path.exists(name):
                cmd.extend(["--ro-bind", name, name])
        # Mount only system runtime files and the registered scripts tree.
        return [*cmd, "--ro-bind", str(root), "/scripts", "--dev", "/dev", "--remount-ro", "/",
                "--chdir", str(Path("/scripts") / cwd.relative_to(root)), "--",
                "/usr/bin/python3", *options, str(Path("/scripts") / path.relative_to(root)), *flags]
    raise HTTPException(503, "Script isolation unavailable. Install bubblewrap on Linux or use a supported macOS host.")
