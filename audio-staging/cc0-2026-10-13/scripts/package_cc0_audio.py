"""Package only acquisition artifacts, preserving paths for another checkout."""
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

if __name__=='__main__':
    catalog=json.loads((ROOT/'assets/metadata/audio/cc0-library.json').read_text(encoding='utf-8'))
    files=set()
    for a in catalog['assets']:
        files.update([ROOT/a['sourcePath'],ROOT/a['runtimePath']])
    files.update(ROOT/a['sourcePath'] for a in catalog['duplicateAliases'])
    for folder in ['assets/licenses/audio','assets/metadata/audio','docs/assets','docs/handoffs']:
        files.update(p for p in (ROOT/folder).rglob('*') if p.is_file())
    files.update([ROOT/'assets/audio-preview.html',ROOT/'assets/CC0_AUDIO_README.md'])
    files.update(p for p in (ROOT/'scripts').glob('*') if p.is_file() and ('audio' in p.name))
    public_copies={};redactions=[]
    for p in sorted(files):
        if p.suffix.lower() != '.html':continue
        original=p.read_bytes()
        public,count=re.subn(rb'(?:pk|sk)\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?',b'REDACTED_PUBLICATION_MAPBOX_TOKEN',original)
        if count:
            public_copies[p]=public
            redactions.append({'path':p.relative_to(ROOT).as_posix(),'originalSha256':hashlib.sha256(original).hexdigest(),
                'publishedSha256':hashlib.sha256(public).hexdigest(),'replacements':count,
                'reason':'Third-party website Mapbox token removed from publication; local acquisition HTML retained.'})
    redaction_path=ROOT/'assets/metadata/audio/publication-redactions.json'
    redaction_path.write_text(json.dumps({'redactions':redactions,'scope':'Only public export HTML is sanitized. Catalog audio and license declarations are unchanged.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    files.add(redaction_path)
    output=ROOT/'exports/new-knolstory-cc0-audio-2026-10-13.zip'
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
        for p in sorted(files):
            if p in public_copies:
                bundle.writestr(p.relative_to(ROOT).as_posix(),public_copies[p])
            else:
                bundle.write(p,p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(output) as bundle:
        bad=bundle.testzip()
        if bad: raise ValueError(f'Corrupt ZIP entry: {bad}')
        included=set(bundle.namelist())
        for a in catalog['assets']:
            assert a['sourcePath'] in included and a['runtimePath'] in included and a['licenseEvidence'] in included
        assert not any(p.startswith(('.git/','.tools/','exports/')) or '/_downloads/' in p for p in included)
    with output.open('rb') as stream:
        checksum=hashlib.file_digest(stream,'sha256').hexdigest()
    report={'filename':output.name,'bytes':output.stat().st_size,'sha256':checksum,'entries':len(files),'assetCount':catalog['count'],'zipCrcVerification':'pass','publicationRedactions':redactions}
    output.with_suffix('.manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
