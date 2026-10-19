import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createLocalJWKSet, errors, jwtVerify, type JSONWebKeySet } from 'jose';
import type { VerifiedIdentity } from './identity-links';

type Provider = VerifiedIdentity['provider'];
export type OidcProviderConfig = Readonly<{
  provider: Provider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;
/** Trusted server dependency injection only; never populate from HTTP input. */
export type OidcTransport = Readonly<{ fetch?: typeof fetch; timeoutMs?: number }>;
type ErrorCode = 'INVALID_CONFIG' | 'INVALID_REQUEST' | 'PROVIDER_UNAVAILABLE' | 'INVALID_ID_TOKEN';
export class OidcProviderError extends Error {
  readonly name = 'OidcProviderError';
  constructor(readonly code: ErrorCode) { super(code); }
}
const ENDPOINTS = {
  kakao: {
    issuer: ['https://kauth.kakao.com'],
    authorization: 'https://kauth.kakao.com/oauth/authorize',
    tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
    jwks: 'https://kauth.kakao.com/.well-known/jwks.json',
  },
  google: {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  },
} as const;
const CLOCK_TOLERANCE_SECONDS = 5;
const JWKS_CACHE_MS = 5 * 60_000;

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max && value.trim().length > 0;
}
function opaque(value: unknown): value is string {
  return boundedString(value, 32, 256) && /^[A-Za-z0-9_-]+$/.test(value);
}
function checkedConfig(config: OidcProviderConfig): OidcProviderConfig {
  if (!config || (config.provider !== 'kakao' && config.provider !== 'google')
    || !boundedString(config.clientId, 1, 1024) || !boundedString(config.clientSecret, 1, 4096)
    || !boundedString(config.redirectUri, 1, 2048)) throw new OidcProviderError('INVALID_CONFIG');
  try {
    const url = new URL(config.redirectUri);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
      || url.username || url.password || url.hash) throw new Error();
  } catch { throw new OidcProviderError('INVALID_CONFIG'); }
  return Object.freeze({ ...config });
}

/** Bounds the complete fetch + streamed body, even with an uncooperative transport. */
async function boundedJson(fetcher: typeof fetch, url: string, init: RequestInit, maxBytes: number, timeoutMs: number): Promise<unknown> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { abort.abort(); reject(new OidcProviderError('PROVIDER_UNAVAILABLE')); }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetcher(url, { ...init, signal: abort.signal, redirect: 'error' });
      if (!response.ok || !response.body) throw new Error();
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { abort.abort(); throw new Error(); }
          chunks.push(value);
        }
      } finally {
        // Cancelling a hostile stream must not postpone the timeout/error result.
        void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    })()]);
  } catch { throw new OidcProviderError('PROVIDER_UNAVAILABLE'); }
  finally { clearTimeout(timer); }
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function matchingNonce(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  const actualBytes = Buffer.from(actual); const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

/**
 * Verifies code-flow ID tokens using pinned provider endpoints and public JWKS.
 * HTTP callbacks must separately consume the one-use state bound to their session.
 * Strict single audience: multi-audience tokens are rejected, even with azp.
 * Secrets, authorization codes and tokens are never returned or logged.
 */
export function createOidcProvider(input: OidcProviderConfig, transport: OidcTransport = {}) {
  const config = checkedConfig(input);
  const endpoints = ENDPOINTS[config.provider];
  const fetcher = transport.fetch ?? globalThis.fetch;
  const timeoutMs = transport.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new OidcProviderError('INVALID_CONFIG');
  let cached: { resolver: ReturnType<typeof createLocalJWKSet>; expires: number } | undefined;
  let pendingKeys: Promise<ReturnType<typeof createLocalJWKSet>> | undefined;
  async function keys(refresh = false) {
    if (!refresh && cached && cached.expires > Date.now()) return cached.resolver;
    if (pendingKeys) return pendingKeys;
    pendingKeys = (async () => {
      const data = await boundedJson(fetcher, endpoints.jwks, { headers: { accept: 'application/json' } }, 1_048_576, timeoutMs);
      if (!record(data) || !Array.isArray(data.keys) || !data.keys.length || data.keys.length > 100
        || data.keys.some(key => !record(key) || 'd' in key)) throw new OidcProviderError('PROVIDER_UNAVAILABLE');
      const resolver = createLocalJWKSet(data as unknown as JSONWebKeySet);
      cached = { resolver, expires: Date.now() + JWKS_CACHE_MS };
      return resolver;
    })();
    try { return await pendingKeys; } finally { pendingKeys = undefined; }
  }
  async function verify(idToken: string, nonce: string): Promise<VerifiedIdentity> {
    try {
      const resolver = await keys();
      const options = { issuer: [...endpoints.issuer], audience: config.clientId, algorithms: ['RS256'],
        requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat', 'nonce'], clockTolerance: CLOCK_TOLERANCE_SECONDS };
      const result = await jwtVerify(idToken, resolver, options).catch(async error => {
        if (!(error instanceof errors.JWKSNoMatchingKey)) throw error;
        return jwtVerify(idToken, await keys(true), options);
      });
      const { payload } = result;
      if (!boundedString(payload.sub, 1, 1024) || payload.aud !== config.clientId
        || (payload.azp !== undefined && payload.azp !== config.clientId)
        || typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)
        || payload.iat > Date.now() / 1000 + CLOCK_TOLERANCE_SECONDS
        || !matchingNonce(payload.nonce, nonce)) throw new Error();
      return Object.freeze({ provider: config.provider, subject: payload.sub });
    } catch (error) {
      if (error instanceof OidcProviderError) throw error;
      throw new OidcProviderError('INVALID_ID_TOKEN');
    }
  }
  return Object.freeze({
    start(state: string, nonce: string): Readonly<{ authorizationUrl: string; verifier: string }> {
      if (!opaque(state) || !opaque(nonce)) throw new OidcProviderError('INVALID_REQUEST');
      const verifier = randomBytes(32).toString('base64url');
      const authorization = new URL(endpoints.authorization);
      authorization.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
        response_type: 'code', scope: 'openid', state, nonce, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString();
      return Object.freeze({ authorizationUrl: authorization.toString(), verifier });
    },
    async complete(code: string, verifier: string, nonce: string): Promise<VerifiedIdentity> {
      if (!boundedString(code, 1, 8192) || !boundedString(verifier, 43, 128)
        || !/^[A-Za-z0-9._~-]+$/.test(verifier) || !opaque(nonce)) throw new OidcProviderError('INVALID_REQUEST');
      const data = await boundedJson(fetcher, endpoints.tokenEndpoint, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId,
          client_secret: config.clientSecret, redirect_uri: config.redirectUri, code, code_verifier: verifier }).toString(),
      }, 262_144, timeoutMs);
      if (!record(data) || !boundedString(data.id_token, 1, 131_072)) throw new OidcProviderError('PROVIDER_UNAVAILABLE');
      return verify(data.id_token, nonce);
    },
  });
}
