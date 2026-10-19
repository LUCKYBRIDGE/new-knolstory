import {readFileSync} from 'node:fs';
import {describe,expect,it,vi} from 'vitest';
import {createStoryDocument,type StoryProject} from '../../packages/story-domain/src/index';
import {createAuthoringArchive,prepareJsonbSnapshot,type AuthoringAudioResource} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {projectSnapshot,restoreProjectedSnapshot} from './snapshot-projection';

async function resource(variant=0):Promise<AuthoringAudioResource> {
 const bytes=new Uint8Array(46);bytes.set(new TextEncoder().encode('RIFF'));bytes.set(new TextEncoder().encode('WAVE'),8);bytes[44]=variant;
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return {id:`audio:custom:${sha}:wav`,name:`첨부 ${variant}`,kind:'sound',mime:'audio/wav',data:Buffer.from(bytes).toString('base64'),metadata:{category:'effect',tags:['보존','한글']},provenance:{provider:'local',source:'test fixture',author:'작가',license:'private',commercialUse:'unknown',redistribution:'restricted',attribution:'내 자료',sourceSha256:sha}};
}
async function snapshot(resources?:AuthoringAudioResource[]) {
 const project=JSON.parse(readFileSync(new URL('../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8')) as StoryProject;
 const document=createStoryDocument({project,savedAt:'2026-10-15T00:00:00.000Z',appVersion:'projection-test'});
 return prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document,audioResources:resources??[await resource(),await resource(1)]}));
}
async function projected(){const input=await snapshot();return {input,...await projectSnapshot(input)};}

describe('internal snapshot binary projection',()=>{
 it('preserves complete StoryDocument and every ordered unused audio attachment while keeping bytes out of JSONB',async()=>{
  const {input,projection,blobs}=await projected();
  expect(blobs).toHaveLength(2);
  const json=JSON.stringify(projection);expect(json).not.toContain('"data"');
  if(input.content.format!=='knolstory')throw Error();
  for(const item of input.content.audioResources)expect(json).not.toContain(item.data);
  expect(await restoreProjectedSnapshot(JSON.parse(json),async id=>blobs.find(b=>b.id===id)?.bytes??null)).toEqual(input);
 });
 it('preserves ShortStory exactly without reading blobs',async()=>{
  const input=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));
  const {projection,blobs}=await projectSnapshot(input),read=vi.fn();
  expect(blobs).toEqual([]);expect(await restoreProjectedSnapshot(projection,read)).toEqual(input);expect(read).not.toHaveBeenCalled();
 });
 it('keeps same-byte work metadata independent with one unchanged asset identity',async()=>{
  const sound=await resource();const a=await projected();const b=await snapshot([{...sound,name:'다른 작품 음악',kind:'music' as const,metadata:{category:'background' as const,tags:['별도']},provenance:undefined}].map(({provenance:_p,...rest})=>rest));
  const second=await projectSnapshot(b);expect(second.blobs[0]).toEqual(a.blobs[0]);
  expect(await restoreProjectedSnapshot(second.projection,async()=>a.blobs[0].bytes)).toEqual(b);
 });
 it('captures input synchronously and returns detached projection and bytes',async()=>{
  const input=await snapshot(),before=structuredClone(input),pending=projectSnapshot(input);
  if(input.content.format==='knolstory')input.content.document.project.title='changed';
  const result=await pending;expect(await restoreProjectedSnapshot(result.projection,async id=>result.blobs.find(b=>b.id===id)!.bytes)).toEqual(before);
  result.blobs[0].bytes.fill(0);expect(input).not.toEqual(before);
  if(result.projection.snapshot.content.format==='knolstory')result.projection.snapshot.content.document.project.title='output mutation';
  expect(before.content.format==='knolstory'&&before.content.document.project.title).not.toBe('output mutation');
 });
 it('captures projection before callbacks and copies callback bytes across subsequent awaits',async()=>{
  const {input,projection,blobs}=await projected();let previous:Uint8Array|undefined;
  const result=await restoreProjectedSnapshot(projection,async id=>{
   if(projection.snapshot.content.format==='knolstory')projection.snapshot.content.document.project.title='callback mutation';
   previous?.fill(0);const bytes=blobs.find(b=>b.id===id)!.bytes;previous=bytes;return bytes;
  });expect(result).toEqual(input);
 });
 it('delegates invalid source snapshots to the existing shared validator',async()=>{
  const input=await snapshot();await expect(projectSnapshot({...input,contentSha256:'0'.repeat(64)})).rejects.toThrow();
  await expect(projectSnapshot({...input,extra:true})).rejects.toThrow();
 });
 it('rejects unsupported, missing and unknown projection envelope fields',async()=>{
  const {projection}=await projected();
  for(const value of [null,[],{}, {...projection,projectionVersion:2},{...projection,extra:true},{projectionVersion:1}])await expect(restoreProjectedSnapshot(value,async()=>null)).rejects.toThrow();
 });
 it('rejects missing, non-byte, corrupt or truncated blob reads',async()=>{
  const {projection,blobs}=await projected();
  for(const bytes of [null,'bad',new Uint8Array(),new Uint8Array(blobs[0].byteLength),blobs[0].bytes.slice(0,-1)])await expect(restoreProjectedSnapshot(projection,async()=>bytes as Uint8Array|null)).rejects.toThrow();
 });
 it('rejects altered metadata, attachment order, references, hash and injected data',async()=>{
  const {projection,blobs}=await projected();
  const alter=(fn:(value:any)=>void)=>{const value=structuredClone(projection);fn(value);return value;};
  const variants=[
   alter(v=>v.snapshot.content.audioResources[0].name='corrupt'),
   alter(v=>v.snapshot.content.audioResources.reverse()),
   alter(v=>v.snapshot.assetReferences[0].byteLength++),
   alter(v=>v.snapshot.contentSha256='0'.repeat(64)),
   alter(v=>v.snapshot.content.audioResources[0].data='injected'),
   alter(v=>v.snapshot.content.audioResources[0].unknown=true),
   alter(v=>v.snapshot.content.audioResources[0].id=123),
   alter(v=>v.snapshot.content.audioResources={}),
   alter(v=>v.snapshot=null),
  ];
  for(const value of variants)await expect(restoreProjectedSnapshot(value,async id=>blobs.find(b=>b.id===id)?.bytes??null)).rejects.toThrow();
 });
 it('propagates failed blob reads without modifying supplied projection',async()=>{
  const {projection}=await projected(),before=structuredClone(projection);
  await expect(restoreProjectedSnapshot(projection,async()=>{throw Error('blob read failed');})).rejects.toThrow('blob read failed');expect(projection).toEqual(before);
 });
});
