"""Inspect publisher pages; never infer licenses from collection titles."""
import json
import sys
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/audio-python'))
from bs4 import BeautifulSoup

def inspect(source):
    with urllib.request.urlopen(urllib.request.Request(source['url'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=40) as response:
        html = response.read()
    evidence = ROOT / 'assets/licenses/audio/cc0' / source['id']
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'source-page.html').write_bytes(html)
    soup = BeautifulSoup(html, 'html.parser')
    if 'kenney.nl' in source['url']:
        licenses = [a.get_text(' ', strip=True) for a in soup.select('a[href*="creativecommons.org/publicdomain/zero"]')]
        links = [urljoin(source['url'], a['href']) for a in soup.select('a[href]') if 'download' in a['href'] or '.zip' in a['href']]
        author = 'Kenney'
    else:
        node = soup.select_one('.field-name-field-art-licenses')
        licenses = [a.get_text(' ', strip=True) for a in node.select('a')] if node else []
        node = soup.select_one('.field-name-field-art-files')
        links = list(dict.fromkeys(urljoin(source['url'], a['href']) for a in node.select('a[href]') if '/sites/default/files/' in a['href'])) if node else []
        node = soup.select_one('.field-name-author-submitter .field-items') or soup.select_one('.field-name-author-submitter')
        author = node.get_text(' ', strip=True).removeprefix('Author:').strip() if node else 'UNKNOWN'
    description = soup.select_one('.field-name-body')
    attribution = soup.select_one('.field-name-field-copyright-notice') or soup.select_one('.field-name-field-art-attribution')
    if attribution:
        attribution = attribution.select_one('.field-items') or attribution
    result = {**source, 'author':author, 'licenses':licenses, 'downloads':links,
              'description': description.get_text(' ', strip=True) if description else '',
              'attributionNotice': attribution.get_text(' ', strip=True) if attribution else ''}
    (evidence / 'inspection.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return {'id':source['id'], 'author':author, 'licenses':licenses, 'files':[unquote(urlparse(u).path.split('/')[-1]) for u in links], 'urls':links if 'kenney.nl' in source['url'] else None}

if __name__ == '__main__':
    sources = json.loads((ROOT/'scripts/audio_sources.json').read_text(encoding='utf-8'))
    with ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(inspect, sources):
            print(json.dumps(result, ensure_ascii=False), flush=True)
