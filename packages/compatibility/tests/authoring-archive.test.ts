import {describe,it,expect} from 'vitest';
import {createStoryDocument} from '@knolstory/story-domain';
import {unknownUploadProvenance,validateMediaProvenance} from '../../../apps/web/lib/media-provenance';
import {getRepresentativeStory} from '../src/index';
import {newShortStory} from '../src/shortstory';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,validateAuthoringArchive,validateAuthoringAudioResources} from '../src/authoring-archive';
const document=()=>getRepresentativeStory('rabbit');
describe('official authoring archive and future JSONB snapshot',()=>{
 it('preserves exact current Next document through portable file and JSONB',async()=>{
  const input=document(); const archive=await createAuthoringArchive({format:'knolstory',document:input});
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
  const snapshot=await prepareJsonbSnapshot(archive); expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(archive);
  expect(archive.formatVersion).toBe(2); expect(archive.format==='knolstory'&&archive.document).toEqual(input);
 });
 it('accepts current Next plain document through explicit adapter',async()=>{
  const input=document(); const archive=await decodeAuthoringArchive(JSON.stringify({...input,audioResources:[]}));
  expect(archive.format==='knolstory'&&archive.document).toEqual(input);
 });
 it('supports ShortStory v1 and official v2 exactly',async()=>{
  const project=newShortStory(); const archive=await decodeAuthoringArchive(JSON.stringify({manifest:{format:'shortstory',version:1,kind:'project'},project}));
  expect(archive).toEqual(await createAuthoringArchive({format:'shortstory',project}));
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 });
 it('rejects unsupported/future envelope fields and service data',async()=>{
  const archive=await createAuthoringArchive({format:'knolstory',document:document()});
  for(const value of [{...archive,ownerId:'user'}, {...archive,formatVersion:3},{...archive,document:{...document(),future:1}}])await expect(validateAuthoringArchive(value)).rejects.toThrow();
 });
 it('rejects legacy story-maker envelopes',async()=>{await expect(decodeAuthoringArchive(JSON.stringify({manifest:{format:'knolstory',version:1},draft:document()}))).rejects.toThrow();});
 it('rejects missing custom audio and preserves input on failure',async()=>{
  const input=document(); input.project.lines[0]={...input.project.lines[0],audio:{music:{action:'play',assetId:`audio:custom:${'a'.repeat(64)}:wav`,volume:1}}};
  const before=structuredClone(input); await expect(createAuthoringArchive({format:'knolstory',document:input})).rejects.toThrow(); expect(input).toEqual(before);
 });
 it('validates audio bytes/hash and returns portable asset references',async()=>{
  const bytes=new TextEncoder().encode('RIFF0000WAVE1234'); const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const resource={id:`audio:custom:${hash}:wav`,name:'음악.wav',mime:'audio/wav',data:btoa(String.fromCharCode(...bytes)),kind:'music' as const};
  const input=document(); input.project.lines[0]={...input.project.lines[0],audio:{music:{action:'play',assetId:resource.id,volume:1}}};
  const archive=await createAuthoringArchive({format:'knolstory',document:input,audioResources:[resource]}); const snapshot=await prepareJsonbSnapshot(archive);
  expect(snapshot.assetReferences[0]).toMatchObject({id:resource.id,sha256:hash,byteLength:bytes.length});
  await expect(createAuthoringArchive({format:'knolstory',document:input,audioResources:[{...resource,data:btoa('RIFF0000WAVE5678')}]})).rejects.toThrow();
 });
 it('fingerprints ignore object key order and transport savedAt but include content edits',async()=>{
  const input=document(); const first=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:input}));
  const second=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:{...input,savedAt:'2026-10-09T00:00:00.000Z'}})); expect(first.contentSha256).toBe(second.contentSha256);
  const edited={...input,project:{...input.project,title:'수정한 제목'}};const third=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:edited}));expect(third.contentSha256).not.toBe(first.contentSha256);
  await expect(restoreJsonbSnapshot({...first,contentSha256:'a'.repeat(64)})).rejects.toThrow();
 });
 it('rejects malformed JSON, non-JSON values and unsupported shortstory data',async()=>{
  await expect(decodeAuthoringArchive('{')).rejects.toThrow();
  await expect(validateAuthoringArchive({format:'shortstory',formatVersion:2,project:{...newShortStory(),ownerId:'user'}})).rejects.toThrow();
  await expect(validateAuthoringArchive({format:'knolstory',formatVersion:2,document:document(),audioResources:[],extra:undefined})).rejects.toThrow();
  await expect(restoreJsonbSnapshot({payloadVersion:2})).rejects.toThrow();
 });
 it('rejects malformed, duplicate, unknown-field and incorrect-provenance audio atomically',async()=>{
  const bytes=new TextEncoder().encode('RIFF0000WAVE1234'); const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const resource={id:`audio:custom:${hash}:wav`,name:'음악.wav',mime:'audio/wav',data:btoa(String.fromCharCode(...bytes)),kind:'music' as const};
  for(const invalid of [null,{},[resource,resource],[{...resource,ownerId:'user'}],[{...resource,mime:'audio/mpeg'}],[{...resource,data:'%%%'}],[{...resource,name:''}],[{...resource,provenance:{sourceSha256:hash}}]])await expect(validateAuthoringAudioResources(invalid)).rejects.toThrow();
  expect(await validateAuthoringAudioResources([resource])).toEqual([resource]);
 });

 it('rejects supplied authored fields dropped or coerced by normalizers',async()=>{
  const original=document();
  for(const project of [{...original.project,characters:[{id:'character-1',name:123,role:'',description:'',defaultImageId:''}]},{...original.project,creativeMemos:[{id:'memo-1',kind:'future-memo',title:'메모',fields:[]}]}]){
   await expect(validateAuthoringArchive({format:'knolstory',formatVersion:2,document:{...original,project},audioResources:[]})).rejects.toThrow();
  }
 });

 it('validates OGG/MP3 and provenance with immutable exact optional metadata',async()=>{
  for(const [extension,signature,mime]of [['ogg','OggS0000','audio/ogg'],['mp3','ID30000','audio/mpeg']] as const){
   const bytes=new TextEncoder().encode(signature);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   const provenance={provider:'user',source:'local',author:'writer',license:'unknown',commercialUse:'unknown' as const,redistribution:'unknown' as const,attribution:'unknown',sourceSha256:hash,generationPlan:'',termsUrl:'https://example.org/terms'};
   const resource={id:`audio:custom:${hash}:${extension}`,name:'음원',mime,data:btoa(String.fromCharCode(...bytes)),kind:'sound' as const,provenance};
   expect(await validateAuthoringAudioResources([resource])).toEqual([resource]);
   for(const invalid of [null,{...provenance,sourceSha256:'0'.repeat(64)},{...provenance,termsUrl:123},{...provenance,commercialUse:'maybe'},{...provenance,futureField:true}])await expect(validateAuthoringAudioResources([{...resource,provenance:invalid}])).rejects.toThrow();
  }
 });
 it('collects all chapter and cut audio including ambience and sound cues',async()=>{
  const input=document();input.project.chapters[0]={...input.project.chapters[0],audio:{music:{action:'stop'},ambience:{action:'play',assetId:`audio:custom:${'a'.repeat(64)}:ogg`,volume:0.5}}};
  input.project.lines[0]={...input.project.lines[0],audio:{sounds:[{id:'sound-1',assetId:`audio:custom:${'b'.repeat(64)}:mp3`,volume:1,delayMs:0}]}};
  await expect(createAuthoringArchive({format:'knolstory',document:input})).rejects.toThrow();
 });
 it('rejects broken document and snapshot references with concrete failures',async()=>{
  for(const bad of [null,[],{format:'unknown',formatVersion:2},{format:'knolstory',formatVersion:2,document:null,audioResources:[]},{format:'knolstory',formatVersion:2,document:{...document(),schemaVersion:9},audioResources:[]}])await expect(validateAuthoringArchive(bad)).rejects.toThrow();
  await expect(decodeAuthoringArchive(JSON.stringify({manifest:{format:'shortstory',version:1,kind:'shared'},project:newShortStory()}))).rejects.toThrow();
  await expect(restoreJsonbSnapshot(null)).rejects.toThrow();
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));
  expect(snapshot.assetReferences).toEqual([]);expect(await restoreJsonbSnapshot(snapshot)).toEqual(snapshot.content);
  await expect(restoreJsonbSnapshot({...snapshot,assetReferences:[{id:'wrong'}]})).rejects.toThrow();
 });

 it('rejects arbitrary nested authored fields without silently discarding them',async()=>{
  const input=document();const lines=input.project.lines.map((line,index)=>index?line:{...line,notes:{futureMode:true}});
  await expect(validateAuthoringArchive({format:'knolstory',formatVersion:2,document:{...input,project:{...input.project,lines}},audioResources:[]})).rejects.toThrow('notes');
  const project=newShortStory();await expect(createAuthoringArchive({format:'shortstory',project:{...project,cover:{...project.cover,futureFace:true}} as typeof project})).rejects.toThrow('futureFace');
 });

 it('accepts direct domain constructor output and drops only typed optional undefined object values',async()=>{
  const base=document();const project={...base.project,source:undefined,cover:undefined,lines:base.project.lines.map(line=>({...line,audio:undefined,presentation:undefined}))};
  const input=createStoryDocument({project,savedAt:base.savedAt,appVersion:base.appVersion,assetCatalogVersion:undefined});
  const before=structuredClone(input);const archive=await createAuthoringArchive({format:'knolstory',document:input,audioResources:undefined});
  expect(archive.format==='knolstory'&&archive.document).toEqual(JSON.parse(JSON.stringify(input)));expect(input).toEqual(before);
  await expect(createAuthoringArchive({format:'knolstory',document:{...input,project:{...project,unknownOptional:undefined}}} as never)).rejects.toThrow();
  await expect(createAuthoringArchive({format:'knolstory',document:{...input,project:{...project,lines:[undefined]}}} as never)).rejects.toThrow();
 });
 it('preserves lawful current upload provenance and explicit empty optional UI fields',async()=>{
  const bytes=new TextEncoder().encode('RIFF0000WAVE1234');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');const id=`audio:custom:${hash}:wav`;
  const provenance=validateMediaProvenance({...unknownUploadProvenance(id),generationPlan:'',generatedAt:'',providerAssetId:'',termsUrl:'',termsCheckedAt:'',replacementAssetId:''},id);
  const resource={id,name:'음원.wav',mime:'audio/wav',kind:'music' as const,data:btoa(String.fromCharCode(...bytes)),provenance};
  expect(await validateAuthoringAudioResources([resource])).toEqual([resource]);
 });

});
