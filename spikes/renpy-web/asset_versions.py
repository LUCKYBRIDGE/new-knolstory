"""Version local boot dependencies without clearing user caches or stored works."""
import hashlib
from pathlib import Path
import re


def version_runtime_html(html: str, root: Path) -> str:
    def version(name: str) -> str:
        path = root / name
        if not path.is_file():
            raise ValueError(f'Runtime dependency not found: {name}')
        return f'{name}?v={hashlib.sha256(path.read_bytes()).hexdigest()[:16]}'

    # Only the pinned template's relative local JS/CSS dependencies, never URLs.
    html = re.sub(r'((?:src|href)=["\'])([A-Za-z0-9_-]+\.(?:js|css))(["\'])',
                  lambda match: match[1] + version(match[2]) + match[3], html)
    return re.sub(r"(window\.gameZipURL\s*=\s*')game\.zip(';)",
                  lambda match: match[1] + version('game.zip') + match[2], html)
