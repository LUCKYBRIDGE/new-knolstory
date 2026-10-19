import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createOidcProvider } from './oidc-provider';

const config = { provider: 'kakao' as const, clientId: 'client-test', clientSecret: 'secret-test-only', redirectUri: 'http://localhost:3000/auth/callback' };
const nonce = 'nonce-'.repeat(8);
const state = 'state-'.repeat(8);
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let otherKeys: typeof keys;
let jwk: Awaited<ReturnType<typeof exportJWK>>;
beforeAll(async () => {
  keys = await generateKeyPair('RS256'); otherKeys = await generateKeyPair('RS256');
  jwk = { ...await exportJWK(keys.publicKey), kid: 'key-1', alg: 'RS256', use: 'sig' };
});
async function token(claims: Record<string, unknown> = {}, options: { kid?: string; wrongKey?: boolean; alg?: string } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: 'https://kauth.kakao.com', aud: config.clientId, sub: 'opaque-subject', iat: now, exp: now + 300, nonce, ...claims })
    .setProtectedHeader({ alg: options.alg ?? 'RS256', kid: options.kid ?? 'key-1' })
    .sign(options.wrongKey ? otherKeys.privateKey : keys.privateKey);
}
function harness(idToken: string, opts: { tokenResponse?: () => Response | Promise<Response>; jwksResponse?: () => Response | Promise<Response> } = {}) {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); requests.push({ url, init });
    if (url === 'https://kauth.kakao.com/oauth/token' || url === 'https://oauth2.googleapis.com/token') return opts.tokenResponse?.() ?? Response.json({ id_token: idToken, access_token: 'discard-me' });
    return opts.jwksResponse?.() ?? Response.json({ keys: [jwk] });
  }) as typeof fetch;
  return { requests, provider: createOidcProvider(config, { fetch: fetcher, timeoutMs: 25 }), fetcher };
}

