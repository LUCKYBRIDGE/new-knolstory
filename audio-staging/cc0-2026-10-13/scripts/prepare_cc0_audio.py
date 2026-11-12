"""Acquire only publisher-verified CC0 audio, with provenance and decode QA.

Run inspect_audio_sources.py first. Optional dependencies live in .tools/audio-python.
No application code or existing Asset IDs are modified.
"""
import argparse
import csv
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/audio-python'))
import imageio_ffmpeg
import mutagen

AUDIO = {'.wav', '.ogg', '.mp3', '.flac'}
LICENSE_URL = 'https://creativecommons.org/publicdomain/zero/1.0/'
SOURCE = ROOT / 'assets/source/audio/cc0'
RUNTIME = ROOT / 'assets/runtime/audio/cc0'
EVIDENCE = ROOT / 'assets/licenses/audio/cc0'
META = ROOT / 'assets/metadata/audio'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def relative(path):
    return path.relative_to(ROOT).as_posix()

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def filename(url):
    return unquote(urlparse(url).path.rsplit('/', 1)[-1])

def canonical(name):
    return re.sub(r'_\d+$', '', Path(name).stem).lower().replace(' ', '_')

def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')

def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 0:
        return
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    temporary = target.with_suffix(target.suffix + '.partial')
    with urllib.request.urlopen(request, timeout=60) as response, temporary.open('wb') as output:
        if 'text/html' in response.headers.get('Content-Type', ''):
            raise ValueError(f'Expected media, received HTML: {url}')
        shutil.copyfileobj(response, output)
    temporary.replace(target)

def select_downloads(source):
    urls = [u for u in source['downloads'] if Path(filename(u)).suffix.lower() in AUDIO | {'.zip'}]
    if source.get('select'):
        urls = [u for u in urls if canonical(filename(u)) == canonical(source['select']) and Path(filename(u)).suffix.lower() == Path(source['select']).suffix.lower()]
    elif source.get('allFiles'):
        # Store one format per musical performance, preferring lossless masters.
        grouped = {}
        rank = {'.wav':0, '.flac':1, '.ogg':2, '.mp3':3, '.zip':4}
        for url in urls:
            key = canonical(filename(url))
            old = grouped.get(key)
            if not old or rank[Path(filename(url)).suffix.lower()] < rank[Path(filename(old)).suffix.lower()]:
                grouped[key] = url
        urls = list(grouped.values())
    else:
        loops = [u for u in urls if 'loop' in filename(u).lower()]
        if source.get('preferLoop') and loops:
            urls = loops
        rank = {'.wav':0, '.flac':1, '.ogg':2, '.mp3':3, '.zip':4}
        urls = sorted(urls, key=lambda u: rank[Path(filename(u)).suffix.lower()])[:1]
    if not urls:
        raise ValueError(f"No matching download for {source['id']}")
    return urls

def acquire(source):
    if source['licenses'] not in (['CC0'], ['Creative Commons CC0']):
        raise ValueError(f"Not exclusively CC0: {source['id']} {source['licenses']}")
    if source['author'] == 'UNKNOWN':
        raise ValueError(f"Missing author: {source['id']}")
    files = []
    downloads = []
    for url in select_downloads(source):
        name = filename(url)
        if Path(name).suffix.lower() == '.zip':
            archive = SOURCE / '_downloads' / source['id'] / name
            download(url, archive)
            with zipfile.ZipFile(archive) as bundle:
                bad = bundle.testzip()
                if bad:
                    raise ValueError(f'Corrupt archive member: {bad}')
                chosen = {}
                for member in bundle.infolist():
                    if member.is_dir():
                        continue
                    path = Path(member.filename.replace('\\', '/'))
                    if path.is_absolute() or path.drive or path.root or '..' in path.parts or any(':' in part for part in path.parts):
                        raise ValueError(f'Unsafe archive path: {member.filename}')
                    if path.suffix.lower() in AUDIO:
                        if path.stem.lower() == 'preview':
                            continue
                        key = path.stem.lower()
                        old = chosen.get(key)
                        rank = {'.wav':0, '.flac':1, '.ogg':2, '.mp3':3}
                        if not old or rank[path.suffix.lower()] < rank[Path(old.filename).suffix.lower()]:
                            chosen[key] = member
                    elif path.suffix.lower() == '.txt' and any(t in path.name.lower() for t in ['license', 'readme', 'credit']):
                        dest = EVIDENCE / source['id'] / 'included' / path
                        if not dest.resolve().is_relative_to((EVIDENCE / source['id'] / 'included').resolve()):
                            raise ValueError(f'Unsafe evidence path: {member.filename}')
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(bundle.read(member))
                for member in chosen.values():
                    dest = SOURCE / source['id'] / Path(member.filename.replace('\\', '/'))
                    if not dest.resolve().is_relative_to((SOURCE / source['id']).resolve()):
                        raise ValueError(f'Unsafe audio path: {member.filename}')
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if not dest.exists():
                        dest.write_bytes(bundle.read(member))
                    files.append((dest, url, member.filename))
            downloads.append({'url':url, 'sha256':digest(archive), 'bytes':archive.stat().st_size, 'archive':True})
        else:
            dest = SOURCE / source['id'] / name
            download(url, dest)
            files.append((dest, url, None))
            downloads.append({'url':url, 'sha256':digest(dest), 'bytes':dest.stat().st_size, 'archive':False})
    return source, files, downloads

