import {describe,it,expect,vi} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot,newShortStory} from '@knolstory/compatibility';
import {createOnlineWorkStore,saveOnlineWork} from './online-work-bindings';
const account='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222';
function storage(){const map=new Map<string,string>();return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},map};}
async function snapshot(){return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));}
describe('durable online work linkage',()=>{
 it('keeps a durable pending command but does not send after the originating operation expires during preparation',async()=>{
  const disk=storage(),base=createOnlineWorkStore(disk),value=await snapshot(),fetcher=vi.fn();let current=true;
  const store={...base,prepare:async(...args:Parameters<typeof base.prepare>)=>{const pending=await base.prepare(...args);current=false;return pending;}};
  await expect(saveOnlineWork(store,account,'local',value,'csrf',fetcher,{isCurrent:()=>current})).rejects.toThrow('작업 상태');
  expect(fetcher).not.toHaveBeenCalled();expect((await base.prepare(account,'local',value)).snapshot).toEqual(value);
 });
 it('reuses the exact pending creation across response loss and reload before sending newer edits',async()=>{
  const disk=storage(),first=await snapshot(),store=createOnlineWorkStore(disk),pending=await store.prepare(account,'local',first);
  const changed=await snapshot(),retry=await createOnlineWorkStore(disk).prepare(account,'local',changed);
  expect(retry).toEqual(pending);expect(retry.snapshot).toEqual(first);
  const receipt={recordId:record,revision:1,contentSha256:first.contentSha256,replayed:true};
  store.complete(account,'local',pending,receipt);
  const next=await store.prepare(account,'local',first);expect(next.recordId).toBe(record);expect(next.expectedRevision).toBe(1);expect(next.key).not.toBe(pending.key);
 });
 it('keeps accounts isolated and leaves corrupt or unwritable state intact',async()=>{
  const disk=storage(),value=await snapshot();await createOnlineWorkStore(disk).prepare(account,'local',value);
  expect(createOnlineWorkStore(disk).get('33333333-3333-4333-8333-333333333333','local')).toBeNull();
  const guard=vi.fn(()=>{throw Error('other writer');});await expect(createOnlineWorkStore(disk,{assertWritable:guard}).prepare(account,'local',value)).rejects.toThrow('writer');
  const [key]=disk.map.keys();disk.setItem(key!,'{corrupt');await expect(createOnlineWorkStore(disk).prepare(account,'local',value)).rejects.toThrow();expect(disk.getItem(key!)).toBe('{corrupt');
 });
 it('does not dispatch any HTTP if durable pending persistence fails',async()=>{
  const fetcher=vi.fn(),value=await snapshot(),store=createOnlineWorkStore({getItem:()=>null,setItem:()=>{throw Error('quota');}});
  await expect(saveOnlineWork(store,account,'local',value,'csrf',fetcher)).rejects.toThrow('quota');expect(fetcher).not.toHaveBeenCalled();
 });
 it('maps a downloaded independent local copy back to the original server project identity',async()=>{
  const disk=storage(),value=await snapshot(),project=value.content.format==='shortstory'?value.content.project:null;if(!project)throw Error();
  const store=createOnlineWorkStore(disk);store.bind(account,'independent-local',{recordId:record,revision:4,format:'shortstory',clientProjectId:project.id,title:project.title,contentSha256:value.contentSha256,createdAt:1,updatedAt:1,snapshot:value});
  const local=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:{...project,id:'independent-local',title:'로컬 수정'}}));
  const pending=await store.prepare(account,'independent-local',local);expect(pending.recordId).toBe(record);expect(pending.expectedRevision).toBe(4);expect(pending.snapshot.content.format==='shortstory'&&pending.snapshot.content.project.id).toBe(project.id);expect(local.content.format==='shortstory'&&local.content.project.id).toBe('independent-local');
 });
 it('replays a committed creation after network loss and reports later unsent edits honestly',async()=>{
  const disk=storage(),first=await snapshot(),changed=structuredClone(first.content);if(changed.format!=='shortstory')throw Error();changed.project.title='나중에 바꾼 글';
  const latest=await prepareJsonbSnapshot(changed),sent:Record<string,unknown>[]=[],keys:string[]=[];let fail=true;
  const fetcher=vi.fn(async(_url:unknown,options?:RequestInit)=>{const body=JSON.parse(options!.body as string);sent.push(body);keys.push((options!.headers as Record<string,string>)['idempotency-key']!);if(fail){fail=false;throw Error('response lost after commit');}return new Response(JSON.stringify({success:true,data:{recordId:record,revision:1,contentSha256:body.snapshot.contentSha256,replayed:true}}));}) as unknown as typeof fetch;
  await expect(saveOnlineWork(createOnlineWorkStore(disk),account,'local',first,'csrf',fetcher)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  const recovered=await saveOnlineWork(createOnlineWorkStore(disk),account,'local',latest,'csrf',fetcher);
  expect(recovered.includesLatest).toBe(false);expect(sent[1]).toEqual(sent[0]);expect(keys[1]).toBe(keys[0]);expect(createOnlineWorkStore(disk).get(account,'local')?.revision).toBe(1);
 });
 it('keeps pending state on server conflict and does not advance its revision',async()=>{
  const disk=storage(),value=await snapshot(),store=createOnlineWorkStore(disk),project=value.content.format==='shortstory'?value.content.project:null;if(!project)throw Error();
  store.bind(account,'local',{recordId:record,revision:2,format:'shortstory',clientProjectId:project.id,title:project.title,contentSha256:value.contentSha256,createdAt:1,updatedAt:1,snapshot:value});
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({success:false,error:{code:'REVISION_CONFLICT',actualRevision:3}}),{status:409})) as unknown as typeof fetch;
  await expect(saveOnlineWork(store,account,'local',value,'csrf',fetcher)).rejects.toMatchObject({code:'REVISION_CONFLICT'});
  expect(store.get(account,'local')?.revision).toBe(2);expect((await store.prepare(account,'local',value)).expectedRevision).toBe(2);
 });
 it('rejects acknowledgments changed by another tab and leaves the newer journal intact',async()=>{
  const disk=storage(),store=createOnlineWorkStore(disk),value=await snapshot(),pending=await store.prepare(account,'local',value);
  expect(()=>store.complete(account,'local',pending,{recordId:record,revision:2,contentSha256:value.contentSha256,replayed:false})).toThrow();
  expect(()=>store.complete(account,'local',{...pending,key:'different'},{recordId:record,revision:1,contentSha256:value.contentSha256,replayed:false})).toThrow();
  expect((await store.prepare(account,'local',value)).key).toBe(pending.key);
 });

 it('allows corrected content after a definitive noncommitting policy rejection',async()=>{
  const disk=storage(),store=createOnlineWorkStore(disk),value=await snapshot();
  const rejected=await store.prepare(account,'local',value);
  const fail=vi.fn(async()=>new Response(JSON.stringify({success:false,error:{code:'CATALOG_MEDIA_REQUIRED'}}),{status:422})) as unknown as typeof fetch;
  await expect(saveOnlineWork(store,account,'local',value,'csrf',fail)).rejects.toMatchObject({code:'CATALOG_MEDIA_REQUIRED'});
  const next=await store.prepare(account,'local',await snapshot());expect(next.key).not.toBe(rejected.key);
 });

});
