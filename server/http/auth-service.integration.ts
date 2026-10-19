import { createHash, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runStorageMigrations } from '../migrations/runner';
import { createAuthService } from './auth-service';

type Provider = 'kakao' | 'google';
type Ticket = Readonly<{ provider: Provider; nonce: string; challenge: string; subject: string; badNonce?: boolean; badSignature?: boolean }>;
const pool = new Pool({ max: 6 });
const codes = new Map<string, Ticket>();
const traffic: string[] = [];
let server: Server, origin: string;
let key: Awaited<ReturnType<typeof generateKeyPair>>;
let otherKey: Awaited<ReturnType<typeof generateKeyPair>>;
let publicJwk: Awaited<ReturnType<typeof exportJWK>>;
let exchangeGate: { entered: () => void; wait: Promise<void> } | undefined;
const clients = { kakao: 'local-kakao-client', google: 'local-google-client' };
const secrets = { kakao: 'local-kakao-secret', google: 'local-google-secret' };
const tokenUrls = { kakao: 'https://kauth.kakao.com/oauth/token', google: 'https://oauth2.googleapis.com/token' };
const keyUrls = ['https://kauth.kakao.com/.well-known/jwks.json', 'https://www.googleapis.com/oauth2/v3/certs'];

/** Only the trusted provider transport is replaced: JWT crypto, HTTP and DB remain real. */
const providerFetch: typeof fetch = async (input, init) => {
  const url = String(input); traffic.push(url);
  expect(init?.redirect).toBe('error');
  if (keyUrls.includes(url)) return Response.json({ keys: [{ ...publicJwk, kid: 'integration-key', alg: 'RS256', use: 'sig' }] });
  const provider = (Object.entries(tokenUrls).find(([, endpoint]) => endpoint === url)?.[0]) as Provider | undefined;
  expect(provider).toBeDefined();
  if (!provider) throw Error('Unexpected endpoint');
  expect(init?.method).toBe('POST');
  expect(new Headers(init?.headers).get('content-type')).toBe('application/x-www-form-urlencoded');
  const form = new URLSearchParams(String(init?.body));
  const code = form.get('code') ?? '', ticket = codes.get(code);
  expect(ticket?.provider).toBe(provider);
  if (!ticket) throw Error('Unknown code');
  codes.delete(code);
  expect([...form.keys()].sort()).toEqual(['client_id', 'client_secret', 'code', 'code_verifier', 'grant_type', 'redirect_uri']);
  expect(form.get('client_id')).toBe(clients[provider]);
  expect(form.get('client_secret')).toBe(secrets[provider]);
  expect(form.get('redirect_uri')).toBe(`${origin}/api/v1/auth/${provider}/callback`);
  expect(form.get('grant_type')).toBe('authorization_code');
  expect(createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url')).toBe(ticket.challenge);
  const gate = exchangeGate; exchangeGate = undefined;
  if (gate) { gate.entered(); await gate.wait; }
  const idToken = await new SignJWT({ nonce: ticket.badNonce ? 'incorrect-nonce' : ticket.nonce })
    .setProtectedHeader({ alg: 'RS256', kid: 'integration-key' })
    .setIssuer(provider === 'kakao' ? 'https://kauth.kakao.com' : 'https://accounts.google.com')
    .setAudience(clients[provider]).setSubject(ticket.subject).setIssuedAt().setExpirationTime('5m')
    .sign(ticket.badSignature ? otherKey.privateKey : key.privateKey);
  return Response.json({ id_token: idToken, access_token: 'never-exposed-provider-token' });
};

class Browser {
  readonly cookies = new Map<string, string>();
  async request(path: string, init: RequestInit = {}) {
    const response = await fetch(origin + path, { ...init, redirect: 'manual', headers: {
      cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '), ...init.headers,
    } });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'), separator = pair.indexOf('=');
      const name = pair.slice(0, separator), value = pair.slice(separator + 1);
      if (!value) this.cookies.delete(name); else this.cookies.set(name, value);
    }
    return response;
  }
  async me() {
    const response = await this.request('/api/v1/me');
    expect(response.status).toBe(200);
    return (await response.json()).data as { accountId: string; csrf: string };
  }
  async start(provider: Provider, link = false) {
    const csrf = link ? (await this.me()).csrf : '';
    const response = await this.request(`/api/v1/auth/${provider}/${link ? 'link/start' : 'start'}`, link
      ? { method: 'POST', headers: { origin, 'x-csrf-token': csrf } } : {});
    expect(response.status).toBe(link ? 200 : 302);
    const authorization = new URL(link ? (await response.json()).data.authorizationUrl : response.headers.get('location')!);
    if (link) {
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('content-type')).toContain('application/json');
    }
    expect(authorization.origin + authorization.pathname).toBe(provider === 'kakao'
      ? 'https://kauth.kakao.com/oauth/authorize' : 'https://accounts.google.com/o/oauth2/v2/auth');
    expect(authorization.searchParams.get('redirect_uri')).toBe(`${origin}/api/v1/auth/${provider}/callback`);
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorization.searchParams.get('nonce')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorization.searchParams.get('client_secret')).toBeNull();
    return authorization;
  }
  callback(provider: Provider, authorization: URL, subject: string, overrides: Partial<Ticket> = {}) {
    const code = randomUUID();
    codes.set(code, { provider, nonce: authorization.searchParams.get('nonce')!, challenge: authorization.searchParams.get('code_challenge')!, subject, ...overrides });
    return { code, path: `/api/v1/auth/${provider}/callback?${new URLSearchParams({ code, state: authorization.searchParams.get('state')! })}` };
  }
  async login(provider: Provider, subject: string) {
    const authorization = await this.start(provider), callback = this.callback(provider, authorization, subject);
    const response = await this.request(callback.path);
    expect(response.headers.get('location')).toBe(origin + '/?auth=success');
    const cookies = response.headers.getSetCookie();
    expect(cookies.some(cookie => cookie.includes('knolstory-next-session=') && cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax'))).toBe(true);
    return this.me();
  }
}
async function identityRows(subject: string) {
  return (await pool.query('SELECT account_id FROM knolstory_auth.identities WHERE subject=$1', [subject])).rows;
}
async function accountCounts() {
  const rows = await pool.query('SELECT (SELECT count(*) FROM knolstory_auth.accounts)::int AS accounts, (SELECT count(*) FROM knolstory_auth.sessions)::int AS sessions');
  return rows.rows[0];
}

describe('composed local HTTP → real OIDC RSA verification → PostgreSQL authentication', () => {
  beforeAll(async () => {
    await runStorageMigrations(pool);
    key = await generateKeyPair('RS256'); otherKey = await generateKeyPair('RS256'); publicJwk = await exportJWK(key.publicKey);
    // Bind once to discover the real loopback origin before constructing redirect URIs.
    server = createServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing HTTP port');
    origin = `http://127.0.0.1:${address.port}`;
    server.on('request', createAuthService({ origin, flowTtlMs: 60_000, sessionTtlMs: 60_000, csrfSecret: 'integration-csrf-secret-32-bytes-long', providers: {
      kakao: { clientId: clients.kakao, clientSecret: secrets.kakao, redirectUri: `${origin}/api/v1/auth/kakao/callback` },
      google: { clientId: clients.google, clientSecret: secrets.google, redirectUri: `${origin}/api/v1/auth/google/callback` },
    }, rateLimit: { maxRequests: 1000, maxEntries: 10, windowMs: 60_000 } }, pool, { fetch: providerFetch }));
  });
  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
  });

  it('allows Kakao signup and explicitly linked Google login to the same account after logout', async () => {
    const browser = new Browser(), kakaoSubject = randomUUID(), googleSubject = randomUUID();
    const account = await browser.login('kakao', kakaoSubject);
    const auth = await browser.start('google', true), callback = browser.callback('google', auth, googleSubject);
    const linked = await browser.request(callback.path);
    expect(linked.headers.get('location')).toBe(origin + '/?auth=linked');
    expect((await browser.me()).accountId).toBe(account.accountId);
    expect(await identityRows(googleSubject)).toEqual([{ account_id: account.accountId }]);
    const logout = await browser.request('/api/v1/auth/logout', { method: 'POST', headers: { origin, 'x-csrf-token': account.csrf } });
    expect(logout.status).toBe(200); expect((await browser.request('/api/v1/me')).status).toBe(401);
    expect((await browser.login('google', googleSubject)).accountId).toBe(account.accountId);
  });

  it('denies unlinked Google signup without creating an account or session', async () => {
    const before = await accountCounts(), browser = new Browser(), subject = randomUUID();
    const callback = browser.callback('google', await browser.start('google'), subject);
    const response = await browser.request(callback.path);
    expect(response.headers.get('location')).toBe(origin + '/?auth=error&reason=GOOGLE_NOT_LINKED');
    expect(await identityRows(subject)).toEqual([]); expect(await accountCounts()).toEqual(before);
    expect((await browser.request('/api/v1/me')).status).toBe(401);
  });

  it.each(['badNonce', 'badSignature'] as const)('rejects %s before identity mutation and keeps the current account', async failure => {
    const browser = new Browser(), account = await browser.login('kakao', randomUUID()), subject = randomUUID();
    const before = await accountCounts(), callback = browser.callback('google', await browser.start('google', true), subject, { [failure]: true });
    const response = await browser.request(callback.path);
    expect(response.headers.get('location')).toBe(origin + '/?auth=error&reason=AUTH_FAILED');
    expect((await browser.me()).accountId).toBe(account.accountId); expect(await identityRows(subject)).toEqual([]);
    expect(await accountCounts()).toEqual(before);
  });

  it('requires POST origin and CSRF before starting an account link', async () => {
    const browser = new Browser(); await browser.login('kakao', randomUUID());
    expect((await browser.request('/api/v1/auth/google/link/start')).status).toBe(405);
    expect((await browser.request('/api/v1/auth/google/link/start', { method: 'POST', headers: { origin } })).status).toBe(403);
    const { csrf } = await browser.me();
    expect((await browser.request('/api/v1/auth/google/link/start', { method: 'POST', headers: { origin: 'https://other.example', 'x-csrf-token': csrf } })).status).toBe(403);
  });

  it('rejects state/cookie mismatch before token exchange, consumes a genuine callback once, and denies replay', async () => {
    const browser = new Browser(), subject = randomUUID(), auth = await browser.start('kakao'), callback = browser.callback('kakao', auth, subject);
    const cookieSnapshot = new Map(browser.cookies), beforeTraffic = traffic.length;
    const wrongState = new URL(callback.path, origin); wrongState.searchParams.set('state', 's'.repeat(43));
    expect((await browser.request(wrongState.pathname + wrongState.search)).headers.get('location')).toContain('AUTH_FAILED');
    browser.cookies.clear();
    const stranger = new Browser();
    expect((await stranger.request(callback.path)).headers.get('location')).toContain('AUTH_FAILED');
    expect(traffic).toHaveLength(beforeTraffic);
    for (const [name, value] of cookieSnapshot) browser.cookies.set(name, value);
    expect((await browser.request(callback.path)).headers.get('location')).toBe(origin + '/?auth=success');
    const account = await browser.me(), afterTraffic = traffic.length;
    expect((await stranger.request(callback.path, { headers: { cookie: [...cookieSnapshot].map(([name, value]) => `${name}=${value}`).join('; ') } })).headers.get('location')).toContain('AUTH_FAILED');
    expect(traffic).toHaveLength(afterTraffic); expect(await identityRows(subject)).toEqual([{ account_id: account.accountId }]);
  });

  it('rechecks a session revoked during token exchange and atomically rejects linking without an identity write', async () => {
    const browser = new Browser(), account = await browser.login('kakao', randomUUID()), subject = randomUUID();
    const callback = browser.callback('google', await browser.start('google', true), subject);
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    exchangeGate = { entered, wait: new Promise<void>(resolve => { release = resolve; }) };
    const pending = browser.request(callback.path);
    try {
      await started;
      const logout = await browser.request('/api/v1/auth/logout', { method: 'POST', headers: { origin, 'x-csrf-token': account.csrf } });
      expect(logout.status).toBe(200);
    } finally { release(); }
    expect((await pending).headers.get('location')).toBe(origin + '/?auth=error&reason=AUTH_FAILED');
    expect(await identityRows(subject)).toEqual([]); expect((await browser.request('/api/v1/me')).status).toBe(401);
  });

  it('pins callback configuration and permits disabled providers with no fallback credentials', async () => {
    expect(() => createAuthService({ origin, flowTtlMs: 1000, sessionTtlMs: 1000, csrfSecret: 's'.repeat(32), providers: {
      kakao: { clientId: 'client', clientSecret: 'secret', redirectUri: origin + '/arbitrary-path' },
    } }, pool)).toThrow();
    const handler = createAuthService({ origin, flowTtlMs: 1000, sessionTtlMs: 1000, csrfSecret: 's'.repeat(32), providers: {} }, pool);
    const disabled = createServer(handler);
    await new Promise<void>(resolve => disabled.listen(0, '127.0.0.1', resolve));
    try {
      const address = disabled.address(); if (!address || typeof address === 'string') throw Error('Missing port');
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/kakao/start`, { redirect: 'manual' });
      expect(response.status).toBe(503); expect(await response.json()).toEqual({ success: false, error: { code: 'PROVIDER_UNAVAILABLE' } });
    } finally { await new Promise<void>((resolve, reject) => disabled.close(error => error ? reject(error) : resolve())); }
    expect(traffic.every(url => [...Object.values(tokenUrls), ...keyUrls].includes(url))).toBe(true);
  });
});
