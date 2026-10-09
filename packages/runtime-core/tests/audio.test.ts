import { describe, expect, it } from 'vitest';
import { getRepresentativeStory } from '@knolstory/compatibility';
import { parseStoryDocument, serializeStoryDocument } from '@knolstory/story-domain';
import { isRuntimeAudio } from '@knolstory/runtime-contract';
import { compileStoryAudio, audioPreviewPath } from '../src/audio';
const resolve = (id: string) => id === 'music' || id === 'sound' ? { runtimePath: `assets/audio/${id}.ogg` } : undefined;
function project() {
 const p = getRepresentativeStory('rabbit').project;
 return {...p, chapters:p.chapters.map((c,i)=>i===0?{...c,audio:{music:{action:'play' as const,assetId:'music',volume:.4,loop:true,fadeInMs:600}}}:c),lines:p.lines.slice(0,3).map((l,i)=>({...l,audio:i===1?{music:{action:'stop' as const,fadeOutMs:400},sounds:[{id:'knock',assetId:'sound',delayMs:250}]}:undefined}))};
}
describe('authored audio and resolved runtime cues',()=>{
 it('round trips chapter defaults, cut stop and delayed sound without touching the source',()=>{
  const p=project(), d=getRepresentativeStory('rabbit'), candidate={...d,project:p};
  const before=JSON.stringify(candidate); const loaded=parseStoryDocument(serializeStoryDocument(candidate));
  expect(loaded.ok).toBe(true); if(loaded.ok)expect(loaded.document.project).toEqual(p);
  expect(JSON.stringify(candidate)).toBe(before);
 });
 it('rejects malformed audio at both document boundaries',()=>{
  const d=getRepresentativeStory('rabbit');
  for(const audio of [null,{music:{action:'play',assetId:''}},{music:{action:'play',assetId:'music',volume:2}},{sounds:[{id:'x',assetId:'sound'},{id:'x',assetId:'sound'}]},{sounds:[{id:'x',assetId:'sound',delayMs:-1}]}]) {
   expect(parseStoryDocument({...d,project:{...d.project,lines:[{...d.project.lines[0],audio}]}}).ok).toBe(false);
   expect(parseStoryDocument({...d,project:{...d.project,chapters:[{...d.project.chapters[0],audio}]}}).ok).toBe(false);
  }
 });
 it('compiles defaults, path inherited stop, backward restoration and current cut sounds',()=>{
  const p=project(), [a,b,c]=p.lines;
  expect(compileStoryAudio(p,a.id,resolve).music).toMatchObject({action:'play',audioPath:'assets/audio/music.ogg',volume:.4,loop:true});
  expect(compileStoryAudio(p,c.id,resolve,[a.id,b.id,c.id]).music).toEqual({action:'stop',fadeOutMs:400});
  expect(compileStoryAudio(p,a.id,resolve,[a.id]).music.action).toBe('play');
  expect(compileStoryAudio(p,b.id,resolve).sounds).toEqual([{id:'knock',audioPath:'assets/audio/sound.ogg',volume:1,delayMs:250}]);
  expect(compileStoryAudio(p,c.id,resolve,[a.id,b.id,c.id]).sounds).toEqual([]);
 });
 it('fails missing/unsafe assets, unknown path ids, invalid runtime settings',()=>{
  const p=project(); expect(()=>compileStoryAudio(p,p.lines[0].id,()=>undefined)).toThrow('자산');
  expect(()=>compileStoryAudio(p,p.lines[0].id,()=>({runtimePath:'https://outside.test/a.ogg'}))).toThrow('경로');
  expect(()=>compileStoryAudio(p,p.lines[0].id,resolve,['missing'])).toThrow();
  const valid=compileStoryAudio(p,p.lines[0].id,resolve); expect(isRuntimeAudio(valid)).toBe(true);
  for(const value of [null,{...valid,version:2},{...valid,music:{action:'play',audioPath:'../../a.ogg',volume:1,loop:true,fadeInMs:0,fadeOutMs:0}},{...valid,sounds:[{id:'x',audioPath:'assets/audio/sound.ogg',volume:1,delayMs:10001}]}])expect(isRuntimeAudio(value)).toBe(false);
 });
});

