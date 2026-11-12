import io
import tarfile
import tempfile
import unittest
from pathlib import Path
from runtime_archive import reviewed_members

PREFIX='node-v22.23.3-darwin-arm64/'
class ArchiveTests(unittest.TestCase):
    def archive(self, changes=(), omit=(), defaults=True):
        temporary=tempfile.TemporaryDirectory();self.addCleanup(temporary.cleanup)
        path=Path(temporary.name)/'runtime.tar.gz'
        with tarfile.open(path,'w:gz')as out:
            for name,data,kind in ([ (PREFIX+'bin/node',b'binary',tarfile.REGTYPE),(PREFIX+'LICENSE',b'license',tarfile.REGTYPE)]if defaults else [])+list(changes):
                if name in omit:continue
                member=tarfile.TarInfo(name);member.type=kind;member.size=len(data)if kind==tarfile.REGTYPE else 0;member.linkname='elsewhere'if kind!=tarfile.REGTYPE else ''
                out.addfile(member,io.BytesIO(data)if kind==tarfile.REGTYPE else None)
        return path
    def test_selected_members_only(self):
        self.assertEqual(reviewed_members(self.archive([(PREFIX+'unselected',b'other',tarfile.REGTYPE)])),{'node':b'binary','LICENSE':b'license'})
    def test_duplicate_or_missing_selected_refused(self):
        for path in [self.archive([(PREFIX+'bin/node',b'duplicate',tarfile.REGTYPE)]),self.archive(omit=[PREFIX+'LICENSE'])]:
            with self.assertRaises(ValueError):reviewed_members(path)
    def test_links_refused(self):
        for kind in [tarfile.SYMTYPE,tarfile.LNKTYPE]:
            with self.assertRaises(ValueError):reviewed_members(self.archive([(PREFIX+'bin/node',b'',kind),(PREFIX+'LICENSE',b'license',tarfile.REGTYPE)],defaults=False))
    def test_traversal_and_absolute_names_refused(self):
        for name in ['../escape','/absolute',PREFIX+'a/../escape',PREFIX+'a\\escape']:
            with self.assertRaises(ValueError):reviewed_members(self.archive([(name,b'x',tarfile.REGTYPE)]))
    def test_wrong_version_and_oversize_selected_refused(self):
        with self.assertRaises(ValueError):reviewed_members(self.archive(),version='../../escape')
        with self.assertRaises(ValueError):reviewed_members(self.archive(),version='v22.23.2')
        with self.assertRaises(ValueError):reviewed_members(self.archive([(PREFIX+'bin/node',b'binary',tarfile.REGTYPE),(PREFIX+'LICENSE',b'x'*(1024*1024+1),tarfile.REGTYPE)],defaults=False))
    def test_corrupt_and_oversized_archives_refused(self):
        path=self.archive();path.write_bytes(b'not-an-archive')
        with self.assertRaises(ValueError):reviewed_members(path)
        with path.open('wb')as out:out.truncate(80*1024*1024+1)
        with self.assertRaises(ValueError):reviewed_members(path)
    def test_empty_selected_member_refused(self):
        with self.assertRaises(ValueError):reviewed_members(self.archive([(PREFIX+'bin/node',b'',tarfile.REGTYPE),(PREFIX+'LICENSE',b'license',tarfile.REGTYPE)],defaults=False))
if __name__=='__main__':unittest.main()
