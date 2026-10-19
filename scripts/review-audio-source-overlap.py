"""Review publisher/name/description overlap separately from byte identity."""
import argparse
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]

def name(value):
    match=re.match(r'^(.*?\.(?:wav|ogg|mp3))(?:\s+\(.*\))?$',value,re.I)
    if match:value=match.group(1)
    return re.sub(r'[^a-z0-9가-힣]','',re.sub(r'\.(wav|ogg|mp3)$','',unicodedata.normalize('NFKC',value).casefold()))
def source(value):
    parsed=urlparse(value)
    return (parsed.hostname or '').casefold()+parsed.path.rstrip('/').casefold()

def review(package):
    library=json.loads((package/'assets/metadata/audio/cc0-library.json').read_text())['assets']
    definitions={}
    for file in ['story-score.json','external-cc0-audio.json','pixabay-audio.json']:
        for row in json.loads((ROOT/'packages/asset-registry/src'/file).read_text()):definitions[row['id']]=row
    approvals=json.loads((ROOT/'packages/asset-registry/src/audio-service-approvals.json').read_text())['assets']
    existing=[row for row in approvals if row['id'].startswith('audio:')]
    same_asset, same_pack, alternative, themes=[],[],[],[]
    words={'rain':r'빗소리|비 내|rain','forest':r'숲|forest','steps':r'발걸음|footstep','books':r'책|book','doors':r'문 열|문 닫|door','water':r'물 흐|물소리|water','bells':r'종소리|bell','wind':r'바람|wind'}
    for old in existing:
        definition=definitions.get(old['id'],{});metadata=definition.get('metadata',{});origin=definition.get('origin',{})
        original=metadata.get('originalName',Path(old['src']).name);author=origin.get('author',metadata.get('source','놀스토리 직접 제작'))
        old_text=definition.get('name',old['id'])+' '+original+' '+' '.join(metadata.get('tags',[]))
        for new in library:
            pair={'existingId':old['id'],'newId':new['id'],'existingName':definition.get('name',old['id']),'newName':new['titleKo'],'existingOriginalName':original,'newOriginalName':new['originalFilename'],'existingAuthor':author,'newAuthor':new['author'],'existingSource':old['sourceUrl'],'newSource':new['sourceUrl'],'newDescription':new['descriptionKo']}
            same_url=source(old['sourceUrl'])==source(new['sourceUrl']);same_name=name(original)==name(new['originalFilename'])
            if same_url and same_name: same_asset.append({**pair,'classification':'same-source-and-original-name; confirm byte/provenance evidence'})
            elif same_url: same_pack.append({**pair,'classification':'same-release-different-file; preserve numbered variants'})
            elif name(author)==name(new['author']) and same_name and len(name(original))>=5: alternative.append({**pair,'classification':'same-author-and-name; inspect alternate encoding/edit'})
            new_text=new['titleKo']+' '+new['descriptionKo']+' '+' '.join(new['tagsKo'])
            shared=[key for key,pattern in words.items() if re.search(pattern,old_text,re.I) and re.search(pattern,new_text,re.I)]
            if shared and not (same_url and same_name): themes.append({**pair,'themes':shared,'classification':'similar-use-description; not proof of same recording'})
    return {'version':1,'sameSourceAndName':same_asset,'samePackDifferentFile':same_pack,'sameAuthorAndNameOtherSource':alternative,'similarUseDescriptions':themes,'scope':'Use source/creator/original filenames/descriptions alongside byte and decoded comparisons. Same pack or same use does not automatically mean the same recording. No existing ID, media or rights is modified.'}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package-root',required=True,type=Path);p.add_argument('--output',required=True,type=Path);args=p.parse_args();result=review(args.package_root)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:len(result[k]) for k in ['sameSourceAndName','samePackDifferentFile','sameAuthorAndNameOtherSource','similarUseDescriptions']}))
