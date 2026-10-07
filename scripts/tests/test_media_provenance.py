import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('provenance',Path(__file__).resolve().parents[1]/'media-provenance.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class ReleaseEvidenceTests(unittest.TestCase):
 def test_required_credit_without_distributed_evidence_is_blocked(self):
  record={'license':'CC-BY-4.0','redistribution':'permitted','commercialUse':'permitted','attribution':'Name and license'}
  self.assertFalse(module.release_allowed(record,'free'))
 def test_original_dedication_does_not_require_credit(self):
  record={'license':'CC0-1.0','redistribution':'permitted','commercialUse':'permitted','attribution':'not-required'}
  self.assertTrue(module.release_allowed(record,'free'))
  self.assertTrue(module.release_allowed(record,'commercial'))
 def test_unknown_credit_is_blocked(self):
  record={'license':'CC-BY-4.0','redistribution':'permitted','commercialUse':'permitted','attribution':'unverified'}
  self.assertFalse(module.release_allowed(record,'free'))
if __name__=='__main__':unittest.main()
