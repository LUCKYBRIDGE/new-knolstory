import { describe, expect, it } from 'vitest';
import { acceptsBrotli, brotliResponseInit, edgeConfig, handleEdgeRequest } from './story-edge-worker.mjs';

const env = { PUBLIC_ORIGIN: 'https://story.knolquiz.com', PAGES_ORIGIN: 'https://new-knolstory.pages.dev' };
function recorder(reply: (request: Request) => Response = () => new Response('ok')) {
  const seen: Request[] = [];
  const upstream = async (request: Request) => { seen.push(request); return reply(request); };
  return { seen, upstream };
}
const at = (path: string, init?: RequestInit) => new Request('https://story.knolquiz.com' + path, init);

describe('story edge worker', () => {
  it('accepts only the fixed public and Pages origins', () => {
    expect(edgeConfig(env)).toEqual({ publicOrigin: 'https://story.knolquiz.com', publicHost: 'story.knolquiz.com', pagesOrigin: 'https://new-knolstory.pages.dev' });
    for (const broken of [{}, { ...env, PUBLIC_ORIGIN: 'http://story.knolquiz.com' }, { ...env, PUBLIC_ORIGIN: 'https://story.knolquiz.com/' }, { ...env, PUBLIC_ORIGIN: 'https://evil.example' },
      { ...env, PAGES_ORIGIN: 'https://new-knolstory.pages.dev/x' }, { ...env, PAGES_ORIGIN: 'https://user:pw@new-knolstory.pages.dev' }, { ...env, PAGES_ORIGIN: 'https://evil.example' }])
      expect(() => edgeConfig(broken)).toThrow();
  });

  it('keeps the API, writes and other hosts on the Mac mini origin untouched', async () => {
    for (const request of [at('/api/v1/me'), at('/api'), at('/api/v1/auth/kakao/callback?code=a&state=b'), at('/', { method: 'POST', body: 'x' }), at('/assets/a.png', { method: 'OPTIONS' }), new Request('https://story-next.knolquiz.com/')]) {
      const { seen, upstream } = recorder();
      await handleEdgeRequest(request, env, upstream);
      expect(seen).toEqual([request]);
    }
  });

  it('reads static paths from Pages without cookies or credentials', async () => {
    const { seen, upstream } = recorder();
    await handleEdgeRequest(at('/assets/audio/a.ogg?v=1', { headers: { cookie: '__Host-knolstory-next-session=secret', authorization: 'Bearer x', range: 'bytes=0-1023', 'if-none-match': '"e"', 'user-agent': 'UA', accept: 'audio/*', 'x-csrf-token': 't' } }), env, upstream);
    const [sent] = seen;
    expect(sent.url).toBe('https://new-knolstory.pages.dev/assets/audio/a.ogg?v=1');
    expect(sent.method).toBe('GET');
    expect(sent.redirect).toBe('manual');
    expect(Object.fromEntries(sent.headers)).toEqual({ range: 'bytes=0-1023', 'if-none-match': '"e"', 'user-agent': 'UA', accept: 'audio/*' });
    const apiLike = recorder();
    await handleEdgeRequest(at('/apix/file.txt', { method: 'HEAD' }), env, apiLike.upstream);
    expect(apiLike.seen[0].url).toBe('https://new-knolstory.pages.dev/apix/file.txt');
    expect(apiLike.seen[0].method).toBe('HEAD');
  });

  it('never lets a request path pick another upstream host', async () => {
    for (const path of ['//evil.example/x', '/%2F%2Fevil.example/x', '/..//evil.example/x']) {
      const { seen, upstream } = recorder();
      await handleEdgeRequest(at(path), env, upstream);
      expect(new URL(seen[0].url).origin).toBe('https://new-knolstory.pages.dev');
    }
  });

  it('passes statuses and ranges through while removing Pages-only headers', async () => {
    const partial = recorder(() => new Response('0123', { status: 206, headers: { 'content-range': 'bytes 0-3/10', 'access-control-allow-origin': '*', 'set-cookie': 'a=b', 'cache-control': 'no-cache' } }));
    const response = await handleEdgeRequest(at('/assets/a.wav', { headers: { range: 'bytes=0-3' } }), env, partial.upstream);
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('0123');
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10');
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    expect(response.headers.has('set-cookie')).toBe(false);
    const notModified = recorder(() => new Response(null, { status: 304, headers: { etag: '"e"' } }));
    expect((await handleEdgeRequest(at('/'), env, notModified.upstream)).status).toBe(304);
  });

  it('rewrites Pages redirects to the public origin and leaves other targets alone', async () => {
    const cases: Array<[string, string]> = [['/shortstory', 'https://story.knolquiz.com/shortstory'], ['https://new-knolstory.pages.dev/a?b=1#c', 'https://story.knolquiz.com/a?b=1#c'], ['https://kauth.kakao.com/x', 'https://kauth.kakao.com/x']];
    for (const [location, expected] of cases) {
      const { upstream } = recorder(() => new Response(null, { status: 308, headers: { location } }));
      const response = await handleEdgeRequest(at('/shortstory.html'), env, upstream);
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(expected);
    }
  });

  it('falls back to the origin on a broken configuration and answers 502 when Pages is unreachable', async () => {
    const { seen, upstream } = recorder();
    const request = at('/');
    await handleEdgeRequest(request, { PUBLIC_ORIGIN: env.PUBLIC_ORIGIN }, upstream);
    expect(seen).toEqual([request]);
    const failing = await handleEdgeRequest(at('/'), env, async () => { throw new TypeError('network'); });
    expect(failing.status).toBe(502);
    expect(failing.headers.get('cache-control')).toBe('no-store');
  });
});

