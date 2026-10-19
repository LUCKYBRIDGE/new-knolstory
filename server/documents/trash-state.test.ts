import {describe,expect,it,vi} from 'vitest';
import {changeDocumentState,stateInput,type DocumentStateInput} from './trash-state';
const target={scopeId:'account:test',recordId:'11111111-1111-4111-8111-111111111111'};
const input:DocumentStateInput={payloadVersion:1,expectedRevision:1,expectedStateVersion:1,idempotencyKey:'command'};
const info={recordId:target.recordId,revision:1,stateVersion:1,contentSha256:'a'.repeat(64),deletedAt:null};
function client(rows:Record<string,unknown>[]=[]){return {query:vi.fn().mockResolvedValueOnce({rows,rowCount:rows.length}).mockResolvedValue({rows:[],rowCount:1}),release:vi.fn()};}
describe('validated online document state transitions',()=>{
 it('captures exactly the supported request fields and rejects malformed versions and keys',()=>{
  expect(stateInput(input)).toEqual(input);expect(stateInput(input)).not.toBe(input);
  for(const value of [null,[],{...input,extra:true},{...input,payloadVersion:2},{...input,expectedRevision:'1'},{...input,expectedStateVersion:0},{...input,expectedStateVersion:1.1},{...input,idempotencyKey:'bad key'}])expect(()=>stateInput(value as never)).toThrowError('INVALID_REQUEST');
 });
 it.each(['trash','restore'] as const)('writes a %s receipt without modifying the content revision',async action=>{
  const db=client(),current=action==='trash'?info:{...info,deletedAt:5};
  expect(await changeDocumentState(db,target,input,current,action,10)).toEqual({...info,stateVersion:2,deletedAt:action==='trash'?10:null,replayed:false});
  expect(db.query).toHaveBeenCalledTimes(3);expect(db.query.mock.calls[1][0]).toContain('UPDATE knolstory_storage.private_documents');
  expect(db.query.mock.calls[2][0]).toContain('INSERT INTO knolstory_storage.document_state_commands');
 });
 it('replays the original receipt after later transitions without issuing any update',async()=>{
  const receipt={...info,stateVersion:2,deletedAt:10};const seed=client();await changeDocumentState(seed,target,input,info,'trash',10);
  const fingerprint=seed.query.mock.calls[2][1][3];const db=client([{request_sha256:fingerprint,receipt}]);
  expect(await changeDocumentState(db,target,input,{...info,stateVersion:3},'trash',20)).toEqual({...receipt,replayed:true});expect(db.query).toHaveBeenCalledTimes(1);
 });
 it('rejects a reused key, stale revisions, wrong current state, and version overflow without writes',async()=>{
  await expect(changeDocumentState(client([{request_sha256:'different',receipt:{}}]),target,input,info,'trash',10)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
  for(const current of [{...info,revision:2},{...info,stateVersion:2},{...info,deletedAt:5}]){
   const db=client();await expect(changeDocumentState(db,target,input,current,'trash',10)).rejects.toMatchObject({code:'DOCUMENT_STATE_CONFLICT'});expect(db.query).toHaveBeenCalledTimes(1);
  }
  await expect(changeDocumentState(client(),target,input,info,'restore',10)).rejects.toMatchObject({code:'DOCUMENT_STATE_CONFLICT'});
  await expect(changeDocumentState(client(),target,{...input,expectedStateVersion:Number.MAX_SAFE_INTEGER},{...info,stateVersion:Number.MAX_SAFE_INTEGER},'trash',10)).rejects.toMatchObject({code:'STORAGE_CONTRACT_VIOLATION'});
 });
});
