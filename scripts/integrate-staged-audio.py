"""Map a verified staging package into the service catalogue without overwriting legacy audio."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/'packages/asset-registry/src'

def read(path): return json.loads(path.read_text(encoding='utf-8'))
def write(path,value): path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def integrate(package):
    incoming=read(package/'assets/metadata/audio/cc0-library.json')
    approvals=read(REGISTRY/'audio-service-approvals.json')
    existing=[row for row in approvals['assets'] if not row['id'].startswith('audio.cc0.')]
    originals={}
    for row in existing:
        assert sha(ROOT/'apps/web/public'/row['src'].lstrip('/'))==row['sha256'],f'Existing bytes changed: {row["id"]}'
        originals.setdefault(row['sha256'],[]).append(row)
    overrides=read(REGISTRY/'media-provenance-overrides.json')
    assets,rows,aliases,duplicate_report=[],[],{},[]
    categories={'bgm':'background','ambience':'ambience','ui':'effect','foley':'effect','jingle':'effect','sfx':'effect'}
    for item in incoming['assets']:
        assert re.fullmatch(r'audio\.cc0\.[a-z0-9_-]+\.[a-z0-9_-]+',item['id'])
        assert item['license']=='CC0-1.0' and item['redistributionAllowed'] and not item['attributionRequired']
        assert item['qa']['fullDecode']=='pass' and item['revision']==1
        source=(package/item['sourcePath']).resolve();runtime=(package/item['runtimePath']).resolve()
        assert source.is_relative_to(package.resolve()) and runtime.is_relative_to(package.resolve())
        assert sha(source)==item['sourceSha256'] and sha(runtime)==item['runtimeSha256']
        matches={row['id']:row for digest in {item['sourceSha256'],item['runtimeSha256']} for row in originals.get(digest,[])}
        if matches:
            assert len(matches)==1,'Review multiple canonical matches before aliasing.'
            canonical=next(iter(matches.values()));aliases[item['id']]=canonical['id'];duplicate_report.append({'alias':item['id'],'canonical':canonical['id'],'licensePreserved':canonical['license'],'srcPreserved':canonical['src']});continue
        relative=item['runtimePath'].removeprefix('assets/runtime/')
        assert re.fullmatch(r'audio/cc0/[a-z0-9_-]+/v1/[a-z0-9_-]+\.(ogg|mp3)',relative)
        target=ROOT/'apps/web/public/assets'/relative
        if target.exists(): assert sha(target)==item['runtimeSha256'],'Versioned bytes must not be overwritten.'
        else: target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(runtime,target)
        evidence_relative=f'docs/assets/cc0-staging/evidence/{item["sourcePack"]}/inspection.json'
        evidence_source=(package/item['licenseEvidence']).resolve()
        assert evidence_source.is_relative_to(package.resolve()),'Escaped license evidence'
        proof=read(evidence_source)
        assert proof['licenses'] in (['CC0'],['Creative Commons CC0']) and proof['url']==item['sourceUrl']
        evidence_target=ROOT/evidence_relative;evidence_target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(evidence_source,evidence_target)
        category=categories[item['category']];mime='audio/ogg' if target.suffix=='.ogg' else 'audio/mpeg';src='/assets/'+relative
        note=item['descriptionKo']+' 반복 연결부 청취 검토 전에는 반복을 직접 선택하세요.' if category!='effect' else item['descriptionKo']
        assets.append({'id':item['id'],'name':item['titleKo'],'kind':'sound' if category=='effect' else 'music','src':src,'runtimePath':src.lstrip('/'),'mime':mime,'durationSeconds':item['durationSeconds'],'revision':1,'runtimeBytes':item['runtimeBytes'],'delivery':'on-demand','metadata':{'category':category,'tags':item['tagsKo'],'originalName':item['originalFilename'],'source':item['author']},'playbackAdvice':{'loopDefault':False,'note':note,'suggestedGainDb':item['suggestedGainDb']},'origin':{'url':item['sourceUrl'],'author':item['author'],'license':item['license'],'termsUrl':item['licenseUrl'],'commercialUse':'permitted','usageNote':'CC0 배포 기록에 따른 서비스 등록 자료. 출처 기록을 보존합니다.'}})
        rows.append({'id':item['id'],'src':src,'sha256':item['runtimeSha256'],'license':'CC0-1.0','commercialUse':'permitted','redistribution':'permitted','editorProvision':'permitted','sourceUrl':item['sourceUrl'],'evidence':[evidence_relative],'usage':'unrestricted','standaloneDownload':'permitted','preview':'asset','exportMode':'reference','delivery':'on-demand'})
        overrides['apps/web/public'+src]={'sha256':item['runtimeSha256'],'assetIds':[item['id']],'provider':'staged-cc0-library','source':item['sourceUrl'],'authorOrRightsHolder':item['author'],'license':'CC0-1.0','commercialUse':'permitted','redistribution':'permitted','attribution':'not-required','generationPlan':'publisher-source; no generated media','replacementRequiredBeforeCommercialRelease':False,'sourcePack':item['sourcePack'],'sourceSha256':item['sourceSha256'],'revision':1,'rightsEvidence':[evidence_relative]}
    for item in incoming['duplicateAliases']:
        aliases[item['id']]=aliases.get(item['duplicateOf'],item['duplicateOf'])
    write(REGISTRY/'staged-cc0-audio.json',assets);write(REGISTRY/'staged-cc0-audio-aliases.json',aliases)
    search={item['id']:{'name':item['titleKo'],'description':item['descriptionKo'],'tags':item['tagsKo'],'originalName':item['originalFilename']} for item in incoming['assets'] if item['id'] in aliases}
    write(REGISTRY/'staged-cc0-alias-search.json',search)
    write(REGISTRY/'audio-service-approvals.json',{**approvals,'checkedAt':'2026-10-13','assets':existing+rows})
    write(REGISTRY/'media-provenance-overrides.json',overrides)
    summary={'sourceCommit':'8ec4c7cda0da51087e8c5ce354648fa9a3b02ced','release':'audio-cc0-staging-2026-10-13-v1','incoming':len(incoming['assets']),'existing':len(existing),'added':len(assets),'catalogueTotal':len(existing)+len(assets),'aliases':aliases,'exactExistingDuplicates':duplicate_report,'delivery':'on-demand; only referenced scene files enter native playback','scope':'No existing story, Asset ID, audio bytes or old license changed. Story cue proposals remain optional and are not applied automatically.'}
    write(ROOT/'docs/assets/cc0-staging/integration.json',summary)
    print(json.dumps({k:summary[k] for k in ['incoming','existing','added','catalogueTotal']},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package-root',required=True,type=Path);args=p.parse_args();integrate(args.package_root.resolve())
