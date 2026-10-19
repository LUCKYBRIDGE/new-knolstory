import { createServer, type Server } from 'node:http';
import { connect } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocumentRouter, type DocumentRouterOptions } from './document-routes';
import { DocumentServiceError, type DocumentService } from '../documents/service';
const origin = 'http://localhost:3000', token = 't'.repeat(43), recordId = '12345678-1234-4123-8123-123456789012';
const context = { token, accountId: 'owner' };
const snapshot = { document: { title: '원본 유지' } };
const input = { payloadVersion: 1, snapshot, idempotencyKey: 'create-1' };
const receipt = { recordId, revision: 1, hash: 'hash', createdAt: 'now', updatedAt: 'now', replayed: false };
const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(r => { s.closeAllConnections(); s.close(() => r()); }))); });
async function harness(overrides: Partial<DocumentRouterOptions> = {}) {
  const documents = { create: vi.fn(async () => receipt), list: vi.fn(async () => ({ documents: [], nextCursor: null })), read: vi.fn(async () => ({ metadata: receipt, snapshot })), save: vi.fn(async () => ({ ...receipt, revision: 2 })) };
  const authState = { authenticate: vi.fn(async (value: string) => value === token ? { accountId: 'owner', csrf: 'csrf', expiresAt: Date.now() + 1000 } : null), verifyCsrf: vi.fn(async (value: string, csrf: string, requestOrigin: string) => { if (value !== token || csrf !== 'csrf' || requestOrigin !== origin) throw Error('private'); }) } as unknown as DocumentRouterOptions['authState'];
  const router = createDocumentRouter({ origin, authState, documents: documents as unknown as DocumentService, ...overrides });
  const server = createServer((req, res) => { void router(req, res); }); servers.push(server); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('address');
  const port = address.port;
  const base = `http://127.0.0.1:${port}`;
  const request = (path = '/api/v1/documents', init: RequestInit = {}) => fetch(base + path, { ...init, headers: { cookie: `knolstory-next-session=${token}`, origin, 'x-csrf-token': 'csrf', ...init.headers } });
  const write = (body: unknown, path = '/api/v1/documents', method = 'POST') => { const { idempotencyKey, ...payload } = body as Record<string, unknown>; return request(path, { method, headers: { 'content-type': 'application/json', 'idempotency-key': typeof idempotencyKey === 'string' ? idempotencyKey : 'create-1' }, body: JSON.stringify(payload) }); };
  async function raw(request: string) { return new Promise<string>((resolve, reject) => { const socket = connect(port, '127.0.0.1'); let text = ''; const timer = setTimeout(() => { socket.destroy(); reject(Error('socket did not close')); }, 600); socket.on('connect', () => socket.write(request)); socket.on('data', chunk => { text += chunk; }); socket.on('close', () => { clearTimeout(timer); resolve(text); }); socket.on('error', error => { clearTimeout(timer); reject(error); }); }); }
  return { request, write, raw, documents, authState };
}
describe('document HTTP boundary', () => {
  it('accepts a matching expected account while cookie remains the authority', async () => {
    const h = await harness();
    vi.mocked(h.authState.authenticate).mockResolvedValue({ accountId: recordId, csrf: 'csrf', expiresAt: Date.now() + 1000 });
    const headers = { 'x-knolstory-account-id': recordId };
    expect((await h.request(undefined, { headers })).status).toBe(200);
    expect((await h.request('/api/v1/documents/' + recordId, { headers })).status).toBe(200);
    const body = JSON.stringify({ payloadVersion: 1, snapshot });
    expect((await h.request(undefined, { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'bound-create' }, body })).status).toBe(201);
    expect((await h.request('/api/v1/documents/' + recordId, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': 'bound-save' }, body: JSON.stringify({ payloadVersion: 1, snapshot, expectedRevision: 1 }) })).status).toBe(200);
    for (const fn of Object.values(h.documents)) expect((fn.mock.calls as readonly (readonly unknown[])[])[0]?.[0]).toEqual({ token, accountId: recordId });
  });
  it.each([['GET', ''], ['GET', '/' + recordId], ['POST', ''], ['PUT', '/' + recordId]])('rejects changed account before service or body processing: %s %s', async (method, suffix) => {
    const h = await harness();
    vi.mocked(h.authState.authenticate).mockResolvedValue({ accountId: recordId, csrf: 'csrf', expiresAt: Date.now() + 1000 });
    const expected = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const response = await h.request('/api/v1/documents' + suffix, { method, headers: { 'x-knolstory-account-id': expected }, ...(method === 'GET' ? {} : { body: '{' }) });
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ success: false, error: { code: 'ACCOUNT_SESSION_CHANGED' } });
    for (const fn of Object.values(h.documents)) expect(fn).not.toHaveBeenCalled();
    expect(h.authState.verifyCsrf).not.toHaveBeenCalled();
  });
  it.each(['', 'owner', '123', recordId + ', ' + recordId])('rejects malformed expected account %j', async expected => {
    const h = await harness(); const response = await h.request(undefined, { headers: { 'x-knolstory-account-id': expected } });
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ success: false, error: { code: 'INVALID_REQUEST' } });
    expect(h.documents.list).not.toHaveBeenCalled();
  });
  it('rejects duplicate expected account headers and does not authorize from a matching header alone', async () => {
    const h = await harness();
    const raw = await h.raw(`GET /api/v1/documents HTTP/1.1\r\nHost: localhost\r\nCookie: knolstory-next-session=${token}\r\nX-Knolstory-Account-Id: ${recordId}\r\nx-knolstory-account-id: ${recordId}\r\n\r\n`);
    expect(raw).toContain('400 Bad Request'); expect(raw).toContain('INVALID_REQUEST'); expect(h.documents.list).not.toHaveBeenCalled();
    expect((await h.request(undefined, { headers: { cookie: '', 'x-knolstory-account-id': recordId } })).status).toBe(401);
  });
  it('derives owner from session, creates and replays receipts, reads and saves exact snapshots', async () => {
    const h = await harness(); const created = await h.write(input); expect(created.status).toBe(201); expect(await created.json()).toEqual({ success: true, data: receipt }); expect(h.documents.create).toHaveBeenCalledWith(context, input);
    h.documents.create.mockResolvedValueOnce({ ...receipt, replayed: true }); expect((await h.write(input)).status).toBe(200);
    const read = await h.request('/api/v1/documents/' + recordId); expect(await read.json()).toEqual({ success: true, data: { metadata: receipt, snapshot } }); expect(h.documents.read).toHaveBeenCalledWith(context, recordId);
    const save = { ...input, expectedRevision: 1 }; expect((await h.write(save, '/api/v1/documents/' + recordId, 'PUT')).status).toBe(200); expect(h.documents.save).toHaveBeenCalledWith(context, recordId, save);
  });
  it('lists only explicit validated pagination and applies no-store without CORS', async () => {
    const h = await harness(); const r = await h.request('/api/v1/documents?limit=10&cursor=opaque_cursor'); expect(r.status).toBe(200); expect(h.documents.list).toHaveBeenCalledWith(context, { limit: 10, cursor: 'opaque_cursor' }); expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('access-control-allow-origin')).toBeNull();
    await h.request(); expect(h.documents.list).toHaveBeenLastCalledWith(context, {});
  });
  it('rejects unauthenticated reads and validates CSRF before touching stalled bodies', async () => {
    const h = await harness(); expect((await h.request(undefined, { headers: { cookie: '' } })).status).toBe(401);
    for (const headers of [{ origin: 'https://evil.test' }, { 'x-csrf-token': 'bad' }] as Record<string, string>[]) expect((await h.request(undefined, { method: 'POST', headers, body: '{' })).status).toBe(403);
    const raw = await h.raw('POST /api/v1/documents HTTP/1.1\r\nHost: localhost\r\nTransfer-Encoding: chunked\r\n\r\n1\r\nx'); expect(raw).toContain('401 Unauthorized'); expect(h.documents.create).not.toHaveBeenCalled();
  });
  it.each([
    '?limit=51', '?cursor='+'a'.repeat(257), '?limit=0', '?limit=1.5', '?limit=101', '?limit=01', '?limit=1&limit=2', '?cursor=a&cursor=b', '?owner=attacker', '?cursor=%ZZ', '?cursor=', '?limit=',
  ])('rejects malformed query %s', async query => { const h = await harness(); expect((await h.request('/api/v1/documents' + query)).status).toBe(400); expect(h.documents.list).not.toHaveBeenCalled(); });
  it.each([
    {}, { ...input, ownerId: 'attacker' }, { ...input, payloadVersion: 2 }, { ...input, idempotencyKey: '' }, { ...input, idempotencyKey: 'x'.repeat(129) }, { ...input, snapshot: null }, { ...input, snapshot: [] },
  ])('rejects invalid write envelope %j', async body => { const h = await harness(); expect((await h.write(body)).status).toBe(400); expect(h.documents.create).not.toHaveBeenCalled(); });
  it('requires one ASCII idempotency header and forbids it in authored payload', async () => {
    const h = await harness();
    expect((await h.request(undefined, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payloadVersion: 1, snapshot }) })).status).toBe(400);
    expect((await h.request(undefined, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'key' }, body: JSON.stringify(input) })).status).toBe(400);
    const headers = `Host: localhost\r\nCookie: knolstory-next-session=${token}\r\nOrigin: ${origin}\r\nX-CSRF-Token: csrf\r\nContent-Type: application/json\r\nIdempotency-Key: one\r\nIdempotency-Key: two\r\nContent-Length: 0\r\n\r\n`;
    expect(await h.raw('POST /api/v1/documents HTTP/1.1\r\n' + headers)).toContain('400 Bad Request'); expect(h.documents.create).not.toHaveBeenCalled();
  });
  it('validates save revision and exact body keys', async () => {
    const h = await harness(); for (const expectedRevision of [undefined, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) expect((await h.write({ ...input, expectedRevision }, '/api/v1/documents/' + recordId, 'PUT')).status).toBe(400);
    expect(h.documents.save).not.toHaveBeenCalled();
  });
  it('rejects wrong content type and malformed JSON', async () => {
    const h = await harness(); expect((await h.request(undefined, { method: 'POST', body: '{}' })).status).toBe(415); expect((await h.request(undefined, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'create-1' }, body: '{' })).status).toBe(400);
  });
  it('rejects malformed/encoded record paths and unknown methods with Allow', async () => {
    const h = await harness(); for (const path of ['/api/v1/documents/not-uuid', '/api/v1/documents/%ZZ', '/api/v1/documents/%2f', '/api/v1/documents/' + recordId + '?owner=x']) expect((await h.request(path)).status).toBe(400);
    const method = await h.request(undefined, { method: 'DELETE' }); expect(method.status).toBe(405); expect(method.headers.get('allow')).toBe('GET, POST'); expect((await h.request('/unrelated')).status).toBe(404);
    expect((await h.request(undefined, { headers: { cookie: `knolstory-next-session=${token}; knolstory-next-session=${token}` } })).status).toBe(400);
  });
  it('rejects GET body, declared oversized body and deadline-stalled body without service calls', async () => {
    const h = await harness({ bodyLimitBytes: 64, bodyTimeoutMs: 30 });
    const headers = `Host: localhost\r\nCookie: knolstory-next-session=${token}\r\nOrigin: ${origin}\r\nX-CSRF-Token: csrf\r\nContent-Type: application/json\r\nIdempotency-Key: create-1\r\n`;
    expect(await h.raw('GET /api/v1/documents HTTP/1.1\r\n' + headers + 'Content-Length: 1\r\n\r\nx')).toContain('400 Bad Request');
    expect(await h.raw('POST /api/v1/documents HTTP/1.1\r\n' + headers + 'Content-Length: 65\r\n\r\nx')).toContain('413 Payload Too Large');
    expect(await h.raw('POST /api/v1/documents HTTP/1.1\r\n' + headers + 'Transfer-Encoding: chunked\r\n\r\n2\r\nx')).toContain('408 Request Timeout'); expect(h.documents.create).not.toHaveBeenCalled();
  });
  it('bounds chunked body bytes and rejects aborted writes', async () => {
    const h = await harness({ bodyLimitBytes: 32 });
    const headers = `Host: localhost\r\nCookie: knolstory-next-session=${token}\r\nOrigin: ${origin}\r\nX-CSRF-Token: csrf\r\nContent-Type: application/json\r\nIdempotency-Key: create-1\r\n`;
    expect(await h.raw('POST /api/v1/documents HTTP/1.1\r\n' + headers + 'Transfer-Encoding: chunked\r\n\r\n21\r\n' + 'x'.repeat(33) + '\r\n0\r\n\r\n')).toContain('413 Payload Too Large'); expect(h.documents.create).not.toHaveBeenCalled();
  });
  it('does not dispatch writes after a client aborts an incomplete body', async () => {
    const h = await harness({ bodyTimeoutMs: 50 });
    const headers = `Host: localhost\r\nCookie: knolstory-next-session=${token}\r\nOrigin: ${origin}\r\nX-CSRF-Token: csrf\r\nContent-Type: application/json\r\nIdempotency-Key: key\r\nContent-Length: 100\r\n\r\nx`;
    const server = servers[servers.length - 1]!; const address = server.address(); if (!address || typeof address === 'string') throw Error('address');
    await new Promise<void>((resolve, reject) => { const socket = connect(address.port, '127.0.0.1'); socket.on('error', reject); socket.on('connect', () => socket.write('POST /api/v1/documents HTTP/1.1\r\n' + headers, () => { socket.destroy(); resolve(); })); });
    await new Promise(resolve => setTimeout(resolve, 60)); expect(h.documents.create).not.toHaveBeenCalled();
  });
  it('exposes owner conflict revision only through sanitized service errors', async () => {
    const h = await harness(); h.documents.read.mockRejectedValueOnce(new DocumentServiceError('NOT_FOUND', 404)); expect((await h.request('/api/v1/documents/' + recordId)).status).toBe(404);
    h.documents.save.mockRejectedValueOnce(new DocumentServiceError('REVISION_CONFLICT', 409, 5)); const conflict = await h.write({ ...input, expectedRevision: 1 }, '/api/v1/documents/' + recordId, 'PUT'); expect(await conflict.json()).toEqual({ success: false, error: { code: 'REVISION_CONFLICT', actualRevision: 5 } });
    h.documents.list.mockRejectedValueOnce(new Error('private database password')); const failure = await h.request(); expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('password');
  });
  it('rate-limits reads by socket IP and ignores forwarded addresses', async () => {
    const h = await harness({ rateLimit: { maxRequests: 1, windowMs: 60000, maxEntries: 2 } }); expect((await h.request()).status).toBe(200); expect((await h.request(undefined, { headers: { 'x-forwarded-for': '2.3.4.5' } })).status).toBe(429);
  });
  it.each([0, -1, 1.2, Infinity])('validates resource limits %s', async value => { await expect(harness({ bodyLimitBytes: value })).rejects.toThrow(); await expect(harness({ bodyTimeoutMs: value })).rejects.toThrow(); });
});