describe('provider-specific OIDC authorization and verified identity', () => {
  it('creates fresh PKCE S256 authorization requests and exchanges the code without retaining tokens', async () => {
    const h = harness(await token());
    const start = h.provider.start(state, nonce); const url = new URL(start.authorizationUrl);
    expect(start.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(h.provider.start(state, nonce).verifier).not.toBe(start.verifier);
    expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid', state, nonce, code_challenge_method: 'S256' });
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(start.verifier));
    expect(url.searchParams.get('code_challenge')).toBe(Buffer.from(digest).toString('base64url'));
    expect(await h.provider.complete('authorization-code', start.verifier, nonce)).toEqual({ provider: 'kakao', subject: 'opaque-subject' });
    const exchange = h.requests[0]!;
    expect(exchange.init?.redirect).toBe('error');
    expect(new URLSearchParams(String(exchange.init?.body)).get('client_secret')).toBe(config.clientSecret);
    expect(new URLSearchParams(String(exchange.init?.body)).get('code_verifier')).toBe(start.verifier);
    expect(h.requests[1]?.url).toBe('https://kauth.kakao.com/.well-known/jwks.json');
  });
  it.each(['https://accounts.google.com', 'accounts.google.com'])('accepts documented Google issuer %s and only returns identity', async (iss) => {
    const h = harness(await token({ iss }));
    const p = createOidcProvider({ ...config, provider: 'google' }, { fetch: h.fetcher });
    expect(new URL(p.start(state, nonce).authorizationUrl).origin).toBe('https://accounts.google.com');
    expect(await p.complete('code', 'v'.repeat(43), nonce)).toEqual({ provider: 'google', subject: 'opaque-subject' });
    expect(h.requests.map(r => r.url)).toEqual(['https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v3/certs']);
  });
  it.each([
    { iss: 'https://attacker.test' }, { aud: 'other-client' }, { nonce: 'wrong' }, { exp: 1 }, { iat: Math.floor(Date.now()/1000)+60 }, { sub: '' }, { sub: '  ' }, { sub: null }, { exp: undefined }, { iat: undefined }, { nonce: undefined }, { iss: undefined }, { aud: undefined }, { aud: ['client-test', 'extra'] }, { azp: 'other-client' },
  ])('rejects invalid or missing claims %j', async (claims) => {
    const h = harness(await token(claims));
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' });
  });
  it('rejects invalid signature and unsigned algorithm without fetching attacker jku', async () => {
    for (const jwt of [await token({}, { wrongKey: true }), `${Buffer.from(JSON.stringify({ alg: 'none', jku: 'https://attacker.test' })).toString('base64url')}.${Buffer.from('{}').toString('base64url')}.`]) {
      const h = harness(jwt);
      await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' });
      expect(h.requests.every(r => !r.url.includes('attacker'))).toBe(true);
    }
  });
  it('rejects symmetric algorithm confusion and missing or malformed subject claims', async () => {
    const symmetric = await new SignJWT({ iss: 'https://kauth.kakao.com', aud: config.clientId, sub: 'subject', nonce })
      .setProtectedHeader({ alg: 'HS256', kid: 'key-1' }).sign(new TextEncoder().encode('test-only-symmetric-key-32-bytes-long'));
    for (const jwt of [symmetric, await token({ sub: undefined }), await token({ sub: 123 })]) {
      const h = harness(jwt);
      await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' });
    }
  });
  it('bounds initial missing-kid discovery to one refresh and rejects private JWKS material', async () => {
    const h = harness(await token({}, { kid: 'unknown' }));
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' });
    expect(h.requests.filter(r => r.url.endsWith('jwks.json'))).toHaveLength(2);
    const privateKeys = harness(await token(), { jwksResponse: () => Response.json({ keys: [{ ...jwk, d: 'private-material' }] }) });
    await expect(privateKeys.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toThrow('PROVIDER_UNAVAILABLE');
  });
  it('bounds a stalled body read and enforces the timeout configuration range', async () => {
    const h = harness('', { tokenResponse: () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } })) });
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toThrow('PROVIDER_UNAVAILABLE');
    for (const timeoutMs of [0, -1, 30_001, Infinity, 1.5]) {
      expect(() => createOidcProvider(config, { timeoutMs })).toThrow('INVALID_CONFIG');
    }
  });
  it('caches keys and refreshes exactly once for a rotated key id', async () => {
    let count = 0; let jwt = await token();
    const h = harness('', { tokenResponse: () => Response.json({ id_token: jwt }), jwksResponse: () => { count++; return Response.json({ keys: [{ ...jwk, kid: count === 1 ? 'key-1' : 'key-2' }] }); } });
    await h.provider.complete('code', 'v'.repeat(43), nonce);
    await h.provider.complete('code2', 'v'.repeat(43), nonce); expect(count).toBe(1);
    jwt = await token({}, { kid: 'key-2' }); await h.provider.complete('code3', 'v'.repeat(43), nonce); expect(count).toBe(2);
    jwt = await token({}, { kid: 'missing' });
    await expect(h.provider.complete('code4', 'v'.repeat(43), nonce)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' }); expect(count).toBe(3);
  });
  it.each([
    () => new Response('private-provider-error secret-test-only', { status: 400 }),
    () => new Response('{bad'), () => Response.json({}), () => Response.json({ id_token: 123 }),
    () => new Response('x'.repeat(262145)), () => new Response('redirect', { status: 302 }),
    () => { throw new Error('secret-test-only'); },
  ])('redacts failed token exchanges', async (tokenResponse) => {
    const h = harness('', { tokenResponse });
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toThrow('PROVIDER_UNAVAILABLE');
  });
  it.each([() => new Response('{bad'), () => new Response('', { status: 503 }), () => new Response('x'.repeat(1048577)), () => Response.json({ keys: [] }), () => Response.json(null)])('fails closed on invalid JWKS', async (jwksResponse) => {
    const h = harness(await token(), { jwksResponse });
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toThrow();
  });
  it('aborts timed out requests', async () => {
    const h = harness('', { tokenResponse: () => new Promise(() => {}) });
    await expect(h.provider.complete('code', 'v'.repeat(43), nonce)).rejects.toThrow('PROVIDER_UNAVAILABLE');
  });
  it.each([{ clientId: '' }, { clientSecret: '' }, { redirectUri: 'http://example.com/callback' }, { redirectUri: 'javascript:alert(1)' }, { redirectUri: 'https://u:p@example.com/callback' }, { redirectUri: 'https://example.com/callback#fragment' }, { provider: 'other' }])('rejects unsafe configuration %j', (patch) => {
    expect(() => createOidcProvider({ ...config, ...patch } as typeof config)).toThrow('INVALID_CONFIG');
  });
  it('validates bounded inputs before network access', async () => {
    const h = harness('');
    expect(() => h.provider.start('', nonce)).toThrow('INVALID_REQUEST');
    expect(() => h.provider.start(state, 'short')).toThrow('INVALID_REQUEST');
    await expect(h.provider.complete('', 'v'.repeat(43), nonce)).rejects.toThrow('INVALID_REQUEST');
    await expect(h.provider.complete('code', 'short', nonce)).rejects.toThrow('INVALID_REQUEST');
    await expect(h.provider.complete('x'.repeat(8193), 'v'.repeat(43), nonce)).rejects.toThrow('INVALID_REQUEST');
    expect(h.requests).toHaveLength(0);
  });
});
