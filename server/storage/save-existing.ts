import {
 prepareJsonbSnapshot,
 restoreJsonbSnapshot,
 type AuthoringJsonbSnapshot,
} from '../../packages/compatibility/src/authoring-archive';

/** Service namespace supplied by the host; it is never proof of ownership. */
export type SaveTarget = {scopeId:string; recordId:string; idempotencyKey:string};
export type SaveRequest = SaveTarget & {expectedRevision:number; snapshot:AuthoringJsonbSnapshot};
export type SaveReceipt = {requestSha256:string; revision:number; contentSha256:string};
export type ExistingRecord = {revision:number};
export type SaveResult =
 | {status:'saved'|'replayed'; receipt:SaveReceipt}
 | {status:'record-not-found'}
 | {status:'revision-conflict'; actualRevision:number}
 | {status:'idempotency-conflict'};

/**
 * Future adapters must serialize the target record and receipt namespace for the
 * complete callback, then commit both writes atomically or roll both back.
 * Reads must see writes from earlier committed transactions. A normal callback
 * return is the only commit path; any thrown error must roll back every write.
 * writeSnapshot is an UPDATE of the locked existing record, never an upsert.
 * Receipt uniqueness is (scopeId, recordId, idempotencyKey).
 */
export interface SaveTransaction {
 findReceipt(target:SaveTarget):Promise<SaveReceipt|null>;
 findRecord(target:SaveTarget):Promise<ExistingRecord|null>;
 writeSnapshot(target:SaveTarget, snapshot:AuthoringJsonbSnapshot, nextRevision:number):Promise<void>;
 writeReceipt(target:SaveTarget, receipt:SaveReceipt):Promise<void>;
}
export interface SaveTransactionPort {
 transaction<T>(operation:(transaction:SaveTransaction)=>Promise<T>):Promise<T>;
}
/**
 * Both hooks must explicitly return true. The host supplies authenticated context
 * through closures and implements its current authorization/catalog rules.
 * Run on every call, including retries; a stored receipt cannot grant access.
 * Snapshot validation alone does not grant upload or catalog permission.
 */
export interface SavePolicies {
 authorize(request:SaveRequest):Promise<boolean>;
 assertCatalogAllowed(request:SaveRequest):Promise<boolean>;
}

function assertEnvelope(value:unknown):asserts value is SaveRequest {
 if(!value || typeof value!=='object' || Array.isArray(value)) throw Error('저장 요청을 확인해 주세요.');
 const request = value as Record<string,unknown>;
 const keys = ['scopeId','recordId','idempotencyKey','expectedRevision','snapshot'];
 if(Object.keys(request).length!==keys.length || Object.keys(request).some(key=>!keys.includes(key))) throw Error('지원하지 않는 저장 요청 항목입니다.');
 for(const key of ['scopeId','recordId','idempotencyKey']) {
  if(typeof request[key]!=='string' || !request[key].trim()) throw Error('저장 요청 식별자를 확인해 주세요.');
 }
 if(!Number.isSafeInteger(request.expectedRevision) || (request.expectedRevision as number)<1) throw Error('기대 revision을 확인해 주세요.');
}

// The complete validated request includes transport metadata deliberately omitted
// by contentSha256. Stable object order makes semantically identical JSON replay.
function canonical(value:unknown):string {
 if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
 if(value!==null && typeof value==='object') {
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`;
 }
 return JSON.stringify(value);
}
async function requestHash(request:SaveRequest):Promise<string> {
 const bytes = new TextEncoder().encode(canonical(request));
 const hash = await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function applySave(request:SaveRequest, requestSha256:string, tx:SaveTransaction):Promise<SaveResult> {
 const target:SaveTarget = {scopeId:request.scopeId,recordId:request.recordId,idempotencyKey:request.idempotencyKey};
 const previous = await tx.findReceipt({...target});
 if(previous) {
  if(previous.requestSha256!==requestSha256) return {status:'idempotency-conflict'};
  return {status:'replayed',receipt:structuredClone(previous)};
 }
 const record = await tx.findRecord({...target});
 if(!record) return {status:'record-not-found'};
 if(!Number.isSafeInteger(record.revision) || record.revision<1 || record.revision===Number.MAX_SAFE_INTEGER) throw Error('저장된 revision을 확인해 주세요.');
 if(record.revision!==request.expectedRevision) return {status:'revision-conflict',actualRevision:record.revision};
 const receipt:SaveReceipt = {requestSha256,revision:record.revision+1,contentSha256:request.snapshot.contentSha256};
 await tx.writeSnapshot({...target},structuredClone(request.snapshot),receipt.revision);
 await tx.writeReceipt({...target},structuredClone(receipt));
 return {status:'saved',receipt};
}

/**
 * Provider/framework/DB-neutral preparation for saving EXISTING records only.
 * This function establishes no HTTP, auth, create/delete or no-op-save policy.
 * The future host must recheck authorization in the same transaction when its
 * mutable permission data can change between policy evaluation and commit.
 */
export async function saveExisting(value:unknown, policies:SavePolicies, port:SaveTransactionPort):Promise<SaveResult> {
 // Capture all caller data before the first await; no mutation crosses a boundary.
 assertEnvelope(value);
 const captured = structuredClone(value);
 const content = await restoreJsonbSnapshot(captured.snapshot);
 const request:SaveRequest = {...captured,snapshot:await prepareJsonbSnapshot(content)};
 const requestSha256 = await requestHash(request);
 if(typeof policies?.authorize!=='function' || typeof policies?.assertCatalogAllowed!=='function') throw Error('서비스 권한 및 등록 자료 정책 검사가 필요합니다.');
 if(await policies.authorize(structuredClone(request))!==true) throw Error('저장 권한을 확인해 주세요.');
 if(await policies.assertCatalogAllowed(structuredClone(request))!==true) throw Error('서비스 등록 자료 정책을 확인해 주세요.');
 return port.transaction(tx=>applySave(request,requestSha256,tx));
}
