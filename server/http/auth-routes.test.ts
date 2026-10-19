import { createServer, type Server } from 'node:http';
import { connect } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuthRouter, type AuthRouterOptions } from './auth-routes';
import { createAuthStateService, type AuthStatePort, type PendingFlow, type StoredSession } from '../auth/auth-state';
import { linkGoogle, resolveLogin, type Account, type IdentityLinkPort, type VerifiedIdentity } from '../auth/identity-links';
import type { AuthCompletionPort } from '../auth/postgres-auth-completion';
const origin = 'http://localhost:3000';
const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(r => { s.closeAllConnections(); s.close(() => r()); }))); });
async function harness(overrides: Partial<AuthRouterOptions> = {}) {
  let now = 1000;
  const flows = new Map<string, PendingFlow>(), sessions = new Map<string, StoredSession>();
  const statePort: AuthStatePort = {
    async createFlow(f) { flows.set(f.stateHash, f); },
    async consumeFlow(i) { const f = flows.get(i.stateHash); if (!f || f.provider !== i.provider || f.browserBindingHash !== i.browserBindingHash || f.startSessionHash !== i.startSessionHash || f.expiresAt <= i.now || (f.startSessionHash && !await statePort.findSession(f.startSessionHash, i.now))) return null; flows.delete(i.stateHash); return f; },
    async issueSession(s) { sessions.set(s.tokenHash, s); return true; },
    async findSession(h, t) { const s = sessions.get(h); return s && !s.revoked && s.expiresAt > t ? s : null; },
    async revokeSession(h) { const s = sessions.get(h); if (s) sessions.set(h, { ...s, revoked: true }); },
  };
  const authState = createAuthStateService({ origin, flowTtlMs: 10000, sessionTtlMs: 20000, csrfSecret: 's'.repeat(32) }, statePort, () => now);
  const identities = new Map<string, string>(); const accounts = new Map<string, Account>(); let created = 0;
  const identityPort: IdentityLinkPort = { async transaction(action) { return action({
    async findIdentity(i) { return identities.get(i.provider + i.subject) ?? null; },
    async findAccount(id) { return accounts.get(id) ?? null; },
    async createAccount() { const a = { id: `account-${++created}`, status: 'active' as const }; accounts.set(a.id, a); return a; },
    async insertIdentity(i, id) { const k = i.provider + i.subject; const existing = identities.get(k); if (existing) return existing === id ? 'already-linked' : 'conflict'; identities.set(k, id); return 'inserted'; },
  }); } };
  const completions: Array<Parameters<AuthCompletionPort['complete']>[0]> = [];
  const splitRevocations: string[] = [];
  // Test-only atomic-port fake; actual SQL locking/rollback is tested separately.
  const completionPort: AuthCompletionPort = { async complete(input) {
    completions.push(input);
    const current = input.currentSessionToken ? await authState.authenticate(input.currentSessionToken) : null;
    if ((input.currentSessionToken && !current) || (input.expectedAccountId && current?.accountId !== input.expectedAccountId)) throw new Error('SESSION_REQUIRED');
    if (input.purpose === 'link') {
      const result = await linkGoogle(current, input.identity, identityPort);
      return { accountId: result.accountId, linked: result.linked };
    }
    if (current && identities.get(input.identity.provider + input.identity.subject) !== current.accountId) throw new Error('ACCOUNT_SWITCH_REQUIRED');
    const account = await resolveLogin(input.identity, identityPort);
    const session = await authState.issueSession(account.accountId);
    if (input.currentSessionToken) await authState.revokeSession(input.currentSessionToken);
    return { accountId: account.accountId, session };
  } };
  const httpAuthState = { ...authState,
    async issueSession() { throw new Error('HTTP must not issue callback sessions'); },
    async revokeSession(token: string) { splitRevocations.push(token); await authState.revokeSession(token); },
  };
  const exchanges: Array<{ code: string; verifier: string; nonce: string }> = [];
  const provider = (name: VerifiedIdentity['provider']) => ({
    start(state: string, nonce: string) { return { authorizationUrl: `https://${name === 'kakao' ? 'kauth.kakao.com/oauth/authorize' : 'accounts.google.com/o/oauth2/v2/auth'}?state=${state}&nonce=${nonce}`, verifier: 'v'.repeat(43) }; },
    async complete(code: string, verifier: string, nonce: string) { exchanges.push({ code, verifier, nonce }); if (code === 'fail') throw new Error('private secret'); return { provider: name, subject: code }; },
  });
  const options = { origin, authState: httpAuthState, completionPort, providers: { kakao: provider('kakao'), google: provider('google') }, clock: () => now, ...overrides };
  const router = createAuthRouter(options);
  const server = createServer((req, res) => { void router(req, res); }); servers.push(server);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('address');
  const base = `http://127.0.0.1:${address.port}`;
  const request = (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, redirect: 'manual' });
  async function start(name = 'kakao', cookie = '', link = false, csrf = '') { const r = await request(`/api/v1/auth/${name}/${link ? 'link/start' : 'start'}`, { method: link ? 'POST' : 'GET', headers: { cookie, ...(link ? { origin, 'x-csrf-token': csrf } : {}) } }); const location = link && r.status === 200 ? (await r.json()).data.authorizationUrl as string : r.headers.get('location'); return { response: r, state: location ? new URL(location).searchParams.get('state')! : '', cookie: r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ') }; }
  async function callback(name: string, state: string, cookie: string, code = 'subject') { return request(`/api/v1/auth/${name}/callback?state=${state}&code=${code}`, { headers: { cookie } }); }
  async function login() { const flow = await start(); const r = await callback('kakao', flow.state, flow.cookie); return r.headers.getSetCookie().find(c => c.startsWith('knolstory-next-session='))!.split(';')[0]!; }
  return { base, completions, splitRevocations, request, start, callback, login, authState, exchanges, flows, sessions, accounts, identities, advance: (ms: number) => { now += ms; } };
}
describe('actual Node auth HTTP boundary', () => {
  it('creates Kakao membership via a browser-bound callback, returns me and revokes logout', async () => {
    const h = await harness(); const cookie = await h.login();
    expect(h.accounts.size).toBe(1); expect(h.exchanges[0]).toMatchObject({ code: 'subject', verifier: 'v'.repeat(43) });
    const me = await h.request('/api/v1/me', { headers: { cookie } }); expect(me.status).toBe(200); expect(me.headers.get('cache-control')).toBe('no-store');
    const body = await me.json(); expect(body).toMatchObject({ success: true, data: { accountId: 'account-1', csrf: expect.any(String) } }); expect(JSON.stringify(body)).not.toContain(cookie.split('=')[1]);
    const logout = await h.request('/api/v1/auth/logout', { method: 'POST', headers: { cookie, origin, 'x-csrf-token': body.data.csrf } }); expect(logout.status).toBe(200); expect(logout.headers.getSetCookie()[0]).toContain('Max-Age=0');
    expect((await h.request('/api/v1/me', { headers: { cookie } })).status).toBe(401);
  });
  it('only linked Google identities log into the same account; never signs Google up', async () => {
    const h = await harness(); const unknown = await h.start('google'); const denied = await h.callback('google', unknown.state, unknown.cookie); expect(denied.headers.get('location')).toBe(origin + '/?auth=error&reason=GOOGLE_NOT_LINKED'); expect(h.accounts.size).toBe(0);
    const cookie = await h.login(); const me = await (await h.request('/api/v1/me', { headers: { cookie } })).json();
    const link = await h.start('google', cookie, true, me.data.csrf); expect(link.response.status).toBe(200); expect(link.response.headers.get('location')).toBeNull(); expect(link.response.headers.get('content-type')).toContain('application/json');
    const linked = await h.callback('google', link.state, cookie + '; ' + link.cookie); expect(linked.headers.get('location')).toBe(origin + '/?auth=linked'); expect(linked.headers.getSetCookie().join()).not.toContain('knolstory-next-session=');
    const google = await h.start('google'); expect((await h.callback('google', google.state, google.cookie)).headers.get('location')).toBe(origin + '/?auth=success'); expect(h.accounts.size).toBe(1);
  });
  it('rejects missing session, forged CSRF and cross-origin link and logout requests', async () => {
    const h = await harness(); expect((await h.start('google', '', true)).response.status).toBe(401);
    const cookie = await h.login();
    for (const path of ['/api/v1/auth/google/link/start', '/api/v1/auth/logout']) {
      expect((await h.request(path, { method: 'POST', headers: { cookie, origin, 'x-csrf-token': 'bad' } })).status).toBe(403);
      expect((await h.request(path, { method: 'POST', headers: { cookie, origin: 'https://evil.test' } })).status).toBe(403);
    }
  });
  it('rejects missing, duplicate and incorrect state/browser cookies and replay, before exchange', async () => {
    const h = await harness(); const f = await h.start();
    for (const query of [`state=${f.state}&code=x`, `state=${f.state}&state=${f.state}&code=x`, 'code=x']) {
      const r = await h.request('/api/v1/auth/kakao/callback?' + query); expect(r.status).toBe(302); expect(r.headers.get('location')).toContain('auth=error');
    }
    expect(h.exchanges).toHaveLength(0);
    expect((await h.callback('kakao', f.state, f.cookie)).headers.get('location')).toContain('auth=success');
    expect((await h.callback('kakao', f.state, f.cookie)).headers.get('location')).toContain('auth=error'); expect(h.exchanges).toHaveLength(1);
  });
  it('rejects expired flows, swapped sessions and callback provider mismatch', async () => {
    const h = await harness(); const f = await h.start(); h.advance(10000); expect((await h.callback('kakao', f.state, f.cookie)).headers.get('location')).toContain('auth=error');
    const cookie = await h.login(); const token = cookie.split('=')[1]!; const session = await h.authState.authenticate(token);
    const link = await h.start('google', cookie, true, session!.csrf); const other = await h.authState.issueSession('other');
    expect((await h.callback('google', link.state, `knolstory-next-session=${other.token}; ${link.cookie}`)).headers.get('location')).toContain('auth=error');
    const mismatch = await h.start(); expect((await h.callback('google', mismatch.state, mismatch.cookie)).headers.get('location')).toContain('auth=error');
  });
  it('consumes provider denial, redacts failures, validates duplicate code and clears flow', async () => {
    const h = await harness(); const f = await h.start(); const denied = await h.request(`/api/v1/auth/kakao/callback?state=${f.state}&error=private-secret`, { headers: { cookie: f.cookie } }); expect(denied.headers.get('location')).toBe(origin + '/?auth=error&reason=AUTH_FAILED'); expect(denied.headers.getSetCookie()[0]).toContain('Max-Age=0');
    expect((await h.callback('kakao', f.state, f.cookie)).headers.get('location')).toContain('auth=error');
    const g = await h.start(); const fail = await h.callback('kakao', g.state, g.cookie, 'fail'); expect(fail.headers.get('location')).not.toContain('secret');
    const d = await h.start(); expect((await h.request(`/api/v1/auth/kakao/callback?state=${d.state}&code=a&code=b`, { headers: { cookie: d.cookie } })).headers.get('location')).toContain('auth=error');
  });
  it('rejects disabled providers, unknown routes, bad methods, nonempty bodies and adds no CORS', async () => {
    const h = await harness({ providers: {} }); expect((await h.request('/api/v1/auth/kakao/start')).status).toBe(503);
    expect((await h.request('/api/v1/auth/kakao/callback?state=x&code=x')).status).toBe(503);
    expect((await h.request('/unknown')).status).toBe(404); expect((await h.request('/api/v1/auth/logout')).status).toBe(405);
    expect((await h.request('/api/v1/me', { method: 'POST', body: 'x'.repeat(1025) })).status).toBe(405);
    const res = await h.request('/api/v1/me', { headers: { origin: 'https://evil.test' } }); expect(res.status).toBe(401); expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect((await h.request('/api/v1/auth/logout', { method: 'POST', body: 'x'.repeat(1025) })).status).toBe(413);
    expect((await h.request('/api/v1/auth/logout', { method: 'POST', body: '{"accountId":"other"}' })).status).toBe(400);
  });
  it('rotates an existing same-account login and refuses silent account switching', async () => {
    const h = await harness(); const cookie = await h.login();
    const same = await h.start('kakao', cookie); const rotated = await h.callback('kakao', same.state, cookie + '; ' + same.cookie);
    expect(rotated.headers.get('location')).toContain('auth=success'); expect(await h.authState.authenticate(cookie.split('=')[1]!)).toBeNull();
    const nextCookie = rotated.headers.getSetCookie().find(c => c.startsWith('knolstory-next-session='))!.split(';')[0]!;
    const different = await h.start('kakao', nextCookie); const refused = await h.callback('kakao', different.state, nextCookie + '; ' + different.cookie, 'other-subject');
    expect(refused.headers.get('location')).toContain('auth=error'); expect(h.accounts.size).toBe(1);
    expect(await h.authState.authenticate(nextCookie.split('=')[1]!)).not.toBeNull();
  });
  it('delegates callback effects to one required atomic completion call using stored purpose', async () => {
    const h = await harness(); const cookie = await h.login(); expect(h.completions).toHaveLength(1);
    expect(h.completions[0]).toEqual({ identity: { provider: 'kakao', subject: 'subject' }, purpose: 'login' });
    expect(h.splitRevocations).toHaveLength(0);
    const session = await h.authState.authenticate(cookie.split('=')[1]!);
    const flow = await h.start('google', cookie, true, session!.csrf);
    const r = await h.request(`/api/v1/auth/google/callback?state=${flow.state}&code=subject&purpose=login&accountId=attacker`, { headers: { cookie: cookie + '; ' + flow.cookie } });
    expect(r.headers.get('location')).toContain('auth=linked'); expect(h.completions).toHaveLength(2);
    expect(h.completions[1]).toEqual({ identity: { provider: 'google', subject: 'subject' }, purpose: 'link', currentSessionToken: cookie.split('=')[1], expectedAccountId: 'account-1' });
    expect(h.splitRevocations).toHaveLength(0);
  });
  it('fails closed when a completion port omits the required login session', async () => {
    const h = await harness({ completionPort: { async complete() { return { accountId: 'account' }; } } });
    const f = await h.start(); const r = await h.callback('kakao', f.state, f.cookie);
    expect(r.headers.get('location')).toContain('auth=error'); expect(r.headers.getSetCookie().join()).not.toContain('knolstory-next-session=');
  });
  it('rejects duplicate cookies and a revoked linking session without writing identity', async () => {
    const h = await harness(); const cookie = await h.login();
    expect((await h.request('/api/v1/me', { headers: { cookie: cookie + '; ' + cookie } })).status).toBe(400);
    const token = cookie.split('=')[1]!; const session = await h.authState.authenticate(token);
    const f = await h.start('google', cookie, true, session!.csrf); await h.authState.revokeSession(token);
    expect((await h.callback('google', f.state, cookie + '; ' + f.cookie)).headers.get('location')).toContain('auth=error'); expect(h.identities.size).toBe(1);
    expect((await h.start('kakao', cookie)).response.status).toBe(401);
    expect((await h.request('/api/v1/auth/kakao/link/start', { method: 'POST' })).status).toBe(404);
  });
  it('redacts dependency failures and rejects unsafe provider redirects', async () => {
    const broken = { start() { throw new Error('secret'); }, async complete() { throw new Error('secret'); } };
    const h = await harness({ providers: { kakao: broken } }); const r = await h.request('/api/v1/auth/kakao/start'); expect(r.status).toBe(503); expect(await r.text()).not.toContain('secret');
    const unsafe = await harness({ providers: { kakao: { ...broken, start() { return { authorizationUrl: 'https://evil.test', verifier: 'v'.repeat(43) }; } } } });
    expect((await unsafe.request('/api/v1/auth/kakao/start')).status).toBe(503);
  });
  it('immediately closes incomplete chunked and fixed-length command bodies', async () => {
    const h = await harness();
    async function partial(headers: string, fragment: string) {
      const port = Number(new URL(h.base).port);
      return new Promise<string>((resolve, reject) => {
        const socket = connect(port, '127.0.0.1'); let response = '';
        const timeout = setTimeout(() => { socket.destroy(); reject(new Error('request waited for incomplete body')); }, 500);
        socket.on('connect', () => socket.write('POST /api/v1/auth/logout HTTP/1.1\r\nHost: localhost\r\n' + headers + '\r\n' + fragment));
        socket.on('data', chunk => { response += chunk.toString(); });
        socket.on('error', error => { clearTimeout(timeout); reject(error); });
        socket.on('close', () => { clearTimeout(timeout); resolve(response); });
      });
    }
    const chunked = await partial('Transfer-Encoding: chunked\r\n', '5\r\nx');
    expect(chunked).toContain('400 Bad Request'); expect(chunked).toMatch(/connection: close/i);
    const fixed = await partial('Content-Length: 10\r\n', 'x');
    expect(fixed).toContain('400 Bad Request'); expect(fixed).toMatch(/connection: close/i);
    const large = await partial('Content-Length: 1025\r\n', 'x'); expect(large).toContain('413 Payload Too Large');
  });
  it('uses bounded per-socket-IP limits, ignores XFF, and expires buckets', async () => {
    const h = await harness({ rateLimit: { windowMs: 100, maxRequests: 2, maxEntries: 1 } });
    expect((await h.request('/api/v1/me')).status).toBe(401); expect((await h.request('/api/v1/me')).status).toBe(401);
    expect((await h.request('/api/v1/me', { headers: { 'x-forwarded-for': '1.2.3.4' } })).status).toBe(429); h.advance(100); expect((await h.request('/api/v1/me')).status).toBe(401);
  });
  it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid rate limits %s', async (value) => {
    await expect(harness({ rateLimit: { windowMs: value, maxRequests: 2, maxEntries: 2 } })).rejects.toThrow();
  });
});
