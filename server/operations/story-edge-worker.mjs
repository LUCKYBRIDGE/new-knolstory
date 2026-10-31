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
export function pagesRequest(request, config) {
  const url = new URL(request.url), headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // Assign the path instead of resolving it: a request path such as `//other.host/x`
  // must stay a path on Pages and never become another host.
  const target = new URL(config.pagesOrigin);
  target.pathname = url.pathname;
  target.search = url.search;
  if (target.origin !== config.pagesOrigin) throw Error('Edge target escaped the Pages origin.');
  return new Request(target, { method: request.method, headers, redirect: 'manual' });
}
export function publicResponse(response, config) {
  const headers = new Headers(response.headers);
  // Pages adds a wildcard CORS header; the public origin has never offered cross-origin reads.
  headers.delete('access-control-allow-origin');
  headers.delete('set-cookie');
  const location = headers.get('location');
  if (location !== null) {
    const target = new URL(location, config.pagesOrigin);
    if (target.origin === config.pagesOrigin) headers.set('location', config.publicOrigin + target.pathname + target.search + target.hash);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
export async function handleEdgeRequest(request, env, upstream = fetch) {
  let config;
  // A broken variable keeps the previous behaviour (everything from the Mac mini) instead of failing the site.
  try { config = edgeConfig(env); } catch { return upstream(request); }
  if (staysOnOrigin(request, config)) return upstream(request);
  try { return publicResponse(await upstream(pagesRequest(request, config)), config); }
  catch { return new Response(null, { status: 502, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }
}
const storyEdgeWorker = { fetch: (request, env) => handleEdgeRequest(request, env) };
export default storyEdgeWorker;
