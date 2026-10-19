import {
 prepareJsonbSnapshot,
 restoreJsonbSnapshot,
 type AuthoringArchive,
 type AuthoringAudioResource,
 type AuthoringJsonbSnapshot,
} from '../../packages/compatibility/src/authoring-archive';

type ProjectedArchive =
 | Extract<AuthoringArchive,{format:'shortstory'}>
 | (Omit<Extract<AuthoringArchive,{format:'knolstory'}>,'audioResources'> & {
  audioResources:Omit<AuthoringAudioResource,'data'>[];
 });
/** Internal storage value only. Restore bytes before the shared snapshot validator. */
export type SnapshotProjection = {
 projectionVersion:1;
 snapshot:Omit<AuthoringJsonbSnapshot,'content'> & {content:ProjectedArchive};
};
export type SnapshotBlob = Readonly<{
 id:string;sha256:string;mime:string;byteLength:number;bytes:Uint8Array;
}>;
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));

/** Separates already-authored bytes; it does not grant upload or catalog permission. */
export async function projectSnapshot(value:unknown):Promise<{projection:SnapshotProjection;blobs:readonly SnapshotBlob[]}> {
 const captured=structuredClone(value);
 const snapshot=await prepareJsonbSnapshot(await restoreJsonbSnapshot(captured));
 const blobs:SnapshotBlob[]=snapshot.content.format==='shortstory'?[]:snapshot.content.audioResources.map((resource,index)=>({
  id:resource.id,sha256:snapshot.assetReferences[index].sha256,mime:resource.mime,
  byteLength:snapshot.assetReferences[index].byteLength,
  bytes:Uint8Array.from(atob(resource.data),char=>char.charCodeAt(0)),
 }));
 const content:ProjectedArchive=snapshot.content.format==='shortstory'?snapshot.content:{
  ...snapshot.content,audioResources:snapshot.content.audioResources.map(({data:_data,...resource})=>resource),
 };
 return {projection:{projectionVersion:1,snapshot:{...snapshot,content}},blobs};
}

function captureProjection(value:unknown):Record<string,unknown> {
 if(!record(value)||Object.keys(value).length!==2||!Object.hasOwn(value,'projectionVersion')
  ||!Object.hasOwn(value,'snapshot')||value.projectionVersion!==1)throw Error('지원하지 않는 내부 snapshot projection입니다.');
 const captured=structuredClone(value);
 if(!record(captured.snapshot)||!record(captured.snapshot.content))throw Error('내부 snapshot 내용을 확인해 주세요.');
 return captured.snapshot;
}
async function restoreAudio(value:unknown,readBlob:(id:string)=>Promise<Uint8Array|null>):Promise<unknown[]> {
 if(!Array.isArray(value))throw Error('내부 오디오 자료 목록을 확인해 주세요.');
 const restored:unknown[]=[];
 for(const item of value){
  if(!record(item)||typeof item.id!=='string'||Object.hasOwn(item,'data'))throw Error('내부 오디오 자료 형식을 확인해 주세요.');
  const read=await readBlob(item.id);
  if(!(read instanceof Uint8Array))throw Error('보관된 오디오 원본이 없습니다.');
  // Detach immediately: another callback invocation must not change earlier bytes.
  const bytes=new Uint8Array(read);
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  restored.push({...item,data:btoa(binary)});
 }
 return restored;
}

/** Reuses canonical archive validation, hash, reference and explicit schema migration. */
export async function restoreProjectedSnapshot(value:unknown,readBlob:(id:string)=>Promise<Uint8Array|null>):Promise<AuthoringJsonbSnapshot> {
 const snapshot=captureProjection(value),content=snapshot.content as Record<string,unknown>;
 const hydrated=content.format==='knolstory'?{
  ...snapshot,content:{...content,audioResources:await restoreAudio(content.audioResources,readBlob)},
 }:snapshot;
 return prepareJsonbSnapshot(await restoreJsonbSnapshot(hydrated));
}