describe('brotli copies of large runtime files', () => {
  const chrome = 'gzip, deflate, br, zstd';
  it('negotiates br only when the browser lists it with a non-zero quality', () => {
    expect(acceptsBrotli(chrome)).toBe(true);
    expect(acceptsBrotli('br;q=0.5')).toBe(true);
    for (const value of [null, '', 'gzip', 'br;q=0', 'BR;Q=0.0', 'brotli', '*']) expect(acceptsBrotli(value)).toBe(false);
  });

  it('serves the stored brotli copy with the runtime file type and Vary', async () => {
    for (const [path, type] of [['/runtime/renpy.data', 'application/octet-stream'], ['/runtime/renpy.wasm', 'application/wasm']]) {
      const { seen, upstream } = recorder(() => new Response('BROTLI', { status: 200, headers: { 'content-type': 'application/octet-stream', 'content-length': '6', etag: '"br"', 'access-control-allow-origin': '*' } }));
      const response = await handleEdgeRequest(at(path, { headers: { 'accept-encoding': chrome, 'if-none-match': '"old"' } }), env, upstream);
      expect(seen.map(request => request.url)).toEqual([`https://new-knolstory.pages.dev${path}.br`]);
      expect(seen[0].headers.get('if-none-match')).toBe('"old"');
      expect(seen[0].headers.has('accept-encoding')).toBe(false);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('BROTLI');
      expect(Object.fromEntries(response.headers)).toMatchObject({ 'content-encoding': 'br', 'content-type': type, vary: 'Accept-Encoding', etag: '"br"', 'content-length': '6' });
      expect(response.headers.has('access-control-allow-origin')).toBe(false);
    }
  });

  it('sends the stored bytes without re-encoding and keeps 304 free of a body encoding', async () => {
    const init = brotliResponseInit(new Response('x', { status: 200, headers: { vary: 'Origin' } }), { path: '/runtime/renpy.data.br', type: 'application/octet-stream' });
    expect(init.encodeBody).toBe('manual');
    expect(init.headers.get('vary')).toBe('Origin, Accept-Encoding');
    const { upstream } = recorder(() => new Response(null, { status: 304, headers: { etag: '"br"' } }));
    const response = await handleEdgeRequest(at('/runtime/renpy.data', { headers: { 'accept-encoding': chrome } }), env, upstream);
    expect(response.status).toBe(304);
    expect(response.headers.get('etag')).toBe('"br"');
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  it('uses the identity file for ranges, browsers without br, other files and a missing copy', async () => {
    const plain = (init: RequestInit) => { const { seen, upstream } = recorder(); return handleEdgeRequest(at('/runtime/renpy.data', init), env, upstream).then(response => ({ seen, response })); };
    for (const headers of [{ 'accept-encoding': chrome, range: 'bytes=0-9' }, { 'accept-encoding': chrome, 'if-range': '"e"' }, { 'accept-encoding': 'gzip' }, {}]) {
      const { seen, response } = await plain({ headers });
      expect(seen.map(request => new URL(request.url).pathname)).toEqual(['/runtime/renpy.data']);
      expect(response.headers.get('vary')).toBe('Accept-Encoding');
      expect(response.headers.has('content-encoding')).toBe(false);
    }
    const other = recorder();
    await handleEdgeRequest(at('/runtime/game.zip', { headers: { 'accept-encoding': chrome } }), env, other.upstream);
    expect(other.seen.map(request => new URL(request.url).pathname)).toEqual(['/runtime/game.zip']);
    const missing = recorder(request => new URL(request.url).pathname.endsWith('.br') ? new Response('missing', { status: 404 }) : new Response('PLAIN'));
    const fallback = await handleEdgeRequest(at('/runtime/renpy.wasm', { headers: { 'accept-encoding': chrome } }), env, missing.upstream);
    expect(missing.seen.map(request => new URL(request.url).pathname)).toEqual(['/runtime/renpy.wasm.br', '/runtime/renpy.wasm']);
    expect(await fallback.text()).toBe('PLAIN');
    let calls = 0;
    const unreachable = await handleEdgeRequest(at('/runtime/renpy.data', { headers: { 'accept-encoding': chrome } }), env, async request => {
      calls += 1; if (new URL(request.url).pathname.endsWith('.br')) throw new TypeError('network'); return new Response('PLAIN');
    });
    expect(calls).toBe(2);
    expect(await unreachable.text()).toBe('PLAIN');
  });
});
