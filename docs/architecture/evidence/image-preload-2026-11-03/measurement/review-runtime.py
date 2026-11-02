"""Seal the image-preparation runtime against the previous exact source review.

Only two new project members are accepted. Existing generated image placeholders,
progressive indices, SDK inputs, engines, transport and notices must stay exact.
"""
import collections
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
PRIOR = 'docs/architecture/evidence/rainy-courtyard-2026-11-02/runtime-review.json'
NEW = {
    'game/image_preload.rpy': 'renpy/responsive-spike/game/image_preload.rpy',
    'game/image_preload.rpyc': 'renpy/responsive-spike/game/image_preload.rpyc',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    review = json.loads((ROOT / PRIOR).read_text())
    baseline = {row['name']: row for row in review['archiveMembers']}
    for row in review['sdkArchives']:
        if sha((ROOT / row['file']).read_bytes()) != row['sha256']:
            raise ValueError('Pinned SDK archive changed: ' + row['file'])
    for row in review['engineByteMatches']:
        if sha((ROOT / row['sdkSource']).read_bytes()) != row['sdkSourceSha256']:
            raise ValueError('Pinned SDK engine source changed: ' + row['sdkSource'])
    rows, changed = [], []
    with zipfile.ZipFile(ROOT / 'apps/web/public/runtime/game.zip') as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != set(baseline) | set(NEW):
            raise ValueError('Archive member delta exceeds the two reviewed project files.')
        for info in archive.infolist():
            name, data = info.filename, archive.read(info)
            row = dict(baseline[name]) if name in baseline else {
                'name': name, 'category': 'project-exact', 'source': NEW[name],
            }
            if row['category'].endswith('-exact'):
                if (ROOT / row['source']).read_bytes() != data:
                    raise ValueError('Exact source mismatch: ' + name)
                row['sourceSha256'] = sha(data)
            elif row['category'] != 'directory' and sha(data) != row['sha256']:
                raise ValueError('Generated/opaque member changed: ' + name)
            if name in baseline and baseline[name].get('sha256') != sha(data):
                changed.append(name)
                if row['category'] not in {'project-exact', 'sdk-build-metadata-exact'}:
                    raise ValueError('Unexpected changed non-project member: ' + name)
            row.update(sha256=sha(data), bytes=len(data))
            rows.append(row)
    for notice in review['notices']:
        if sha((ROOT / notice['file']).read_bytes()) != notice['sha256']:
            raise ValueError('Distributed license notice changed.')
    for row in review['files']:
        path = ROOT / 'apps/web/public' / row['path']
        digest, size = sha(path.read_bytes()), path.stat().st_size
        if row['path'] != 'runtime/game.zip' and (digest != row['sha256'] or size != row['bytes']):
            raise ValueError('Engine or transport changed: ' + row['path'])
        row.update(sha256=digest, bytes=size)
    counts = dict(collections.Counter(row['category'] for row in rows))
    review.update(reviewedAt='2026-11-03', supersedes=PRIOR, archiveMembers=rows,
                  archiveMemberCount=len(rows), categories=counts, unclassifiedMembers=[])
    output = Path(__file__).resolve().parents[1]
    (output / 'runtime-review.json').write_text(json.dumps(review, indent=2) + '\n')
    delta = {'prior': PRIOR, 'archiveMembers': len(rows), 'newMembers': NEW,
             'changedMembers': sorted(changed), 'categories': counts,
             'boundary': 'Exact source/member/SDK/engine/transport/license comparison. No new media, hosting action or deployment.'}
    (output / 'runtime-delta.json').write_text(json.dumps(delta, indent=2) + '\n')
    print(json.dumps(delta))


if __name__ == '__main__':
    main()
