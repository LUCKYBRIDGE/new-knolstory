"""Guard the pinned SDL DPR import without changing browser DPR or story layout."""
import importlib.util
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("pixel_budget", ROOT / "spikes/renpy-web/pixel_budget.py")


class RuntimePixelBudgetTests(unittest.TestCase):
    def load(self):
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        return module

    def test_caps_only_pinned_import_and_preserves_fractional_density(self):
        module = self.load()
        anchor = 'var _emscripten_get_device_pixel_ratio=()=>typeof devicePixelRatio=="number"&&devicePixelRatio||1;'
        patched = module.cap_runtime_pixel_ratio('before;' + anchor + 'after;')
        self.assertTrue(patched.startswith('before;'))
        self.assertTrue(patched.endswith('after;'))
        expression = patched[len('before;'):-len('after;')]
        script = 'const out=[];for(const devicePixelRatio of [undefined,0,-1,1,1.25,2,3,4,Infinity,NaN]){' + expression + 'out.push(_emscripten_get_device_pixel_ratio());}console.log(JSON.stringify(out));'
        result = subprocess.run(['node', '-e', script], text=True, capture_output=True, check=True)
        self.assertEqual(result.stdout.strip(), '[1,1,1,1,1.25,2,2,2,2,1]')
        self.assertNotIn('defineProperty', patched)

    def test_unknown_or_duplicate_sdk_anchor_fails_before_mutation(self):
        module = self.load()
        for source in ['different SDK', module.DPR_IMPORT * 2]:
            with self.subTest(source=source):
                with self.assertRaisesRegex(ValueError, 'exactly one'):
                    module.cap_runtime_pixel_ratio(source)
