export type RuntimeMusic = Readonly<{action:'maintain'} | {action:'stop';fadeOutMs:number}
  | {action:'play';audioPath:string;volume:number;loop:boolean;fadeInMs:number;fadeOutMs:number}>;
export type RuntimeSound = Readonly<{id:string;audioPath:string;volume:number;delayMs:number}>;
export type RuntimeAudio = Readonly<{version:1;sessionId?:string;music:RuntimeMusic;ambience?:RuntimeMusic;sounds:readonly RuntimeSound[]}>;
const record = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const number = (v:unknown,max:number) => typeof v==='number' && Number.isFinite(v) && v>=0 && v<=max;
export function isRuntimeAudioPath(v:unknown):v is string {
 return typeof v==='string' && v.length<=500 && (/^assets\/audio\/(?:(?:story-score|pixabay|cc0)\/)?[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(wav|ogg|mp3)$/.test(v)||isRuntimeServiceAudioPath(v));
}
export function isRuntimeAudio(v:unknown):v is RuntimeAudio {
 if(!record(v)||v.version!==1||!record(v.music)||!Array.isArray(v.sounds)||v.sounds.length>8)return false;
 if(v.sessionId!==undefined&&(typeof v.sessionId!=='string'||!v.sessionId.trim()||v.sessionId.length>200))return false;
 if(v.ambience!==undefined && !isRuntimeMusic(v.ambience))return false;
 if(!isRuntimeMusic(v.music))return false;
 return v.sounds.every(s=>record(s)&&typeof s.id==='string'&&s.id.trim().length>0&&s.id.length<=200&&isRuntimeAudioPath(s.audioPath)&&number(s.volume,1)&&number(s.delayMs,10000))&&new Set(v.sounds.map(s=>s.id)).size===v.sounds.length;
}
function isRuntimeMusic(m:unknown):m is RuntimeMusic {
 if(!record(m))return false;
 if(m.action==='stop'?!number(m.fadeOutMs,10000):m.action==='play'?!isRuntimeAudioPath(m.audioPath)||!number(m.volume,1)||typeof m.loop!=='boolean'||!number(m.fadeInMs,10000)||!number(m.fadeOutMs,10000):m.action!=='maintain')return false;
 return true;
}

/** Versioned shared catalogue files, separate from restored private audio resources. */
export type RuntimeServiceAudioResource=Readonly<{path:string;sha256:string;mime:string;data:string}>;
export function isRuntimeServiceAudioPath(value:unknown):value is string {
 return typeof value==='string'&&value.length<=500&&/^assets\/audio\/cc0\/[a-z0-9_-]+\/v[1-9][0-9]*\/[a-z0-9_-]+\.(ogg|mp3|wav)$/.test(value);
}
export function runtimeServiceAudioPaths(audio:RuntimeAudio|undefined):string[]{
 const paths=[...(audio?.music.action==='play'?[audio.music.audioPath]:[]),...(audio?.ambience?.action==='play'?[audio.ambience.audioPath]:[]),...(audio?.sounds.map(sound=>sound.audioPath)??[])];
 return [...new Set(paths.filter(isRuntimeServiceAudioPath))];
}
export function isRuntimeServiceAudioResources(value:unknown,paths:readonly string[]):value is readonly RuntimeServiceAudioResource[]|undefined {
 if(value===undefined)return true;
 if(!Array.isArray(value)||value.length>10)return false;
 let total=0;const seen=new Set<string>();
 return value.every(row=>{
  if(!record(row)||!isRuntimeServiceAudioPath(row.path)||!paths.includes(row.path)||seen.has(row.path)||typeof row.sha256!=='string'||! /^[a-f0-9]{64}$/.test(row.sha256)||typeof row.data!=='string'||!row.data.length||row.data.length>12000000||! /^[A-Za-z0-9+/]*={0,2}$/.test(row.data))return false;
  const mime=row.path.endsWith('.ogg')?'audio/ogg':row.path.endsWith('.mp3')?'audio/mpeg':'audio/wav';
  seen.add(row.path);total+=row.data.length;return row.mime===mime&&total<=32000000;
 });
}
