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
class DerivedImageEvidenceTests(unittest.TestCase):
 def asset(self):
  return {'id':'same-child','src':'/assets/characters/stature-v2/child.webp','sourcePath':'public/story-assets/child.webp','copyright':'project owner','revision':'b'*64,'metadata':{'statureTransform':{'method':'uniform-resize-transparent-headroom','source':'assets/legacy-18da4fc/child.webp','sourceSha256':'a'*64,'output':'assets/characters/stature-v2/child.webp','outputSha256':'b'*64,'scale':.72,'offset':[112,322]}}}
 def test_derived_art_names_local_transform_without_licensing_the_original(self):
  fields=module.asset_provenance(self.asset())
  self.assertEqual(fields['provider'],'local-derived-image')
  self.assertEqual(fields['source'],'scripts/prepare-character-stature-assets.py')
  self.assertEqual(fields['originalSource'],'apps/web/public/assets/legacy-18da4fc/child.webp')
  self.assertEqual(fields['originalSha256'],'a'*64)
  self.assertEqual(fields['transformation'],{'method':'uniform-resize-transparent-headroom','scale':.72,'offset':[112,322]})
  record={'license':'unknown','redistribution':'unverified','commercialUse':'unverified','attribution':'unverified',**fields}
  self.assertFalse(module.release_allowed(record,'free'))
  self.assertFalse(module.release_allowed(record,'commercial'))
  self.assertNotIn('license',fields)
 def test_exact_legacy_source_keeps_its_original_provider(self):
  asset=self.asset();asset['metadata']={}
  fields=module.asset_provenance(asset)
  self.assertEqual(fields['provider'],'legacy-repository')
  self.assertEqual(fields['source'],'story-maker@18da4fc:public/story-assets/child.webp')
  self.assertNotIn('originalSource',fields)
 def test_transformation_must_match_the_recorded_output(self):
  asset=self.asset();asset['metadata']['statureTransform']['outputSha256']='c'*64
  with self.assertRaisesRegex(ValueError,'transformation'):
   module.asset_provenance(asset)
 def test_parent_escape_and_nonuniform_transform_are_not_accepted_as_known_derivation(self):
  for patch in [{'source':'../private.webp'},{'method':'stretch-body'},{'scale':float('nan')},{'offset':[-1,20]}]:
   asset=self.asset();asset['metadata']['statureTransform'].update(patch)
   with self.assertRaisesRegex(ValueError,'transformation'):
    module.asset_provenance(asset)
if __name__=='__main__':unittest.main()
