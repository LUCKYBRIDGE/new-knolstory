import {unknownUploadProvenance,validateMediaProvenance,type MediaProvenance} from './media-provenance';
import type {StoryProject} from '@knolstory/story-domain';
export type PortableAudioResource = Readonly<{id:string;name:string;mime:string;data:string;kind:'music'|'sound';provenance?:MediaProvenance}>;
export function referencedAudioIds(project:StoryProject):string[] {
  const ids=new Set<string>();
  for(const item of [...project.chapters,...project.lines]) {
    if(item.audio?.ambience?.action==='play')ids.add(item.audio.ambience.assetId);
    if(item.audio?.music?.action==='play')ids.add(item.audio.music.assetId);
    if('sounds' in (item.audio??{}))for(const sound of item.audio?.sounds??[])ids.add(sound.assetId);
  }
  return [...ids];
}
/** Validate attachment shape before touching the local audio library. Bytes/hash checked by its importer. */
export function portableAudioResources(value:unknown):PortableAudioResource[] {
  if(!value||typeof value!=='object')throw new Error('작품 파일 형식을 확인해 주세요.');
  const resources=(value as {audioResources?:unknown}).audioResources;
  if(resources===undefined)return [];
  if(!Array.isArray(resources)||resources.length>50)throw new Error('오디오 자료 목록을 확인해 주세요.');
  let total=0;
  const ids=new Set<string>();
  for(const item of resources) {
    if(!item||typeof item!=='object'||!/^audio:custom:[a-f0-9]{64}:(wav|ogg|mp3)$/.test(item.id)
      ||typeof item.name!=='string'||item.name.length>200||!['music','sound'].includes(item.kind)
      ||!['audio/wav','audio/ogg','audio/mpeg'].includes(item.mime)||typeof item.data!=='string'
      ||item.data.length>7_000_000||!item.data.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.data)||ids.has(item.id))throw new Error('오디오 자료 형식을 확인해 주세요.');
    ids.add(item.id);total+=item.data.length;
  }
  if(total>20_000_000)throw new Error('작품 오디오 자료의 전체 크기가 너무 큽니다.');
  return resources.map(item=>({...item,provenance:item.provenance===undefined?unknownUploadProvenance(item.id):validateMediaProvenance(item.provenance,item.id)}));
}
