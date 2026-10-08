"""Restore exact fixed-baseline media for local testing without re-extracting domain code.
Requires an existing authorized local story-maker checkout. Does not grant redistribution rights.
"""
import argparse,hashlib,json,subprocess
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
 for asset in catalog:
  path=ROOT/'apps/web/public'/asset['src'].lstrip('/')
  source=asset['sourcePath']
  # The local catalog source uses some pre-conversion paths. Prefer its exact public baseline file.
  public='public/story-assets/'+path.name
  result=subprocess.run(['git','-C',str(legacy),'show',f'{BASELINE}:{public}'],capture_output=True)
  if result.returncode:result=subprocess.run(['git','-C',str(legacy),'show',f'{BASELINE}:{source}'],capture_output=True)
  if result.returncode:raise SystemExit('Missing baseline asset: '+asset['id'])
  relative=path.relative_to(ROOT).as_posix()
  if hashlib.sha256(result.stdout).hexdigest()!=expected.get(relative):raise SystemExit('Media requires exact conversion from baseline; source mismatch: '+asset['id'])
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(result.stdout);restored+=1
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
 print(f'Restored {restored} exact fixed-baseline files for local testing. No release permission is inferred.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('legacy',type=Path);args=parser.parse_args();restore(args.legacy)
