"""Compare approved local audio with a staged catalogue without modifying media or rights."""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def decoded_digest(path):
    command = ['ffmpeg', '-v', 'error', '-i', str(path), '-ar', '16000', '-ac', '2', '-f', 's16le', '-']
    errors = tempfile.TemporaryFile()
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors)
    digest, length = hashlib.sha256(), 0
    for data in iter(lambda: process.stdout.read(65536), b''):
        digest.update(data)
        length += len(data)
    code=process.wait();errors.seek(0);error=errors.read().decode('utf-8','replace');errors.close()
    if code or not length:
        raise ValueError(f'Audio decode failed: {path.name}: {error}')
    return {'decodedSha256': digest.hexdigest(), 'decodedBytes': length}

def compare(package):
    incoming = json.loads((package/'assets/metadata/audio/cc0-library.json').read_text())['assets']
    existing = json.loads((ROOT/'packages/asset-registry/src/audio-service-approvals.json').read_text())['assets']
    hashes, old_paths, exact = {}, {}, []
    for row in existing:
        path = ROOT/'apps/web/public'/row['src'].lstrip('/')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != row['sha256']:
            raise ValueError(f'Existing approved bytes changed: {row["id"]}')
        hashes.setdefault(digest, []).append(row)
        old_paths[row['id']] = path
    matched = set()
    for row in incoming:
        for digest in {row['sourceSha256'], row['runtimeSha256']}:
            for old in hashes.get(digest, []):
                exact.append({'newId': row['id'], 'existingId': old['id'], 'sha256': digest, 'existingLicense': old['license'], 'newSource': row['sourceUrl'], 'existingSource': old['sourceUrl']})
                matched.add(row['id'])
    jobs = [(row['id'], old_paths[row['id']]) for row in existing]
    jobs += [(row['id'], package/row['runtimePath']) for row in incoming if row['id'] not in matched]
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(decoded_digest, path): identifier for identifier, path in jobs}
        for future in concurrent.futures.as_completed(futures):
            results[futures[future]] = future.result()
    old_decoded = {}
    for row in existing:
        value = results[row['id']]
        old_decoded.setdefault((value['decodedSha256'], value['decodedBytes']), []).append(row['id'])
    decoded = []
    for row in incoming:
        if row['id'] in matched:
            continue
        value = results[row['id']]
        for old in old_decoded.get((value['decodedSha256'], value['decodedBytes']), []):
            decoded.append({'newId': row['id'], 'existingId': old, **value})
    return {'version': 1, 'existingCount': len(existing), 'incomingCount': len(incoming), 'exactByteMatches': exact, 'normalizedDecodedCandidates': decoded, 'decodedFiles': len(results), 'normalization': 'FFmpeg full decode; stereo 16000 Hz signed16 PCM; no gain or trimming', 'scope': 'Read-only; only exact-byte matches may be aliased after provenance comparison. Normalized matches are review candidates. Different trims/lossy encodings may still require listening.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-root', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = compare(args.package_root.resolve())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'existing': result['existingCount'], 'incoming': result['incomingCount'], 'exact': len(result['exactByteMatches']), 'decodedCandidates': len(result['normalizedDecodedCandidates']), 'fullDecodes': result['decodedFiles']}))
