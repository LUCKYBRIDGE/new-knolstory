import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('project_authorization',Path(__file__).resolve().parents[1]/'project-media-authorization.py')
MODULE=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(MODULE)
class ProjectMediaAuthorizationTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup)
  self.file='apps/web/public/assets/own.webp';self.sha='a'*64
  manifest={'version':1,'scope':'knolstory-service','declaredBy':'project-owner','assets':[{'file':self.file,'sha256':self.sha,'sourceKind':'legacy-project','assetIds':['own']} ]}
  self.path=self.root/MODULE.DECLARATION;self.path.parent.mkdir(parents=True);self.path.write_text(json.dumps(manifest))
 def record(self):return {'file':self.file,'sha256':self.sha,'mediaType':'image','license':'unknown','provider':'legacy-repository','source':'story-maker@fixed:own.webp'}
 def test_owner_service_permission_does_not_turn_into_cc0_or_standalone_permission(self):
  revised=MODULE.apply_authorization(self.record(),self.root)
  self.assertEqual(revised['license'],'project-owner-authorized-service-use');self.assertEqual(revised['redistribution'],'service-only')
  self.assertTrue(MODULE.service_authorized(revised,self.root))
  self.assertEqual(revised['source'],'story-maker@fixed:own.webp')
 def test_unlisted_file_and_external_license_are_not_relicensed(self):
  record={**self.record(),'file':'apps/web/public/assets/other.webp'};self.assertEqual(MODULE.apply_authorization(record,self.root),record)
  record={**self.record(),'license':'CC-BY-4.0'};self.assertEqual(MODULE.apply_authorization(record,self.root),record)
 def test_changed_bytes_declaration_and_forged_scope_are_rejected(self):
  with self.assertRaises(ValueError):MODULE.apply_authorization({**self.record(),'sha256':'b'*64},self.root)
  revised=MODULE.apply_authorization(self.record(),self.root)
  self.path.write_text(self.path.read_text()+' ');self.assertFalse(MODULE.service_authorized(revised,self.root))
  revised=MODULE.apply_authorization(self.record(),self.root);revised['serviceAuthorization']['scope']='all-assets';self.assertFalse(MODULE.service_authorized(revised,self.root))
 def test_runtime_copy_requires_the_same_authorized_bytes(self):
  revised=MODULE.apply_authorization(self.record(),self.root);copy={**revised,'file':'apps/web/public/runtime/game/assets/own.webp'}
  self.assertTrue(MODULE.service_authorized(copy,self.root));self.assertFalse(MODULE.service_authorized({**copy,'sha256':'b'*64},self.root))
