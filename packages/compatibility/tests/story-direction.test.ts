import { describe, expect, it } from 'vitest';
import { parseStoryDocument, isStoryAudio, isStoryPresentation, type StoryProject } from '@knolstory/story-domain';
import { compileStoryAudio } from '../../runtime-core/src/audio';
import { resolveAudioAsset } from '../../asset-registry/src/audio';
import { enhanceExistingStory, storyDirectionManifest } from '../src/story-direction';
import seonnyeo from '../../../tests/fixtures/stories/seonnyeo.json';
import heungbu from '../../../tests/fixtures/stories/heungbu.json';
import onggojib from '../../../tests/fixtures/stories/onggojib.json';
import rabbit from '../../../tests/fixtures/stories/rabbit.json';
import seonnyeoClassic from '../../../tests/fixtures/stories/seonnyeo-classic.json';
import heungbuClassic from '../../../tests/fixtures/stories/heungbu-classic.json';
import onggojibClassic from '../../../tests/fixtures/stories/onggojib-classic.json';
import rabbitClassic from '../../../tests/fixtures/stories/rabbit-classic.json';

const fixtures = [seonnyeo, heungbu, onggojib, rabbit, seonnyeoClassic, heungbuClassic, onggojibClassic, rabbitClassic];
function project(raw: unknown): StoryProject {
  const parsed = parseStoryDocument(raw,{savedAt:'2026-10-08T00:00:00.000Z',appVersion:'direction-test'});
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.document.project;
}
/** Remove only newly authored fields; layout, flow and the entire original presentation stay exact. */
function undoDirection(enhanced: StoryProject, baseline: StoryProject): StoryProject {
  return { ...enhanced, chapters: enhanced.chapters.map((c, i) => { const { audio: _audio, ...rest } = c; return { ...rest, ...(baseline.chapters[i].audio ? {audio: baseline.chapters[i].audio} : {}) }; }), lines: enhanced.lines.map((l, i) => { const { audio: _audio, presentation: _presentation, stageComposition: _stage, ...rest } = l; const old = baseline.lines[i]; return { ...rest, ...(old.audio ? {audio: old.audio} : {}), ...(old.presentation ? {presentation: old.presentation} : {}), ...(old.stageComposition ? {stageComposition: old.stageComposition} : {}) }; }) };
}

