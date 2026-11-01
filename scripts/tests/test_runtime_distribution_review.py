import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('runtime_review',Path(__file__).resolve().parents[1]/'runtime-distribution-review.py')
MODULE=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(MODULE)
class RuntimeReviewTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  self.public=self.root/'apps/web/public';self.public.mkdir(parents=True)
  notice=self.public/'licenses/RenPy-8.5.3-LICENSE.txt';notice.parent.mkdir();notice.write_bytes(b'Full license')
  self.zipped=self.public/'runtime/game.zip';self.zipped.parent.mkdir()
  with zipfile.ZipFile(self.zipped,'w') as z:z.writestr('renpy/LICENSE.txt',b'Full license');z.writestr('game/main.rpyc',b'code')
  sha=lambda b:hashlib.sha256(b).hexdigest()
  self.manifest={'version':1,'scope':'knolstory-service-runtime','sdkVersion':'8.5.3','files':[{'path':'runtime/game.zip','sha256':sha(self.zipped.read_bytes()),'bytes':self.zipped.stat().st_size}],'notices':[{'file':'apps/web/public/licenses/RenPy-8.5.3-LICENSE.txt','sha256':sha(notice.read_bytes())}],'archiveMembers':[{'name':'renpy/LICENSE.txt','sha256':sha(b'Full license'),'category':'sdk'},{'name':'game/main.rpyc','sha256':sha(b'code'),'category':'project'}]}
  self.path=self.root/MODULE.REVIEW;self.path.parent.mkdir(parents=True);self.write()
 def write(self):self.path.write_text(json.dumps(self.manifest))
 def test_exact_reviewed_package_has_all_members_and_preserved_license(self):
  review=MODULE.reviewed_runtime_files(self.root);self.assertIn('runtime/game.zip',review['files'])
 def test_changed_bundle_or_notice_does_not_reuse_previous_review(self):
  self.zipped.write_bytes(b'changed')
  with self.assertRaises(ValueError):MODULE.reviewed_runtime_files(self.root)
 def test_member_omission_and_unsafe_path_are_rejected(self):
  self.manifest['archiveMembers'].pop();self.write()
  with self.assertRaises(ValueError):MODULE.reviewed_runtime_files(self.root)
  self.manifest['files'][0]['path']='../private.zip';self.write()
  with self.assertRaises(ValueError):MODULE.reviewed_runtime_files(self.root)
 def test_deployed_notice_is_required_and_exact(self):
  review=MODULE.reviewed_runtime_files(self.root)
  row=self.manifest['files'][0]
  self.assertTrue(MODULE.matches_deployed_review(review,row['path'],row['sha256'],self.public))
  (self.public/'licenses/RenPy-8.5.3-LICENSE.txt').write_bytes(b'changed')
  self.assertFalse(MODULE.matches_deployed_review(review,row['path'],row['sha256'],self.public))
 def test_empty_deployed_notice_list_cannot_approve_an_opaque_bundle(self):
  review=MODULE.reviewed_runtime_files(self.root);row=self.manifest['files'][0]
  for notices in [[],None,[{}]]:
   self.assertFalse(MODULE.matches_deployed_review({**review,'notices':notices},row['path'],row['sha256'],self.public))
 def test_missing_review_returns_no_approval(self):
  self.path.unlink();self.assertIsNone(MODULE.reviewed_runtime_files(self.root))
