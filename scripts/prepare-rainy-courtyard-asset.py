"""Register one reviewed weather edit; preserve every existing image and catalogue row."""
import argparse,hashlib,json,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ASSET='seonnyeo.background.cottage-rain-evening-v1'
REFERENCE='seonnyeo.background.BG04-cottage-day'
EVIDENCE='docs/architecture/evidence/rainy-courtyard-2026-11-02/generation.json'
OUTPUT='apps/web/public/assets/backgrounds/weather-v1/seonnyeo-cottage-rain-evening.webp'
PROMPT='Lighting-weather edit of exact BG04-cottage-day architecture/framing: same Joseon-era thatched cottage, porch, lattice doors, hearth, firewood lean-to, wall and clear foreground; windy rainy late evening, diagonal rain, wet ground, blue-grey ambient and gentle existing-doorway light. Preserve hand-painted style and historical props. No people, silhouettes, animals, text, modern objects, portals or new structures.'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def prepare(source):
 source=source.resolve();evidence=ROOT/EVIDENCE
 if evidence.is_file() and json.loads(evidence.read_text()).get('sourceSha256')!=sha(source):
  raise ValueError('Reviewed source changed; create a new versioned asset recipe instead of overwriting this asset.')
 cache=ROOT/'.cache/rainy-courtyard/sources'/source.name;cache.parent.mkdir(parents=True,exist_ok=True)
 if cache.is_file() and sha(cache)!=sha(source):raise ValueError('Retained original source differs; preserve it and use a new version.')
 if source!=cache.resolve():shutil.copyfile(source,cache)
 image=Image.open(cache).convert('RGB');output=ROOT/OUTPUT;output.parent.mkdir(parents=True,exist_ok=True)
 image.save(output,'WEBP',quality=95,method=6)
 catalog_path=ROOT/'packages/asset-registry/src/catalog.json';catalog=json.loads(catalog_path.read_text());reference=next(a for a in catalog if a['id']==REFERENCE)
 asset={'id':ASSET,'displayName':'작은 집 마당 · 비 오는 저녁 · 인물 없음','label':'작은 집 마당 · 비 오는 저녁 · 인물 없음','story':'선녀와 나무꾼','type':'background','group':'작은 집 마당','backgroundRole':'scenery','src':'/'+output.relative_to(ROOT/'apps/web/public').as_posix(),'sourcePath':EVIDENCE+'#'+ASSET,'copyright':'놀퀴즈','revision':sha(output),'geometry':None,'tags':['선녀와 나무꾼','초가집','마당','비','저녁','재회','인물 없음'],'metadata':{'kind':'background','placementRole':'background-slot','storyPackIds':['seonnyeo'],'qualityStatus':'approved','pickerVisibility':'primary','containsCharacters':False,'generatedWeatherAsset':True,'background':{'location':'작은 집 마당','space':'outdoor','time':'저녁','season':'가을','weather':'비','state':'비바람 속 재회'},'searchTerms':['선녀','초가집','작은 집 마당','비','비바람','저녁','재회','인물 없음'],'artFamily':reference['metadata'].get('artFamily','seonnyeo-painted-v2'),'qualityReview':{'decision':'KEEP','referenceAssetId':REFERENCE,'evidence':EVIDENCE,'reason':'기존 초가집 구도·조선 시대 건축·소품을 유지한 비 오는 저녁; 인물 없는 배경'}}}
 existing=next((i for i,a in enumerate(catalog) if a['id']==ASSET),None)
 if existing is None:catalog.append(asset)
 else:catalog=[asset if i==existing else a for i,a in enumerate(catalog)]
 write(catalog_path,catalog)
 sizes_path=ROOT/'packages/asset-registry/src/background-sizes.json';sizes=json.loads(sizes_path.read_text());sizes[ASSET]={'width':image.width,'height':image.height};write(sizes_path,sizes)
 record={'date':'2026-11-02','tool':'built-in image_gen','assetId':ASSET,'referenceAssetId':REFERENCE,'referenceFile':'apps/web/public'+reference['src'],'referenceSha256':reference['revision'],'sourceFile':cache.relative_to(ROOT).as_posix(),'sourceSha256':sha(cache),'output':OUTPUT,'outputSha256':sha(output),'dimensions':{'width':image.width,'height':image.height},'transparent':False,'containsCharacters':False,'conversion':{'format':'WebP','quality':95,'resize':False,'method':6},'prompt':PROMPT,'review':'Exact cottage/porch/hearth/woodpile framing and readable empty foreground retained; rain/evening lighting verified. Existing source and all prior432catalogue assets preserved.','authorization':'Project-owner requested regeneration and service/editor use; project-generated weather edit, not a CC0 dedication.'}
 evidence=ROOT/EVIDENCE;evidence.parent.mkdir(parents=True,exist_ok=True);write(evidence,record)
 auth_path=ROOT/'packages/asset-registry/src/project-media-authorization.json';auth=json.loads(auth_path.read_text());row={'file':OUTPUT,'sha256':sha(output),'assetIds':[ASSET],'sourceKind':'generated-project','lineageEvidence':[EVIDENCE+'#'+ASSET],'creationMethodEvidence':'built-in image_gen; project owner requested regeneration and service/editor use 2026-11-02'}
 auth['assets']=[a for a in auth['assets'] if a['file']!=OUTPUT]+[row]
 if EVIDENCE not in auth['evidence']:auth['evidence'].append(EVIDENCE)
 write(auth_path,auth)
 print(json.dumps({'assetId':ASSET,'dimensions':[image.width,image.height],'bytes':output.stat().st_size,'catalogueAssets':len(catalog)}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args();prepare(args.source)
