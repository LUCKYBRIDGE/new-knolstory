export type RuntimeMusicSequenceClip=Readonly<{id:string;audioPath:string;sourceStartMs:number;sourceEndMs:number;volume:number;fadeInMs:number;fadeOutMs:number}>;
export type RuntimeMusicSequence=Readonly<{action:'sequence';id:string;entryId:string;clips:readonly RuntimeMusicSequenceClip[]}>;
export type RuntimeMusic = RuntimeMusicSequence | Readonly<{action:'maintain'} | {action:'stop';fadeOutMs:number}
  | {action:'play';audioPath:string;sourceStartMs?:number;sourceEndMs?:number;volume:number;loop:boolean;fadeInMs:number;fadeOutMs:number}>;
export type RuntimeSound = Readonly<{id:string;audioPath:string;sourceStartMs?:number;sourceEndMs?:number;volume:number;delayMs:number}>;
export type RuntimeAudio = Readonly<{version:1;sessionId?:string;music:RuntimeMusic;ambience?:RuntimeMusic;sounds:readonly RuntimeSound[]}>;
const record = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const number = (v:unknown,max:number) => typeof v==='number' && Number.isFinite(v) && v>=0 && v<=max;
export function isRuntimeAudioPath(v:unknown):v is string {
 return typeof v==='string' && v.length<=500 && (/^assets\/audio\/(?:(?:story-score|pixabay|cc0)\/)?[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(wav|ogg|mp3)$/.test(v)||isRuntimeServiceAudioPath(v));
}
const sourceRange=(value:Record<string,unknown>)=>[value.sourceStartMs,value.sourceEndMs].every(time=>time===undefined||typeof time==='number'&&Number.isInteger(time)&&time>=0&&time<=86400000)&&(value.sourceEndMs===undefined||(value.sourceEndMs as number)>(value.sourceStartMs as number|undefined??0));
export function isRuntimeAudio(v:unknown):v is RuntimeAudio {
 if(!record(v)||v.version!==1||!record(v.music)||!Array.isArray(v.sounds)||v.sounds.length>8)return false;
 if(v.sessionId!==undefined&&(typeof v.sessionId!=='string'||!v.sessionId.trim()||v.sessionId.length>200))return false;
 if(v.ambience!==undefined && !isRuntimeMusic(v.ambience))return false;
 if(!isRuntimeMusic(v.music))return false;
 return v.sounds.every(s=>record(s)&&sourceRange(s)&&typeof s.id==='string'&&s.id.trim().length>0&&s.id.length<=200&&isRuntimeAudioPath(s.audioPath)&&number(s.volume,1)&&number(s.delayMs,10000))&&new Set(v.sounds.map(s=>s.id)).size===v.sounds.length;
}
function isRuntimeMusic(m:unknown):m is RuntimeMusic {
 if(!record(m))return false;
 if(m.action==='sequence')return Object.keys(m).every(key=>['action','id','entryId','clips'].includes(key))&&typeof m.id==='string'&&m.id.trim().length>0&&m.id.length<=200&&typeof m.entryId==='string'&&m.entryId.trim().length>0&&m.entryId.length<=500&&Array.isArray(m.clips)&&m.clips.length>=1&&m.clips.length<=16&&m.clips.every(clip=>record(clip)&&Object.keys(clip).every(key=>['id','audioPath','sourceStartMs','sourceEndMs','volume','fadeInMs','fadeOutMs'].includes(key))&&typeof clip.id==='string'&&clip.id.trim().length>0&&clip.id.length<=200&&isRuntimeAudioPath(clip.audioPath)&&clip.sourceStartMs!==undefined&&clip.sourceEndMs!==undefined&&sourceRange(clip)&&number(clip.volume,1)&&number(clip.fadeInMs,10000)&&number(clip.fadeOutMs,10000))&&new Set(m.clips.map(clip=>clip.id)).size===m.clips.length;
 if(m.action!=='play'&&(m.sourceStartMs!==undefined||m.sourceEndMs!==undefined))return false;
 if(m.action==='stop'?!number(m.fadeOutMs,10000):m.action==='play'?!sourceRange(m)||!isRuntimeAudioPath(m.audioPath)||!number(m.volume,1)||typeof m.loop!=='boolean'||!number(m.fadeInMs,10000)||!number(m.fadeOutMs,10000):m.action!=='maintain')return false;
 return true;
}

/** Versioned shared catalogue files, separate from restored private audio resources. */
export type RuntimeServiceAudioResource=Readonly<{path:string;sha256:string;mime:string;data:string}>;
export function isRuntimeServiceAudioPath(value:unknown):value is string {
 return typeof value==='string'&&value.length<=500&&/^assets\/audio\/cc0\/[a-z0-9_-]+\/v[1-9][0-9]*\/[a-z0-9_-]+\.(ogg|mp3|wav)$/.test(value);
}
function musicPaths(cue:RuntimeMusic|undefined):string[]{return cue?.action==='play'?[cue.audioPath]:cue?.action==='sequence'?cue.clips.map(clip=>clip.audioPath):[];}
export function runtimeAudioPaths(audio:RuntimeAudio|undefined):string[]{
 const paths=[...musicPaths(audio?.music),...musicPaths(audio?.ambience),...(audio?.sounds.map(sound=>sound.audioPath)??[])];
 return [...new Set(paths)];
}
export function runtimeServiceAudioPaths(audio:RuntimeAudio|undefined):string[]{return runtimeAudioPaths(audio).filter(isRuntimeServiceAudioPath);}
export function isRuntimeServiceAudioResources(value:unknown,paths:readonly string[]):value is readonly RuntimeServiceAudioResource[]|undefined {
 if(value===undefined)return true;
 if(!Array.isArray(value)||value.length>42)return false;
 let total=0;const seen=new Set<string>();
 return value.every(row=>{
  if(!record(row)||!isRuntimeServiceAudioPath(row.path)||!paths.includes(row.path)||seen.has(row.path)||typeof row.sha256!=='string'||! /^[a-f0-9]{64}$/.test(row.sha256)||typeof row.data!=='string'||!row.data.length||row.data.length>12000000||! /^[A-Za-z0-9+/]*={0,2}$/.test(row.data))return false;
  const mime=row.path.endsWith('.ogg')?'audio/ogg':row.path.endsWith('.mp3')?'audio/mpeg':'audio/wav';
  seen.add(row.path);total+=row.data.length;return row.mime===mime&&total<=32000000;
 });
}
