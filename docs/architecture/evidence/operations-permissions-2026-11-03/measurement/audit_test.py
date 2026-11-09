import unittest
import tempfile
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('permission_audit',Path(__file__).with_name('audit.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
class Boundaries(unittest.TestCase):
 def test_environment_summary_never_returns_secret_values_or_paths(self):
  value=audit.environment_summary(['PGUSER=knolstory_next_app','PGDATABASE=knolstory_next_production','PGPASSWORD=do-not-publish','PGPASSWORD_FILE=/private/do-not-publish','KNOLSTORY_CSRF_SECRET_FILE=/private/also-private'])
  self.assertEqual(value['applicationRoleExpected'],True)
  self.assertEqual(value['rawSecretEnvironmentPresent'],True)
  self.assertNotIn('do-not-publish',str(value));self.assertNotIn('/private',str(value))
 def test_mode_summary_contains_only_metadata_and_checks_exact_private_modes(self):
  root=Path('/tmp/does-not-exist-in-this-test')
  value=audit.checked_metadata({'isDirectory':True,'isFile':False,'isSymlink':False,'uid':501,'gid':20,'mode':0o700,'path':'/private/not-public'},True,501)
  self.assertTrue(value['privateModeExpected']);self.assertNotIn(str(root),str(value));self.assertNotIn('/private',str(value))
  self.assertFalse(audit.checked_metadata({'isDirectory':True,'isFile':False,'isSymlink':True,'uid':501,'gid':20,'mode':0o700},True,501)['privateModeExpected'])
 def test_output_identifies_boundary_failures_without_repairing_them(self):
  value=audit.environment_summary(['PGUSER=unexpected','PGDATABASE=other','DATABASE_URL=secret'])
  self.assertFalse(value['applicationRoleExpected']);self.assertFalse(value['databaseExpected']);self.assertTrue(value['rawSecretEnvironmentPresent']);self.assertNotIn('secret',str(value))
 def test_missing_required_secret_file_cannot_look_like_a_complete_private_mount(self):
  with tempfile.TemporaryDirectory() as directory:
   container={'Mounts':[{'Destination':'/run/fixture','Source':directory,'RW':False}]}
   value=audit.secret_mount(container,'/run/fixture',{'database':'db-password'},('database',))
   self.assertFalse(value['requiredRolesPresent']);self.assertNotIn(directory,str(value))
if __name__=='__main__':unittest.main()
