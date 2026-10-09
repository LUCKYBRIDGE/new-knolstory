import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('environment', Path(__file__).parents[1] / 'test-environment.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class EnvironmentTests(unittest.TestCase):
    def test_node_requirement_rejects_old_patch(self):
        self.assertFalse(MODULE.supported_node('v22.12.0'))
        self.assertTrue(MODULE.supported_node('v22.13.0'))
        self.assertTrue(MODULE.supported_node('v24.0.0'))
        self.assertFalse(MODULE.supported_node('broken'))

    def test_media_check_reports_missing_and_changed_without_writing(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'ok').write_bytes(b'abc')
            records = [{'file': 'ok', 'sha256': MODULE.hashlib.sha256(b'abc').hexdigest()},
                       {'file': 'missing', 'sha256': '0' * 64}]
            self.assertEqual(MODULE.media_errors(root, records), ['missing'])
            (root / 'ok').write_bytes(b'changed')
            self.assertEqual(MODULE.media_errors(root, records), ['ok', 'missing'])
            self.assertEqual((root / 'ok').read_bytes(), b'changed')

    def test_runtime_requires_actual_wasm_and_bridge(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.assertIn('renpy.wasm', MODULE.runtime_errors(root))
            for name in MODULE.RUNTIME_FILES:
                (root / name).write_bytes(b'present')
            self.assertEqual(MODULE.runtime_errors(root), [])
            (root / 'renpy.wasm').write_bytes(b'')
            self.assertEqual(MODULE.runtime_errors(root), ['renpy.wasm'])

    def test_static_preview_rejects_old_runtime(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'source'
            output = root / 'output'
            source.mkdir()
            output.mkdir()
            for name in MODULE.RUNTIME_FILES:
                (source / name).write_bytes(b'new')
                (output / name).write_bytes(b'new')
            self.assertEqual(MODULE.static_runtime_errors(source, output), [])
            (output / 'game.zip').write_bytes(b'old')
            self.assertEqual(MODULE.static_runtime_errors(source, output), ['game.zip'])

    def test_prepare_plan_uses_fixed_install_and_root_relative_tools(self):
        commands = MODULE.prepare_commands(Path('authorized legacy'))
        self.assertEqual(commands[0][-1], 'authorized legacy')
        self.assertIn(['pnpm', 'install', '--frozen-lockfile'], commands)
        self.assertIn(['pnpm', 'exec', 'playwright', 'install', 'chromium'], commands)
        self.assertEqual(commands[-1], ['pnpm', 'build'])


if __name__ == '__main__':
    unittest.main()
