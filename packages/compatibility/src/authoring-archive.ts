import {validateAudioMetadata,type AudioMetadata} from '../../asset-registry/src/audio-metadata';
import {parseAuthoringJson,assertJsonbText} from './authoring-json';
import {parseStoryDocument, normalizeChapterTitle, CURRENT_SCHEMA_VERSION, stageProjection, type StoryDocumentEnvelope, type StoryProject} from '@knolstory/story-domain';
import {parseShortStory, type ShortStoryProject} from './shortstory';
import {assertAuthoringFields} from './authoring-fields';

export const AUTHORING_FORMAT_VERSION = 2 as const;
export const SERVER_PAYLOAD_VERSION = 1 as const;
export type AuthoringFormat = 'knolstory' | 'shortstory';
export type AudioProvenance = Readonly<{
 provider:string;source:string;author:string;license:string;commercialUse:'permitted'|'restricted'|'unknown';
 redistribution:'permitted'|'restricted'|'unknown';attribution:string;sourceSha256:string;
 generatedAt?:string;generationPlan?:string;providerAssetId?:string;termsUrl?:string;termsCheckedAt?:string;replacementAssetId?:string;
}>;
export type AuthoringAudioResource = Readonly<{id:string;name:string;mime:string;data:string;kind:'music'|'sound';provenance?:AudioProvenance;metadata?:AudioMetadata}>;
export type AuthoringArchive =
 | {format:'knolstory';formatVersion:2;document:StoryDocumentEnvelope;audioResources:AuthoringAudioResource[]}
 | {format:'shortstory';formatVersion:2;project:ShortStoryProject};
export type AuthoringArchiveInput =
 | {format:'knolstory';document:StoryDocumentEnvelope;audioResources?:readonly AuthoringAudioResource[]}
 | {format:'shortstory';project:ShortStoryProject};