def decorate(source, original):
    stem = original.stem
    tags = list(source['tags'])
    hints = [('footstep','발걸음'), ('door','문'), ('cloth','옷'), ('book','책'), ('coin','동전'),
             ('wood','나무'), ('metal','금속'), ('glass','유리'), ('water','물'), ('stone','돌'),
             ('leather','가죽'), ('grass','풀'), ('gravel','자갈'), ('click','버튼'), ('switch','스위치'),
             ('confirmation','확인'), ('error','오류'), ('success','성공'), ('jingle','전환'),
             ('bird','새'), ('river','강물'), ('wind','바람'), ('frog','개구리'), ('cricket','귀뚜라미')]
    specific = [ko for en,ko in hints if en in stem.lower()]
    tags.extend(specific)
    return source['titleKo'] + ' · ' + stem, list(dict.fromkeys(tags))

def prepare(job):
    source, original, url, member = job
    category = source['category']
    for rule in source.get('categoryByFilename', []):
        if re.search(rule['pattern'], original.stem, re.IGNORECASE):
            category = rule['category']
            break
    if category not in {'bgm', 'ambience', 'foley', 'sfx', 'ui', 'jingle'}:
        raise ValueError(f'Unknown audio category: {category}')
    original_hash = digest(original)
    name = slug(original.stem)
    identifier = f"audio.cc0.{source['id']}.{name}"
    extension = original.suffix.lower() if original.suffix.lower() in {'.ogg', '.mp3'} else '.ogg'
    previous = CACHE.get(identifier)
    changed = bool(previous and previous['sourceSha256'] != original_hash)
    revision = previous['revision'] + int(changed) if previous else 1
    runtime = RUNTIME / source['id'] / ('v' + str(revision)) / (name + extension)
    runtime.parent.mkdir(parents=True, exist_ok=True)
    cache_valid = bool(previous and not changed and previous['runtimePath'] == relative(runtime)
                       and runtime.exists() and digest(runtime) == previous['runtimeSha256'])
    if not cache_valid:
        if original.suffix.lower() in {'.ogg', '.mp3'}:
            shutil.copyfile(original, runtime)
        else:
            subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-xerror', '-i', str(original),
                            '-map', '0:a:0', '-vn', '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '4', str(runtime)],
                           check=True, capture_output=True, timeout=180)
    audio = mutagen.File(runtime)
    if audio is None or not math.isfinite(audio.info.length) or audio.info.length <= 0:
        raise ValueError(f'Invalid audio: {runtime}')
    # Decode every frame and measure levels, rather than trusting extensions/headers.
    probe = subprocess.run([FFMPEG, '-hide_banner', '-nostdin', '-v', 'info', '-xerror', '-i', str(runtime),
                            '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-'],
                           capture_output=True, text=True, check=True, timeout=180)
    peaks = re.findall(r'Peak level dB: ([-\w.]+)', probe.stderr)
    rms = re.findall(r'RMS level dB: ([-\w.]+)', probe.stderr)
    peak = float(peaks[-1]) if peaks else None
    rms_level = float(rms[-1]) if rms else None
    title, tags = decorate(source, original)
    claimed = bool(source.get('loopClaimed') or source.get('preferLoop') or 'loop' in original.stem.lower())
    return {
        'id':identifier, 'revision':revision, 'type':'audio', 'category':category,
        'titleKo':title, 'originalFilename':original.name, 'tagsKo':tags,
        'sourcePack':source['id'], 'author':source['author'], 'sourceUrl':source['url'],
        'downloadUrl':url, 'archiveMember':member,
        'license':'CC0-1.0', 'licenseUrl':LICENSE_URL, 'licenseVerifiedOn':DATE,
        'licenseEvidence':relative(EVIDENCE/source['id']/'inspection.json'),
        'sourcePath':relative(original), 'sourceSha256':original_hash,
        'sourceBytes':original.stat().st_size, 'runtimePath':relative(runtime),
        'runtimeSha256':digest(runtime), 'runtimeBytes':runtime.stat().st_size,
        'durationSeconds':round(audio.info.length, 4), 'sampleRateHz':audio.info.sample_rate,
        'channels':audio.info.channels, 'redistributionAllowed':True, 'attributionRequired':False,
        'loop':{'publisherClaimed':claimed, 'auditionVerified':False, 'startSeconds':None, 'endSeconds':None},
        'qa':{'fullDecode':'pass', 'peakDbfs':round(peak,2) if peak is not None and math.isfinite(peak) else None,
              'rmsDbfs':round(rms_level,2) if rms_level is not None and math.isfinite(rms_level) else None,
              'nearSilence':rms_level is None or rms_level < -60,
              'peakAboveZero':peak is not None and peak > 0,
              'listeningReview':'pending'},
        'suggestedGainDb':-6 if category in {'bgm','ambience'} else -3,
        'curationStatus':'acquired-awaiting-audition'
    }

