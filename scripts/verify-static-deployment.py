"""Read-only verification of one deployed static candidate; no publication/rights approval.

All local files must remain immutable while this command runs. HTTPS requests
and redirects stay on the exact supplied origin. Deployment configuration files
are recorded, but are not expected to be publicly served by Pages. A Cloudflare
403/error1010 response stops this transport before fanout; it is not a missing
asset verdict and this tool never spoofs a browser or changes edge security.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import urllib.error
import urllib.parse
import urllib.request

MAX_BYTES = 25 * 1024 * 1024
CONFIG = {'_headers', '_redirects', '_routes.json'}
CRITICAL = {'index.html', 'runtime/index.html', 'runtime/runtime-contract.js', 'runtime/game.zip'}
MIMES = {
    '.html': {'text/html'}, '.js': {'text/javascript', 'application/javascript'},
    '.css': {'text/css'}, '.wasm': {'application/wasm'}, '.png': {'image/png'},
    '.webp': {'image/webp'}, '.jpg': {'image/jpeg'}, '.jpeg': {'image/jpeg'},
    '.svg': {'image/svg+xml'}, '.wav': {'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'},
    '.ogg': {'audio/ogg', 'application/ogg'}, '.mp3': {'audio/mpeg', 'audio/mp3'},
    '.zip': {'application/zip', 'application/x-zip-compressed', 'application/octet-stream'},
    '.data': {'application/octet-stream'},
}


def origin_key(url):
    if not isinstance(url, str) or any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in url):
        raise ValueError('An HTTPS origin without whitespace or controls is required.')
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('An HTTPS origin without credentials is required.')
    return parsed.scheme, parsed.hostname.lower(), parsed.port or 443


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, origin):
        self.origin = origin_key(origin)

    def redirect_request(self, request, response, code, message, headers, newurl):
        try:
            allowed = origin_key(newurl) == self.origin
        except ValueError:
            allowed = False
        if not allowed:
            raise urllib.error.HTTPError(request.full_url, 403, 'Cross-origin redirect refused.', headers, None)
        return super().redirect_request(request, response, code, message, headers, newurl)


def load_candidate(candidate, output):
    candidate = Path(candidate).resolve()
    site = candidate / 'site'
    if output is not None:
        output = Path(output)
        if output.is_symlink() or output.resolve().is_relative_to(site.resolve()) or output.resolve() == candidate/'manifest.json':
            raise ValueError('The report must not overwrite a serving file or the candidate manifest.')
    manifest = json.loads((candidate/'manifest.json').read_text())
    if manifest.get('formatVersion') != 1 or not isinstance(manifest.get('files'), list):
        raise ValueError('Unsupported candidate manifest.')
    seen, rows = set(), []
    for row in manifest['files']:
        if not isinstance(row, dict):
            raise ValueError('Every candidate file must be a manifest record.')
        name, size, sha = row.get('path'), row.get('bytes'), row.get('sha256')
        if (not isinstance(name, str) or not name or name.startswith('/') or
                name != PurePosixPath(name).as_posix() or '..' in PurePosixPath(name).parts or
                any(character in name for character in '\\%?#') or any(ord(c) < 32 or ord(c) == 127 for c in name) or
                name in seen or row.get('tier') != 'site' or
                not isinstance(size, int) or isinstance(size, bool) or not 0 <= size <= MAX_BYTES or
                not isinstance(sha, str) or re.fullmatch('[0-9a-f]{64}', sha) is None):
            raise ValueError('Invalid or non-Pages candidate file.')
        path = site/name
        chain = [site] + [site.joinpath(*PurePosixPath(name).parts[:i]) for i in range(1, len(PurePosixPath(name).parts)+1)]
        if (any(part.is_symlink() for part in chain) or not path.resolve().is_relative_to(site.resolve()) or
                not path.is_file() or path.stat().st_size != size or hashlib.sha256(path.read_bytes()).hexdigest() != sha):
            raise ValueError('Local candidate bytes differ from the manifest.')
        seen.add(name)
        rows.append(dict(row))
    if not CRITICAL.issubset(seen):
        raise ValueError('Required native candidate files are missing.')
    return candidate, manifest, rows


def inspect(origin, row, opener, *, method='HEAD', range_end=None, allow_full_range_response=False):
    result = {'path': row['path'], 'method': method}
    headers = {'Accept-Encoding': 'identity'}
    if range_end is not None:
        headers['Range'] = f'bytes=0-{range_end}'
    request = urllib.request.Request(origin+'/'+urllib.parse.quote(row['path'], safe='/'), headers=headers, method=method)
    try:
        with opener(request, timeout=30) as response:
            if origin_key(response.geturl()) != origin_key(origin):
                raise ValueError('Response origin changed.')
            result.update(status=response.status, contentType=response.headers.get('Content-Type'),
                          contentLength=response.headers.get('Content-Length'),
                          cacheControl=response.headers.get('Cache-Control'), etag=response.headers.get('ETag'))
            whole_file_fallback = range_end is not None and response.status == 200 and allow_full_range_response
            expected_status = 206 if range_end is not None and not whole_file_fallback else 200
            if response.status != expected_status:
                raise ValueError(f'Expected HTTP {expected_status}.')
            mime = (result['contentType'] or '').split(';')[0].strip().lower()
            expected_mimes = MIMES.get(PurePosixPath(row['path']).suffix.lower())
            if expected_mimes and mime not in expected_mimes:
                raise ValueError('Unexpected Content-Type.')
            encoding = response.headers.get('Content-Encoding', 'identity')
            if encoding not in ('identity', ''):
                raise ValueError('An identity request received an encoded response.')
            if (range_end is None or whole_file_fallback) and result['contentLength'] is not None and result['contentLength'] != str(row['bytes']):
                raise ValueError('Unexpected Content-Length.')
            if method == 'GET':
                limit = range_end+1 if range_end is not None and not whole_file_fallback else row['bytes']
                data = response.read(limit+1)
                if len(data) != limit:
                    raise ValueError('Unexpected response body length.')
                if range_end is None or whole_file_fallback:
                    result['sha256'] = hashlib.sha256(data).hexdigest()
                    if result['sha256'] != row['sha256']:
                        raise ValueError('Deployed SHA-256 differs from the candidate.')
                    if whole_file_fallback:
                        result.update(rangeMode='whole-file-fallback', partialRangesSupported=False)
                        result['_rangeBytes'] = data[:range_end+1]
                else:
                    content_range = response.headers.get('Content-Range')
                    result['contentRange'] = content_range
                    if content_range != f"bytes 0-{range_end}/{row['bytes']}":
                        raise ValueError('Unexpected Content-Range.')
                    result.update(rangeMode='partial', partialRangesSupported=True)
                    result['_rangeBytes'] = data
    except (OSError, ValueError, urllib.error.HTTPError) as issue:
        if isinstance(issue, urllib.error.HTTPError) and method == 'HEAD' and row['path'] == '404.html' and issue.code == 404 and origin_key(issue.geturl()) == origin_key(origin):
            result.update(status=404, contentType=issue.headers.get('Content-Type'), contentLength=issue.headers.get('Content-Length'), cacheControl=issue.headers.get('Cache-Control'), etag=issue.headers.get('ETag'))
            if (result['contentType'] or '').split(';')[0].strip().lower() != 'text/html':
                result['error'] = 'Unexpected Content-Type for the custom error document.'
            return result
        result['error'] = str(issue) if isinstance(issue, ValueError) else 'Network/HTTP request failed.'
        if isinstance(issue, urllib.error.HTTPError):
            result['status'] = issue.code
            if issue.code == 403 and 'cloudflare' in issue.headers.get('Server', '').lower():
                if method == 'HEAD':
                    result.update(errorType='origin-http-policy', transportBlocked=True, error='Cloudflare rejected the HEAD transport; file presence is unverified.')
                try:
                    prefix = issue.read(4096)
                except OSError:
                    prefix = b''
                if re.search(rb'(?:error\s*(?:code\s*:?)?\s*)1010\b', prefix, re.IGNORECASE):
                    result.update(errorType='origin-client-policy', transportBlocked=True, error='Cloudflare client-policy error1010 blocks this transport; file presence is unverified.')
    return result


def inspect_brotli(origin, row, copy, opener):
    """GET a file with Accept-Encoding: br; the raw body must be the candidate's stored brotli copy."""
    result = {'path': row['path'], 'method': 'GET', 'acceptEncoding': 'br', 'copy': copy['path']}
    request = urllib.request.Request(origin+'/'+urllib.parse.quote(row['path'], safe='/'), headers={'Accept-Encoding': 'br'}, method='GET')
    try:
        with opener(request, timeout=60) as response:
            if origin_key(response.geturl()) != origin_key(origin):
                raise ValueError('Response origin changed.')
            result.update(status=response.status, contentType=response.headers.get('Content-Type'),
                          contentEncoding=response.headers.get('Content-Encoding'), vary=response.headers.get('Vary'))
            if response.status != 200 or (result['contentEncoding'] or '').lower() != 'br':
                raise ValueError('Expected the brotli copy with Content-Encoding: br.')
            if 'accept-encoding' not in (result['vary'] or '').lower():
                raise ValueError('A negotiated response must vary on Accept-Encoding.')
            expected_mimes = MIMES.get(PurePosixPath(row['path']).suffix.lower())
            if expected_mimes and (result['contentType'] or '').split(';')[0].strip().lower() not in expected_mimes:
                raise ValueError('Unexpected Content-Type.')
            data = response.read(copy['bytes']+1)
            result['sha256'] = hashlib.sha256(data).hexdigest()
            if len(data) != copy['bytes'] or result['sha256'] != copy['sha256']:
                raise ValueError('The negotiated body differs from the candidate brotli copy.')
    except (OSError, ValueError, urllib.error.HTTPError) as issue:
        result['error'] = str(issue) if isinstance(issue, ValueError) else 'Network/HTTP request failed.'
    return result