describe('online trash HTTP boundary',()=>{
 it('routes state commands with CSRF, exact envelope and expected state version',async()=>{
  const change=vi.fn(async()=>({...receipt,stateVersion:2,deletedAt:123}));
  const h=await harness({documents:{trash:change,restore:change} as unknown as DocumentService});
  const body={payloadVersion:1,expectedRevision:1,expectedStateVersion:1,idempotencyKey:'trash-command'};
  expect((await h.write(body,`/api/v1/documents/${recordId}/trash`)).status).toBe(200);
  expect(change).toHaveBeenCalledWith(context,recordId,body);
  expect((await h.write({...body,expectedStateVersion:0},`/api/v1/documents/${recordId}/restore`)).status).toBe(400);
  expect((await h.request(`/api/v1/documents/${recordId}/trash`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':'key','x-csrf-token':''},body:JSON.stringify(body)})).status).toBe(403);
  expect((await h.request(`/api/v1/documents/${recordId}/trash`)).status).toBe(405);
 });
 it('forwards the explicit trash listing scope and rejects unknown states',async()=>{
  const h=await harness();expect((await h.request('/api/v1/documents?state=trash')).status).toBe(200);
  expect(h.documents.list).toHaveBeenCalledWith(context,{state:'trash'});
  expect((await h.request('/api/v1/documents?state=all')).status).toBe(400);
 });
});
