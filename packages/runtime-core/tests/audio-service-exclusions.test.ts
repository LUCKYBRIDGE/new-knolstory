import {it,expect,vi} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {compileStoryAudio,excludedStoryAudio} from '../src/audio';
import {parseStoryDocument,serializeStoryDocument} from '@knolstory/story-domain';
vi.mock('@knolstory/asset-registry',async importOriginal=>({...await importOriginal<object>(),resolveExcludedAudioAsset:(id:string)=>id.includes('denied-')?{id,name:'Denied fixture',source:'test',reason:'unconfirmed'}:undefined}));
it('keeps excluded authored IDs while stopping channels and never resolving them for playback',()=>{
 const original=getRepresentativeStory('rabbit');const id='audio:sound:denied-effect';
 const project={...original.project,chapters:original.project.chapters.map(c=>({...c,audio:undefined})),lines:original.project.lines.map((line,i)=>i?line:{...line,audio:{music:{action:'play' as const,assetId:'audio:music:denied-music'},ambience:{action:'play' as const,assetId:'audio:music:denied-ambience'},sounds:[{id:'old',assetId:id}]}})};
 const before=JSON.stringify(project);let resolved=0;
 expect(compileStoryAudio(project,project.lines[0].id,()=>{resolved++;return {runtimePath:'assets/audio/chime.wav'};})).toEqual({version:1,music:{action:'stop',fadeOutMs:0},ambience:{action:'stop',fadeOutMs:0},sounds:[]});
 expect(resolved).toBe(0);expect(excludedStoryAudio(project).map(a=>a.id).sort()).toEqual([id,'audio:music:denied-music','audio:music:denied-ambience'].sort());
 expect(JSON.stringify(project)).toBe(before);
 const parsed=parseStoryDocument(serializeStoryDocument({...original,project}));expect(parsed.ok).toBe(true);
 if(parsed.ok)expect(parsed.document.project).toEqual(project);
});
it('fails the entire ordered channel closed before resolving any clip when one asset is excluded',()=>{
 const original=getRepresentativeStory('rabbit');
 const queue={action:'sequence' as const,id:'queue',clips:[{id:'ok',assetId:'audio:music:forest',sourceEndMs:1000},{id:'denied',assetId:'audio:music:denied-queue',sourceEndMs:1500}]};
 const project={...original.project,chapters:original.project.chapters.map(c=>({...c,audio:undefined})),lines:original.project.lines.map((line,i)=>i?line:{...line,audio:{music:queue,ambience:queue}})};
 const before=structuredClone(project);let resolved=0;
 const audio=compileStoryAudio(project,project.lines[0].id,()=>{resolved++;throw Error('must not resolve');});
 expect(audio.music).toEqual({action:'stop',fadeOutMs:0});expect(audio.ambience).toEqual({action:'stop',fadeOutMs:0});expect(resolved).toBe(0);
 expect(excludedStoryAudio(project).map(asset=>asset.id)).toEqual(['audio:music:denied-queue']);expect(project).toEqual(before);
});
