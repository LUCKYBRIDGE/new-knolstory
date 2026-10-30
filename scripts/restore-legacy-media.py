"""Restore exact fixed-baseline media for local testing without re-extracting domain code.
Requires an existing authorized local story-maker checkout. Does not grant redistribution rights.
"""
import argparse,hashlib,importlib.util,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASELINE='18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b'
def restore(legacy):
 check=subprocess.run(['git','-C',str(legacy),'cat-file','-e',BASELINE+'^{commit}'],capture_output=True)
 if check.returncode:raise SystemExit('The authorized legacy checkout must contain pinned commit '+BASELINE+'. Fetch that commit before restoring local test media.')
 catalog=json.loads((ROOT/'packages/asset-registry/src/catalog.json').read_text())
 inventory=json.loads((ROOT/'packages/asset-registry/src/media-provenance.json').read_text())
 expected={r['file']:r['sha256'] for r in inventory['entries']}
 restored=0
 derived=[]
 public_root=ROOT/'apps/web/public'
 for asset in catalog:
  transform=asset.get('metadata',{}).get('statureTransform')
  source=asset['sourcePath']
  if transform:
   original=transform.get('source','')
   source_hash=transform.get('sourceSha256','')
   expected_output='assets/characters/stature-v2/'+asset['id']+'.webp'
   if (not original.startswith('assets/legacy-18da4fc/') or '..' in Path(original).parts or
       Path(original).is_absolute() or '\\' in original or asset['src']!='/'+expected_output or
       not isinstance(source_hash,str) or len(source_hash)!=64 or any(c not in '0123456789abcdef' for c in source_hash)):
    raise SystemExit('Invalid derived character source or destination: '+asset['id'])
   path=public_root/original
   chain=[ROOT]+[ROOT.joinpath(*path.relative_to(ROOT).parts[:index]) for index in range(1,len(path.relative_to(ROOT).parts)+1)]
   if any(part.is_symlink() for part in chain) or not path.resolve().is_relative_to(public_root.resolve()):
    raise SystemExit('Invalid derived original source symlink or escaped path: '+asset['id'])
   if path.exists() and path.stat().st_nlink>1:
    raise SystemExit('Invalid derived original source hardlink: '+asset['id'])
   expected_hash=source_hash
   derived.append({'id':asset['id'],'source':original,'sourceSha256':source_hash,'scale':transform.get('scale')})
  else:
   path=public_root/asset['src'].lstrip('/')
   expected_hash=expected.get(path.relative_to(ROOT).as_posix())
  # The local catalog source uses some pre-conversion paths. Prefer its exact public baseline file.
  public='public/story-assets/'+path.name
  result=subprocess.run(['git','-C',str(legacy),'show',f'{BASELINE}:{public}'],capture_output=True)
  if result.returncode:result=subprocess.run(['git','-C',str(legacy),'show',f'{BASELINE}:{source}'],capture_output=True)
  if result.returncode:raise SystemExit('Missing baseline asset: '+asset['id'])
  relative=path.relative_to(ROOT).as_posix()
  if hashlib.sha256(result.stdout).hexdigest()!=expected_hash:raise SystemExit('Media requires exact conversion from baseline; source mismatch: '+asset['id'])
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(result.stdout);restored+=1
 if derived:
  # Derived catalog URLs are never fetched as if they were fixed baseline art.
  # Restore their recorded original bytes above, then reproduce the declared
  # uniform padding and verify exact current catalog geometry/hash.
  spec=importlib.util.spec_from_file_location('restore_character_stature',Path(__file__).with_name('prepare-character-stature-assets.py'))
  padding=importlib.util.module_from_spec(spec);spec.loader.exec_module(padding)
  padding.prepare(ROOT,plan=derived,update_catalog=False)
 ui=json.loads((ROOT/'packages/asset-registry/src/legacy-ui-media.json').read_text())
 for item in ui['entries']:
  relative=Path(item['file'])
  if relative.is_absolute() or '..' in relative.parts or not item['file'].startswith('apps/web/public/assets/legacy-ui/'):
   raise SystemExit('Invalid local UI media destination.')
  result=subprocess.run(['git','-C',str(legacy),'show',f"{BASELINE}:{item['sourcePath']}"],capture_output=True)
  if result.returncode or hashlib.sha256(result.stdout).hexdigest()!=item['sha256']:
   raise SystemExit('Missing or mismatched fixed-baseline room media: '+relative.name)
  path=ROOT/relative;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(result.stdout)
 print(f"Restored {len(ui['entries'])} exact fixed-baseline room files for authorized local testing.")
 print(f'Restored {restored} exact fixed-baseline files for local testing and {len(derived)} reproducible padded derivatives. No release permission is inferred.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('legacy',type=Path);args=parser.parse_args();restore(args.legacy)