def write_preview(assets):
    template = (ROOT/'scripts/audio_preview.template.html').read_text(encoding='utf-8')
    # Embedded JSON keeps preview usable when opened directly from disk.
    data = json.dumps(assets, ensure_ascii=False).replace('<', '\\u003c')
    (ROOT/'assets/audio-preview.html').write_text(template.replace('__AUDIO_DATA__', data), encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verified-on', required=True, help='Publisher verification date (YYYY-MM-DD, local client date)')
    args = parser.parse_args()
    DATE = args.verified_on
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', DATE):
        parser.error('Invalid --verified-on date')
    sources = json.loads((ROOT/'scripts/audio_sources.json').read_text(encoding='utf-8'))
    previous_path = META/'cc0-library.json'
    CACHE = {a['id']:a for a in json.loads(previous_path.read_text(encoding='utf-8'))['assets']} if previous_path.exists() else {}
    inspected = [json.loads((EVIDENCE/s['id']/'inspection.json').read_text(encoding='utf-8')) for s in sources]
    jobs, packs = [], []
    with ThreadPoolExecutor(max_workers=3) as pool:
        for source, files, downloads in pool.map(acquire, inspected):
            print(f"Downloaded {source['id']}: {len(files)} audio files", flush=True)
            packs.append({**source, 'verifiedOn':DATE, 'acquiredDownloads':downloads})
            jobs.extend((source, file, url, member) for file,url,member in files)
    assets = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        for index, item in enumerate(pool.map(prepare, jobs), 1):
            assets.append(item)
            if index % 50 == 0:
                print(f'Prepared and decoded {index}/{len(jobs)}', flush=True)
    # Exact duplicates are aliases, not inflated library counts.
    hashes, unique, duplicates = {}, [], []
    for item in assets:
        if item['sourceSha256'] in hashes:
            duplicates.append({'id':item['id'], 'duplicateOf':hashes[item['sourceSha256']], 'sourcePath':item['sourcePath']})
        else:
            hashes[item['sourceSha256']] = item['id']
            unique.append(item)
    ids = [a['id'] for a in unique]
    paths = [a['runtimePath'] for a in unique]
    if len(ids) != len(set(ids)) or len(paths) != len(set(paths)):
        raise ValueError('Asset ID or runtime path collision')
    META.mkdir(parents=True, exist_ok=True)
    manifest = {'schemaVersion':1, 'preparedOn':DATE, 'purpose':'CC0 acquisition staging; merge into final registry later',
                'count':len(unique), 'countsByCategory':dict(Counter(a['category'] for a in unique)),
                'assets':unique, 'duplicateAliases':duplicates}
    (META/'cc0-library.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    (META/'cc0-sources.json').write_text(json.dumps(packs, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    fields = ['id','category','titleKo','author','license','sourceUrl','durationSeconds','runtimePath','sourcePath','licenseVerifiedOn','curationStatus']
    with (META/'cc0-library.csv').open('w', encoding='utf-8-sig', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(unique)
    report = {'verifiedOn':DATE, 'assetCount':len(unique), 'fullDecodePassed':len(unique),
              'duplicateCount':len(duplicates), 'sourceBytes':sum(a['sourceBytes'] for a in unique),
              'runtimeBytes':sum(a['runtimeBytes'] for a in unique),
              'nearSilentAssets':[a['id'] for a in unique if a['qa']['nearSilence']],
              'peakAboveZeroAssets':[a['id'] for a in unique if a['qa']['peakAboveZero']],
              'listeningReview':'pending; mechanical decode is not a subjective quality or loop-seam review'}
    (META/'cc0-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    write_preview(unique)
    print(json.dumps({**report, 'countsByCategory':manifest['countsByCategory']}, ensure_ascii=False), flush=True)
