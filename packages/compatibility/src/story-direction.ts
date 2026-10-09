import type { StoryAudio, StoryActorMotion, StoryEffectCue, StoryPresentation, StoryProject, StoryTransition } from '@knolstory/story-domain';
import directionData from './story-direction-data.json';

export type StoryDirectionProfile = 'original' | 'nolstory';
export type ChapterDirection = Readonly<{
  chapterIds: readonly string[];
  music: string;
  ambience?: string;
  intent: string;
  evidence: string;
  transition?: StoryTransition['type'];
}>;
export type EventDirection = Readonly<{
  lineId: string;
  evidence: string;
  intent: string;
  sound?: string;
  music?: string;
  ambience?: string;
  ambienceStop?: boolean;
  effect?: StoryEffectCue['type'];
  actorKey?: string;
  motion?: StoryActorMotion['type'];
  fromXAnchor?: number;
}>;
export type WorkDirection = Readonly<{
  projectId: string;
  profile: StoryDirectionProfile;
  chapters: readonly ChapterDirection[];
  events: readonly EventDirection[];
}>;
export const storyDirectionManifest = directionData as { version: 1; works: WorkDirection[] };

function chapterAudio(cue: ChapterDirection, profile: StoryDirectionProfile, existing?: StoryAudio): StoryAudio {
  return {
    ...existing,
    music: existing?.music ?? { action: 'play', assetId: cue.music, loop: true, volume: profile === 'original' ? .26 : .32, fadeInMs: 700, fadeOutMs: 500 },
    ...(cue.ambience && !existing?.ambience ? { ambience: { action: 'play' as const, assetId: cue.ambience, loop: true, volume: profile === 'original' ? .19 : .23, fadeInMs: 700, fadeOutMs: 500 } } : {}),
    ...(!cue.ambience && !existing?.ambience ? { ambience: { action: 'stop' as const, fadeOutMs: 500 } } : {}),
  };
}
function eventAudio(existing: StoryAudio | undefined, events: readonly EventDirection[], profile: StoryDirectionProfile): StoryAudio | undefined {
  const sounds = events.filter(e => e.sound).map(e => ({ id: `direction:${e.lineId}:${e.sound}`, assetId: e.sound!, volume: profile === 'original' ? .42 : .5 }));
  const music = events.find(e => e.music)?.music;
  const ambience = events.find(e => e.ambience)?.ambience;
  const ambienceStop = events.some(e => e.ambienceStop);
  const state = {...existing, ...(ambienceStop && !existing?.ambience ? {ambience:{action:'stop' as const,fadeOutMs:500}} : {}), ...(music && !existing?.music ? {music:{action:'play' as const,assetId:music,loop:true,volume:profile==='original'?.26:.32,fadeInMs:700,fadeOutMs:500}} : {}), ...(ambience && !existing?.ambience ? {ambience:{action:'play' as const,assetId:ambience,loop:true,volume:.2,fadeInMs:700,fadeOutMs:500}} : {})};
  if (!sounds.length) return music || ambience || ambienceStop ? state : existing;
  // Preserve authored cue order and the boundary's four simultaneous sound limit.
  const current = existing?.sounds ?? [];
  const additions = sounds.filter(s => !current.some(c => c.id === s.id || c.assetId === s.assetId)).slice(0, Math.max(0, 4 - current.length));
  return additions.length ? { ...state, sounds: [...current, ...additions] } : music || ambience || ambienceStop ? state : existing;
}
function eventPresentation(existing: StoryPresentation | undefined, events: readonly EventDirection[], profile: StoryDirectionProfile, chapter?: ChapterDirection): StoryPresentation | undefined {
  const effects: StoryEffectCue[] = events.filter(e => e.effect).map(e => ({ id: `direction:${e.lineId}:${e.effect}`, type: e.effect!, intensity: 'soft', trigger: 'scene-enter', scope: 'cut', repeat: 'once', target: {kind:'background'} }));
  const current = existing?.effects ?? [];
  const additions = effects.filter(e => !current.some(c => c.id === e.id || c.type === e.type)).slice(0, Math.max(0, 3 - current.length));
  const transition = !existing?.transition && chapter?.transition ? { type:chapter.transition,durationMs:profile==='original'?350:450,mode:'auto' as const } : undefined;
  if (!additions.length && !transition) return existing;
  return {...existing,...(additions.length ? {effects:[...current,...additions]} : {}),...(transition ? {transition} : {})};
}

/** Applied only when opening an official catalog work. Never run on every saved user edit. */
export function enhanceExistingStory(project: StoryProject, profile?: StoryDirectionProfile): StoryProject {
  const work = storyDirectionManifest.works.find(w => w.projectId === project.id && (!profile || w.profile === profile));
  if (!work) return project;
  const chapterCues = new Map(work.chapters.flatMap(c => c.chapterIds.map(id => [id,c] as const)));
  const firstLines = new Map(project.chapters.map(c => [c.id, project.lines.filter(l=>l.chapterId===c.id).sort((a,b)=>a.order-b.order)[0]?.id]));
  return {
    ...project,
    chapters:project.chapters.map(c => {const cue=chapterCues.get(c.id);return cue ? {...c,audio:chapterAudio(cue,work.profile,c.audio)} : c;}),
    lines:project.lines.map(line => {
      const events=work.events.filter(e=>e.lineId===line.id);
      const audio=eventAudio(line.audio,events,work.profile);
      const presentation=eventPresentation(line.presentation,events,work.profile,firstLines.get(line.chapterId)===line.id?chapterCues.get(line.chapterId):undefined);
      const motionEvents=events.filter(e=>e.motion && e.actorKey);
      const stage=line.stageComposition;
      const stageComposition=stage && motionEvents.length ? {...stage,...Object.fromEntries((['leftActors','rightActors'] as const).map(side=>[side,stage[side].map(actor=>{
        const cue=motionEvents.find(e=>e.actorKey===actor.key);
        return cue && !actor.motion ? {...actor,motion:{type:cue.motion!,durationMs:work.profile==='original'?350:450,...(cue.fromXAnchor!==undefined?{fromXAnchor:cue.fromXAnchor}:{})}} : actor;
      })]))} : stage;
      return {...line,...(audio ? {audio} : {}),...(presentation ? {presentation} : {}),...(stageComposition ? {stageComposition} : {})};
    }),
  };
}
