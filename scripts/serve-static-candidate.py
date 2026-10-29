"""Loopback-only same-origin preview of a local site/objects candidate, without API.

This models paths, hashes, byte ranges and cache behavior, not a CDN deployment.
Candidate files must remain immutable while served: the open descriptor is
verified before headers, but concurrent in-place writes during transmission
are outside this local preview contract.
"""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer
import importlib.util
import hashlib
import json
import os
import re
import stat
from pathlib import Path, PurePosixPath
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


PREVIEW = module('candidate_export', 'serve-test-build.py')
AUDIT = module('candidate_audit', 'static-delivery-audit.py')


def status_identity(status):
    return (status.st_dev, status.st_ino, status.st_size, status.st_mtime_ns, status.st_ctime_ns)


def file_identity(path):
    return status_identity(path.stat())


class CandidateChanged(ValueError):
    pass


def verified_stream(row):
    # O_NOFOLLOW rejects a final symlink installed after the path checks.
    # Verify and return this same descriptor; never reopen its pathname.
    descriptor = os.open(row['file'], os.O_RDONLY | os.O_NONBLOCK | getattr(os, 'O_NOFOLLOW', 0))
    stream = os.fdopen(descriptor, 'rb')
    try:
        status = os.fstat(stream.fileno())
        if not stat.S_ISREG(status.st_mode) or status_identity(status) != row['identity']:
            raise CandidateChanged('Candidate changed; prepare and verify it again.')
        sha = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(chunk)
        if sha.hexdigest() != row['sha256'] or status_identity(os.fstat(stream.fileno())) != row['identity']:
            raise CandidateChanged('Candidate changed while verifying its content.')
        stream.seek(0)
        return stream, status
    except BaseException:
        stream.close()
        raise


def load_files(root):
    root = Path(root).resolve()
    manifest = json.loads((root / 'manifest.json').read_text())
    if manifest.get('formatVersion') != 1 or manifest.get('localOnly') is not True:
        raise ValueError('Expected a local-only static candidate manifest.')
    files = {}
    for row in manifest['files']:
        name, tier = row['path'], row['tier']
        parts = PurePosixPath(name).parts
        if (not name or name.startswith('/') or '..' in parts or '\\' in name or
                name != PurePosixPath(name).as_posix() or tier not in {'site', 'objects'} or
                name in files or name.startswith('api/') or AUDIT.private_artifact(name)):
            raise ValueError('Invalid candidate file path.')
        path = root / tier / name
        chain = [root / tier] + [root / tier / Path(*parts[:i]) for i in range(1, len(parts) + 1)]
        if (any(item.is_symlink() for item in chain) or not path.resolve().is_relative_to(root) or
                not path.is_file() or path.stat().st_size != row['bytes'] or
                AUDIT.digest(path) != row['sha256']):
            raise ValueError('Candidate bytes do not match the manifest: ' + name)
        files[name] = {**row, 'file': path, 'identity': file_identity(path)}
    if 'index.html' not in files:
        raise ValueError('Candidate entrypoint is missing.')
    return files


class CandidateHandler(PREVIEW.ExportHandler):
    def __init__(self, *args, files, **kwargs):
        self.files = files
        super().__init__(*args, **kwargs)

    def selected(self):
        path = unquote(urlsplit(self.path).path)
        if not path.startswith('/') or path.startswith('//') or '\\' in path or '..' in PurePosixPath(path).parts:
            return None
        name = path.lstrip('/') or 'index.html'
        return self.files.get(name) or self.files.get(name.rstrip('/') + '.html')

    def translate_path(self, path):
        row = self.selected()
        return str(row['file']) if row else str(ROOT / '.cache/no-candidate-route')

    def send_head(self):
        self.current_row = None
        if self.headers.get('Host') != '127.0.0.1:%d' % self.server.server_port:
            self.send_error(400, 'Untrusted preview host.')
            return None
        row = self.selected()
        if row is None:
            self.send_error(404, 'No static candidate route; online API is unavailable.')
            return None
        # Refuse files replaced with links after startup as well.
        path = row['file']
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
            self.send_error(404)
            return None
        try:
            stream, status = verified_stream(row)
        except CandidateChanged as issue:
            self.send_error(409, str(issue))
            return None
        except OSError:
            self.send_error(404)
            return None
        return self.serve_verified(stream, status, row)

    def serve_verified(self, stream, status, row):
        self.byte_range = None
        size, start, end = status.st_size, 0, status.st_size - 1
        requested = self.headers.get('Range')
        if requested:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
            if not match or not any(match.groups()):
                stream.close()
                return self.invalid_range(size)
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last))
            end = min(size - 1, int(last)) if first and last else size - 1
            if start >= size or end < start or not first and int(last) == 0:
                stream.close()
                return self.invalid_range(size)
            self.byte_range = (start, end)
            stream.seek(start)
        self.current_row = row
        try:
            self.send_response(206 if requested else 200)
            self.send_header('Content-Type', self.guess_type(str(row['file'])))
            self.send_header('Content-Length', str(end - start + 1))
            self.send_header('Last-Modified', self.date_time_string(status.st_mtime))
            self.send_header('Accept-Ranges', 'bytes')
            if requested:
                self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.end_headers()
            return stream
        except BaseException:
            stream.close()
            raise

    def end_headers(self):
        row = getattr(self, 'current_row', None)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-KnolStory-Preview', 'local-split-static-no-api')
        if row:
            version = parse_qs(urlsplit(self.path).query).get('v', [])
            cache = 'public, max-age=31536000, immutable' if version == [row['sha256'][:16]] else 'no-cache'
            self.send_header('Cache-Control', cache)
            self.send_header('ETag', '"' + row['sha256'] + '"')
        super().end_headers()


def create_server(candidate, port):
    files = load_files(candidate)
    return ThreadingHTTPServer(('127.0.0.1', port), partial(CandidateHandler, files=files))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', type=Path, default=Path(os.environ.get('KNOL_STATIC_CANDIDATE', '.cache/static-candidate')))
    parser.add_argument('--port', type=int, default=3000)
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('Port must be between 0 and 65535.')
    try:
        server = create_server(args.candidate, args.port)
    except (ValueError, OSError, KeyError) as error:
        parser.error(str(error))
    print('Local split static candidate: http://127.0.0.1:%d (no API)' % server.server_port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
