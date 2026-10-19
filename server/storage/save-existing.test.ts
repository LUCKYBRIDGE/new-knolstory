import {describe, expect, it, vi} from 'vitest';
import {createAuthoringArchive, prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {scoreNarrativeDocument} from '../../packages/compatibility/tests/fixtures/score-narrative';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {saveExisting, type SaveRequest, type SaveReceipt, type SaveTransaction, type SaveTransactionPort} from './save-existing';

// Test-only serial, rollback-capable transaction harness. It is not a DB adapter.
function harness(revision = 3) {
 let state = {records: new Map<string, {revision:number; snapshot?:SaveRequest['snapshot']}>(), receipts:new Map<string,SaveReceipt>()};
 state.records.set(JSON.stringify(['owner-a','record-a']), {revision});
 let tail = Promise.resolve();
 const faults = {snapshot:false, receipt:false};
 const key = (scope:string, record:string) => JSON.stringify([scope,record]);
 const port:SaveTransactionPort = {transaction:vi.fn(async operation => {
  const previous = tail;
  let release!:() => void;
  tail = new Promise<void>(resolve => {release = resolve;});
  await previous;
  const draft = structuredClone(state);
  const tx:SaveTransaction = {
   findReceipt:async target => draft.receipts.get(JSON.stringify([target.scopeId,target.recordId,target.idempotencyKey])) ?? null,
   findRecord:async target => draft.records.get(key(target.scopeId,target.recordId)) ?? null,
   writeSnapshot:async (target,snapshot,nextRevision) => {
    draft.records.set(key(target.scopeId,target.recordId),{revision:nextRevision,snapshot});
    if(faults.snapshot) throw Error('snapshot failure');
   },
   writeReceipt:async (target,receipt) => {
    draft.receipts.set(JSON.stringify([target.scopeId,target.recordId,target.idempotencyKey]),receipt);
    if(faults.receipt) throw Error('receipt failure');
   },
  };
  try {const result = await operation(tx); state = draft; return result;} finally {release();}
 })};
 return {port,faults,read:()=>structuredClone(state), add:(scope:string,record:string)=>state.records.set(key(scope,record),{revision})};
}
const policies = () => ({authorize:vi.fn(async () => true), assertCatalogAllowed:vi.fn(async () => true)});
async function request():Promise<SaveRequest> {
 const snapshot = await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:scoreNarrativeDocument()}));
 return {scopeId:'owner-a',recordId:'record-a',idempotencyKey:'save-a',expectedRevision:3,snapshot};
}
describe('existing-record revision and idempotency preparation', () => {
 it('saves exact Korean, Flow, StageComposition, scores and registered media references detached from callers', async () => {
  const input = await request(), before = structuredClone(input), store = harness();
  const result = await saveExisting(input,policies(),store.port);
  expect(result).toMatchObject({status:'saved',receipt:{revision:4}});
  expect([...store.read().records.values()][0].snapshot).toEqual(before.snapshot);
  if(input.snapshot.content.format==='knolstory') input.snapshot.content.document.project.title = 'caller mutation';
  expect([...store.read().records.values()][0].snapshot).toEqual(before.snapshot);
  if(result.status==='saved') (result.receipt as {revision:number}).revision = 900;
  expect([...store.read().receipts.values()][0].revision).toBe(4);
 });
 it('replays receipt before stale revision check, and never writes twice', async () => {
  const input = await request(), store = harness();
  const first = await saveExisting(input,policies(),store.port);
  const replay = await saveExisting(input,policies(),store.port);
  expect(replay).toEqual({...first,status:'replayed'});
  expect(store.read().receipts.size).toBe(1);
  expect([...store.read().records.values()][0].revision).toBe(4);
 });
 it('serial contention accepts only one different key at the same revision', async () => {
  const input = await request(), store = harness();
  const results = await Promise.all([saveExisting(input,policies(),store.port),saveExisting({...input,idempotencyKey:'save-b'},policies(),store.port)]);
  expect(results.map(result=>result.status).sort()).toEqual(['revision-conflict','saved']);
  expect(store.read().receipts.size).toBe(1);
 });
 it('concurrent identical retries yield one save and one replay', async () => {
  const input = await request(), store = harness();
  const results = await Promise.all([saveExisting(input,policies(),store.port),saveExisting(input,policies(),store.port)]);
  expect(results.map(result=>result.status).sort()).toEqual(['replayed','saved']);
 });
 it('same key with changed revision or transport metadata conflicts despite matching content hash', async () => {
  const input = await request(), store = harness();
  await saveExisting(input,policies(),store.port);
  const metadata = structuredClone(input);
  if(metadata.snapshot.content.format==='knolstory') metadata.snapshot.content.document.savedAt = '2026-10-15T00:00:00.000Z';
  expect(metadata.snapshot.contentSha256).toBe(input.snapshot.contentSha256);
  for(const changed of [{...input,expectedRevision:4},metadata]) expect(await saveExisting(changed,policies(),store.port)).toMatchObject({status:'idempotency-conflict'});
  if(metadata.snapshot.content.format==='knolstory') metadata.snapshot.content.document.appVersion = 'different-version';
  expect(await saveExisting(metadata,policies(),store.port)).toMatchObject({status:'idempotency-conflict'});
 });
 it('scopes identical keys by record and authorized namespace', async () => {
  const input = await request(), store = harness();
  store.add('owner-a','record-b');store.add('owner-b','record-a');
  for(const target of [input,{...input,recordId:'record-b'},{...input,scopeId:'owner-b'}]) expect(await saveExisting(target,policies(),store.port)).toMatchObject({status:'saved'});
  expect(store.read().receipts.size).toBe(3);
 });
 it('rejects missing records and stale revisions without creating or modifying anything', async () => {
  const input = await request(), store = harness(), before = store.read();
  expect(await saveExisting({...input,recordId:'absent'},policies(),store.port)).toEqual({status:'record-not-found'});
  expect(await saveExisting({...input,expectedRevision:2},policies(),store.port)).toEqual({status:'revision-conflict',actualRevision:3});
  expect(store.read()).toEqual(before);
 });
 it.each(['snapshot','receipt'] as const)('rolls back both writes when %s persistence fails', async fault => {
  const input = await request(), store = harness(), before = store.read();store.faults[fault] = true;
  await expect(saveExisting(input,policies(),store.port)).rejects.toThrow('failure');
  expect(store.read()).toEqual(before);
  store.faults[fault] = false;
  expect(await saveExisting(input,policies(),store.port)).toMatchObject({status:'saved'});
 });
 it('requires authorization and catalog policy before every transaction including replay', async () => {
  const input = await request(), store = harness();
  for(const gate of ['authorize','assertCatalogAllowed'] as const) {
   const policy = policies();policy[gate].mockResolvedValue(false);
   await expect(saveExisting(input,policy,store.port)).rejects.toThrow();
  }
  await expect(saveExisting(input,{} as ReturnType<typeof policies>,store.port)).rejects.toThrow();
  expect(store.port.transaction).not.toHaveBeenCalled();
  await saveExisting(input,policies(),store.port);
  const denied = policies();denied.authorize.mockResolvedValue(false);
  await expect(saveExisting(input,denied,store.port)).rejects.toThrow();
  expect(store.port.transaction).toHaveBeenCalledTimes(1);
 });
 it('rejects malformed envelope, snapshot, hash and asset references before any port call', async () => {
  const input = await request(), store = harness(), policy = policies();
  const invalid = [null,{...input,expectedRevision:0},{...input,expectedRevision:1.2},{...input,recordId:''},{...input,scopeId:1},{...input,idempotencyKey:' '},{...input,extra:true},{...input,snapshot:null},{...input,snapshot:{...input.snapshot,contentSha256:'a'.repeat(64)}},{...input,snapshot:{...input.snapshot,assetReferences:[{id:'wrong'}]}},{...input,snapshot:{...input.snapshot,content:{...input.snapshot.content,future:true}}}];
  for(const value of invalid) await expect(saveExisting(value,policy,store.port)).rejects.toThrow();
  expect(store.port.transaction).not.toHaveBeenCalled();expect(policy.authorize).not.toHaveBeenCalled();
 });
 it('policy mutation cannot alter persistence, and input is captured before asynchronous validation', async () => {
  const input = await request(), before = structuredClone(input), store = harness();
  const policy = policies();policy.authorize.mockImplementation(async (...args:unknown[]) => {
   const context = args[0] as SaveRequest;context.recordId = 'different';
   if(context.snapshot.content.format==='knolstory') context.snapshot.content.document.project.title = 'policy mutation';
   return true;
  });
  const pending = saveExisting(input,policy,store.port); input.recordId = 'changed';
  expect(await pending).toMatchObject({status:'saved'});
  expect([...store.read().records.values()][0].snapshot).toEqual(before.snapshot);
 });
 it('propagates rejected policy checks before opening a transaction', async () => {
  const input = await request(), store = harness(), policy = policies();
  policy.assertCatalogAllowed.mockRejectedValue(Error('policy unavailable'));
  await expect(saveExisting(input,policy,store.port)).rejects.toThrow('policy unavailable');
  expect(store.port.transaction).not.toHaveBeenCalled();
 });
 it('rejects invalid stored revision instead of overflowing or advancing it', async () => {
  const input = await request();
  for(const revision of [0,1.5,Number.MAX_SAFE_INTEGER]) {
   const store = harness(revision), before = store.read();
   await expect(saveExisting(input,policies(),store.port)).rejects.toThrow('revision');
   expect(store.read()).toEqual(before);
  }
 });
 it('replays equivalent JSON key order but conflicts on authored content changes', async () => {
  const input = await request(), store = harness();
  await saveExisting(input,policies(),store.port);
  const reversed = Object.fromEntries(Object.entries(input).reverse());
  expect(await saveExisting(reversed,policies(),store.port)).toMatchObject({status:'replayed'});
  const archive = structuredClone(input.snapshot.content);
  if(archive.format==='knolstory') archive.document.project.title = '저작 내용 수정';
  const snapshot = await prepareJsonbSnapshot(archive);
  expect(await saveExisting({...input,snapshot},policies(),store.port)).toMatchObject({status:'idempotency-conflict'});
 });
 it('supports the shared ShortStory snapshot without interpreting its content', async () => {
  const input = await request(), store = harness();
  const snapshot = await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));
  expect(await saveExisting({...input,snapshot},policies(),store.port)).toMatchObject({status:'saved'});
  expect([...store.read().records.values()][0].snapshot).toEqual(snapshot);
 });
});
