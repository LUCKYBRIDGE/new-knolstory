/** Additive document audio v1: asset IDs remain portable, paths belong to Runtime Core. */
export type StoryMusicCue = { action: 'maintain' } | { action: 'stop'; fadeOutMs?: number }
  | { action: 'play'; assetId: string; volume?: number; loop?: boolean; fadeInMs?: number; fadeOutMs?: number };
export type StorySoundCue = { id: string; assetId: string; volume?: number; delayMs?: number };
export type StoryAudio = { music?: StoryMusicCue; ambience?: StoryMusicCue; sounds?: StorySoundCue[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const number = (v: unknown, max: number) => v === undefined || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const id = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
export function isStoryMusicCue(v: unknown): v is StoryMusicCue {
  if (!record(v)) return false;
  if (v.action === 'maintain') return keys(v, ['action']);
  if (v.action === 'stop') return keys(v, ['action','fadeOutMs']) && number(v.fadeOutMs,10000);
  return v.action === 'play' && keys(v,['action','assetId','volume','loop','fadeInMs','fadeOutMs']) && id(v.assetId)
    && number(v.volume,1) && number(v.fadeInMs,10000) && number(v.fadeOutMs,10000) && (v.loop === undefined || typeof v.loop === 'boolean');
}
export function isStoryAudio(v: unknown): v is StoryAudio {
  if (!record(v) || !keys(v,['music','ambience','sounds']) || v.music !== undefined && !isStoryMusicCue(v.music) || v.ambience !== undefined && !isStoryMusicCue(v.ambience)) return false;
  if (v.sounds === undefined) return true;
  return Array.isArray(v.sounds) && v.sounds.length <= 4 && v.sounds.every(s => record(s) && keys(s,['id','assetId','volume','delayMs'])
    && id(s.id) && id(s.assetId) && number(s.volume,1) && number(s.delayMs,10000)) && new Set(v.sounds.map(s=>s.id)).size === v.sounds.length;
}
