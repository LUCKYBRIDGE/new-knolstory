import {describe,expect,it} from 'vitest';
import {createAuthoringArchive,newShortStory,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {freeTitle,importAsNew,importOverwrite,planImport,retitle,snapshotTitle} from './submission-import';
const account='11111111-1111-4111-8111-111111111111';
const record=(over:Record<string,unknown>)=>({recordId:'22222222-2222-4222-8222-222222222222',revision:3,format:'shortstory',clientProjectId:'old-project',title:'07_하늘',contentSha256:'a'.repeat(64),createdAt:1,updatedAt:1,stateVersion:1,deletedAt:null,...over});
function fakeFetch(documents:unknown[]){
 const writes:{method:string;url:string;body:{snapshot:{content:{project:{id:string;title:string}}};expectedRevision?:number}}[]=[];
 const fetcher=(async(url:string,init?:RequestInit)=>{
  if(!init?.method||init.method==='GET')return new Response(JSON.stringify({success:true,data:{documents,nextCursor:null}}));
  const body=JSON.parse(String(init.body));writes.push({method:init.method,url,body});
  return new Response(JSON.stringify({success:true,data:{recordId:'22222222-2222-4222-8222-222222222222',revision:(body.expectedRevision??0)+1,contentSha256:body.snapshot.contentSha256,createdAt:1,updatedAt:1,replayed:false}}),{status:init.method==='POST'?201:200});
 }) as unknown as typeof fetch;
 return {fetcher,writes};
}
const submitted=async(title:string)=>prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:{...newShortStory(),title}}));
describe('bringing a submission into personal online works',()=>{
 it('suggests the first free numbered title',()=>{
  expect(freeTitle('07_하늘',new Set(['07_하늘']))).toBe('07_하늘 (2)');
  expect(freeTitle('07_하늘 (2)',new Set(['07_하늘','07_하늘 (2)']))).toBe('07_하늘 (3)');
 });
 it('finds a same-named work of the same kind and ignores trashed ones',async()=>{
  const snapshot=await submitted('07_하늘');
  expect((await planImport(snapshot,account,fakeFetch([record({})]).fetcher)).existing?.title).toBe('07_하늘');
  expect((await planImport(snapshot,account,fakeFetch([record({deletedAt:5})]).fetcher)).existing).toBeNull();
  expect((await planImport(snapshot,account,fakeFetch([record({format:'knolstory'})]).fetcher)).existing).toBeNull();
 });
 it('keeps both under a new name with a new identity, or replaces the old work in place',async()=>{
  const snapshot=await submitted('07_하늘'),{fetcher,writes}=fakeFetch([record({})]);
  const plan=await planImport(snapshot,account,fetcher);
  await importAsNew(plan,'07_하늘 (2)','csrf',account,fetcher);
  expect(writes[0]!.method).toBe('POST');expect(writes[0]!.body.snapshot.content.project.title).toBe('07_하늘 (2)');
  expect(writes[0]!.body.snapshot.content.project.id).not.toBe(snapshotTitle(snapshot));
  await importOverwrite(plan,'csrf',account,fetcher);
  expect(writes[1]!.method).toBe('PUT');expect(writes[1]!.body.expectedRevision).toBe(3);
  expect(writes[1]!.body.snapshot.content.project).toMatchObject({id:'old-project',title:'07_하늘'});
  expect(snapshotTitle(await retitle(snapshot,'새 제목'))).toBe('새 제목');
 });
});
