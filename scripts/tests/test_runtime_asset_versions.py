"""Runtime dependencies must change URL when their content changes."""
import importlib.util
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]


class RuntimeAssetVersionTests(unittest.TestCase):
    def test_content_changes_only_invalidate_the_changed_resource(self):
        spec = importlib.util.spec_from_file_location('asset_versions', ROOT / 'spikes/renpy-web/asset_versions.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'renpy.js').write_text('old engine')
            (root / 'game.zip').write_bytes(b'game')
            source = '<script src="renpy.js"></script><script>window.gameZipURL = \'game.zip\';</script>'
            first = module.version_runtime_html(source, root)
            self.assertIn('renpy.js?v=', first)
            self.assertIn('game.zip?v=', first)
            self.assertEqual(first, module.version_runtime_html(source, root))
            (root / 'renpy.js').write_text('new engine')
            second = module.version_runtime_html(source, root)
            self.assertNotEqual(first.split('</script>')[0], second.split('</script>')[0])
            self.assertEqual(first.split('</script>')[1], second.split('</script>')[1])
            with self.assertRaisesRegex(ValueError, 'not found'):
                module.version_runtime_html('<script src="missing.js"></script>', root)

    def test_css_quotes_external_links_and_exact_digest(self):
        import hashlib
        spec = importlib.util.spec_from_file_location('asset_versions', ROOT / 'spikes/renpy-web/asset_versions.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root / 'style.css').write_bytes(b'body{}')
            (root / 'game.zip').write_bytes(b'first')
            source = "<link href='style.css'><script src='https://example.org/lib.js'></script><script>window.gameZipURL = 'game.zip';</script>"
            result = module.version_runtime_html(source, root)
            digest = hashlib.sha256(b'body{}').hexdigest()[:16]
            self.assertIn(f"href='style.css?v={digest}'", result)
            self.assertIn("src='https://example.org/lib.js'", result)
            (root / 'game.zip').write_bytes(b'second')
            changed = module.version_runtime_html(source, root)
            self.assertEqual(result.split('<script>')[0], changed.split('<script>')[0])
            self.assertNotEqual(result.split('<script>')[1], changed.split('<script>')[1])
