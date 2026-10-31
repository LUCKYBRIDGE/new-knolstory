import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

SPEC = importlib.util.spec_from_file_location('verify_static_deployment', Path(__file__).parents[1] / 'verify-static-deployment.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class Response(io.BytesIO):
    def __init__(self, data, status, headers, url):
        super().__init__(data)
        self.status, self.headers, self.url = status, headers, url
    def geturl(self): return self.url


class StaticDeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = {'index.html': b'web', 'runtime/index.html': b'frame',
                     'runtime/runtime-contract.js': b'contract', 'runtime/game.zip': b'zip',
                     'assets/tone.wav': b'RIFF0123456789', '_headers': b'configuration'}
        self.calls = []
        self.manifest()
    def manifest(self, extra=None):
        rows = []
        for name, data in self.data.items():
            path = self.root / 'site' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            rows.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'tier': 'site'})
        (self.root / 'manifest.json').write_text(json.dumps({'formatVersion': 1, 'files': rows + (extra or [])}))
    def opener(self, request, timeout):
        self.calls.append(request)
        name = request.full_url.removeprefix('https://example.pages.dev/')
        data = self.data[name]
        mime = 'text/html' if name.endswith('.html') else 'text/javascript' if name.endswith('.js') else 'audio/wav' if name.endswith('.wav') else 'application/zip'
        status, headers = 200, {'Content-Type': mime, 'Content-Length': str(len(data)), 'ETag': 'hash'}
        if request.get_header('Range'):
            end = min(1023, len(data)-1)
            status, headers = 206, {**headers, 'Content-Range': f'bytes 0-{end}/{len(data)}', 'Content-Length': str(end+1)}
            data = data[:end+1]
        return Response(data, status, headers, request.full_url)
    def verify(self, opener=None, output=None, **kwargs):
        return MODULE.verify(self.root, 'https://example.pages.dev', opener=opener or self.opener, output=output, **kwargs)
    def test_verifies_every_served_file_hashes_and_audio_range_without_serving_config(self):
        report = self.verify(output=self.root / 'report.json')
        self.assertTrue(report['success'])
        self.assertEqual(report['checkedFiles'], 5)
        self.assertEqual(report['configurationFiles'], ['_headers'])
        self.assertEqual(len(report['ranges']), 1)
        self.assertFalse(any('_headers' in request.full_url for request in self.calls))
        self.assertTrue((self.root / 'report.json').exists())
    def test_wrong_download_hash_fails_even_when_head_matches(self):
        def wrong(request, timeout):
            response = self.opener(request, timeout)
            if request.get_method() == 'GET' and request.full_url.endswith('game.zip'):
                return Response(b'bad', 200, response.headers, request.full_url)
            return response
        self.assertFalse(self.verify(wrong)['success'])
    def test_missing_file_and_wrong_mime_fail(self):
        def missing(request, timeout):
            if request.full_url.endswith('.js'):
                raise urllib.error.HTTPError(request.full_url, 404, 'missing', {}, None)
            response = self.opener(request, timeout)
            response.headers['Content-Type'] = 'text/html'
            return response
        report = self.verify(missing)
        self.assertFalse(report['success'])
        self.assertGreaterEqual(len(report['errors']), 2)
    def test_cross_origin_redirect_handler_rejects_before_following(self):
        handler = MODULE.SameOriginRedirect('https://example.pages.dev')
        from urllib.request import Request
        request = Request('https://example.pages.dev/index.html')
        with self.assertRaises(urllib.error.HTTPError):
            handler.redirect_request(request, None, 302, 'redirect', {}, 'https://outside.invalid/file')
        self.assertEqual(handler.redirect_request(request, None, 302, 'redirect', {}, 'https://example.pages.dev/').full_url, 'https://example.pages.dev/')
    def test_changed_response_origin_is_rejected(self):
        def redirected(request, timeout):
            response = self.opener(request, timeout)
            response.url = 'https://outside.invalid/file'
            return response
        self.assertFalse(self.verify(redirected)['success'])
    def test_invalid_manifest_paths_and_objects_fail_before_any_network(self):
        for name in ['../private', '/absolute', 'a%2fb', 'a?query', 'a#hash', 'a\\b', 'a\n']:
            self.manifest([{'path': name, 'bytes': 1, 'sha256': 'a'*64, 'tier': 'site'}])
            with self.assertRaises(ValueError): self.verify()
        self.manifest([{'path': 'large.zip', 'bytes': 1, 'sha256': 'a'*64, 'tier': 'objects'}])
        with self.assertRaises(ValueError): self.verify()
        self.manifest([None])
        with self.assertRaises(ValueError): self.verify()
        self.assertEqual(self.calls, [])
    def test_output_inside_site_or_changed_local_bytes_fail_before_network(self):
        with self.assertRaises(ValueError): self.verify(output=self.root/'site/report.json')
        (self.root/'site/index.html').write_bytes(b'changed')
        with self.assertRaises(ValueError): self.verify()
        self.assertEqual(self.calls, [])
    def test_invalid_range_response_fails(self):
        def no_range(request, timeout):
            response = self.opener(request, timeout)
            if request.get_header('Range'): response.status = 200
            return response
        self.assertFalse(self.verify(no_range)['success'])
    def test_cloudflare_client_policy_is_reported_and_stops_before_fanout(self):
        def blocked(request, timeout):
            self.calls.append(request)
            raise urllib.error.HTTPError(request.full_url, 403, 'Forbidden', {'Server': 'cloudflare', 'Content-Type': 'text/html'}, io.BytesIO(b'<html>Error 1010: Access denied</html>'))
        report = self.verify(blocked)
        self.assertFalse(report['success'])
        self.assertTrue(report['transportBlocked'])
        self.assertEqual(report['checkedFiles'], 1)
        self.assertEqual(report['candidateFiles'], 5)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(report['errors'][0]['errorType'], 'origin-client-policy')
        self.assertEqual(report['hashes'], [])
        self.assertEqual(report['ranges'], [])

    def test_empty_cloudflare_head_403_stops_once_without_claiming_error1010(self):
        def blocked(request, timeout):
            self.calls.append(request)
            raise urllib.error.HTTPError(request.full_url, 403, 'Forbidden', {'Server': 'cloudflare'}, io.BytesIO(b''))
        report = self.verify(blocked)
        self.assertTrue(report['transportBlocked'])
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(report['errors'][0]['errorType'], 'origin-http-policy')
        self.assertNotIn('1010', report['errors'][0]['error'])

    def whole_file_response(self, request, timeout, wrong=False, oversized=False):
        if request.get_header('Range'):
            self.calls.append(request)
            name = request.full_url.removeprefix('https://example.pages.dev/')
            data = self.data[name]
            if wrong: data = b'x'*len(data)
            if oversized: data += b'excess'
            return Response(data, 200, {'Content-Type': 'audio/wav', 'Content-Length': str(len(self.data[name]))}, request.full_url)
        return self.opener(request, timeout)

    def test_full_file_range_fallback_requires_explicit_flag_and_exact_body(self):
        self.assertFalse(self.verify(self.whole_file_response)['success'])
        report = self.verify(self.whole_file_response, allow_full_range_response=True)
        self.assertTrue(report['success'])
        self.assertEqual(report['ranges'][0]['rangeMode'], 'whole-file-fallback')
        self.assertFalse(report['ranges'][0]['partialRangesSupported'])
        self.assertEqual(report['ranges'][0]['sha256'], hashlib.sha256(self.data['assets/tone.wav']).hexdigest())

    def test_full_file_fallback_rejects_changed_or_oversized_body(self):
        for change in ('wrong', 'oversized'):
            def altered(request, timeout):
                return self.whole_file_response(request, timeout, **{change: True})
            self.assertFalse(self.verify(altered, allow_full_range_response=True)['success'])

    def test_full_file_fallback_never_reads_more_than_recorded_size_plus_one(self):
        reads = []
        class UnboundedBody(Response):
            def read(self, size=-1):
                reads.append(size)
                if size < 0: raise AssertionError('Unbounded read')
                return b'x'*size
        def oversized(request, timeout):
            if request.get_header('Range'):
                return UnboundedBody(b'', 200, {'Content-Type': 'audio/wav', 'Content-Length': str(len(self.data['assets/tone.wav']))}, request.full_url)
            return self.opener(request, timeout)
        self.assertFalse(self.verify(oversized, allow_full_range_response=True)['success'])
        self.assertEqual(reads, [len(self.data['assets/tone.wav'])+1])

    def test_exact_custom_404_page_may_return_404_without_hiding_missing_media(self):
        self.data['404.html'] = b'custom not found'
        self.manifest()
        def custom_error(request, timeout):
            if request.full_url.endswith('/404.html'):
                raise urllib.error.HTTPError(request.full_url, 404, 'Not found', {'Content-Type': 'text/html', 'Content-Length': str(len(self.data['404.html']))}, io.BytesIO(self.data['404.html']))
            return self.opener(request, timeout)
        report = self.verify(custom_error)
        self.assertTrue(report['success'])
        self.assertEqual(next(row for row in report['files'] if row['path'] == '404.html')['status'], 404)

    def test_origin_credentials_or_path_are_rejected_without_requests(self):
        for origin in ['http://example.pages.dev', 'https://name:secret@example.pages.dev', 'https://example.pages.dev/path', 'https://example.pages.dev?x=1', 'https://example.pages.dev\n', 'https://example.pages.dev ']:
            with self.assertRaises(ValueError): MODULE.verify(self.root, origin, opener=self.opener)
        self.assertEqual(self.calls, [])


if __name__ == '__main__': unittest.main()