it('keeps branch music through merges, chapter changes and explicit maintain',()=>{
 const p=project(), [a,b,c]=p.lines;
 const branch={...p,lines:p.lines.map(l=>l.id===b.id?{...l,audio:{music:{action:'play' as const,assetId:'sound',loop:false,volume:0,fadeInMs:0,fadeOutMs:10000}}}:l.id===c.id?{...l,audio:{music:{action:'maintain' as const}}}:l)};
 expect(compileStoryAudio(branch,c.id,resolve,[a.id,b.id,c.id]).music).toMatchObject({action:'play',audioPath:'assets/audio/sound.ogg',loop:false,volume:0});
 expect(compileStoryAudio({...branch,chapters:branch.chapters.map(ch=>({...ch,audio:undefined})),lines:branch.lines.map(l=>({...l,audio:undefined}))},a.id,resolve).music).toEqual({action:'stop',fadeOutMs:0});
 expect(()=>compileStoryAudio(p,'missing',resolve)).toThrow();
 expect(()=>compileStoryAudio(p,a.id,resolve,[b.id])).toThrow('현재 컷');
});

it("builds chapter-local direct preview paths",()=>{const p=project();expect(audioPreviewPath(p,p.lines[1].id)).toEqual(p.lines.slice(0,2).map(l=>l.id));expect(()=>audioPreviewPath(p,"missing")).toThrow();});

it('runs chapter sounds once on chapter entry alongside up to four cut sounds',()=>{
 const p=project(),[a,b]=p.lines;
 const next={...p,chapters:p.chapters.map(c=>({...c,audio:{...c.audio,sounds:Array.from({length:4},(_,i)=>({id:'chapter'+i,assetId:'sound'}))}})),lines:p.lines.map(l=>l.id===a.id?{...l,audio:{sounds:Array.from({length:4},(_,i)=>({id:'cut'+i,assetId:'sound'}))}}:l)};
 const entering=compileStoryAudio(next,a.id,resolve,[a.id]);expect(entering.sounds).toHaveLength(8);expect(isRuntimeAudio(entering)).toBe(true);
 const saved=parseStoryDocument(serializeStoryDocument({...getRepresentativeStory('rabbit'),project:next}));expect(saved.ok).toBe(true);if(saved.ok)expect(saved.document.project.chapters[0].audio?.sounds).toEqual(next.chapters[0].audio?.sounds);
 expect(compileStoryAudio(next,b.id,resolve,[a.id,b.id]).sounds).toHaveLength(1);
});

it('restores independent ambience from the actual visited path without changing music',()=>{
 const p=project(),[a,b,c]=p.lines;
 const next={...p,chapters:p.chapters.map(ch=>({...ch,audio:{...ch.audio,ambience:{action:'play' as const,assetId:'sound',volume:.2}}})),lines:p.lines.map(l=>l.id===b.id?{...l,audio:{...l.audio,ambience:{action:'stop' as const,fadeOutMs:500}}}:l)};
 const first=compileStoryAudio(next,a.id,resolve,[a.id]);
 expect(first.ambience).toMatchObject({action:'play',audioPath:'assets/audio/sound.ogg',volume:.2,loop:true});
 expect(first.music.action).toBe('play');
 expect(compileStoryAudio(next,c.id,resolve,[a.id,b.id,c.id]).ambience).toEqual({action:'stop',fadeOutMs:500});
 expect(compileStoryAudio(next,c.id,resolve,[a.id,c.id]).ambience?.action).toBe('play');
 const doc={...getRepresentativeStory('rabbit'),project:next};
 const loaded=parseStoryDocument(serializeStoryDocument(doc));expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.document.project).toEqual(next);
 for(const ambience of [null,{action:'play',assetId:''},{action:'play',assetId:'sound',volume:2}])expect(parseStoryDocument({...doc,project:{...next,chapters:[{...next.chapters[0],audio:{ambience}}]}}).ok).toBe(false);
});