def verify(candidate, origin, *, opener=None, output=None, allow_full_range_response=False, expect_brotli=False):
    parsed = urllib.parse.urlsplit(origin)
    origin_key(origin)
    if parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise ValueError('Supply an origin, without a path, query or fragment.')
    origin = origin.rstrip('/')
    candidate, manifest, rows = load_candidate(candidate, output)
    if opener is None:
        opener = urllib.request.build_opener(SameOriginRedirect(origin)).open
    served = [row for row in rows if row['path'] not in CONFIG]
    heads, hashes, ranges, negotiated = [], [], [], []
    # Probe once before fanout: a browser-integrity policy rejection is not
    # evidence of hundreds of missing assets, and must not trigger retries.
    first = inspect(origin, served[0], opener)
    heads.append(first)
    if not first.get('transportBlocked'):
        with ThreadPoolExecutor(max_workers=6) as pool:
            heads.extend(pool.map(lambda row: inspect(origin, row, opener), served[1:]))
        selected = [row for row in served if row['path'] in CRITICAL or row['path'].startswith('assets/characters/stature-v2/')]
        hashes = [inspect(origin, row, opener, method='GET') for row in selected]
        for extension in ('.wav', '.ogg', '.mp3'):
            options = [row for row in served if row['path'].endswith(extension) and row['bytes'] > 0]
            if not options:
                continue
            row = min(options, key=lambda item: item['bytes'])
            end = min(1023, row['bytes']-1)
            result = inspect(origin, row, opener, method='GET', range_end=end, allow_full_range_response=allow_full_range_response)
            actual = result.pop('_rangeBytes', None)
            with (candidate/'site'/row['path']).open('rb') as stream:
                expected = stream.read(end+1)
            if actual is not None and actual != expected:
                result['error'] = 'Deployed range bytes differ from the candidate.'
            ranges.append(result)
        if expect_brotli:
            # Only the public origin negotiates (edge Worker); Pages alone serves the identity file.
            by_path = {row['path']: row for row in served}
            for copy in sorted((row for row in served if row['path'].endswith('.br')), key=lambda item: item['path']):
                source = by_path.get(copy['path'][:-3])
                if source is not None:
                    negotiated.append(inspect_brotli(origin, source, copy, opener))
    errors = [dict(result) for result in heads+hashes+ranges+negotiated if result.get('error')]
    report = {'origin': origin, 'sourceCommit': manifest.get('sourceCommit'), 'success': not errors,
              'scope': 'Static delivery evidence, not rights approval or complete application validation.',
              'candidateFiles': len(served), 'checkedFiles': len(heads),
              'transportBlocked': bool(first.get('transportBlocked')), 'configurationFiles': sorted(row['path'] for row in rows if row['path'] in CONFIG),
              'errors': errors, 'files': heads, 'hashes': hashes, 'ranges': ranges, 'negotiated': negotiated}
    if output is not None:
        path = Path(output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--origin', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--allow-full-range-response', action='store_true', help='Accept an HTTP200 whole-file range fallback only after exact length/SHA and first-byte verification; does not claim partial-range support.')
    parser.add_argument('--expect-brotli', action='store_true', help='For each candidate .br copy, require the public origin to serve it for Accept-Encoding: br (edge Worker negotiation).')
    args = parser.parse_args()
    try:
        report = verify(args.candidate, args.origin, output=args.output, allow_full_range_response=args.allow_full_range_response, expect_brotli=args.expect_brotli)
    except (OSError, ValueError, KeyError) as issue:
        parser.error(str(issue))
    print(json.dumps({'checkedFiles': report['checkedFiles'], 'errors': len(report['errors']), 'success': report['success'], 'transportBlocked': report['transportBlocked']}))
    return 0 if report['success'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
