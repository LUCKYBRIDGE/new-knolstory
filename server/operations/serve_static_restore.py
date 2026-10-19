"""Loopback-only preview: allowlisted restored files are hashed before every response."""
import argparse
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import stat
from urllib.parse import unquote, urlsplit
from static_release import release_base, restore_root, verify_release


def configured_handler(root, expected_sha, run):
    manifest = verify_release(root, expected_sha)
    entries = {entry['path']: entry for entry in manifest['files']}
    files = Path(root) / 'files'

    class RestoreHandler(SimpleHTTPRequestHandler):
        response_verified = False
        extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.wasm': 'application/wasm'}

        def end_headers(self):
            if self.response_verified:
                self.send_header('X-Knolstory-Restored-Manifest', expected_sha)
                self.send_header('X-Knolstory-Restore-Run', run)
            super().end_headers()

        def send_head(self):
            self.response_verified = False
            parsed = urlsplit(self.path)
            try:
                path = unquote(parsed.path, errors='strict')
            except (UnicodeError, ValueError):
                self.send_error(400)
                return None
            if parsed.scheme or parsed.netloc or not path.startswith('/') or path.startswith('//'):
                self.send_error(400)
                return None
            name = path[1:]
            if not name:
                name = 'index.html'
            elif name not in entries:
                if name.rstrip('/') + '.html' in entries:
                    name = name.rstrip('/') + '.html'
                elif name.rstrip('/') + '/index.html' in entries:
                    if not path.endswith('/'):
                        self.send_response(301)
                        self.send_header('Location', parsed._replace(path=parsed.path + '/').geturl())
                        self.end_headers()
                        return None
                    name = name.rstrip('/') + '/index.html'
                else:
                    directory = any(item.startswith(name.rstrip('/') + '/') for item in entries)
                    self.send_error(403 if directory else 404)
                    return None
            entry, stream = entries[name], None
            try:
                candidate = files / name
                for parent in candidate.parents:
                    if parent.is_symlink():
                        raise ValueError('Linked parent.')
                descriptor = os.open(candidate, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
                stream = os.fdopen(descriptor, 'rb')
                before = os.fstat(stream.fileno())
                if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
                        or stat.S_IMODE(before.st_mode) != 0o600 or before.st_size != entry['bytes']):
                    raise ValueError('Changed file metadata.')
                digest, total = hashlib.sha256(), 0
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    total += len(block)
                    if total > entry['bytes']:
                        raise ValueError('File grew after opening.')
                    digest.update(block)
                after = os.fstat(stream.fileno())
                if (digest.hexdigest() != entry['sha256']
                        or (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns)):
                    raise ValueError('Changed file content.')
                stream.seek(0)
                self.response_verified = True
                self.send_response(200)
                self.send_header('Content-Type', self.guess_type(name))
                self.send_header('Content-Length', str(entry['bytes']))
                self.end_headers()
                return stream
            except (OSError, ValueError):
                if stream is not None:
                    stream.close()
                self.send_error(409, 'Restored file integrity mismatch.')
                return None

        def list_directory(self, path):
            self.send_error(403)
            return None

    return RestoreHandler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--restore-run', required=True)
    parser.add_argument('--manifest-sha', required=True)
    parser.add_argument('--port', type=int, default=3142)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('Use an unprivileged loopback port.')
    root = restore_root(args.restore_run, release_base())
    handler = configured_handler(root, args.manifest_sha, args.restore_run)
    if not (root / 'files' / 'index.html').is_file():
        parser.error('A complete restored Web release is required.')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(handler, directory=str(root / 'files')))
    print(f'Verified restored release on loopback port {args.port}.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
