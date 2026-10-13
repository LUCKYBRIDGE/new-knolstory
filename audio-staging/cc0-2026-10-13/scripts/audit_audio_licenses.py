"""Recheck actual publisher license fields without overwriting acquisition evidence."""
import csv
import hashlib
import json
import sys
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/audio-python'))
from bs4 import BeautifulSoup
DATE='2026-10-13'
OUT=ROOT/'assets/licenses/audio'/('audit-'+DATE)

def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def fields(raw,url):
    soup=BeautifulSoup(raw,'html.parser')
    if 'kenney.nl' in url:
        entries=[{'label':a.get_text(' ',strip=True),'url':urljoin(url,a['href'])} for a in soup.select('a[href*="creativecommons.org/publicdomain/zero"]')]
        downloads=[urljoin(url,a['href']) for a in soup.select('a[href]') if 'download' in a['href'] or '.zip' in a['href']]
    else:
        node=soup.select_one('.field-name-field-art-licenses')
        entries=[{'label':a.get_text(' ',strip=True),'url':urljoin(url,a['href'])} for a in node.select('a[href]')] if node else []
        node=soup.select_one('.field-name-field-art-files')
        downloads=[urljoin(url,a['href']) for a in node.select('a[href]') if '/sites/default/files/' in a['href']] if node else []
    body=soup.select_one('.field-name-body')
    notice=soup.select_one('.field-name-field-copyright-notice') or soup.select_one('.field-name-field-art-attribution')
    if notice:notice=notice.select_one('.field-items') or notice
    return {'licenseEntries':entries,'downloads':list(dict.fromkeys(downloads)),
            'body':body.get_text(' ',strip=True) if body else '',
            'copyrightNotice':notice.get_text(' ',strip=True) if notice else ''}

def cc0(data):
    return bool(data['licenseEntries']) and all('creativecommons.org/publicdomain/zero/1.0' in e['url'] and e['label'] in ('CC0','Creative Commons CC0') for e in data['licenseEntries'])

def inspect(pack):
    directory=OUT/pack['id'];directory.mkdir(parents=True,exist_ok=True)
    archived=ROOT/'assets/licenses/audio/cc0'/pack['id']/'source-page.html'
    old=fields(archived.read_bytes(),pack['url'])
    result={'id':pack['id'],'url':pack['url'],'author':pack['author'],'archiveSha256':sha(archived),'archived':old,
            'includedNotices':[],'issues':[]}
    for p in (archived.parent/'included').rglob('*.txt'):
        t=p.read_text(encoding='utf-8',errors='replace')
        result['includedNotices'].append({'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'text':t})
    if not cc0(old):result['issues'].append('archived license field is not exclusively CC0')
    try:
        request=urllib.request.Request(pack['url'],headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request,timeout=40) as response:
            raw=response.read();result['resolvedUrl']=response.geturl()
        p=directory/'current-page.html';p.write_bytes(raw)
        live=fields(raw,pack['url']);result['current']=live;result['currentSha256']=sha(p)
        if not cc0(live):result['issues'].append('current license field is not exclusively CC0')
        if any(a['downloadUrl'] not in old['downloads'] for a in ASSETS if a['sourcePack']==pack['id']):result['issues'].append('acquired URL not present in archived download field')
    except Exception as exc:
        result['fetchError']=str(exc);result['issues'].append('current page recheck unavailable')
    result['status']='pass' if not result['issues'] else 'review-required'
    (directory/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return result

if __name__=='__main__':
    manifest=json.loads((ROOT/'assets/metadata/audio/cc0-library.json').read_text(encoding='utf-8'))
    ASSETS=manifest['assets']
    packs=json.loads((ROOT/'assets/metadata/audio/cc0-sources.json').read_text(encoding='utf-8'))
    with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(inspect,packs))
    bypack={r['id']:r for r in results}
    checked=[]
    for a in ASSETS:
        issues=[]
        for kind in ('source','runtime'):
            if sha(ROOT/a[kind+'Path'])!=a[kind+'Sha256']:issues.append(kind+' hash mismatch')
        if a['license']!='CC0-1.0' or a['attributionRequired'] or not a['redistributionAllowed']:issues.append('catalog rights mismatch')
        if bypack[a['sourcePack']]['status']!='pass':issues.append('source requires review')
        checked.append({'id':a['id'],'sourcePack':a['sourcePack'],'license':a['license'],'sourceUrl':a['sourceUrl'],'sourcePath':a['sourcePath'],'runtimePath':a['runtimePath'],'status':'pass' if not issues else 'review-required','issues':issues})
    excluded=[]
    for p in (ROOT/'assets/licenses/audio/excluded').glob('*/inspection.json'):
        item=json.loads(p.read_text(encoding='utf-8'))
        excluded.append({'id':item['id'],'url':item['url'],'licenses':item['licenses'],'includedInCatalog':any(a['sourcePack']==item['id'] or a['downloadUrl'] in item['downloads'] for a in ASSETS)})
    report={'checkedOn':DATE,'assetCount':len(ASSETS),'sourceCount':len(results),'passedAssets':sum(a['status']=='pass' for a in checked),
      'sourceStatuses':dict(Counter(r['status'] for r in results)),
      'method':'actual archived and newly fetched publisher license fields + CC0 URL; original/runtime hashes and catalog rights; excluded candidates checked separately',
      'claimLimit':'Publisher license declarations verified; original authorship and all third-party rights are not independently guaranteed.',
      'sources':results,'assets':checked,'excludedCandidates':excluded}
    target=ROOT/'assets/metadata/audio/cc0-license-audit.json'
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with target.with_suffix('.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(checked[0]),extrasaction='ignore');w.writeheader();w.writerows(checked)
    print(json.dumps({k:report[k] for k in ['assetCount','sourceCount','passedAssets','sourceStatuses']},ensure_ascii=False))
    print(json.dumps([{'id':r['id'],'notice':r.get('current',r['archived'])['copyrightNotice'],'issues':r['issues']} for r in results if r.get('current',r['archived'])['copyrightNotice'] or r['issues']],ensure_ascii=True))
