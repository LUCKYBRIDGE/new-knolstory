import { isStoryBranchCondition, type StoryBranchCondition } from './story-branch-condition';
/** Additive document audio v1: asset IDs remain portable, paths belong to Runtime Core. */
export type StoryMusicSequenceClip = {id:string;assetId:string;sourceStartMs?:number;sourceEndMs:number;volume?:number;fadeInMs?:number;fadeOutMs?:number};
export type StoryMusicClip = StoryMusicSequenceClip;
export type StoryMusicSequence = {action:'sequence';id:string;clips:StoryMusicSequenceClip[];endLineId?:string;branchCondition?:StoryBranchCondition};
export type StoryMusicCue = StoryMusicSequence | { action: 'maintain' } | { action: 'stop'; fadeOutMs?: number }
  | { action: 'play'; assetId: string; sourceStartMs?:number; sourceEndMs?:number; endLineId?:string; branchCondition?:StoryBranchCondition; volume?: number; loop?: boolean; fadeInMs?: number; fadeOutMs?: number };
export type StorySoundCue = { id: string; assetId: string; sourceStartMs?:number; sourceEndMs?:number; branchCondition?:StoryBranchCondition; volume?: number; delayMs?: number };
export type StoryAudio = { music?: StoryMusicCue; ambience?: StoryMusicCue; sounds?: StorySoundCue[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const number = (v: unknown, max: number) => v === undefined || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const sourceRange=(value:Record<string,unknown>)=>[value.sourceStartMs,value.sourceEndMs].every(time=>time===undefined||typeof time==='number'&&Number.isInteger(time)&&time>=0&&time<=86400000)&&(value.sourceEndMs===undefined||(value.sourceEndMs as number)>(value.sourceStartMs as number|undefined??0));
const id = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
export function isStoryMusicCue(v: unknown): v is StoryMusicCue {
  if (!record(v)) return false;
  if (v.action === 'maintain') return keys(v, ['action']);
  if (v.action === 'stop') return keys(v, ['action','fadeOutMs']) && number(v.fadeOutMs,10000);
  if(v.action==='sequence')return keys(v,['action','id','clips','endLineId','branchCondition'])&&id(v.id)&&(v.endLineId===undefined||id(v.endLineId))&&(v.branchCondition===undefined||isStoryBranchCondition(v.branchCondition))&&Array.isArray(v.clips)&&v.clips.length>=1&&v.clips.length<=16&&v.clips.every(clip=>record(clip)&&keys(clip,['id','assetId','sourceStartMs','sourceEndMs','volume','fadeInMs','fadeOutMs'])&&id(clip.id)&&id(clip.assetId)&&clip.sourceEndMs!==undefined&&sourceRange(clip)&&number(clip.volume,1)&&number(clip.fadeInMs,10000)&&number(clip.fadeOutMs,10000))&&new Set(v.clips.map(clip=>clip.id)).size===v.clips.length;
  return v.action === 'play' && keys(v,['action','assetId','sourceStartMs','sourceEndMs','volume','loop','fadeInMs','fadeOutMs','endLineId','branchCondition']) && id(v.assetId) && sourceRange(v)
    && (v.branchCondition === undefined || isStoryBranchCondition(v.branchCondition)) && (v.endLineId===undefined || id(v.endLineId)) && number(v.volume,1) && number(v.fadeInMs,10000) && number(v.fadeOutMs,10000) && (v.loop === undefined || typeof v.loop === 'boolean');
}
export function isStoryAudio(v: unknown): v is StoryAudio {
  if (!record(v) || !keys(v,['music','ambience','sounds']) || v.music !== undefined && !isStoryMusicCue(v.music) || v.ambience !== undefined && !isStoryMusicCue(v.ambience)) return false;
  if (v.sounds === undefined) return true;
  return Array.isArray(v.sounds) && v.sounds.length <= 4 && v.sounds.every(s => record(s) && keys(s,['id','assetId','sourceStartMs','sourceEndMs','volume','delayMs','branchCondition'])
    && (s.branchCondition === undefined || isStoryBranchCondition(s.branchCondition)) && sourceRange(s) && id(s.id) && id(s.assetId) && number(s.volume,1) && number(s.delayMs,10000)) && new Set(v.sounds.map(s=>s.id)).size === v.sounds.length;
}
