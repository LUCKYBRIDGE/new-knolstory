/**
 * Cloudflare Worker for the public origin (ADR 0026, 2026-10-31 cutover).
 * Static reads (the web app, pictures, sound and the Ren'Py runtime) come from the
 * Cloudflare Pages project. `/api/` and every non-read request keep going to the zone
 * origin: the Tunnel to the Mac mini production ingress. The browser still sees one
 * origin, so the same-origin Ren'Py frame, cookies, CSRF and the OAuth callback keep
 * their existing contract. Rollback is removing the zone route; this file holds no secret.
 */
// Only headers that shape a static read are forwarded. Cookies and credentials stay
// with the public origin and are never sent to Pages.
const forwardedRequestHeaders = ['accept', 'accept-language', 'if-modified-since', 'if-none-match', 'if-range', 'range', 'user-agent'];
const reads = new Set(['GET', 'HEAD']);
// Runtime files with a brotli copy from the runtime build (spikes/renpy-web/transport.py). Cloudflare
// does not compress application/octet-stream, and Pages compresses wasm only lightly.
const brotliCopies = new Map([
  ['/runtime/renpy.data', { path: '/runtime/renpy.data.br', type: 'application/octet-stream' }],
  ['/runtime/renpy.wasm', { path: '/runtime/renpy.wasm.br', type: 'application/wasm' }],
]);
/** True when the request lists br with a non-zero quality (RFC 9110 content negotiation). */
export function acceptsBrotli(value) {
  return (value ?? '').split(',').some(part => {
    const [coding, ...parameters] = part.split(';').map(item => item.trim().toLowerCase());
    if (coding !== 'br') return false;
    const quality = parameters.find(item => item.startsWith('q='));
    return quality === undefined || Number(quality.slice(2)) > 0;
  });
}
/** The brotli copy to serve, or null. Ranges always use the identity file: they address its bytes. */
export function brotliCopy(request) {
  const copy = brotliCopies.get(new URL(request.url).pathname);
  if (!copy || !reads.has(request.method) || request.headers.has('range') || request.headers.has('if-range')) return null;
  return acceptsBrotli(request.headers.get('accept-encoding')) ? copy : null;
}
const withVary = (value) => [...new Set([...(value ?? '').split(',').map(item => item.trim()).filter(Boolean), 'Accept-Encoding'])].join(', ');

function strictOrigin(value, host) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password || !host.test(url.hostname)) throw Error('Invalid edge origin.');
  return url;
}
/** Validates the two fixed origins from the Worker variables. */
export function edgeConfig(env) {
  const publicOrigin = strictOrigin(env?.PUBLIC_ORIGIN, /^story(?:-[a-z0-9]+)*\.knolquiz\.com$/);
  const pages = strictOrigin(env?.PAGES_ORIGIN, /^[a-z0-9-]+\.pages\.dev$/);
  return { publicOrigin: publicOrigin.origin, publicHost: publicOrigin.host, pagesOrigin: pages.origin };
}
/** True for requests that the Mac mini origin must answer. */
export function staysOnOrigin(request, config) {
  const url = new URL(request.url);
  return url.host !== config.publicHost || url.pathname === '/api' || url.pathname.startsWith('/api/') || !reads.has(request.method);
}
export function pagesRequest(request, config, pathname) {
  const url = new URL(request.url), headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Assign the path instead of resolving it: a request path such as `//other.host/x`
  // must stay a path on Pages and never become another host.
  const target = new URL(config.pagesOrigin);
  target.pathname = pathname ?? url.pathname;
  target.search = url.search;
  if (target.origin !== config.pagesOrigin) throw Error('Edge target escaped the Pages origin.');
  return new Request(target, { method: request.method, headers, redirect: 'manual' });
}
export function publicResponse(response, config, negotiated = false) {
  const headers = new Headers(response.headers);
  // Pages adds a wildcard CORS header; the public origin has never offered cross-origin reads.
  headers.delete('access-control-allow-origin');
  headers.delete('set-cookie');
  // The identity file of a negotiated path must not be reused by a cache for a brotli request.
  if (negotiated) headers.set('vary', withVary(headers.get('vary')));
  const location = headers.get('location');
  if (location !== null) {
    const target = new URL(location, config.pagesOrigin);
    if (target.origin === config.pagesOrigin) headers.set('location', config.publicOrigin + target.pathname + target.search + target.hash);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
/** Response options for a brotli copy. `encodeBody: 'manual'` sends the stored bytes as they are. */
export function brotliResponseInit(response, copy) {
  const headers = new Headers(response.headers);
  headers.delete('access-control-allow-origin');
  headers.delete('set-cookie');
  headers.set('vary', withVary(headers.get('vary')));
  if (response.status === 200) {
    headers.set('content-type', copy.type);
    headers.set('content-encoding', 'br');
  }
  return { status: response.status, statusText: response.statusText, headers, encodeBody: 'manual' };
}
export async function handleEdgeRequest(request, env, upstream = fetch) {
  let config;
  // A broken variable keeps the previous behaviour (everything from the Mac mini) instead of failing the site.
  try { config = edgeConfig(env); } catch { return upstream(request); }
  if (staysOnOrigin(request, config)) return upstream(request);
  try {
    const copy = brotliCopy(request);
    if (copy) {
      try {
        const encoded = await upstream(pagesRequest(request, config, copy.path));
        if (encoded.status === 200 || encoded.status === 304) return new Response(encoded.status === 304 ? null : encoded.body, brotliResponseInit(encoded, copy));
        await encoded.body?.cancel();
      } catch { /* A missing or unreachable copy falls back to the identity file. */ }
    }
    return publicResponse(await upstream(pagesRequest(request, config)), config, brotliCopies.has(new URL(request.url).pathname));
  } catch { return new Response(null, { status: 502, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
}
const storyEdgeWorker = { fetch: (request, env) => handleEdgeRequest(request, env) };
export default storyEdgeWorker;
