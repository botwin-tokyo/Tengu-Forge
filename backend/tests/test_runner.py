import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from backend.app.models import HTTPActionCreate, Script, ScriptArgument
from backend.app.services import config_service, http_actions_service, run_history_service, script_registry, script_runner


class RunnerTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        for module, name, value in [
            (script_runner, "SCRIPTS_ROOT", self.root),
            (run_history_service, "RUNS_STORE_PATH", self.root / "runs.json"),
            (http_actions_service, "HTTP_ACTIONS_STORE_PATH", self.root / "actions.json"),
            (script_registry, "SCRIPTS_STORE_PATH", self.root / "scripts.json"),
            (config_service, "CONFIG_PATH", self.root / "config.json"),
        ]:
            stub = patch.object(module, name, value)
            stub.start()
            self.addCleanup(stub.stop)
        self.file = self.root / "hello.py"
        self.file.write_text("import sys\nprint(sys.argv[1:])")
        self.script = Script(id="hello", name="Hello", filePath=self.file.name,
                             arguments=[ScriptArgument(name="name", label="Name")])

    def test_missing_corrupt_and_rotated_key(self):
        self.assertFalse(config_service.matches_key("anything"))
        config_service.CONFIG_PATH.write_text("invalid json")
        self.assertFalse(config_service.matches_key("anything"))
        first, second = "first-example-key", "second-example-key"
        config_service.CONFIG_PATH.write_text(json.dumps({"apiKey": first}))
        self.assertTrue(config_service.matches_key(first))
        config_service.set_api_key(first)
        self.assertTrue(config_service.matches_key(first))
        config_service.set_api_key(second)
        self.assertFalse(config_service.matches_key(first))
        self.assertTrue(config_service.matches_key(second))
        self.assertNotIn(second, config_service.CONFIG_PATH.read_text())

    def test_history_concurrent_append(self):
        def run(i):
            result = script_runner.run_script(self.script, {"name": str(i)})
            self.assertEqual(result.exitCode, 0)
            self.assertIn(str(i), result.stdout)
            run_history_service.append_run(result)
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(run, range(12)))
        history = run_history_service.list_runs_for_script("hello")
        self.assertEqual(len({x.id for x in history}), 12)

    def test_sensitive_run(self):
        self.script.arguments[0].secret = True
        self.script.allowedEnv = ["GREETING"]
        result = script_runner.run_script(self.script, {"name": "private-input"}, {"GREETING": "private-env"})
        run_history_service.append_run(result)
        encoded = run_history_service.RUNS_STORE_PATH.read_text()
        self.assertNotIn("private-input", encoded)
        self.assertNotIn("private-env", encoded)
        self.assertEqual(result.stdout, "[output withheld]")
        with self.assertRaises(HTTPException):
            script_runner.run_script(self.script, {}, {"UNDECLARED": "value"})

    def test_history_redacts_legacy_records_on_read(self):
        result = script_runner.run_script(self.script, {"name": "old-private-input"})
        run_history_service.append_run(result)
        self.script.arguments[0].secret = True
        script_registry.save_scripts([self.script])
        history = run_history_service.list_runs_for_script("hello")
        self.assertNotIn("old-private-input", history[0].model_dump_json())

    def test_run_limits(self):
        self.file.write_text("print('x' * 8192)")
        with patch.object(script_runner, "OUTPUT_LIMIT", 128):
            result = script_runner.run_script(self.script, {})
        self.assertNotEqual(result.exitCode, 0)
        self.assertLessEqual(len(result.stdout), 128)
        self.file.write_text("import time\ntime.sleep(5)")
        with patch.object(script_runner, "TIME_LIMIT", 0.1):
            result = script_runner.run_script(self.script, {})
        self.assertIn("timed out", result.stderr)

    def test_action_lifecycle_and_corrupt_store(self):
        definition = HTTPActionCreate(name="Example", method="GET", url="https://example.com")
        first = http_actions_service.create_http_action(definition)
        updated = http_actions_service.change_http_action(first.id, definition.model_copy(update={"name": "Changed"}))
        self.assertEqual(updated.createdAt, first.createdAt)
        self.assertEqual(http_actions_service.list_http_actions()[0].name, "Changed")
        http_actions_service.change_http_action(first.id, None)
        self.assertEqual(http_actions_service.list_http_actions(), [])
        http_actions_service.HTTP_ACTIONS_STORE_PATH.write_text("bad")
        with self.assertRaises(json.JSONDecodeError):
            http_actions_service.create_http_action(definition)
        self.assertEqual(http_actions_service.HTTP_ACTIONS_STORE_PATH.read_text(), "bad")
