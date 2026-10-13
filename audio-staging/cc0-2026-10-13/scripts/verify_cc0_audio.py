"""Verify the portable catalog against actual files and publisher evidence."""
import hashlib
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def verify():
    manifest = json.loads((ROOT/'assets/metadata/audio/cc0-library.json').read_text(encoding='utf-8'))
    sources = json.loads((ROOT/'assets/metadata/audio/cc0-sources.json').read_text(encoding='utf-8'))
    source_map = {s['id']:s for s in sources}
    assets = manifest['assets']
    assert len(assets) == manifest['count']
    assert len({a['id'] for a in assets}) == len(assets)
    assert len({a['sourceSha256'] for a in assets}) == len(assets)
    assert dict(Counter(a['category'] for a in assets)) == manifest['countsByCategory']
    for asset in assets:
        assert asset['license'] == 'CC0-1.0'
        assert asset['durationSeconds'] > 0
        assert asset['author'] and asset['author'] != 'UNKNOWN'
        assert asset['redistributionAllowed'] and not asset['attributionRequired']
        assert asset['qa']['fullDecode'] == 'pass'
        evidence = json.loads((ROOT/asset['licenseEvidence']).read_text(encoding='utf-8'))
        assert evidence['licenses'] in (['CC0'], ['Creative Commons CC0'])
        assert evidence['url'] == asset['sourceUrl']
        assert source_map[asset['sourcePack']]['url'] == asset['sourceUrl']
        for kind in ['source','runtime']:
            path = (ROOT/asset[kind+'Path']).resolve()
            assert path.is_relative_to(ROOT)
            assert path.is_file()
            assert path.stat().st_size == asset[kind+'Bytes']
            assert sha(path) == asset[kind+'Sha256']
            assert path.stat().st_size < 100*1024*1024, f'GitHub per-file size limit: {path}'
        assert (ROOT/asset['licenseEvidence']).with_name('source-page.html').is_file()
    for path in (ROOT/'assets').rglob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))
    # Audio preview paths are relative to assets/, with no server-side fetch needed.
    preview = (ROOT/'assets/audio-preview.html').read_text(encoding='utf-8')
    assert '__AUDIO_DATA__' not in preview
    assert all(a['runtimePath'] in preview for a in assets)
    print(json.dumps({'result':'pass','assets':len(assets),'sources':len(sources),
                      'countsByCategory':manifest['countsByCategory'],
                      'sourceMiB':round(sum(a['sourceBytes'] for a in assets)/1024**2,2),
                      'runtimeMiB':round(sum(a['runtimeBytes'] for a in assets)/1024**2,2)}, ensure_ascii=False))

if __name__ == '__main__':
    verify()
