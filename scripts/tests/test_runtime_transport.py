"""Runtime transport copies must decode to the exact runtime bytes, and the boot shell must expose sizes."""
import base64
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('runtime_transport', ROOT / 'spikes/renpy-web/transport.py')
transport = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(transport)
DECODE = "const fs=require('fs'),zlib=require('zlib');process.stdout.write(zlib.brotliDecompressSync(fs.readFileSync(process.argv[1])).toString('base64'))"


class RuntimeTransportTests(unittest.TestCase):
    def runtime(self, root):
        (root / 'renpy.data').write_bytes(b'engine data ' * 4000)
        (root / 'renpy.wasm').write_bytes(bytes(range(256)) * 300)
        (root / 'game.zip').write_bytes(b'PK' + b'\x00' * 5000)

    def test_copies_decode_to_the_same_bytes_and_replace_older_copies(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.runtime(root)
            (root / 'renpy.data.br').write_bytes(b'stale')
            sizes = transport.write_brotli_copies(root)
            for name in transport.BROTLI_FILES:
                decoded = subprocess.run(['node', '-e', DECODE, str(root / f'{name}.br')], check=True, capture_output=True, text=True).stdout
                self.assertEqual(base64.b64decode(decoded), (root / name).read_bytes())
                self.assertEqual(sizes[name], (root / f'{name}.br').stat().st_size)
                self.assertLess(sizes[name], (root / name).stat().st_size)
            self.assertEqual(sorted(path.name for path in root.iterdir()), ['game.zip', 'renpy.data', 'renpy.data.br', 'renpy.wasm', 'renpy.wasm.br'])

    def test_missing_runtime_file_fails_before_writing(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                transport.write_brotli_copies(Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_transfer_info_counts_decoded_bytes_and_weighs_transfer(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.runtime(root)
            plain = transport.transfer_info(root)
            self.assertEqual(plain['data'], {'bytes': 48000, 'weight': 48000})
            transport.write_brotli_copies(root)
            info = transport.transfer_info(root)
            self.assertEqual(info['version'], 1)
            self.assertEqual(info['data']['bytes'], 48000)
            self.assertEqual(info['data']['weight'], (root / 'renpy.data.br').stat().st_size)
            self.assertEqual(info['game'], {'bytes': 5002, 'weight': 5002})

    def test_sizes_are_exposed_once_before_the_bridge(self):
        html = '<script src="runtime-contract.js"></script>\n  <script src="knol-bridge.js"></script>\n  <script src="renpy-pre.js"></script>'
        result = transport.embed_transfer_info(html, {'version': 1, 'game': {'bytes': 1, 'weight': 1}})
        self.assertLess(result.index('window.knolRuntimeTransfer='), result.index('knol-bridge.js'))
        payload = result.split('window.knolRuntimeTransfer=')[1].split(';</script>')[0]
        self.assertEqual(json.loads(payload)['game'], {'bytes': 1, 'weight': 1})
        for drifted in ['<script src="renpy-pre.js"></script>', html + html]:
            with self.assertRaises(ValueError):
                transport.embed_transfer_info(drifted, {'version': 1})


if __name__ == '__main__':
    unittest.main()
