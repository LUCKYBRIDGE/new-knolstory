import {describe,it,expect,vi} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {newShortStory} from '@knolstory/compatibility';
import {documentCreate,documentSave,documentRead,documentList,documentTrash,documentRestore} from './document-api';
const id='12345678-1234-4123-8123-123456789012';
const meta={recordId:id,revision:1,format:'shortstory',clientProjectId:'work',title:'원고',contentSha256:'a'.repeat(64),createdAt:1,updatedAt:2};
const reply=(data:unknown,status=200)=>vi.fn(async()=>new Response(JSON.stringify(status<400?{success:true,data}:{success:false,error:data}),{status})) as unknown as typeof fetch;
describe('online document client',()=>{
 it('explains actionable service failures without exposing server messages or calling uploads storage',async()=>{
  for(const [code,status,message] of [
   ['DOCUMENT_TRASHED',409,'온라인 휴지통에서 이 작품을 복구한 뒤 다시 업로드해 주세요. 기기의 원고는 유지됩니다.'],
   ['CATALOG_MEDIA_REQUIRED',422,'온라인 업로드에는 서비스에 등록된 그림과 소리만 사용할 수 있어요. 기기의 원고는 유지됩니다.'],
   ['RATE_LIMITED',429,'요청이 많아 잠시 처리할 수 없어요. 잠시 뒤 다시 시도해 주세요. 기기의 원고는 유지됩니다.'],
   ['INVALID_SNAPSHOT',400,'작품 내용을 확인하지 못해 업로드하지 않았어요. 기기의 원고는 유지됩니다.'],
  ] as const){
   await expect(documentList(reply({code,message:'database private path /private/original'},status))).rejects.toMatchObject({code,status,message});
  }
 });

 it('lists trash explicitly and validates optional lifecycle metadata',async()=>{
  const record={...meta,stateVersion:2,deletedAt:10},fetcher=reply({documents:[record],nextCursor:null});
  expect(await documentList(fetcher,undefined,undefined,'trash')).toEqual({documents:[record],nextCursor:null});
  expect(fetcher).toHaveBeenCalledWith('/api/v1/documents?state=trash',expect.anything());
  for(const extra of [{stateVersion:0},{stateVersion:-1},{deletedAt:'today'},{deletedAt:-1}])await expect(documentList(reply({documents:[{...meta,...extra}],nextCursor:null}))).rejects.toThrow();
 });
 it('sends guarded trash and restore commands without changing content revision',async()=>{
  const account='11111111-1111-4111-8111-111111111111';
  for(const [command,action,deletedAt] of [[documentTrash,'trash',10],[documentRestore,'restore',null]] as const){
   const receipt={recordId:id,revision:1,contentSha256:meta.contentSha256,stateVersion:3,deletedAt,replayed:true},fetcher=reply(receipt);
   expect(await command(id,1,2,'stable-retry','csrf',fetcher,account)).toEqual(receipt);
   expect(fetcher).toHaveBeenCalledWith(`/api/v1/documents/${id}/${action}`,expect.objectContaining({method:'POST',headers:expect.objectContaining({'x-csrf-token':'csrf','idempotency-key':'stable-retry','x-knolstory-account-id':account})}));
   expect(JSON.parse(vi.mocked(fetcher).mock.calls[0]![1]!.body as string)).toEqual({payloadVersion:1,expectedRevision:1,expectedStateVersion:2});
   await expect(command(id,1,0,'key','csrf',fetcher)).rejects.toMatchObject({code:'INVALID_REQUEST'});
   await expect(command(id,1,2,'key','csrf',reply({...receipt,revision:2}))).rejects.toMatchObject({code:'INVALID_RESPONSE'});
   await expect(command(id,1,2,'key','csrf',reply({...receipt,stateVersion:2}))).rejects.toMatchObject({code:'INVALID_RESPONSE'});
  }
 });
 it('preserves lifecycle conflict codes without exposing server details',async()=>{
  for(const code of ['DOCUMENT_TRASHED','DOCUMENT_STATE_CONFLICT'])await expect(documentRead(id,reply({code,private:'secret'},409))).rejects.toMatchObject({code,status:409});
 });
 it('pins list and write requests to the account displayed by the caller',async()=>{
  const account='11111111-1111-4111-8111-111111111111',fetcher=reply({documents:[],nextCursor:null});
  await documentList(fetcher,undefined,account);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/documents',expect.objectContaining({headers:{'x-knolstory-account-id':account}}));
  await expect(documentList(fetcher,undefined,'bad')).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(documentRead(id,reply({code:'ACCOUNT_SESSION_CHANGED'},409),account)).rejects.toMatchObject({code:'ACCOUNT_SESSION_CHANGED',status:409});
 });
 it('requests only relative fixed paths and current csrf without embedding account ownership',async()=>{
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));const fetcher=reply({...meta,contentSha256:snapshot.contentSha256,replayed:false},201);
  await documentCreate(snapshot,'retry-key','csrf',fetcher);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/documents',expect.objectContaining({method:'POST',credentials:'same-origin',redirect:'error',headers:expect.objectContaining({'x-csrf-token':'csrf','idempotency-key':'retry-key'})}));
  const call=vi.mocked(fetcher).mock.calls[0]!;expect(JSON.parse(call[1]!.body as string)).toEqual({payloadVersion:1,snapshot});
 });
 it('validates a full downloaded snapshot against metadata',async()=>{
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));
  const metadata={...meta,clientProjectId:snapshot.content.format==='shortstory'?snapshot.content.project.id:'',contentSha256:snapshot.contentSha256};
  expect((await documentRead(id,reply({...metadata,snapshot}))).snapshot).toEqual(snapshot);
  await expect(documentRead(id,reply({...metadata,snapshot,revision:0}))).rejects.toThrow();
  await expect(documentRead(id,reply({...metadata,snapshot,contentSha256:'b'.repeat(64)}))).rejects.toThrow();
 });
 it('distinguishes session, not found and owner revision conflict without copying server errors',async()=>{
  for(const [status,code] of [[401,'SESSION_REQUIRED'],[404,'NOT_FOUND'],[409,'REVISION_CONFLICT']] as const){
   await expect(documentRead(id,reply({code,actualRevision:5,private:'password'},status))).rejects.toMatchObject({code,status,...(status===409?{actualRevision:5}:{})});
  }
  await expect(documentList(reply({message:'database password'},503))).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE',status:503});
 });
 it('rejects malformed list metadata and pagination before presenting a success',async()=>{
  expect(await documentList(reply({documents:[meta],nextCursor:null}))).toEqual({documents:[meta],nextCursor:null});
  for(const data of [{documents:[{...meta,recordId:'../me'}],nextCursor:null},{documents:[],nextCursor:'https://evil.test'}, {documents:[{...meta,revision:Infinity}],nextCursor:null},null])await expect(documentList(reply(data))).rejects.toThrow();
 });
 it('bounds command identifiers and preserves explicit revision/idempotency on save',async()=>{
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));const fetcher=reply({...meta,contentSha256:snapshot.contentSha256,revision:2,replayed:true});
  await documentSave(id,snapshot,1,'retry','csrf',fetcher);
  expect(JSON.parse(vi.mocked(fetcher).mock.calls[0]![1]!.body as string)).toEqual({payloadVersion:1,snapshot,expectedRevision:1});
  for(const bad of ['../me','https://evil.test'])await expect(documentRead(bad,fetcher)).rejects.toThrow();
  await expect(documentSave(id,snapshot,0,'retry','csrf',fetcher)).rejects.toThrow();
 });
});
