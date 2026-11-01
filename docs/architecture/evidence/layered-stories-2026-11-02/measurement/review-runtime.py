"""Recheck this scoped SDK/project delta against the prior sealed source review.
Requires the pinned local SDK and a completed runtime build. Unknown members fail.
The output seals only these exact bytes, never authorizes future builds.
"""
import collections
import hashlib
import json
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[5]
def sha(data):return hashlib.sha256(data).hexdigest()
def main():
 prior='docs/architecture/evidence/media-rights-2026-11-01/runtime-review.json'
 review=json.loads((ROOT/prior).read_text());baseline={r['name']:r for r in review['archiveMembers']}
 auth={r['file']:r for r in json.loads((ROOT/'packages/asset-registry/src/project-media-authorization.json').read_text())['assets']}
 assets=[a for a in json.loads((ROOT/'packages/asset-registry/src/catalog.json').read_text()) if a['metadata'].get('layeredStoryAsset')]
 added={'_placeholders/'+a['src'].lstrip('/'):a for a in assets};rows=[];changed=[]
 with zipfile.ZipFile(ROOT/'apps/web/public/runtime/game.zip') as archive:
  if not set(baseline).issubset(archive.namelist()):raise ValueError('Prior members removed; review separately.')
  for info in archive.infolist():
   name=info.filename;data=archive.read(info);row=dict(baseline[name]) if name in baseline else None
   if row is None:
    if info.is_dir():row={'name':name,'category':'directory'}
    elif name in added:
     asset=added[name];src='apps/web/public'+asset['src'];grant=auth[src]
     if sha((ROOT/src).read_bytes())!=grant['sha256']:raise ValueError('Changed generated input '+src)
     row={'name':name,'category':'generated-placeholder','source':src,'sourceSha256':grant['sha256'],
      'generationEvidence':['spikes/renpy-web/placeholders.py','scripts/prepare-layered-story-assets.py'],
      'authorization':{'declaration':'packages/asset-registry/src/project-media-authorization.json','assetFile':src,'sha256':grant['sha256']}}
    else:raise ValueError('Unreviewed new archive member: '+name)
   category=row['category']
   if category.endswith('-exact'):
    if (ROOT/row['source']).read_bytes()!=data:raise ValueError('Source mismatch '+name)
    row['sourceSha256']=sha(data)
   elif category=='generated-placeholder':
    if sha((ROOT/row['source']).read_bytes())!=row['sourceSha256']:raise ValueError('Placeholder input changed '+name)
   elif category=='generated-progressive-index':
    if sha((ROOT/row['source']).read_bytes())!=row['sourceSha256']:raise ValueError('Progressive recipe changed')
    for asset in assets:
     if asset['src'].lstrip('/').encode() not in data:raise ValueError('Missing progressive asset '+asset['id'])
   elif category!='directory':raise ValueError('Unsupported review category '+category)
   if row.get('sha256')!=sha(data):changed.append(name)
   row.update(sha256=sha(data),bytes=len(data));rows.append(row)
 review.update(reviewedAt='2026-11-02',supersedes=prior,archiveMembers=rows)
 for row in review['files']:
  path=ROOT/'apps/web/public'/row['path'];row.update(sha256=sha(path.read_bytes()),bytes=path.stat().st_size)
 output=Path(__file__).resolve().parents[1]
 (output/'runtime-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
 (output/'runtime-delta.json').write_text(json.dumps({'changedMembers':changed,'counts':dict(collections.Counter(r['category'] for r in rows)),
  'boundary':'Exact-source equality checked; generated placeholder output not independently regenerated.'},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'archiveMembers':len(rows),'changedMembers':len(changed)}))
if __name__=='__main__':main()
