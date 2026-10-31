// Deployment check through a real Chromium page on the target origin (kept with the 2026-10-31
// evidence; not yet a maintained repository tool with tests).
// Cloudflare refuses Python urllib (error 1010), so file presence and bytes are
// checked with same-origin fetch() calls from the page itself.
// Usage, from the repository root:
//   node docs/architecture/evidence/startup-speed-2026-10-31/measurement/browser-verify.mjs <candidate-dir> <https-origin> <output.json>
// <candidate-dir> is the prepared static candidate (manifest.json and site/) that was deployed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const [candidate, origin, output] = process.argv.slice(2);
if (!candidate || !/^https:\/\/[a-z0-9.-]+$/.test(origin ?? '') || !output) throw Error('usage: <candidate> <https-origin> <output>');
const manifest = JSON.parse(readFileSync(`${candidate}/manifest.json`, 'utf8'));
const served = manifest.files.filter(row => !['_headers', '_redirects', '_routes.json'].includes(row.path));
// renpy.data and renpy.wasm may arrive as brotli copies: their decoded bytes must still equal the runtime files.
const critical = served.filter(row => ['index.html', 'runtime/index.html', 'runtime/runtime-contract.js', 'runtime/game.zip', 'runtime/renpy.data', 'runtime/renpy.wasm'].includes(row.path) || row.path.startsWith('assets/characters/stature-v2/'));
const audio = ['.wav', '.ogg', '.mp3'].map(ext => served.filter(row => row.path.endsWith(ext) && row.bytes > 0).sort((a, b) => a.bytes - b.bytes)[0]).filter(Boolean);
const sha = path => createHash('sha256').update(readFileSync(`${candidate}/site/${path}`)).digest('hex');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const landing = await page.goto(origin + '/', { waitUntil: 'load' });
  const heads = await page.evaluate(async (rows) => {
    const results = []; let next = 0;
    async function worker() {
      while (next < rows.length) {
        const row = rows[next++];
        const url = '/' + row.path.split('/').map(encodeURIComponent).join('/');
        let attempt = 0, result;
        while (attempt++ < 3) {
          try {
            // Pages answers /x.html with 308 to /x; follow it and record where it landed.
            const response = await fetch(url, { method: 'HEAD', cache: 'no-store', redirect: 'follow' });
            result = { path: row.path, status: response.status, redirectedTo: response.redirected ? new URL(response.url).pathname : null, length: response.headers.get('content-length'), encoding: response.headers.get('content-encoding'), type: response.headers.get('content-type'), cache: response.headers.get('cache-control'), acao: response.headers.get('access-control-allow-origin'), attempts: attempt };
            break;
          } catch (error) { result = { path: row.path, error: String(error), attempts: attempt }; }
        }
        results.push(result);
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    return results;
  }, served.map(row => ({ path: row.path })));
  const digest = async (path, range) => page.evaluate(async ({ path, range }) => {
    const url = '/' + path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(url, { cache: 'no-store', headers: range ? { Range: range } : {} });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    return { status: response.status, bytes: bytes.length, sha256: hash, first: Array.from(bytes.slice(0, 16)), contentRange: response.headers.get('content-range'), acceptRanges: response.headers.get('accept-ranges') };
  }, { path, range });
  const hashes = [];
  for (const row of critical) { const got = await digest(row.path); hashes.push({ path: row.path, status: got.status, match: got.sha256 === row.sha256 && got.bytes === row.bytes }); }
  const ranges = [];
  for (const row of audio) {
    const got = await digest(row.path, 'bytes=0-1023');
    const local = readFileSync(`${candidate}/site/${row.path}`);
    const firstMatch = got.first.every((value, index) => value === local[index]);
    ranges.push({ path: row.path, status: got.status, bytes: got.bytes, contentRange: got.contentRange, acceptRanges: got.acceptRanges, wholeFileMatch: got.status === 200 ? got.sha256 === sha(row.path) : null, firstBytesMatch: firstMatch });
  }
  const sizeByPath = new Map(served.map(row => [row.path, row.bytes]));
  const unexpected = heads.filter(row => row.error || row.status !== (row.path === '404.html' ? 404 : 200) && !(row.path === '404.html' && row.status === 200) || (!row.encoding && row.length !== null && row.length !== undefined && Number(row.length) !== sizeByPath.get(row.path) && !/^(text|application\/(javascript|json))/.test(row.type ?? '')));
  const encoded = heads.filter(row => row.encoding).map(row => ({ path: row.path, encoding: row.encoding, length: row.length }));
  const report = { origin, landingStatus: landing?.status(), sourceCommit: manifest.sourceCommit, checked: heads.length, retried: heads.filter(row => row.attempts > 1).length, unexpected, encoded, acaoValues: [...new Set(heads.map(row => row.acao))], hashes, ranges, success: unexpected.length === 0 && hashes.every(row => row.match) && ranges.every(row => row.firstBytesMatch && (row.status === 206 || row.wholeFileMatch)) };
  writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify({ origin, checked: report.checked, unexpected: unexpected.length, encoded, retried: report.retried, hashes: hashes.filter(row => row.match).length + '/' + hashes.length, ranges: ranges.map(row => `${row.path.split('/').pop()}:${row.status}`), acao: report.acaoValues, success: report.success }));
} finally { await browser.close(); }
