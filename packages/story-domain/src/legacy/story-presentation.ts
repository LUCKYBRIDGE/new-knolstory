import { STORY_EFFECTS, isStorySceneEffect } from './story-scene-effect';
import type { StoryLine } from './story-data';

export const PRESENTATION_EFFECTS = [...STORY_EFFECTS, { type: 'flash', label: '하얀 섬광', hint: '빛나는 순간' }, { type: 'screen-crack', label: '현실 균열', hint: '현실이 갈라지는 순간' }] as const;
export const PRESENTATION_LOOKS = [{type:'flashback',label:'회상'}, {type:'fractured-reality',label:'균열된 현실'}] as const;
export const PRESENTATION_TRANSITIONS = [{type:'fade-black',label:'암전'}, {type:'white-fade',label:'하얀 전환'}, {type:'dissolve',label:'부드러운 전환'}, {type:'perspective-blackout',label:'시점 전환'}] as const;
export type StoryEffectTarget = {kind:'screen'|'background'} | {kind:'actor';actorKey:string};
export type StoryEffectCue = {target?:StoryEffectTarget;scope?:'cut'|'following';repeat?:'once'|'loop';periodMs?:number; id?: string; type: typeof PRESENTATION_EFFECTS[number]['type']; intensity?: 'soft'|'normal'|'strong'; trigger?: 'scene-enter'|'with-dialogue'|'after-delay'; delayMs?: number };
export type StoryVisualLook = {type: typeof PRESENTATION_LOOKS[number]['type']; intensity?: StoryEffectCue['intensity']};
export type StoryTransition = {type: typeof PRESENTATION_TRANSITIONS[number]['type']; durationMs?: number; mode?: 'auto'|'confirm'; cue?: string; title?: string; description?: string; actionLabel?: string};
export type StoryActorOverride = {xAnchor?: number; scaleMultiplier?: number; facing?: 'left'|'right'; opacity?: number; emphasis?: 'normal'|'dim'; spectral?: boolean};
export type StoryPresentation = {clearFollowingEffects?:boolean;backgroundFit?: "cover"|"contain";backgroundFocal?: {x:number;y:number};effects?: StoryEffectCue[]; look?: StoryVisualLook; transition?: StoryTransition; actors?: {left?: StoryActorOverride; right?: StoryActorOverride}; presetOrigin?: string};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const number = (v: unknown, min: number, max: number) => v === undefined || typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const choice = (v: unknown, choices: readonly unknown[]) => v === undefined || choices.includes(v);
const intensity = (v: unknown) => choice(v, ['soft','normal','strong']);
export function isStoryPresentation(v: unknown): v is StoryPresentation {
  if (!object(v) || !keys(v, ['effects','look','transition','actors','presetOrigin','backgroundFocal','backgroundFit','clearFollowingEffects'])) return false;
  if(v.clearFollowingEffects!==undefined && typeof v.clearFollowingEffects!=='boolean')return false;
  if(!choice(v.backgroundFit,['cover','contain']))return false;
  if(v.backgroundFocal !== undefined && (!object(v.backgroundFocal) || !keys(v.backgroundFocal,['x','y']) || typeof v.backgroundFocal.x !== 'number' || typeof v.backgroundFocal.y !== 'number' || !number(v.backgroundFocal.x,0,1) || !number(v.backgroundFocal.y,0,1)))return false;
  if (v.presetOrigin !== undefined && (typeof v.presetOrigin !== 'string' || v.presetOrigin.length > 200)) return false;
  if (v.effects !== undefined && (!Array.isArray(v.effects) || v.effects.length > 3 || !v.effects.every(e => object(e) && keys(e,['id','type','intensity','trigger','delayMs','target','scope','repeat','periodMs']) && choice(e.scope,['cut','following']) && choice(e.repeat,['once','loop']) && number(e.periodMs,400,10000) && (e.target===undefined || object(e.target) && (e.target.kind==='actor' ? keys(e.target,['kind','actorKey']) && typeof e.target.actorKey==='string' && e.target.actorKey.length>0 && e.target.actorKey.length<=200 : keys(e.target,['kind']) && ['screen','background'].includes(e.target.kind as string))) && PRESENTATION_EFFECTS.some(x=>x.type===e.type) && intensity(e.intensity) && choice(e.trigger,['scene-enter','with-dialogue','after-delay']) && number(e.delayMs,0,10000) && (e.id===undefined || typeof e.id==='string')))) return false;
  if (v.look !== undefined && (!object(v.look) || !keys(v.look,['type','intensity']) || !PRESENTATION_LOOKS.some(x=>x.type=== (v.look as Record<string, unknown>).type) || !intensity(v.look.intensity))) return false;
  if (v.transition !== undefined) {
    const t=v.transition;
    if (!object(t) || !keys(t,['type','durationMs','mode','cue','title','description','actionLabel']) || !PRESENTATION_TRANSITIONS.some(x=>x.type===t.type) || !number(t.durationMs,0,10000) || !choice(t.mode,['auto','confirm']) || !['cue','title','description','actionLabel'].every(k=>t[k]===undefined || typeof t[k]==='string' && (t[k] as string).length<=2000)) return false;
  }
  if (v.actors !== undefined) {
    if (!object(v.actors) || !keys(v.actors,['left','right'])) return false;
    for (const a of Object.values(v.actors)) if (a !== undefined && (!object(a) || !keys(a,['xAnchor','scaleMultiplier','facing','opacity','emphasis','spectral']) || !number(a.xAnchor,0,100) || !number(a.scaleMultiplier,.8,1.25) || !number(a.opacity,0,1) || !choice(a.facing,['left','right']) || !choice(a.emphasis,['normal','dim']) || (a.spectral!==undefined && typeof a.spectral!=='boolean'))) return false;
  }
  return true;
}
/** Sorted keys produce stable publication fingerprints; cue order remains meaningful. */
export function normalizePresentation(p: StoryPresentation): StoryPresentation {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : object(v) ? Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,sort(v[k])])) : v;
  return sort(p) as StoryPresentation;
}
export function migrateLegacyPresentation(value: unknown): StoryPresentation | undefined {
  return isStorySceneEffect(value) ? {effects:[{...value}]} : undefined;
}
export function canonicalizeProjectPresentation<T extends {lines: StoryLine[]}>(project: T): T {
  return {...project, lines: project.lines.map(line => {
    const legacy = line as StoryLine & {effect?: unknown};
    const {effect, ...rest} = legacy;
    if(effect !== undefined && !isStorySceneEffect(effect)) throw new Error('Invalid legacy scene effect.');
    if(line.presentation !== undefined && !isStoryPresentation(line.presentation)) throw new Error('Invalid presentation.');
    if(effect !== undefined && line.presentation !== undefined) throw new Error('Conflicting presentation and legacy effect.');
    const p = line.presentation ?? migrateLegacyPresentation(effect);
    return {...rest, ...(p ? {presentation: normalizePresentation(p)} : {})};
  })};
}
export const PRESENTATION_PRESETS: {id:string; label:string; presentation:StoryPresentation}[] = [
  {id:'impact',label:'💥 충격',presentation:{effects:[{type:'shake',intensity:'normal'}]}},
  {id:'flashback',label:'🌫 회상',presentation:{look:{type:'flashback',intensity:'normal'}}},
  {id:'blackout',label:'🌑 암전',presentation:{transition:{type:'fade-black',durationMs:900,mode:'auto'}}},
  {id:'reality-crack',label:'⚡ 현실 균열',presentation:{effects:[{type:'flash',intensity:'normal'},{type:'screen-crack',intensity:'strong',delayMs:80},{type:'shake',intensity:'strong',delayMs:120}],look:{type:'fractured-reality',intensity:'normal'}}},
  {id:'perspective',label:'👁 시점 전환',presentation:{transition:{type:'perspective-blackout',durationMs:900,mode:'confirm',cue:'시점 전환',title:'다른 눈으로 보는 이야기'}}},
];
export function presentationLabel(p?: StoryPresentation) {
  return p ? [p.effects?.map(e=>PRESENTATION_EFFECTS.find(x=>x.type===e.type)?.label).join(' + '), PRESENTATION_LOOKS.find(x=>x.type===p.look?.type)?.label, PRESENTATION_TRANSITIONS.find(x=>x.type===p.transition?.type)?.label, p.actors && '인물 배치'].filter(Boolean).join(' · ') || '없음' : '없음';
}
/** Only look is copied. Explicit selection can cross branches; sequential range cannot. */
export function presentationRange(lines: StoryLine[], lineId: string, count: number): string[] | undefined {
  const index=lines.findIndex(l=>l.id===lineId);
  const selected=lines.slice(index,index+count);
  if(index<0 || selected.some((l,i)=>i<selected.length-1 && l.flow)) return undefined;
  return selected.map(l=>l.id);
}
