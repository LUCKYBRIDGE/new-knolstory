"""Verify a sealed, source-reviewed shared runtime and its distributed notices."""
import hashlib
import json
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REVIEW='docs/architecture/evidence/layered-stories-2026-11-02/runtime-review.json'

def digest(data):return hashlib.sha256(data).hexdigest()
def safe(root,name):
    if not isinstance(name,str) or Path(name).is_absolute() or '..' in Path(name).parts or '\\' in name:raise ValueError('Unsafe runtime review path.')
    path=root/name
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()) or not path.is_file():raise ValueError('Missing runtime review evidence: '+name)
    return path

def reviewed_runtime_files(root=ROOT):
    root=Path(root);review=root/REVIEW
    if not review.exists():return None
    data=json.loads(safe(root,REVIEW).read_text())
    if data.get('version')!=1 or data.get('scope')!='knolstory-service-runtime' or data.get('sdkVersion')!='8.5.3':raise ValueError('Unsupported runtime source review.')
    files={}
    for row in data.get('files',[]):
        name=row['path']
        if not name.startswith('runtime/') or name in files:raise ValueError('Invalid runtime review entry.')
        path=safe(root,'apps/web/public/'+name)
        if path.stat().st_size!=row['bytes'] or digest(path.read_bytes())!=row['sha256']:raise ValueError('Runtime changed; renew source review: '+name)
        files[name]=row
    notices=data.get('notices',[])
    if not notices:raise ValueError('Runtime notices are missing.')
    for notice in notices:
        if not notice['file'].startswith('apps/web/public/licenses/') or digest(safe(root,notice['file']).read_bytes())!=notice['sha256']:raise ValueError('Runtime license notice changed.')
    archive=safe(root,'apps/web/public/runtime/game.zip')
    members=data.get('archiveMembers',[]);names=[row['name'] for row in members]
    if len(names)!=len(set(names)):raise ValueError('Duplicate reviewed archive member.')
    with zipfile.ZipFile(archive) as z:
        if len(z.namelist())!=len(set(z.namelist())) or set(names)!=set(z.namelist()):raise ValueError('Runtime archive member set changed.')
        for row in members:
            info=z.getinfo(row['name'])
            if info.is_dir():continue
            if digest(z.read(info))!=row.get('sha256'):raise ValueError('Runtime archive member changed: '+row['name'])
        license_file=next((n for n in notices if n['file'].endswith('RenPy-8.5.3-LICENSE.txt')),None)
        if not license_file or digest(z.read('renpy/LICENSE.txt'))!=license_file['sha256']:raise ValueError('Full SDK license must stay in runtime archive.')
    return {'files':files,'notices':notices,'review':REVIEW,'scope':data['scope']}

def matches_deployed_review(review,name,sha,build_root):
    if not review or review.get('scope')!='knolstory-service-runtime':return False
    record=review.get('files',{}).get(name)
    if not record or record.get('sha256')!=sha:return False
    notices=review.get('notices')
    if not isinstance(notices,list) or not notices or not any(isinstance(row,dict) and row.get('file')=='apps/web/public/licenses/RenPy-8.5.3-LICENSE.txt' for row in notices):return False
    if any(not isinstance(row,dict) or not isinstance(row.get('file'),str) or not row['file'].startswith('apps/web/public/licenses/') or not isinstance(row.get('sha256'),str) for row in notices):return False
    try:
        return all(digest(safe(Path(build_root),row['file'].removeprefix('apps/web/public/')).read_bytes())==row['sha256'] for row in notices)
    except (OSError,ValueError,KeyError):return False
