import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { authCookieNames, serializeAuthCookie, validateAuthOrigin, type createAuthStateService } from '../auth/auth-state';
import { IdentityLinkError, type VerifiedIdentity } from '../auth/identity-links';
import type { AuthCompletionPort } from '../auth/postgres-auth-completion';
import type { createOidcProvider } from '../auth/oidc-provider';

type Provider = VerifiedIdentity['provider'];
type AuthState = ReturnType<typeof createAuthStateService>;
type OidcProvider = ReturnType<typeof createOidcProvider>;
export type AuthRouterOptions = Readonly<{
  origin: string;
  authState: AuthState;
  completionPort: AuthCompletionPort;
  providers: Readonly<Partial<Record<Provider, OidcProvider>>>;
  clock?: () => number;
  rateLimit?: Readonly<{ windowMs: number; maxRequests: number; maxEntries: number }>;
}>;
class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return typeof value === 'string' ? value : '';
}
function cookie(req: IncomingMessage, name: string): string {
  const values = header(req, 'cookie').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
  if (values.length > 1) throw new HttpError(400, 'INVALID_REQUEST');
  return values[0]?.slice(name.length + 1) ?? '';
}
function json(res: ServerResponse, status: number, data: unknown, error?: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(error ? { success: false, error: { code: error } } : { success: true, data }));
}
function redirect(res: ServerResponse, destination: string) {
  res.statusCode = 302; res.setHeader('Location', destination); res.end();
}
function single(query: URLSearchParams, key: string, required = true): string {
  const values = query.getAll(key);
  if (values.length > 1 || (required && values.length !== 1) || (values[0]?.length ?? 0) > 4096) throw new HttpError(400, 'INVALID_REQUEST');
  const value = values[0] ?? '';
  if (required && !value) throw new HttpError(400, 'INVALID_REQUEST');
  return value;
}
function emptyBody(req: IncomingMessage, res: ServerResponse) {
  const length = header(req, 'content-length');
  // Commands accept no payload. Reject framing before reading so a stalled
  // unauthenticated stream cannot retain an unresolved handler or connection.
  if (header(req, 'transfer-encoding') || (length && length !== '0')) {
    res.setHeader('Connection', 'close');
    const tooLarge = length && (!/^\d+$/.test(length) || Number(length) > 1024);
    throw new HttpError(tooLarge ? 413 : 400, tooLarge ? 'REQUEST_TOO_LARGE' : 'INVALID_REQUEST');
  }
}