export type AuthoringAssetReference = Readonly<{id:string;sha256:string;mime:string;kind:'music'|'sound';byteLength:number}>;
/** JSON value for a future API/JSONB write; no account, permissions, revision or storage credentials. */
export type AuthoringJsonbSnapshot = {payloadVersion:1;content:AuthoringArchive;contentSha256:string;assetReferences:AuthoringAssetReference[]};
const MAX_ARCHIVE_BYTES=25_000_000;
const MAX_AUDIO_BYTES=5*1024*1024;
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
function exactKeys(value:Record<string,unknown>,keys:readonly string[],path:string){
 const unknown=Object.keys(value).filter(key=>!keys.includes(key));
 if(unknown.length)throw Error(`${path}: 지원하지 않는 항목 ${unknown.join(', ')}. 원본을 보존하고 가져오기를 중단했습니다.`);
}
function jsonSize(value:unknown){
 const serialized=JSON.stringify(value);
 if(serialized===undefined||new TextEncoder().encode(serialized).length>MAX_ARCHIVE_BYTES)throw Error('작품 자료는 25MB 이하로 보관해 주세요.');
 return serialized;
}
function assertJson(value:unknown,path='$'):void{
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(Array.isArray(value)){Array.from(value).forEach((item,index)=>assertJson(item,`${path}[${index}]`));return;}
 if(record(value)&&Object.getPrototypeOf(value)===Object.prototype){for(const [key,item]of Object.entries(value))assertJson(item,`${path}.${key}`);return;}
 throw Error(`${path}: JSON으로 보관할 수 없는 값입니다.`);
}
async function sha256(bytes:Uint8Array){
 const buffer=new ArrayBuffer(bytes.byteLength);new Uint8Array(buffer).set(bytes);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),v=>v.toString(16).padStart(2,'0')).join('');
}
function canonicalJson(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
 if(record(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
 return JSON.stringify(value);
}
function audioBytes(resource:AuthoringAudioResource){return Uint8Array.from(atob(resource.data),char=>char.charCodeAt(0));}
function assertProvenance(value:unknown,id:string){
 if(value===undefined)return;
 if(!record(value))throw Error(`${id}: 자료 출처 형식을 확인해 주세요.`);
 const required=['provider','source','author','license','attribution','sourceSha256'];
 const optional=['generatedAt','generationPlan','providerAssetId','termsUrl','termsCheckedAt','replacementAssetId'];
 exactKeys(value,[...required,...optional,'commercialUse','redistribution'],'audioResources.provenance');
 if(required.some(key=>typeof value[key]!=='string'||!String(value[key]).trim()||String(value[key]).length>2000)
 ||optional.some(key=>value[key]!==undefined&&(typeof value[key]!=='string'||String(value[key]).length>2000))
 ||!['permitted','restricted','unknown'].includes(String(value.commercialUse))
 ||!['permitted','restricted','unknown'].includes(String(value.redistribution))||value.sourceSha256!==id.split(':')[2])throw Error(`${id}: 자료 출처와 원본 해시를 확인해 주세요.`);
}
export async function validateAuthoringAudioResources(value:unknown):Promise<AuthoringAudioResource[]>{
 if(!Array.isArray(value)||value.length>50)throw Error('오디오 자료 목록은 50개 이하로 구성해 주세요.');
 const ids=new Set<string>();let total=0;
 for(const [index,item]of value.entries()){
  const path=`audioResources[${index}]`;
  if(!record(item))throw Error(`${path}: 오디오 자료 형식을 확인해 주세요.`);
  exactKeys(item,['id','name','mime','data','kind','provenance','metadata'],path);
  const match=typeof item.id==='string'?/^audio:custom:([a-f0-9]{64}):(wav|ogg|mp3)$/.exec(item.id):null;
  if(!match||typeof item.name!=='string'||!item.name.trim()||item.name.length>200||typeof item.kind!=='string'||!['music','sound'].includes(item.kind)
   ||typeof item.data!=='string'||item.data.length>Math.ceil(MAX_AUDIO_BYTES/3)*4||!item.data.length||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.data)
   ||item.mime!==({wav:'audio/wav',ogg:'audio/ogg',mp3:'audio/mpeg'}[match[2] as 'wav'|'ogg'|'mp3'])||ids.has(String(item.id)))throw Error(`${path}: 오디오 ID·종류·이름·MIME·크기·중복을 확인해 주세요.`);
  ids.add(String(item.id));total+=item.data.length;if(total>20_000_000)throw Error('오디오 첨부 base64의 합계는 20MB까지 지원합니다.');
  const bytes=audioBytes(item as AuthoringAudioResource);
  const text=(offset:number,length:number)=>String.fromCharCode(...bytes.slice(offset,offset+length));
  const signature=match[2]==='wav'?text(0,4)==='RIFF'&&text(8,4)==='WAVE':match[2]==='ogg'?text(0,4)==='OggS':text(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224;
  if(!bytes.length||bytes.length>MAX_AUDIO_BYTES||!signature||await sha256(bytes)!==match[1])throw Error(`${path}: 오디오 내용·원본 해시·파일 형식이 일치하지 않습니다.`);
  assertProvenance(item.provenance,String(item.id));
  validateAudioMetadata(item.metadata);
 }
 return structuredClone(value) as AuthoringAudioResource[];
}
export function authoringReferencedAudioIds(project:StoryProject):string[]{
 const ids=new Set<string>();
 for(const item of [...project.chapters,...project.lines]){
  if(item.audio?.music?.action==='play')ids.add(item.audio.music.assetId);
  if(item.audio?.ambience?.action==='play')ids.add(item.audio.ambience.assetId);
  if('sounds' in(item.audio??{}))for(const cue of item.audio?.sounds??[])ids.add(cue.assetId);
 }
 return [...ids];
}
/** A recognized supplied value must not be silently normalized away in the current schema. */
function assertPreservedValues(original:unknown,parsed:unknown,path:string):void{
 if(Array.isArray(original)){
  if(!Array.isArray(parsed)||original.length!==parsed.length)throw Error(`${path}: 항목이 손실되거나 변경되어 가져오기를 중단했습니다.`);
  original.forEach((item,index)=>assertPreservedValues(item,parsed[index],`${path}[${index}]`));return;
 }
 if(record(original)){
  if(!record(parsed))throw Error(`${path}: 작성한 구조를 보존할 수 없습니다.`);
  for(const [key,item]of Object.entries(original)){
   if(!(key in parsed))throw Error(`${path}.${key}: 지원하지 않거나 보존할 수 없는 항목입니다.`);
   assertPreservedValues(item,parsed[key],`${path}.${key}`);
  }
  return;
 }
 if(original!==parsed)throw Error(`${path}: 작성한 값을 그대로 보존할 수 없습니다. 형식과 허용 값을 확인해 주세요.`);
}
function validatedDocument(input:unknown):StoryDocumentEnvelope{
 if(!record(input))throw Error('document: 작품 문서를 확인해 주세요.');
 let value=input;
 exactKeys(value,['documentType','schemaVersion','savedAt','appVersion','assetCatalogVersion','project'],'document');
 // Explicit title-only correction also applies to exact-value archive/workbook checks.
 // Keep every other authored field and the caller's original object unchanged.
 if(record(value.project)&&Array.isArray(value.project.chapters))value={...value,project:{...value.project,chapters:value.project.chapters.map(chapter=>record(chapter)&&typeof chapter.title==='string'?{...chapter,title:normalizeChapterTitle(chapter.title)}:chapter)}};
 if((value.schemaVersion===5||value.schemaVersion===6||value.schemaVersion===7||value.schemaVersion===CURRENT_SCHEMA_VERSION))assertAuthoringFields('knolstory',value.project);
 const parsed=parseStoryDocument(value);
 if(!parsed.ok)throw Error(parsed.issues.map(issue=>`${issue.path}: ${issue.message}`).join('\n'));
 if((value.schemaVersion!==5&&value.schemaVersion!==6&&value.schemaVersion!==7&&value.schemaVersion!==CURRENT_SCHEMA_VERSION))assertAuthoringFields('knolstory',parsed.document.project);
 if((value.schemaVersion===5||value.schemaVersion===6||value.schemaVersion===7||value.schemaVersion===CURRENT_SCHEMA_VERSION))assertPreservedValues(value.project,parsed.document.project,'document.project');
 // Current authored values must survive exactly. Explicit Next schema migrations use the domain normalizer.
 return structuredClone((value.schemaVersion===5||value.schemaVersion===6||value.schemaVersion===7||value.schemaVersion===CURRENT_SCHEMA_VERSION)?{...value,schemaVersion:CURRENT_SCHEMA_VERSION}:parsed.document) as StoryDocumentEnvelope;
}
/** Object optional `undefined` means absent; arrays and actual authored values never disappear. */
function constructorJson(value:unknown,path='$'):unknown{
 if(Array.isArray(value))return Array.from(value,(item,index)=>{
  if(item===undefined)throw Error(`${path}[${index}]: 목록 항목이 비어 있습니다.`);
  return constructorJson(item,`${path}[${index}]`);
 });
 if(record(value)&&Object.getPrototypeOf(value)===Object.prototype){
  return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,constructorJson(item,`${path}.${key}`)]));
 }
 assertJson(value,path);return value;
}
export async function createAuthoringArchive(input:AuthoringArchiveInput):Promise<AuthoringArchive>{
 if(!record(input))throw Error('작품 입력 형식을 확인해 주세요.');
 exactKeys(input,input.format==='knolstory'?['format','document','audioResources']:['format','project'],'input');
 if(input.format==='knolstory'){
  if(!record(input.document))throw Error('document: 작품 문서를 확인해 주세요.');
  exactKeys(input.document,['documentType','schemaVersion','savedAt','appVersion','assetCatalogVersion','project'],'document');
  assertAuthoringFields('knolstory',input.document.project);
  // Validate attachment keys before removing lawful optional undefined metadata.
  const audioResources=await validateAuthoringAudioResources(input.audioResources??[]);
  return validateAuthoringArchive(constructorJson({...input,formatVersion:AUTHORING_FORMAT_VERSION,audioResources}));
 }
 assertAuthoringFields('shortstory',input.project);
 return validateAuthoringArchive(constructorJson({...input,formatVersion:AUTHORING_FORMAT_VERSION}));
}
export async function validateAuthoringArchive(value:unknown):Promise<AuthoringArchive>{
 assertJson(value);jsonSize(value);
 if(!record(value)||value.formatVersion!==2)throw Error('지원하지 않는 작품 파일 버전입니다.');
 if(value.format==='shortstory'){
  exactKeys(value,['format','formatVersion','project'],'archive');
  assertAuthoringFields('shortstory',value.project);
  return {format:'shortstory',formatVersion:2,project:parseShortStory(value.project)};
 }
 if(value.format!=='knolstory')throw Error('지원하지 않는 작품 파일 종류입니다.');
 exactKeys(value,['format','formatVersion','document','audioResources'],'archive');
 const document=validatedDocument(value.document),audioResources=await validateAuthoringAudioResources(value.audioResources);
 const missing=authoringReferencedAudioIds(document.project).filter(id=>id.startsWith('audio:custom:')&&!audioResources.some(resource=>resource.id===id));
 if(missing.length)throw Error(`audioResources: 연결된 오디오 자료가 없습니다: ${missing.join(', ')}`);
 return {format:'knolstory',formatVersion:2,document,audioResources};
}
export async function encodeAuthoringArchive(value:AuthoringArchive):Promise<string>{
 const result=JSON.stringify(await validateAuthoringArchive(value),null,2);
 if(new TextEncoder().encode(result).length>MAX_ARCHIVE_BYTES)throw Error('작품 파일은 25MB 이하로 저장해 주세요.');
 return result;
}
/** Earlier Next files stored side IDs redundantly; an explicit composition already owns those IDs. */
function adaptNextDocumentProjections(document:Record<string,unknown>):Record<string,unknown>{
 if(document.schemaVersion!==5&&document.schemaVersion!==6&&document.schemaVersion!==7&&document.schemaVersion!==8)return document;
 // Check unknown keys/types before adapting; malformed authored data must still fail atomically.
 assertAuthoringFields('knolstory',document.project);
 const project=document.project as StoryProject;
 const lines=project.lines.map(line=>line.stageComposition&&!line.inheritActors
  ? {...line,...stageProjection(line.stageComposition)}:line);
 return {...document,project:{...project,lines}};
}
/** Only already-authored Next formats adapt; original story-maker draft/playback envelopes are unsupported. */
export async function decodeAuthoringArchive(text:string):Promise<AuthoringArchive>{
 if(new TextEncoder().encode(text).length>MAX_ARCHIVE_BYTES)throw Error('작품 파일은 25MB 이하로 열어 주세요.');
 const value=parseAuthoringJson(text);
 if(record(value)&&value.documentType==='story-maker-project'){
  exactKeys(value,['documentType','schemaVersion','savedAt','appVersion','assetCatalogVersion','project','audioResources'],'Next document');
  const {audioResources,...document}=value;
  return validateAuthoringArchive({format:'knolstory',formatVersion:2,document:adaptNextDocumentProjections(document),audioResources:audioResources??[]});
 }
 if(record(value)&&record(value.manifest)&&value.manifest.format==='shortstory'&&value.manifest.version===1){
  exactKeys(value,['manifest','project'],'ShortStory v1');exactKeys(value.manifest,['format','version','kind'],'ShortStory v1 manifest');
  if(value.manifest.kind!=='project')throw Error('지원하지 않는 숏스토리 파일 종류입니다.');
  return validateAuthoringArchive({format:'shortstory',formatVersion:2,project:value.project});
 }
 return validateAuthoringArchive(value);
}
function fingerprintContent(archive:AuthoringArchive){
 if(archive.format==='shortstory')return archive;
 const {savedAt:_savedAt,appVersion:_appVersion,...document}=archive.document;
 return {...archive,document};
}
export async function prepareJsonbSnapshot(value:AuthoringArchive):Promise<AuthoringJsonbSnapshot>{
 const content=await validateAuthoringArchive(value);
 assertJsonbText(content);
 const assetReferences=content.format==='shortstory'?[]:content.audioResources.map(resource=>({id:resource.id,sha256:resource.id.split(':')[2],mime:resource.mime,kind:resource.kind,byteLength:audioBytes(resource).length}));
 return {payloadVersion:1,content,contentSha256:await sha256(new TextEncoder().encode(canonicalJson(fingerprintContent(content)))),assetReferences};
}
export async function restoreJsonbSnapshot(value:unknown):Promise<AuthoringArchive>{
 assertJson(value);jsonSize(value);
 if(!record(value))throw Error('서버 작품 snapshot을 확인해 주세요.');
 exactKeys(value,['payloadVersion','content','contentSha256','assetReferences'],'snapshot');
 if(value.payloadVersion!==1)throw Error('지원하지 않는 서버 payload 버전입니다.');
 const content=await validateAuthoringArchive(value.content);
 assertJsonbText(value.content);
 // A valid previous snapshot was fingerprinted before schema migration.
 const originalHash=await sha256(new TextEncoder().encode(canonicalJson(fingerprintContent(value.content as AuthoringArchive))));
 const checked=await prepareJsonbSnapshot(content);
 if(value.contentSha256!==originalHash||canonicalJson(value.assetReferences)!==canonicalJson(checked.assetReferences))throw Error('서버 작품 snapshot의 내용·해시·자산 참조가 일치하지 않습니다.');
 return checked.content;
}
