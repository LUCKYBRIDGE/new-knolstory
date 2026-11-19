"""Read-only comparison with audio and optional ID catalog on another checkout.

Never overwrites existing media, changes existing IDs, or assigns CC0 to old files.
Exact byte comparisons include both publisher originals and runtime derivatives.
"""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = {'.wav','.mp3','.ogg','.flac','.m4a','.aac','.opus'}
SKIP = {'.git','node_modules','.tools','__pycache__','exports'}

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def compare(existing_root, existing_catalog=None):
    manifest = json.loads((ROOT/'assets/metadata/audio/cc0-library.json').read_text(encoding='utf-8'))
    assets = manifest['assets']
    existing_root = existing_root.resolve(strict=True)
    known_ids, ids_by_path = set(), defaultdict(list)
    if existing_catalog:
        old = json.loads(existing_catalog.read_text(encoding='utf-8-sig'))
        records = old if isinstance(old,list) else old.get('assets', [])
        if not isinstance(records,list):
            raise ValueError('Expected a list or an object with an assets list')
        for record in records:
            if not isinstance(record,dict) or not record.get('id'):
                continue
            known_ids.add(str(record['id']))
            for field in ['sourcePath','runtimePath','path','src','url']:
                value = record.get(field)
                if isinstance(value,str) and '://' not in value:
                    ids_by_path[(existing_root/value.lstrip('/')).resolve()].append(str(record['id']))
    by_hash, by_name, count = defaultdict(list), defaultdict(list), 0
    new_roots = [(ROOT/'assets/source/audio/cc0').resolve(), (ROOT/'assets/runtime/audio/cc0').resolve()]
    for path in existing_root.rglob('*'):
        if any(part in SKIP for part in path.relative_to(existing_root).parts) or not path.is_file() or path.suffix.lower() not in AUDIO:
            continue
        if any(path.resolve().is_relative_to(folder) for folder in new_roots):
            continue
        entry = {'path':path.relative_to(existing_root).as_posix(),'existingIds':ids_by_path.get(path.resolve(),[]),'sha256':digest(path)}
        by_hash[entry['sha256']].append(entry)
        by_name[path.name.casefold()].append(entry)
        count += 1
    exact, names = [], []
    for asset in assets:
        matches = {e['path']:e for h in {asset['sourceSha256'],asset['runtimeSha256']} for e in by_hash.get(h,[])}
        if matches:
            exact.append({'newId':asset['id'],'existing':list(matches.values()),'action':'Keep existing IDs; consider aliasing the new ID to the existing asset after confirming its provenance.'})
        candidates = by_name.get(asset['originalFilename'].casefold(),[])
        if candidates:
            names.append({'newId':asset['id'],'existing':candidates,'action':'Same name alone is not a duplicate; preserve both source-pack namespaces.'})
    return {'schemaVersion':1,'existingRoot':str(existing_root),'existingAudioFileCount':count,
            'existingCatalog':str(existing_catalog) if existing_catalog else None,
            'existingCatalogIdCount':len(known_ids),'newAssetCount':len(assets),
            'idCollisions':sorted(a['id'] for a in assets if a['id'] in known_ids),
            'exactByteMatches':exact,'sameFilenameCandidates':names,
            'scope':'Report only. Old licenses and IDs are untouched. Different encodings/edits require a separate listening or fingerprint comparison.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--existing-root', required=True, type=Path)
    parser.add_argument('--existing-catalog', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = compare(args.existing_root,args.existing_catalog)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'existingAudioFiles':result['existingAudioFileCount'],'exactMatches':len(result['exactByteMatches']),
                      'filenameCandidates':len(result['sameFilenameCandidates']),'idCollisions':len(result['idCollisions'])},ensure_ascii=False))