function limiter(options: AuthRouterOptions) {
  const config = { windowMs: 60_000, maxRequests: 120, maxEntries: 10_000, ...options.rateLimit };
  for (const value of Object.values(config)) if (!Number.isSafeInteger(value) || value <= 0) throw new HttpError(500, 'INVALID_CONFIG');
  const buckets = new Map<string, Readonly<{ count: number; expiresAt: number }>>();
  return (req: IncomingMessage) => {
    const now = (options.clock ?? Date.now)();
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + config.windowMs)) throw new HttpError(500, 'INVALID_CONFIG');
    // Proxy headers are untrusted. Forwarding deployments need a separate reviewed policy.
    const ip = req.socket.remoteAddress ?? 'unknown';
    const existing = buckets.get(ip);
    if (existing && existing.expiresAt > now) {
      if (existing.count >= config.maxRequests) throw new HttpError(429, 'RATE_LIMITED');
      buckets.set(ip, { ...existing, count: existing.count + 1 }); return;
    }
    for (const [key, value] of buckets) if (value.expiresAt <= now) buckets.delete(key);
    if (buckets.size >= config.maxEntries) throw new HttpError(429, 'RATE_LIMITED');
    buckets.set(ip, { count: 1, expiresAt: now + config.windowMs });
  };
}
/** Node HTTP boundary: all identity/session inputs originate from verified dependencies. */
export function createAuthRouter(options: AuthRouterOptions) {
  const origin = validateAuthOrigin(options.origin), names = authCookieNames(origin);
  const rateLimit = limiter(options), state = options.authState;
  const clearFlow = () => serializeAuthCookie(origin, 'flow', '', 0);
  const age = (expiry: number) => Math.max(0, Math.ceil((expiry - (options.clock ?? Date.now)()) / 1000));
  async function session(req: IncomingMessage) {
    const token = cookie(req, names.session);
    const authenticated = await state.authenticate(token);
    if (!authenticated) throw new HttpError(401, 'SESSION_REQUIRED');
    return { token, ...authenticated };
  }
  async function csrf(req: IncomingMessage) {
    const authenticated = await session(req);
    try { await state.verifyCsrf(authenticated.token, header(req, 'x-csrf-token'), header(req, 'origin')); }
    catch { throw new HttpError(403, 'INVALID_CSRF'); }
    return authenticated;
  }
  async function start(req: IncomingMessage, res: ServerResponse, provider: Provider, link: boolean) {
    const oidc = options.providers[provider];
    if (!oidc) throw new HttpError(503, 'PROVIDER_UNAVAILABLE');
    const token = cookie(req, names.session);
    if (link) await csrf(req);
    else if (token && !await state.authenticate(token)) throw new HttpError(401, 'SESSION_REQUIRED');
    const nonce = randomBytes(32).toString('base64url');
    const material = oidc.start(randomBytes(32).toString('base64url'), nonce);
    const flow = await state.createPendingFlow({ provider, purpose: link ? 'link' : 'login', verifier: material.verifier, nonce, ...(token ? { initialSessionToken: token } : {}) });
    const destination = new URL(material.authorizationUrl);
    const expected = provider === 'kakao' ? 'https://kauth.kakao.com/oauth/authorize' : 'https://accounts.google.com/o/oauth2/v2/auth';
    if (destination.origin + destination.pathname !== expected || destination.username || destination.password || destination.hash) throw new HttpError(503, 'PROVIDER_UNAVAILABLE');
    destination.searchParams.set('state', flow.state);
    res.setHeader('Set-Cookie', serializeAuthCookie(origin, 'flow', flow.browserBinding, age(flow.expiresAt)));
    if (link) json(res, 200, { authorizationUrl: destination.href });
    else redirect(res, destination.href);
  }
  async function callback(req: IncomingMessage, res: ServerResponse, provider: Provider, query: URLSearchParams) {
    res.setHeader('Set-Cookie', clearFlow());
    const oidc = options.providers[provider];
    if (!oidc) throw new HttpError(503, 'PROVIDER_UNAVAILABLE');
    try {
      const token = cookie(req, names.session);
      const flow = await state.consumeFlow({ state: single(query, 'state'), provider, browserBinding: cookie(req, names.flow), ...(token ? { currentSessionToken: token } : {}) });
      const error = single(query, 'error', false), code = single(query, 'code', false);
      if (error || !code) throw new HttpError(400, 'AUTH_FAILED');
      const identity = await oidc.complete(code, flow.verifier, flow.nonce);
      if (identity.provider !== provider) throw new HttpError(400, 'AUTH_FAILED');
      const completed = await options.completionPort.complete({
        identity, purpose: flow.purpose,
        ...(token ? { currentSessionToken: token } : {}),
        ...(flow.accountId ? { expectedAccountId: flow.accountId } : {}),
      });
      if (flow.purpose === 'link') {
        if (completed.session) throw new HttpError(503, 'AUTH_UNAVAILABLE');
        redirect(res, origin + '/?auth=linked'); return;
      }
      const issued = completed.session;
      if (!issued) throw new HttpError(503, 'AUTH_UNAVAILABLE');
      res.setHeader('Set-Cookie', [clearFlow(), serializeAuthCookie(origin, 'session', issued.token, age(issued.expiresAt))]);
      redirect(res, origin + '/?auth=success');
    } catch (error) {
      const reason = error instanceof IdentityLinkError && ['GOOGLE_NOT_LINKED', 'IDENTITY_ALREADY_LINKED'].includes(error.code) ? error.code : 'AUTH_FAILED';
      redirect(res, origin + '/?auth=error&reason=' + reason);
    }
  }
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      rateLimit(req);
      if (!req.url || req.url.length > 8192 || !req.url.startsWith('/') || req.url.startsWith('//')) throw new HttpError(400, 'INVALID_REQUEST');
      const url = new URL(req.url, origin);
      const route = /^\/api\/v1\/auth\/(kakao|google)\/(start|callback|link\/start)$/.exec(url.pathname);
      const known = route || url.pathname === '/api/v1/me' || url.pathname === '/api/v1/auth/logout';
      if (!known) throw new HttpError(404, 'NOT_FOUND');
      const action = route?.[2];
      if (route && action === 'link/start' && route[1] !== 'google') throw new HttpError(404, 'NOT_FOUND');
      const expectedMethod = action === 'link/start' || url.pathname === '/api/v1/auth/logout' ? 'POST' : 'GET';
      if (req.method !== expectedMethod) { res.setHeader('Allow', expectedMethod); throw new HttpError(405, 'METHOD_NOT_ALLOWED'); }
      if (expectedMethod === 'POST') emptyBody(req, res);
      if (route) {
        const provider = route[1] as Provider;
        if (action === 'callback') await callback(req, res, provider, url.searchParams);
        else await start(req, res, provider, action === 'link/start');
      } else if (url.pathname === '/api/v1/me') {
        const authenticated = await session(req);
        json(res, 200, { accountId: authenticated.accountId, csrf: authenticated.csrf });
      } else {
        const authenticated = await csrf(req); await state.revokeSession(authenticated.token);
        res.setHeader('Set-Cookie', [serializeAuthCookie(origin, 'session', '', 0), clearFlow()]);
        json(res, 200, { loggedOut: true });
      }
    } catch (error) {
      if (error instanceof HttpError) json(res, error.status, null, error.code);
      else json(res, 503, null, 'AUTH_UNAVAILABLE');
    }
  };
}
