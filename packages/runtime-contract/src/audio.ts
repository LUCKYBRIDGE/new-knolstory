export type RuntimeMusic = Readonly<{action:'maintain'} | {action:'stop';fadeOutMs:number}
  | {action:'play';audioPath:string;volume:number;loop:boolean;fadeInMs:number;fadeOutMs:number}>;
export type RuntimeSound = Readonly<{id:string;audioPath:string;volume:number;delayMs:number}>;
export type RuntimeAudio = Readonly<{version:1;sessionId?:string;music:RuntimeMusic;ambience?:RuntimeMusic;sounds:readonly RuntimeSound[]}>;
const record = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const number = (v:unknown,max:number) => typeof v==='number' && Number.isFinite(v) && v>=0 && v<=max;
export function isRuntimeAudioPath(v:unknown):v is string {
 return typeof v==='string' && v.length<=500 && /^assets\/audio\/(?:story-score\/)?[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(wav|ogg|mp3)$/.test(v);
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
