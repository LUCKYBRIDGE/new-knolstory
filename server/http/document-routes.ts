import type { IncomingMessage, ServerResponse } from 'node:http';
import { authCookieNames, validateAuthOrigin, type createAuthStateService } from '../auth/auth-state';
import { DocumentServiceError, type DocumentService } from '../documents/service';
export type DocumentRouterOptions = Readonly<{
  origin: string;
  authState: ReturnType<typeof createAuthStateService>;
  documents: DocumentService;
  rateLimit?: Readonly<{ windowMs: number; maxRequests: number; maxEntries: number }>;
  bodyLimitBytes?: number;
  bodyTimeoutMs?: number;
}>;
class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
function header(req: IncomingMessage, name: string): string {
  const count = req.rawHeaders.filter((_, index) => index % 2 === 0 && req.rawHeaders[index]!.toLowerCase() === name).length;
  const value = req.headers[name];
  if (count > 1 || Array.isArray(value)) throw new HttpError(400, 'INVALID_REQUEST');
  return value ?? '';
}
function expectedAccount(req: IncomingMessage): string | undefined {
  const name = 'x-knolstory-account-id', value = header(req, name);
  const present = req.headers[name] !== undefined || req.rawHeaders.some((item, index) => index % 2 === 0 && item.toLowerCase() === name);
  if (!present) return undefined;
  if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new HttpError(400, 'INVALID_REQUEST');
  return value.toLowerCase();
}
function sessionToken(req: IncomingMessage, name: string) {
  const matches = header(req, 'cookie').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
  if (matches.length > 1) throw new HttpError(400, 'INVALID_REQUEST');
  return matches[0]?.slice(name.length + 1) ?? '';
}
function respond(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value));
}
function positive(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw Error('INVALID_CONFIG'); return value; }
function rateLimiter(input: DocumentRouterOptions['rateLimit']) {
  const config = { windowMs: 60000, maxRequests: 120, maxEntries: 10000, ...input };
  Object.values(config).forEach(positive);
  const buckets = new Map<string, Readonly<{ count: number; expiresAt: number }>>();
  return (req: IncomingMessage) => {
    const now = Date.now(), key = req.socket.remoteAddress ?? 'unknown', prior = buckets.get(key);
    if (prior && prior.expiresAt > now) {
      if (prior.count >= config.maxRequests) throw new HttpError(429, 'RATE_LIMITED');
      buckets.set(key, { ...prior, count: prior.count + 1 }); return;
    }
    for (const [ip, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(ip);
    if (buckets.size >= config.maxEntries) throw new HttpError(429, 'RATE_LIMITED');
    buckets.set(key, { count: 1, expiresAt: now + config.windowMs });
  };
}
function route(req: IncomingMessage, origin: string) {
  const raw = req.url ?? '';
  if (raw.length > 8192 || !raw.startsWith('/') || raw.startsWith('//') || /%(?![a-f\d]{2})/i.test(raw)) throw new HttpError(400, 'INVALID_REQUEST');
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { throw new HttpError(400, 'INVALID_REQUEST'); }
  if (/[\u0000-\u001f\u007f]/.test(decoded)) throw new HttpError(400, 'INVALID_REQUEST');
  const url = new URL(raw, origin), base = '/api/v1/documents';
  if (url.pathname !== base && !url.pathname.startsWith(base + '/')) throw new HttpError(404, 'NOT_FOUND');
  const suffix=url.pathname===base?[]:url.pathname.slice(base.length+1).split('/');
  const id=suffix[0],action=suffix[1];
  if(suffix.length>2||action!==undefined&&!['trash','restore'].includes(action))throw new HttpError(400,'INVALID_REQUEST');
  if (id !== undefined && !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id)) throw new HttpError(400, 'INVALID_REQUEST');
  const pagination: { limit?: number; cursor?: string;state?:'active'|'trash' } = {};
  for (const key of url.searchParams.keys()) {
    if (id || req.method !== 'GET' || !['limit', 'cursor','state'].includes(key) || url.searchParams.getAll(key).length !== 1) throw new HttpError(400, 'INVALID_REQUEST');
    const value = url.searchParams.get(key)!;
    if(key==='state'){if(value!=='active'&&value!=='trash')throw new HttpError(400,'INVALID_REQUEST');pagination.state=value;} else if (key === 'limit') {
      if (!/^[1-9]\d*$/.test(value) || Number(value) > 50) throw new HttpError(400, 'INVALID_REQUEST');
      pagination.limit = Number(value);
    } else {
      if (!value || value.length > 256 || /[^\x21-\x7e]/.test(value)) throw new HttpError(400, 'INVALID_REQUEST');
      pagination.cursor = value;
    }
  }
  return { id, action, pagination };
}
function framing(req: IncomingMessage, writing: boolean, limit: number) {
  const length = header(req, 'content-length'), transfer = header(req, 'transfer-encoding');
  if (length && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new HttpError(400, 'INVALID_REQUEST');
  if (length && Number(length) > limit) throw new HttpError(413, 'REQUEST_TOO_LARGE');
  if (!writing && (transfer || Number(length) > 0)) throw new HttpError(400, 'INVALID_REQUEST');
  if (transfer && (transfer.toLowerCase() !== 'chunked' || length)) throw new HttpError(400, 'INVALID_REQUEST');
}
function readBody(req: IncomingMessage, limit: number, timeout: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let bytes = 0, finished = false;
    const chunks: Buffer[] = [];
    const cleanup = () => { clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('aborted', aborted); req.off('error', aborted); };
    const fail = (error: HttpError) => { if (finished) return; finished = true; cleanup(); req.pause(); reject(error); };
    const data = (chunk: Buffer) => { bytes += chunk.length; if (bytes > limit) fail(new HttpError(413, 'REQUEST_TOO_LARGE')); else chunks.push(chunk); };
    const aborted = () => fail(new HttpError(400, 'INVALID_REQUEST'));
    const end = () => {
      if (finished) return;
      finished = true; cleanup();
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'INVALID_REQUEST')); }
    };
    const timer = setTimeout(() => fail(new HttpError(408, 'REQUEST_TIMEOUT')), timeout);
    req.on('data', data); req.once('end', end); req.once('aborted', aborted); req.once('error', aborted);
    if (req.aborted || req.destroyed) aborted();
  });
}
function envelope(value: unknown, saving: boolean, idempotencyKey: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'INVALID_REQUEST');
  const body = value as Record<string, unknown>;
  const keys = saving ? ['payloadVersion', 'snapshot', 'expectedRevision'] : ['payloadVersion', 'snapshot'];
  if (Object.keys(body).length !== keys.length || Object.keys(body).some(k => !keys.includes(k)) || body.payloadVersion !== 1 || !body.snapshot || typeof body.snapshot !== 'object' || Array.isArray(body.snapshot)) throw new HttpError(400, 'INVALID_REQUEST');
  if (saving && (!Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) <= 0)) throw new HttpError(400, 'INVALID_REQUEST');
  return { payloadVersion: 1 as const, snapshot: body.snapshot, idempotencyKey, expectedRevision: body.expectedRevision as number };
}
/** HTTP transports authenticated context; document policy and atomic writes stay in the service. */
export function createDocumentRouter(options: DocumentRouterOptions) {
  const origin = validateAuthOrigin(options.origin), name = authCookieNames(origin).session;
  const limit = positive(options.bodyLimitBytes ?? 26 * 1024 * 1024), timeout = positive(options.bodyTimeoutMs ?? 10000);
  const rateLimit = rateLimiter(options.rateLimit);
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    try {
      rateLimit(req);
      const { id, action, pagination } = route(req, origin);
      const allowed = action ? ['POST'] : id ? ['GET', 'PUT'] : ['GET', 'POST'];
      if (!allowed.includes(req.method ?? '')) { res.setHeader('Allow', allowed.join(', ')); throw new HttpError(405, 'METHOD_NOT_ALLOWED'); }
      const expected = expectedAccount(req);
      const token = sessionToken(req, name), authenticated = await options.authState.authenticate(token);
      if (!authenticated) throw new HttpError(401, 'SESSION_REQUIRED');
      // This optional expectation prevents stale browser state using another
      // account's cookie. Authorization still comes exclusively from the session.
      if (expected !== undefined && expected !== authenticated.accountId.toLowerCase()) throw new HttpError(409, 'ACCOUNT_SESSION_CHANGED');
      const context = { token, accountId: authenticated.accountId }, writing = req.method !== 'GET';
      if (writing) {
        try { await options.authState.verifyCsrf(token, header(req, 'x-csrf-token'), header(req, 'origin')); }
        catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(403, 'INVALID_CSRF'); }
      }
      framing(req, writing, limit);
      if (!writing) {
        const data = id ? await options.documents.read(context, id) : await options.documents.list(context, pagination);
        respond(res, 200, { success: true, data }); return;
      }
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(header(req, 'content-type'))) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE');
      const key = header(req, 'idempotency-key');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw new HttpError(400, 'INVALID_REQUEST');
      const rawBody=await readBody(req,limit,timeout);
      if(action){
        if(!rawBody||typeof rawBody!=='object'||Array.isArray(rawBody))throw new HttpError(400,'INVALID_REQUEST');
        const command=rawBody as Record<string,unknown>,keys=['payloadVersion','expectedRevision','expectedStateVersion'];
        if(Object.keys(command).length!==3||Object.keys(command).some(k=>!keys.includes(k))||command.payloadVersion!==1||!Number.isSafeInteger(command.expectedRevision)||Number(command.expectedRevision)<1||!Number.isSafeInteger(command.expectedStateVersion)||Number(command.expectedStateVersion)<1)throw new HttpError(400,'INVALID_REQUEST');
        if(req.aborted||req.socket.destroyed)throw new HttpError(400,'INVALID_REQUEST');
        const input={payloadVersion:1 as const,expectedRevision:command.expectedRevision as number,expectedStateVersion:command.expectedStateVersion as number,idempotencyKey:key};
        const data=action==='trash'?await options.documents.trash(context,id!,input):await options.documents.restore(context,id!,input);
        respond(res,200,{success:true,data});return;
      }
      const body = envelope(rawBody, Boolean(id), key);
      if (req.aborted || req.socket.destroyed) throw new HttpError(400, 'INVALID_REQUEST');
      const { expectedRevision, ...createInput } = body;
      const data = id ? await options.documents.save(context, id, body) : await options.documents.create(context, createInput);
      respond(res, id || data.replayed ? 200 : 201, { success: true, data });
    } catch (error) {
      res.setHeader('Connection', 'close');
      if (error instanceof HttpError || error instanceof DocumentServiceError) {
        const actualRevision = error instanceof DocumentServiceError && error.status === 409 ? error.actualRevision : undefined;
        respond(res, error.status, { success: false, error: { code: error.code, ...(actualRevision !== undefined ? { actualRevision } : {}) } });
      } else respond(res, 503, { success: false, error: { code: 'DOCUMENT_UNAVAILABLE' } });
    }
  };
}
