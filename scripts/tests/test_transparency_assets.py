"""Cross-machine recovery and alpha regressions for the reviewed repair corpus."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('repairs', Path(__file__).parents[1] / 'prepare-transparency-assets.py')
REPAIRS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REPAIRS)


class TransparencyRepairTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        receipt = json.loads((REPAIRS.ROOT / REPAIRS.RECEIPT).read_text())
        self.rows = receipt['assets']
        # Only tracked source, receipt, catalogue and derivatives; no machine cache/legacy checkout.
        files = [REPAIRS.RECEIPT, 'packages/asset-registry/src/catalog.json']
        files += [row[key] for row in self.rows for key in ['sourceFile', 'output']]
        for name in files:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPAIRS.ROOT / name, target)

    def test_checkout_only_repairs_resolve_stable_ids_and_have_transparent_gaps_and_opaque_clothes(self):
        self.assertEqual(REPAIRS.prepare(self.root)['verifiedRepairs'], 2)

    def test_missing_derivatives_restore_exactly_from_tracked_generated_originals(self):
        for row in self.rows:
            (self.root / row['output']).unlink()
        with self.assertRaisesRegex(ValueError, 'Missing or changed'):
            REPAIRS.prepare(self.root)
        self.assertEqual(REPAIRS.prepare(self.root, restore=True)['verifiedRepairs'], 2)

    def test_changed_existing_derivative_is_preserved_and_rejected(self):
        path = self.root / self.rows[0]['output']
        path.write_bytes(b'local image work')
        with self.assertRaisesRegex(ValueError, 'Missing or changed'):
            REPAIRS.prepare(self.root, restore=True)
        self.assertEqual(path.read_bytes(), b'local image work')

    def test_changed_source_cannot_silently_redefine_the_reviewed_image(self):
        (self.root / self.rows[0]['sourceFile']).write_bytes(b'changed generated source')
        with self.assertRaisesRegex(ValueError, 'Generated source changed'):
            REPAIRS.prepare(self.root, restore=True)


if __name__ == '__main__':
    unittest.main()
