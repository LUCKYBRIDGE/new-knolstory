import {unknownUploadProvenance,validateMediaProvenance,type MediaProvenance} from './media-provenance';
import { AUDIO_CATALOG, customAudioRuntimePath, type AudioAsset } from '@knolstory/asset-registry';
export type AudioResource = Readonly<{ id: string; name: string; mime: string; data: string; kind: 'music' | 'sound';provenance?:MediaProvenance }>;
const DB_NAME = 'knolstory-audio-assets-v1';
const MAX_BYTES = 5 * 1024 * 1024;
const mimeFor = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg' } as const;
function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('resources', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('오디오 보관함을 열지 못했습니다.'));
  });
}
function isAudioBytes(bytes: Uint8Array, ext: string): boolean {
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start,start+length));
  return ext === 'wav' ? text(0,4)==='RIFF' && text(8,4)==='WAVE' : ext === 'ogg' ? text(0,4)==='OggS' : text(0,3)==='ID3' || bytes[0]===255 && (bytes[1]&224)===224;
}
export function validateAudioResource(value: unknown): AudioResource {
  if (!value || typeof value !== 'object') throw new Error('오디오 자료가 올바르지 않습니다.');
  const item = value as Record<string,unknown>;
  const ext = typeof item.id === 'string' ? item.id.split(':').at(-1) : '';
  if (!customAudioRuntimePath(String(item.id)) || typeof item.name!=='string' || !item.name.trim() || item.name.length>200 || (item.kind!=='music' && item.kind!=='sound') || typeof item.data!=='string' || item.data.length>Math.ceil(MAX_BYTES/3)*4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data) || item.mime!==mimeFor[ext as keyof typeof mimeFor]) throw new Error('오디오 자료 형식이나 크기가 올바르지 않습니다.');
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(item.data),char=>char.charCodeAt(0)); } catch { throw new Error('오디오 자료를 읽지 못했습니다.'); }
  if (!bytes.length || bytes.length > MAX_BYTES || !isAudioBytes(bytes,String(ext))) throw new Error('지원하는 WAV, MP3, OGG 오디오 파일이 아닙니다.');
  return { id: String(item.id), name: item.name, mime: String(item.mime), data: item.data, kind: item.kind,provenance:item.provenance===undefined?unknownUploadProvenance(String(item.id)):validateMediaProvenance(item.provenance,String(item.id)) };
}
export async function listAudioResources(ids?: readonly string[]): Promise<AudioResource[]> {
  const db = await openStore();
  try {
    return await new Promise((resolve,reject)=>{
      const request=db.transaction('resources','readonly').objectStore('resources').getAll();
      request.onsuccess=()=>{
        try { resolve((request.result as AudioResource[]).filter(item=>!ids || ids.includes(item.id)).map(validateAudioResource)); }
        catch(error) { reject(error); }
      };
      request.onerror=()=>reject(new Error('오디오 자료를 불러오지 못했습니다.'));
    });
  } finally { db.close(); }
}
export async function importAudioResources(resources: readonly AudioResource[]): Promise<void> {
  const checked = resources.map(validateAudioResource);
  if (!checked.length) return;
  if (checked.reduce((sum,item)=>sum+item.data.length,0)>20*1024*1024) throw new Error('오디오 자료는 전체 15MB까지 보관할 수 있습니다.');
  for (const item of checked) {
    const bytes = Uint8Array.from(atob(item.data),char=>char.charCodeAt(0));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
    if (!item.id.includes(`:${hash}:`)) throw new Error('오디오 자료의 내용과 자산 ID가 다릅니다.');
  }
  const db=await openStore();
  try { await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('resources','readwrite');
    for (const item of checked) tx.objectStore('resources').put(item);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('오디오 자료를 저장하지 못했습니다.'));tx.onabort=()=>reject(new Error('오디오 저장이 취소되었습니다.'));
  }); } finally { db.close(); }
}
export function audioResourceAsset(item: AudioResource): AudioAsset {
  return { id:item.id,name:item.name,kind:item.kind,mime:item.mime,src:`data:${item.mime};base64,${item.data}`,runtimePath:customAudioRuntimePath(item.id)! };
}
export async function listAudioAssets(): Promise<AudioAsset[]> { return [...AUDIO_CATALOG,...(await listAudioResources()).map(audioResourceAsset)]; }
export async function registerAudioFile(file: File, kind: AudioAsset['kind']): Promise<AudioAsset> {
  const ext=file.name.toLowerCase().split('.').at(-1) as keyof typeof mimeFor;
  if (!(ext in mimeFor) || file.size>MAX_BYTES || !file.size) throw new Error('WAV, MP3, OGG 파일을 5MB 이하로 선택하세요.');
  const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);
  if (!isAudioBytes(bytes,ext)) throw new Error('파일 내용이 지원하는 오디오 형식이 아닙니다.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),value=>value.toString(16).padStart(2,'0')).join('');
  let binary=''; for (const byte of bytes) binary+=String.fromCharCode(byte);
  const item: AudioResource={id:`audio:custom:${hash}:${ext}`,name:file.name.slice(0,200),mime:mimeFor[ext],data:btoa(binary),kind};
  const current=await listAudioResources();
  await importAudioResources([...current.filter(value=>value.id!==item.id),item]);
  return audioResourceAsset(item);
}