describe('existing works editorial direction', () => {
  it('covers all eight existing works and every chapter explicitly', () => {
    expect(storyDirectionManifest.works).toHaveLength(8);
    expect(storyDirectionManifest.works.flatMap(w => w.chapters.flatMap(c => c.chapterIds))).toHaveLength(242);
    for (const work of storyDirectionManifest.works) {
      const refs=[...work.chapters.flatMap(c=>[c.music,c.ambience]),...work.events.flatMap(e=>[e.music,e.ambience,e.sound])].filter((id):id is string=>!!id);
      for(const id of refs)expect(resolveAudioAsset(id),id).toBeDefined();
      expect(work.events.some(e=>e.sound)).toBe(true);
    }
  });
  it.each(fixtures)('$id adds cues without changing story content, IDs, routes, stage or authored effects', raw => {
    const baseline = project(raw);
    const snapshot = structuredClone(baseline);
    const enhanced = enhanceExistingStory(baseline);
    expect(baseline).toEqual(snapshot);
    expect(undoDirection(enhanced, baseline)).toEqual(baseline);
    expect(enhanceExistingStory(enhanced)).toEqual(enhanced);
    expect(enhanced.chapters.every(c => c.audio?.music?.action === 'play')).toBe(true);
    expect(enhanced.chapters.every(c => isStoryAudio(c.audio))).toBe(true);
    expect(enhanced.lines.every(l => !l.audio || isStoryAudio(l.audio))).toBe(true);
    expect(enhanced.lines.every(l => !l.presentation || isStoryPresentation(l.presentation))).toBe(true);
    for (const line of enhanced.lines) {
      const old = baseline.lines.find(l=>l.id===line.id)!;
      if (old.stageComposition) {
        const stripped = {...line.stageComposition, leftActors:line.stageComposition!.leftActors.map((a,i)=>{const {motion:_motion,...rest}=a; return {...rest,...(old.stageComposition!.leftActors[i].motion ? {motion:old.stageComposition!.leftActors[i].motion} : {})};}),rightActors:line.stageComposition!.rightActors.map((a,i)=>{const {motion:_motion,...rest}=a;return {...rest,...(old.stageComposition!.rightActors[i].motion ? {motion:old.stageComposition!.rightActors[i].motion} : {})};})};
        expect(stripped).toEqual(old.stageComposition);
      }
    }
    expect(parseStoryDocument(enhanced,{savedAt:'2026-10-08T00:00:00.000Z',appVersion:'direction-test'}).ok).toBe(true);
    const manifest = storyDirectionManifest.works.find(w => w.projectId === baseline.id)!;
    expect(new Set(manifest.chapters.flatMap(c => c.chapterIds))).toEqual(new Set(baseline.chapters.map(c => c.id)));
    for (const cue of manifest.events) {
      const line = baseline.lines.find(l => l.id === cue.lineId);
      expect(line, cue.lineId).toBeDefined();
      expect(line!.text).toContain(cue.evidence);
    }
  });
  it.each(fixtures)('$id establishes independent music and ambience at every chapter entry', raw => {
    const enhanced=enhanceExistingStory(project(raw));
    for(const chapter of enhanced.chapters) {
      const first=enhanced.lines.filter(l=>l.chapterId===chapter.id).sort((a,b)=>a.order-b.order)[0];
      const current=compileStoryAudio(enhanced,first.id,resolveAudioAsset,[first.id]);
      expect(current.music.action).toBe('play');
      if(current.music.action==='play')expect(current.music.audioPath).toContain('assets/audio/story-score/');
      const unrelated=enhanced.lines.find(l=>l.chapterId!==chapter.id)!;
      expect(compileStoryAudio(enhanced,first.id,resolveAudioAsset,[unrelated.id,first.id])).toEqual(current);
    }
  });
  it('actor entrance and exit cues follow actual baseline stage identity changes', () => {
    for (const raw of fixtures) {
      const baseline=project(raw);
      const work=storyDirectionManifest.works.find(w=>w.projectId===baseline.id)!;
      for (const cue of work.events.filter(e=>e.motion)) {
        const index=baseline.lines.findIndex(l=>l.id===cue.lineId);
        const actors=(line:typeof baseline.lines[number]|undefined)=>[...(line?.stageComposition?.leftActors??[]),...(line?.stageComposition?.rightActors??[])];
        expect(actors(baseline.lines[index]).some(a=>a.key===cue.actorKey),cue.lineId).toBe(true);
        if(cue.motion==='fade-in') expect(actors(baseline.lines[index-1]).some(a=>a.key===cue.actorKey)).toBe(false);
        if(cue.motion==='fade-out') expect(actors(baseline.lines[index+1]).some(a=>a.key===cue.actorKey)).toBe(false);
      }
    }
  });
  it('preserves user-authored audio, transitions, effects and actor motion', () => {
    const baseline = project(seonnyeo);
    const first = baseline.lines[0];
    const custom = { ...baseline, chapters: baseline.chapters.map(c => ({...c, audio:{music:{action:'stop' as const}}})), lines:baseline.lines.map(l => ({...l, audio:{sounds:[{id:'user',assetId:'custom'}]}, presentation:{...l.presentation, transition:{type:'white-fade' as const,durationMs:1500}}, stageComposition:l.stageComposition ? {...l.stageComposition,leftActors:l.stageComposition.leftActors.map(a=>({...a,motion:{type:'move' as const,durationMs:1200}}))} : undefined})) };
    const enhanced = enhanceExistingStory(custom);
    expect(enhanced.chapters.every(c=>c.audio?.music?.action==='stop')).toBe(true);
    expect(enhanced.lines.find(l=>l.id===first.id)?.presentation?.transition).toEqual(custom.lines[0].presentation.transition);
    expect(enhanced.lines.every(l=>l.audio?.sounds?.some(s=>s.id==='user'))).toBe(true);
    expect(enhanced.lines.every(l=>l.stageComposition?.leftActors.every(a=>a.motion?.durationMs===1200)??true)).toBe(true);
  });
  it('leaves unrelated or mismatched-profile projects unchanged', () => {
    const baseline = project(seonnyeo);
    expect(enhanceExistingStory({...baseline,id:'user-project'})).toEqual({...baseline,id:'user-project'});
    expect(enhanceExistingStory(baseline,'original')).toEqual(baseline);
  });
});
