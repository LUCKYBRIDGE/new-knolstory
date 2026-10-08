"""Serve the static export on loopback for local tests, including extensionless routes."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ExportHandler(SimpleHTTPRequestHandler):
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
