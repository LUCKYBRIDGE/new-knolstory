"""Serve the static export on loopback for local tests, including extensionless routes."""
import argparse
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ExportHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        requested = self.headers.get('Range')
        path = Path(self.translate_path(self.path))
        if not requested or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested)
        size = path.stat().st_size
        if not match or not any(match.groups()):
            return self.invalid_range(size)
        first, last = match.groups()
        start = int(first) if first else max(0, size-int(last))
        end = min(size-1, int(last)) if first and last else size-1
        if start >= size or end < start or not first and int(last) == 0:
            return self.invalid_range(size)
        stream = path.open('rb')
        stream.seek(start)
        self.byte_range = (start, end)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end-start+1))
        self.end_headers()
        return stream

    def invalid_range(self, size):
        self.send_response(416)
        self.send_header('Content-Range', f'bytes */{size}')
        self.send_header('Content-Length', '0')
        self.end_headers()
        return None

    def copyfile(self, source, outputfile):
        if self.byte_range is None:
            return super().copyfile(source, outputfile)
        remaining = self.byte_range[1]-self.byte_range[0]+1
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def translate_path(self, path):
        original = super().translate_path(path)
        page = Path(original.rstrip('/') + '.html')
        # Next also emits a same-name directory for RSC payloads.
        if not Path(original).is_file() and page.is_file():
            return str(page)
        return original


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=3000)
    args = parser.parse_args()
    output = ROOT / 'apps/web/out'
    if not (output / 'index.html').is_file():
        parser.exit(1, 'Run pnpm build before pnpm preview.\n')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(ExportHandler, directory=str(output)))
    print(f'Local static test build: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
