"""Seal the 2026-11-26 runtime against the 2026-11-21 exact source review.

Since 2026-11-21 only the reviewed project source changed (renpy/responsive-spike
presentation.rpy and script.rpy: actors leaving the stage, f076de5d), so only the
compiled project scripts may differ. No new archive member is accepted. Everything
else must stay exact: SDK inputs, engines, transport, notices and every earlier member.
"""
import collections
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
PRIOR = 'docs/architecture/evidence/picturebook-release-2026-11-21/runtime-review.json'
AUTHORIZATION = 'packages/asset-registry/src/project-media-authorization.json'
NEW_DIRECTORIES = set()
NEW_PLACEHOLDER_ROOTS = ()
CHANGEABLE = {'project-exact', 'sdk-build-metadata-exact', 'generated-progressive-index'}
EMPTY = hashlib.sha256(b'').hexdigest()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def authorized_hashes(node, found):
    if isinstance(node, dict):
        for value in node.values():
            authorized_hashes(value, found)
    elif isinstance(node, list):
        for value in node:
            authorized_hashes(value, found)
    elif isinstance(node, str) and len(node) == 64 and all(c in '0123456789abcdef' for c in node):
        found.add(node)
    return found


def main():
    review = json.loads((ROOT / PRIOR).read_text())
    baseline = {row['name']: row for row in review['archiveMembers']}
    authorized = authorized_hashes(json.loads((ROOT / AUTHORIZATION).read_text()), set())
    for row in review['sdkArchives']:
        if sha((ROOT / row['file']).read_bytes()) != row['sha256']:
            raise ValueError('Pinned SDK archive changed: ' + row['file'])
    for row in review['engineByteMatches']:
        if sha((ROOT / row['sdkSource']).read_bytes()) != row['sdkSourceSha256']:
            raise ValueError('Pinned SDK engine source changed: ' + row['sdkSource'])
    rows, changed, added = [], [], []
    with zipfile.ZipFile(ROOT / 'apps/web/public/runtime/game.zip') as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(baseline) - set(names):
            raise ValueError('Archive lost or repeats an earlier member.')
        for info in archive.infolist():
            name, data = info.filename, archive.read(info)
            if name in baseline:
                row = dict(baseline[name])
            elif name in NEW_DIRECTORIES:
                if data:
                    raise ValueError('Directory entry has content: ' + name)
                row = {'name': name, 'category': 'directory'}
            elif name.startswith(NEW_PLACEHOLDER_ROOTS) and name.endswith('.webp'):
                source = 'apps/web/public/' + name[len('_placeholders/'):]
                path = ROOT / source
                if path.is_symlink() or not path.is_file():
                    raise ValueError('Placeholder without a source image: ' + name)
                source_sha = sha(path.read_bytes())
                if source_sha not in authorized:
                    raise ValueError('Placeholder source is not in the owner authorization: ' + name)
                if len(data) >= path.stat().st_size:
                    raise ValueError('Placeholder is not smaller than its source: ' + name)
                row = {'name': name, 'category': 'generated-placeholder', 'source': source, 'sourceSha256': source_sha,
                       'generationEvidence': ['spikes/renpy-web/placeholders.py', 'scripts/prepare-runtime.py',
                                              'renpy/responsive-spike/progressive_download.txt'],
                       'authorization': {'declaration': AUTHORIZATION, 'assetFile': source, 'sha256': source_sha}}
            else:
                raise ValueError('Unreviewed new archive member: ' + name)
            if name not in baseline:
                added.append(name)
            if row['category'].endswith('-exact'):
                if (ROOT / row['source']).read_bytes() != data:
                    raise ValueError('Exact source mismatch: ' + name)
                row['sourceSha256'] = sha(data)
            elif row['category'] == 'generated-progressive-index':
                row['sourceSha256'] = sha((ROOT / row['source']).read_bytes())
            elif row['category'] == 'directory':
                if sha(data) != EMPTY:
                    raise ValueError('Directory entry has content: ' + name)
            elif name in baseline and sha(data) != row['sha256']:
                raise ValueError('Generated/opaque member changed: ' + name)
            if name in baseline and baseline[name].get('sha256') != sha(data):
                changed.append(name)
                if row['category'] not in CHANGEABLE:
                    raise ValueError('Unexpected changed member: ' + name)
            row.update(sha256=sha(data), bytes=len(data))
            rows.append(row)
        index = archive.read('game/renpyweb_remote_files.txt').decode('utf-8')
    # Every new placeholder is announced in the progressive index, so the full image is fetched from the site.
    unlisted = [name for name in added if name.startswith('_placeholders/') and name[len('_placeholders/'):] not in index]
    if unlisted:
        raise ValueError('Placeholder missing from the progressive index: ' + unlisted[0])
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
    review.update(reviewedAt='2026-11-26', supersedes=PRIOR, archiveMembers=rows,
                  archiveMemberCount=len(rows), categories=counts, unclassifiedMembers=[])
    output = Path(__file__).resolve().parents[1]
    (output / 'runtime-review.json').write_text(json.dumps(review, indent=2) + '\n')
    delta = {'prior': PRIOR, 'archiveMembers': len(rows),
             'newMembers': {'directories': sorted(name for name in added if name in NEW_DIRECTORIES),
                            'placeholders': len([name for name in added if name.startswith('_placeholders/')])},
             'changedMembers': sorted(changed), 'categories': counts,
             'boundary': 'Exact source/member/SDK/engine/transport/license comparison. New placeholders are tied to '
                         'owner-authorized source images by SHA-256; their pixels were not independently regenerated. '
                         'No hosting action or deployment.'}
    (output / 'runtime-delta.json').write_text(json.dumps(delta, indent=2) + '\n')
    print(json.dumps(delta))


if __name__ == '__main__':
    main()
