"""Hash-pinned owner permission for KnolStory service use, never a CC0 dedication."""
import functools
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DECLARATION='packages/asset-registry/src/project-media-authorization.json'
LICENSE='project-owner-authorized-service-use'

@functools.lru_cache(maxsize=8)
def _read_declaration(path, modified, size):
    raw=Path(path).read_bytes();data=json.loads(raw)
    if data.get('version')!=1 or data.get('scope')!='knolstory-service' or data.get('declaredBy')!='project-owner' or not isinstance(data.get('assets'),list):
        raise ValueError('Invalid project service authorization.')
    entries={}
    for item in data['assets']:
        name=item.get('file');sha=item.get('sha256')
        if (not isinstance(name,str) or not name.startswith('apps/web/public/') or '..' in Path(name).parts or '\\' in name
            or not isinstance(sha,str) or len(sha)!=64 or any(c not in '0123456789abcdef' for c in sha) or name in entries):
            raise ValueError('Invalid or duplicate project authorization asset.')
        entries[name]=item
    return hashlib.sha256(raw).hexdigest(),entries

def declaration(root=ROOT):
    path=Path(root)/DECLARATION
    if not path.exists():return None,{}
    if path.is_symlink() or not path.resolve().is_relative_to(Path(root).resolve()):raise ValueError('Unsafe authorization declaration.')
    stat=path.stat();return _read_declaration(str(path),stat.st_mtime_ns,stat.st_size)

def apply_authorization(record, root=ROOT):
    sha,entries=declaration(root);entry=entries.get(record['file'])
    if not entry or record.get('license') not in ('unknown','unverified'):return record
    if record['sha256']!=entry['sha256']:raise ValueError('Project media changed; review owner permission again: '+record['file'])
    if record.get('mediaType')!='image':raise ValueError('Owner image permission does not authorize other media.')
    if record.get('provider') in ('unknown','RenPy SDK distribution'):
        record={**record,'provider':'project-owner-resource','source':entry.get('lineageEvidence',[DECLARATION])[0],
                'generationPlan':entry.get('creationMethodEvidence','not-recorded')}
    # Preserve the original source and generation receipts. Permission and creation method are separate.
    return {**record,'license':LICENSE,'commercialUse':'permitted','redistribution':'service-only','attribution':'not-required',
            'authorOrRightsHolder':'놀퀴즈; project owner declaration 2026-11-01',
            'replacementRequiredBeforeCommercialRelease':False,
            'rightsEvidenceStatus':'owner-declared KnolStory service permission; no CC0 or standalone library grant',
            'serviceAuthorization':{'scope':'knolstory-service','declarationFile':DECLARATION,'declarationSha256':sha,
                                    'authorizedSource':entry['file'],'authorizedSha256':entry['sha256']}}

def service_authorized(record, root=ROOT):
    grant=record.get('serviceAuthorization',{})
    if (record.get('license')!=LICENSE or record.get('redistribution')!='service-only' or record.get('mediaType')!='image'
        or grant.get('scope')!='knolstory-service' or grant.get('declarationFile')!=DECLARATION):return False
    try:sha,entries=declaration(root)
    except (OSError,ValueError,TypeError):return False
    entry=entries.get(grant.get('authorizedSource'))
    return bool(entry and sha==grant.get('declarationSha256') and entry['sha256']==grant.get('authorizedSha256')==record.get('sha256'))
