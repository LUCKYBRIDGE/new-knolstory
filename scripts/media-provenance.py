"""Build/check exhaustive distributed media provenance, including unknown legacy rights."""
import argparse, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'packages/asset-registry/src/media-provenance.json'
OVERRIDES=ROOT/'packages/asset-registry/src/media-provenance-overrides.json'
EXT={'.webp','.png','.jpg','.jpeg','.svg','.gif','.wav','.ogg','.mp3','.ttf','.woff','.woff2','.otf','.mp4','.webm'}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def release_allowed(record,target):
 if record['redistribution'] not in ['permitted','permitted-with-license'] or record['license'] in ['unknown','unverified']:
  return False
 if target=='commercial' and record['commercialUse']!='permitted':return False
 if record['attribution'] in ['unknown','unverified']:return False
 if record['attribution']!='not-required':
  evidence=record.get('attributionEvidence',[])
  public=(ROOT/'apps/web/public').resolve()
  if not evidence:return False
  for name in evidence:
   path=(ROOT/name).resolve()
   if not path.is_relative_to(public) or not path.is_file():return False
 return True
def inventory():
 catalog=json.loads((ROOT/'packages/asset-registry/src/catalog.json').read_text());by_path={a['src'].lstrip('/'):a for a in catalog}
 score=json.loads((ROOT/'apps/web/public/assets/audio/story-score/manifest.json').read_text());scores={f"assets/audio/story-score/{a['file']}":a for a in score['assets']}
 files=list((ROOT/'apps/web/public').rglob('*'))+list((ROOT/'renpy/responsive-spike/game').rglob('*'))
 overrides=json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
 ui=json.loads((ROOT/'packages/asset-registry/src/legacy-ui-media.json').read_text())
 ui_sources={item['file']:item for item in ui['entries']}
 usages={}
 ids=set(a['id'] for a in catalog)|set(f"audio:{'music' if a['kind']=='ambience' else 'sound' if a['kind']=='sfx' else a['kind']}:{a['id']}" for a in score['assets'])
 def scan(value,work,location='$'):
  if isinstance(value,str) and value in ids:usages.setdefault(value,[]).append({'work':work,'documentLocation':location})
  elif isinstance(value,list):
   for i,item in enumerate(value):scan(item,work,f'{location}[{i}]')
  elif isinstance(value,dict):
   for key,item in value.items():scan(item,work,f'{location}.{key}')
 for work in (ROOT/'docs/architecture/evidence/existing-story-enhancement').glob('*.knolstory'):scan(json.loads(work.read_text()).get('project',{}),work.stem)
 for work in (ROOT/'tests/fixtures/stories').glob('*.json'):scan(json.loads(work.read_text()),'baseline:'+work.stem)
 entries=[]
 for file in sorted(set(p for p in files if p.is_file() and p.suffix.lower() in EXT)):
  relative=file.relative_to(ROOT).as_posix();pub=relative.removeprefix('apps/web/public/');asset=by_path.get(pub);cue=scores.get(pub)
  record={'file':relative,'sha256':digest(file),'mediaType':'font' if file.suffix.lower() in {'.ttf','.woff','.woff2','.otf'} else 'audio' if file.suffix.lower() in {'.wav','.ogg','.mp3'} else 'video' if file.suffix.lower() in {'.mp4','.webm'} else 'image','assetIds':[],'provider':'unknown','source':'unknown','authorOrRightsHolder':'unknown','license':'unknown','commercialUse':'unverified','redistribution':'unverified','attribution':'unverified','generationPlan':'not-recorded','replacementRequiredBeforeCommercialRelease':'review-required','replacementAssetId':None}
  if asset:record.update(assetIds=[asset['id']],provider='legacy-repository',source=f"story-maker@18da4fc:{asset.get('sourcePath','unknown')}",authorOrRightsHolder=asset.get('copyright','unknown'))
  elif relative in ui_sources:record.update(provider='legacy-repository',source=f"story-maker@18da4fc:{ui_sources[relative]['sourcePath']}",authorOrRightsHolder='project owner; user-declared on 2026-10-08',usageAuthorization='Direct owner instruction: reuse existing project design/resources in KnolStory Next',redistribution='unverified')
  elif cue:record.update(assetIds=[f"audio:{'music' if cue['kind']=='ambience' else 'sound' if cue['kind']=='sfx' else cue['kind']}:{cue['id']}"],provider='original-procedural-synthesis',source='scripts/create-story-soundtrack.py',authorOrRightsHolder='KnolStory Next original synthesis',license='CC0-1.0',commercialUse='permitted',redistribution='permitted',attribution='not-required',generationPlan='local-no-paid-service',replacementRequiredBeforeCommercialRelease=False)
  elif pub in ['assets/audio/forest.wav','assets/audio/night.wav','assets/audio/chime.wav','assets/audio/step.wav']:record.update(assetIds=[f"audio:{'sound' if file.stem in ['chime','step'] else 'music'}:{file.stem}"],provider='original-procedural-synthesis',source='apps/web/public/assets/audio/README.md',authorOrRightsHolder='KnolStory Next original synthesis',license='original-project-asset; no external samples',generationPlan='local-no-paid-service')
  elif file.name=='NotoSansKR.ttf':record.update(provider='Noto font distribution',source='spikes/renpy-web/FONT-LICENSE.txt',authorOrRightsHolder='Adobe / Noto contributors',license='OFL-1.1',commercialUse='permitted',redistribution='permitted-with-license',attribution='keep copyright and OFL text',attributionEvidence=['apps/web/public/assets/licenses/NotoSansKR-OFL.txt'],replacementRequiredBeforeCommercialRelease=False)
  elif '/effects/' in relative:record.update(provider='project-effect-resource',source='renpy/responsive-spike/game/effects',authorOrRightsHolder='project; original derivation not separately documented')
  elif '/runtime/' in relative:record.update(provider='RenPy SDK distribution',source='RenPy 8.5.3 Web build; SDK bundled resource',authorOrRightsHolder='SDK distribution; specific media author unverified')
  if relative in overrides:
   override=overrides[relative];assert override['sha256']==record['sha256'],f'Rights evidence must be rechecked after changed file: {relative}'
   record.update(override)
  record['usageReferences']=[usage for asset_id in record['assetIds'] for usage in usages.get(asset_id,[])]
  entries.append(record)
 authoritative={item['sha256']:item for item in entries if item['license']!='unknown'}
 for item in entries:
  origin=authoritative.get(item['sha256'])
  if item['license']=='unknown' and origin:
   for key in ['assetIds','provider','source','authorOrRightsHolder','license','commercialUse','redistribution','attribution','generationPlan','replacementRequiredBeforeCommercialRelease','usageReferences']:item[key]=origin[key]
   if 'attributionEvidence' in origin:item['attributionEvidence']=origin['attributionEvidence']
   item['derivedFrom']=origin['file']
 return {'version':1,'policy':'Unknown provenance is recorded, never inferred to be copyright-clear. Source ownership label is not a redistribution license. Update records before production rights decisions.','entries':entries}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');parser.add_argument('--release',choices=['free','commercial']);args=parser.parse_args();current=inventory()
 if args.release:
  blocked=[r['file'] for r in current['entries'] if not release_allowed(r,args.release)]
  print(json.dumps({'target':args.release,'blockedFiles':blocked,'allowed':not blocked},ensure_ascii=False,indent=2));raise SystemExit(1 if blocked else 0)
 if args.check:
  stored=json.loads(OUT.read_text());assert stored==current,'Media provenance is stale or incomplete. Rebuild inventory and review added/changed files.'
  print(f"Verified {len(current['entries'])} media files: no missing record or stale SHA256.")
 else:
  OUT.write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n');print(f"Recorded {len(current['entries'])} distributed media files, including unverified rights.")
