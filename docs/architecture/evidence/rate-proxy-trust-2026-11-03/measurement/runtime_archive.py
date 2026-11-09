"""Read exactly two regular members; never unpack archive paths to disk."""
from pathlib import Path, PurePosixPath
import re
import tarfile


def reviewed_members(archive_path, version='v22.23.3'):
    if not re.fullmatch(r'v22\.\d+\.\d+', version):
        raise ValueError('Invalid runtime version.')
    path=Path(archive_path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size>80*1024*1024:
        raise ValueError('Invalid runtime archive.')
    prefix='node-'+version+'-darwin-arm64/'
    selected={prefix+'bin/node':('node',128*1024*1024),prefix+'LICENSE':('LICENSE',1024*1024)}
    result={}
    try:
        with tarfile.open(path,'r:gz')as archive:
            for index,member in enumerate(archive):
                if index>=20000 or member.name.startswith('/') or '\\'in member.name or '..'in PurePosixPath(member.name).parts:
                    raise ValueError('Unsafe runtime archive member.')
                if member.name not in selected:
                    continue
                key,limit=selected[member.name]
                if key in result or not member.isfile() or not 0<member.size<=limit:
                    raise ValueError('Invalid selected runtime member.')
                with archive.extractfile(member)as stream:
                    data=stream.read(limit+1)
                if len(data)!=member.size or len(data)>limit:
                    raise ValueError('Runtime member differs from header.')
                result[key]=data
    except (tarfile.TarError, OSError, EOFError)as error:
        raise ValueError('Invalid runtime archive.')from error
    if set(result)!={'node','LICENSE'}:
        raise ValueError('Missing selected runtime members.')
    return result
