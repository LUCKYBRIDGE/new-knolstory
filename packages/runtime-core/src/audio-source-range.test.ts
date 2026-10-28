import {it,expect} from 'vitest';
import {isStoryAudio,isStoryMusicCue,type StoryProject} from '@knolstory/story-domain';
import {isRuntimeAudio} from '@knolstory/runtime-contract';
import {compileStoryAudio} from './audio';
it('validates non-destructive source ranges without changing ordinary cue values',()=>{
 expect(isStoryAudio({sounds:[{id:'s',assetId:'x',sourceStartMs:0,sourceEndMs:1250}]})).toBe(true);expect(isStoryMusicCue({action:'play',assetId:'x',sourceStartMs:300,sourceEndMs:1400})).toBe(true);expect(isStoryMusicCue({action:'play',assetId:'x',sourceStartMs:300})).toBe(true);
 for(const patch of [{sourceStartMs:-1},{sourceStartMs:.5},{sourceEndMs:0},{sourceStartMs:100,sourceEndMs:100},{sourceStartMs:200,sourceEndMs:100},{sourceEndMs:86400001},{sourceEndMs:NaN}])expect(isStoryMusicCue({action:'play',assetId:'x',...patch})).toBe(false);
 expect(isStoryMusicCue({action:'maintain',sourceStartMs:0})).toBe(false);expect(isStoryMusicCue({action:'stop',sourceEndMs:1000})).toBe(false);
});
it('compiles exact source bounds separately from scheduled cut delay and preserves path inheritance',()=>{
 const project={chapters:[{id:'ch'}],lines:[{id:'a',chapterId:'ch',audio:{music:{action:'play',assetId:'m',sourceStartMs:500,sourceEndMs:2000},sounds:[{id:'s',assetId:'s',delayMs:300,sourceStartMs:100,sourceEndMs:900}]}},{id:'b',chapterId:'ch'}]} as unknown as StoryProject,resolver=()=>({runtimePath:'assets/audio/test.wav'}),before=JSON.stringify(project);const first=compileStoryAudio(project,'a',resolver),next=compileStoryAudio(project,'b',resolver,['a','b']);expect(first.music).toMatchObject({sourceStartMs:500,sourceEndMs:2000});expect(first.sounds[0]).toMatchObject({delayMs:300,sourceStartMs:100,sourceEndMs:900});expect(next.music).toEqual(first.music);expect(isRuntimeAudio(first)).toBe(true);expect(isRuntimeAudio({...first,music:{...first.music,sourceEndMs:100}})).toBe(false);expect(JSON.stringify(project)).toBe(before);
});
