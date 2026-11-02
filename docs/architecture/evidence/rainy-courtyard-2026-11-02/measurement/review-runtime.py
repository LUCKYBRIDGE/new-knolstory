"""Seal the one rainy-courtyard addition against the prior exact source review.
Run only after the pinned runtime build completes. Unknown members fail closed.
Generated placeholder bytes are recorded, not claimed independently regenerated.
"""
import collections
import hashlib
import json
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[5]
PRIOR = 'docs/architecture/evidence/transition-action-spacing-2026-11-02/runtime-review.json'
ASSET_ID = 'seonnyeo.background.cottage-rain-evening-v1'
ASSET_PATH = '/assets/backgrounds/weather-v1/seonnyeo-cottage-rain-evening.webp'
AUTHORIZATION = 'packages/asset-registry/src/project-media-authorization.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    review = json.loads((ROOT / PRIOR).read_text())
    baseline = {row['name']: row for row in review['archiveMembers']}
    catalogue = json.loads((ROOT / 'packages/asset-registry/src/catalog.json').read_text())
    assets = [asset for asset in catalogue if asset['metadata'].get('layeredStoryAsset')
              or asset['metadata'].get('generatedWeatherAsset')]
    weather = [asset for asset in catalogue if asset['metadata'].get('generatedWeatherAsset')]
    if len(catalogue) != 433 or len(weather) != 1 or weather[0]['id'] != ASSET_ID or weather[0]['src'] != ASSET_PATH:
        raise ValueError('This review authorizes exactly the one registered rainy-courtyard addition.')
    asset = weather[0]
    grants = {row['file']: row for row in json.loads((ROOT / AUTHORIZATION).read_text())['assets']}
    source = 'apps/web/public' + ASSET_PATH
    grant = grants[source]
    source_sha = sha((ROOT / source).read_bytes())
    if source_sha != asset['revision'] or source_sha != grant['sha256'] or ASSET_ID not in grant['assetIds']:
        raise ValueError('Generated source/catalogue/authorization hashes or asset identity differ.')
    new_member = '_placeholders/' + ASSET_PATH.lstrip('/')
    allowed_directories = {str(parent) + '/' for member in [new_member, 'game/' + ASSET_PATH.lstrip('/')]
                           for parent in PurePosixPath(member).parents if str(parent) != '.'}
    for archive in review['sdkArchives']:
        if sha((ROOT / archive['file']).read_bytes()) != archive['sha256']:
            raise ValueError('Pinned SDK archive changed: ' + archive['file'])
    for match in review['engineByteMatches']:
        if sha((ROOT / match['sdkSource']).read_bytes()) != match['sdkSourceSha256']:
            raise ValueError('Pinned SDK engine source changed: ' + match['sdkSource'])
    rows, changed, added = [], [], []
    with zipfile.ZipFile(ROOT / 'apps/web/public/runtime/game.zip') as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or not set(baseline).issubset(names):
            raise ValueError('Duplicate or removed archive members require separate review.')
        for info in archive.infolist():
            name, data = info.filename, archive.read(info)
            row = dict(baseline[name]) if name in baseline else None
            if row is None:
                if info.is_dir() and name in allowed_directories:
                    row = {'name': name, 'category': 'directory'}
                elif name == new_member and not info.is_dir():
                    row = {'name': name, 'category': 'generated-placeholder', 'source': source,
                           'sourceSha256': source_sha,
                           'generationEvidence': ['spikes/renpy-web/placeholders.py', 'scripts/prepare-rainy-courtyard-asset.py',
                                                  'docs/architecture/evidence/rainy-courtyard-2026-11-02/generation.json'],
                           'authorization': {'declaration': AUTHORIZATION, 'assetFile': source, 'sha256': source_sha}}
                else:
                    raise ValueError('Unreviewed new archive member: ' + name)
                added.append(name)
            category = row['category']
            if category.endswith('-exact'):
                if (ROOT / row['source']).read_bytes() != data:
                    raise ValueError('Exact source mismatch: ' + name)
                row['sourceSha256'] = sha(data)
            elif category == 'generated-placeholder':
                if sha((ROOT / row['source']).read_bytes()) != row['sourceSha256']:
                    raise ValueError('Generated placeholder source changed: ' + name)
            elif category == 'generated-progressive-index':
                if sha((ROOT / row['source']).read_bytes()) != row['sourceSha256']:
                    raise ValueError('Progressive recipe changed; review independently.')
                for registered in assets:
                    if registered['src'].lstrip('/').encode() not in data:
                        raise ValueError('Missing registered progressive path: ' + registered['id'])
            elif category != 'directory':
                raise ValueError('Unsupported prior source category: ' + category)
            if row.get('sha256') != sha(data):
                changed.append(name)
            row.update(sha256=sha(data), bytes=len(data))
            rows.append(row)
    if new_member not in added:
        raise ValueError('Expected rainy-courtyard placeholder is absent from the rebuilt archive.')
    counts = dict(collections.Counter(row['category'] for row in rows))
    review.update(reviewedAt='2026-11-02', supersedes=PRIOR, archiveMembers=rows,
                  archiveMemberCount=len(rows), categories=counts, unclassifiedMembers=[])
    for row in review['files']:
        path = ROOT / 'apps/web/public' / row['path']
        digest, size = sha(path.read_bytes()), path.stat().st_size
        if row['path'] != 'runtime/game.zip' and (digest != row['sha256'] or size != row['bytes']):
            raise ValueError('Engine/transport bytes changed; independent review required: ' + row['path'])
        row.update(sha256=digest, bytes=size)
    output = Path(__file__).resolve().parents[1]
    (output / 'runtime-review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
    (output / 'runtime-delta.json').write_text(json.dumps({
        'prior': PRIOR, 'archiveMembers': len(rows), 'changedMembers': changed, 'newMembers': added,
        'counts': counts, 'registeredAssetCount': len(catalogue),
        'newGeneratedAsset': {'id': ASSET_ID, 'source': source, 'sha256': source_sha},
        'boundary': 'Exact source equality checked member by member; pinned SDK archives/sources and sealed engine/transport unchanged. Generated placeholder output not independently regenerated.'
    }, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'archiveMembers': len(rows), 'changedMembers': len(changed), 'newMembers': added}))


if __name__ == '__main__':
    main()
