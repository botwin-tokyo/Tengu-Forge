import asyncio
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from backend.app.models import HTTPAction, Script
from backend.app.scrub_history import scrub
from backend.app.services import http_sender, script_runner


class BoundaryTests(unittest.TestCase):
    def test_sandboxed_python(self):
        with tempfile.TemporaryDirectory() as temp:
            outside = Path(temp).resolve()
            scripts = outside / "scripts"
            scripts.mkdir()
            marker = outside / "private.txt"
            marker.write_text("fixture")
            program = scripts / "permissions.py"
            program.write_text(f"""
from pathlib import Path
import socket
operations = [
    lambda: Path({str(marker)!r}).read_text(),
    lambda: Path(__file__).write_text("changed"),
    lambda: socket.create_connection(("127.0.0.1", {self.listener_port()}), timeout=1),
]
for operation in operations:
    try:
        operation()
    except OSError:
        continue
    raise RuntimeError("unexpected access")
print("restricted")
""")
            with patch.object(script_runner, "SCRIPTS_ROOT", scripts):
                result = script_runner.run_script(Script(id="test", name="Test", filePath=program.name), {})
            self.assertEqual(result.exitCode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "restricted")

    def listener_port(self):
        import socket
        listener = socket.socket()
        self.addCleanup(listener.close)
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        return listener.getsockname()[1]

    def test_http_approval_and_transport(self):
        received = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                received.append((self.path, self.headers.get("Host"), self.headers.get("X-API-Key")))
                self.send_response(302 if self.path.startswith("/move") else 200)
                if self.path.startswith("/move"):
                    self.send_header("Location", "/unexpected")
                self.end_headers()
                self.wfile.write(b"x" * 68000)
            def log_message(self, fmt, *args):
                pass
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        origin = f"http://approved.invalid:{server.server_port}"
        action = HTTPAction(id="sample", createdAt="", name="Sample", method="GET", url=origin+"/read",
                            queryParams=[{"key": "q", "value": "hello world"}])
        with tempfile.TemporaryDirectory() as d, patch.object(http_sender, "TARGETS_PATH", Path(d)/"targets.json"):
            with self.assertRaises(HTTPException) as denied:
                asyncio.run(http_sender.send(action))
            self.assertEqual(denied.exception.status_code, 403)
            self.assertEqual(received, [])
            http_sender.TARGETS_PATH.write_text(json.dumps({origin: "127.0.0.1"}))
            result = asyncio.run(http_sender.send(action))
            self.assertEqual(result["status"], 200)
            self.assertTrue(result["truncated"])
            self.assertEqual(len(result["preview"]), 65536)
            self.assertEqual(received, [("/read?q=hello+world", f"approved.invalid:{server.server_port}", None)])
            action.url = origin + "/move"
            self.assertEqual(asyncio.run(http_sender.send(action))["status"], 302)
            self.assertEqual(len(received), 2)

    def test_history_preview_and_apply(self):
        with tempfile.TemporaryDirectory() as d:
            file = Path(d)/"runs.json"
            original = json.dumps([dict(id="r", scriptId="s", startTime="now", duration=0, exitCode=0,
                                        status="success", arguments={"key":"private"}, envOverrides={"x":"private"},
                                        stdout="private", stderr="private")])
            file.write_text(original)
            self.assertEqual(scrub(file, False), 1)
            self.assertEqual(file.read_text(), original)
            self.assertEqual(scrub(file, True), 1)
            self.assertNotIn("private", file.read_text())
            self.assertEqual(json.loads(file.read_text())[0]["id"], "r")
            self.assertEqual(scrub(file, True), 0)
