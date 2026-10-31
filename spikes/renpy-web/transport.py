"""Brotli transport copies of large runtime files and the sizes the loading screen counts against.
Each `.br` file decodes to the unchanged runtime file; only the HTTP transport encoding differs.
Cloudflare does not compress application/octet-stream, and Pages compresses wasm at a low level,
so the edge Worker serves these copies with Content-Encoding: br when the browser accepts it.
"""
import json
from pathlib import Path
import subprocess

BROTLI_FILES = ('renpy.data', 'renpy.wasm')
BRIDGE_TAG = '<script src="knol-bridge.js"></script>'
# Quality 11 once per runtime build; the round trip must return the exact bytes before the copy is kept.
COMPRESS = (
    "const fs=require('fs'),zlib=require('zlib');const [source,target]=process.argv.slice(1);"
    "const data=fs.readFileSync(source);"
    "const out=zlib.brotliCompressSync(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11,[zlib.constants.BROTLI_PARAM_SIZE_HINT]:data.length}});"
    "if(!zlib.brotliDecompressSync(out).equals(data))throw Error('Brotli round trip changed the runtime bytes.');"
    "fs.writeFileSync(target+'.tmp',out);fs.renameSync(target+'.tmp',target);"
)


def write_brotli_copies(output: Path, names=BROTLI_FILES) -> dict:
    sizes = {}
    for name in names:
        source = Path(output) / name
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Runtime file not found for transport compression: {name}')
        target = Path(output) / f'{name}.br'
        subprocess.run(['node', '-e', COMPRESS, str(source), str(target)], check=True)
        sizes[name] = target.stat().st_size
    return sizes


def transfer_info(output: Path) -> dict:
    """`bytes` is the decoded size the browser counts; `weight` estimates transfer so the bar moves with time."""
    output = Path(output)

    def size(name):
        path = output / name
        if not path.is_file():
            raise ValueError(f'Runtime file not found: {name}')
        return path.stat().st_size

    def weight(name):
        copy = output / f'{name}.br'
        return copy.stat().st_size if copy.is_file() else size(name)

    return {'version': 1,
            'wasm': {'bytes': size('renpy.wasm'), 'weight': weight('renpy.wasm')},
            'data': {'bytes': size('renpy.data'), 'weight': weight('renpy.data')},
            'game': {'bytes': size('game.zip'), 'weight': size('game.zip')}}


def embed_transfer_info(html: str, info: dict) -> str:
    """Expose the sizes before the bridge script runs; fail on unreviewed boot template drift."""
    if html.count(BRIDGE_TAG) != 1:
        raise ValueError('Expected exactly one runtime bridge script tag; review the boot template.')
    payload = json.dumps(info, separators=(',', ':'), sort_keys=True)
    return html.replace(BRIDGE_TAG, f'<script>window.knolRuntimeTransfer={payload};</script>\n  {BRIDGE_TAG}', 1)
