"""Recover the complete four-story addition from tracked files only."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('expressions', Path(__file__).parents[1] / 'prepare-expression-assets.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ExpressionAssetsTests(unittest.TestCase):
    receipt_path = MODULE.RECEIPT
    expected_count = 16

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.receipt = json.loads((MODULE.ROOT / self.receipt_path).read_text())
        files = [self.receipt_path, 'packages/asset-registry/src/catalog.json']
        files += [row[key] for row in self.receipt['assets'] for key in ['sourceFile', 'output']]
        for name in files:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(MODULE.ROOT / name, path)

    def test_recovers_all_declared_missing_derivatives_from_checkout_only(self):
        for row in self.receipt['assets']:
            (self.root / row['output']).unlink()
        self.assertEqual(MODULE.verify(self.root, restore=True, receipt=self.receipt_path)['verifiedExpressions'], self.expected_count)

    def test_changed_output_is_not_overwritten_and_changed_source_is_rejected(self):
        first = self.receipt['assets'][0]
        output = self.root / first['output']
        output.write_bytes(b'local image work')
        with self.assertRaisesRegex(ValueError, 'Missing/changed'):
            MODULE.verify(self.root, restore=True, receipt=self.receipt_path)
        self.assertEqual(output.read_bytes(), b'local image work')
        (self.root / first['sourceFile']).write_bytes(b'changed source')
        with self.assertRaisesRegex(ValueError, 'Generated original changed'):
            MODULE.verify(self.root, restore=True, receipt=self.receipt_path)

class SupportingExpressionAssetsTests(ExpressionAssetsTests):
    receipt_path = MODULE.SUPPORTING_RECEIPT
    expected_count = 32

    def test_unreviewed_receipt_path_cannot_read_an_arbitrary_file(self):
        with self.assertRaisesRegex(ValueError, 'Unreviewed expression receipt'):
            MODULE.verify(self.root, receipt='../private.json')


class AllCharacterEmotionAssetsTests(ExpressionAssetsTests):
    receipt_path = MODULE.EMOTION_RECEIPT
    expected_count = 165


if __name__ == '__main__':
    unittest.main()
