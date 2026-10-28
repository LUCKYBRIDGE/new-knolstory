"""Install verified referenced shared audio; contains no StoryDocument or service policy logic."""
import base64
import hashlib
import re
import time
from pathlib import Path

PATTERN=re.compile(r'assets/audio/cc0/[a-z0-9_-]+/v[1-9][0-9]*/[a-z0-9_-]+\.(ogg|mp3|wav)')

class ServiceAudioCache:
    def __init__(self,root,max_bytes=64*1024*1024):
        self.root=Path(root).resolve()
        self.max_bytes=max_bytes
        self.entries={}
    def install(self,resources,referenced,protected=()):
        if not isinstance(resources,list) or len(resources)>42 or sum(len(row.get('data','')) if isinstance(row,dict) and isinstance(row.get('data'),str) else 32000001 for row in resources)>32000000:
            raise ValueError('Invalid shared audio list')
        expected=set(referenced)
        keep=expected|set(protected)
        staged=[]
        for row in resources:
            if not isinstance(row,dict) or not isinstance(row.get('path'),str) or len(row['path'])>500 or row['path'] not in expected or not PATTERN.fullmatch(row['path']):
                raise ValueError('Unreferenced shared audio path')
            if any(path==row['path'] for path,_,_ in staged):
                raise ValueError('Duplicate shared audio path')
            digest=row.get('sha256');data=row.get('data')
            if not isinstance(digest,str) or not re.fullmatch(r'[a-f0-9]{64}',digest) or not isinstance(data,str) or len(data)>12000000:
                raise ValueError('Invalid shared audio bytes')
            value=base64.b64decode(data,validate=True)
            if not value or len(value)>8*1024*1024 or hashlib.sha256(value).hexdigest()!=digest:
                raise ValueError('Changed shared audio bytes')
            extension=row['path'].rsplit('.',1)[1]
            mime={'ogg':'audio/ogg','mp3':'audio/mpeg','wav':'audio/wav'}[extension]
            valid=value.startswith(b'OggS') if extension=='ogg' else value.startswith(b'ID3') or value[0]==255 and len(value)>1 and value[1]&224==224 if extension=='mp3' else value.startswith(b'RIFF') and value[8:12]==b'WAVE'
            if row.get('mime')!=mime or not valid:
                raise ValueError('Invalid shared audio format')
            destination=(self.root/row['path']).resolve()
            if self.root not in destination.parents:
                raise ValueError('Escaped shared audio path')
            if destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest()!=digest:
                raise ValueError('Shared versioned file changed')
            staged.append((row['path'],value,destination))
        incoming=sum(len(value) for path,value,_ in staged if path not in self.entries)
        total=sum(size for size,_ in self.entries.values())+incoming
        for path,(size,_) in sorted(self.entries.items(),key=lambda item:item[1][1]):
            if total<=self.max_bytes:break
            if path in keep:continue
            target=(self.root/path).resolve()
            if self.root not in target.parents:raise ValueError('Escaped cache path')
            if target.exists():target.unlink()
            self.entries={key:value for key,value in self.entries.items() if key!=path};total-=size
        if total>self.max_bytes:raise ValueError('Shared audio cache limit exceeded')
        for path,value,destination in staged:
            destination.parent.mkdir(parents=True,exist_ok=True)
            if destination.exists():
                if hashlib.sha256(destination.read_bytes()).hexdigest()!=hashlib.sha256(value).hexdigest():raise ValueError('Shared versioned file changed')
            else:destination.write_bytes(value)
            self.entries={**self.entries,path:(len(value),time.monotonic())}
        for path in expected:
            if path in self.entries:
                size,_=self.entries[path];self.entries={**self.entries,path:(size,time.monotonic())}
