import base64,hashlib,importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('service_audio',Path(__file__).resolve().parents[2]/'renpy/responsive-spike/game/service_audio.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class CacheTests(unittest.TestCase):
 def row(self,path='assets/audio/cc0/test/v1/file.ogg',data=b'OggS'):
  return {'path':path,'sha256':hashlib.sha256(data).hexdigest(),'mime':'audio/ogg','data':base64.b64encode(data).decode()}
 def test_verified_reference_and_protected_eviction(self):
  with tempfile.TemporaryDirectory() as root:
   cache=module.ServiceAudioCache(root,8);a=self.row();b=self.row('assets/audio/cc0/test/v1/b.ogg');c=self.row('assets/audio/cc0/test/v1/c.ogg')
   cache.install([a],[a['path']]);cache.install([b],[b['path']]);cache.install([c],[c['path']],[a['path']]);self.assertTrue((Path(root)/a['path']).exists());self.assertFalse((Path(root)/b['path']).exists());self.assertTrue((Path(root)/c['path']).exists())
 def test_rejects_unreferenced_traversal_hash_and_format(self):
  with tempfile.TemporaryDirectory() as root:
   cache=module.ServiceAudioCache(root)
   for row,refs in [(self.row(),[]),(self.row('../escape.ogg'),['../escape.ogg']),({**self.row(),'sha256':'a'*64},[self.row()['path']]),(self.row(data=b'notogg'),[self.row()['path']])]:
    with self.assertRaises(ValueError):cache.install([row],refs)
   self.assertEqual(list(Path(root).rglob('*.ogg')),[])
 def test_symlink_and_version_conflict_leave_other_files_unchanged(self):
  with tempfile.TemporaryDirectory() as root,tempfile.TemporaryDirectory() as outside:
   cache=module.ServiceAudioCache(root);a=self.row();b=self.row('assets/audio/cc0/test/v1/b.ogg')
   folder=Path(root)/'assets/audio/cc0/test';folder.parent.mkdir(parents=True);folder.symlink_to(outside,target_is_directory=True)
   with self.assertRaises(ValueError):cache.install([a],[a['path']])
   folder.unlink();target=Path(root)/b['path'];target.parent.mkdir(parents=True);target.write_bytes(b'changed')
   with self.assertRaises(ValueError):cache.install([a,b],[a['path'],b['path']])
   self.assertFalse((Path(root)/a['path']).exists());self.assertEqual(target.read_bytes(),b'changed')
 def test_budget_preserves_playing_files_and_rejects_duplicate_resources(self):
  with tempfile.TemporaryDirectory() as root:
   cache=module.ServiceAudioCache(root,4);a=self.row();b=self.row('assets/audio/cc0/test/v1/b.ogg');cache.install([a],[a['path']])
   with self.assertRaises(ValueError):cache.install([b],[b['path']],[a['path']])
   with self.assertRaises(ValueError):cache.install([b,b],[b['path']])
   self.assertTrue((Path(root)/a['path']).exists());self.assertFalse((Path(root)/b['path']).exists())
