import {it,expect} from 'vitest';
import {representativeStories} from '../src';
import {resolveProvidedCatalogStory,refineProvidedStory} from '../src/reader-text';
import {enhanceExistingStory} from '../src/story-direction';
import {compileStoryScene} from '../../runtime-core/src/story-runtime';

it('connects all six reviewed Onggojib perspective cues without changing text, identities or routes',()=>{
 const source=representativeStories.find(work=>work.id==='onggojib')!.project;
 const previous=enhanceExistingStory(refineProvidedStory(source)),before=structuredClone(previous);
 const current=resolveProvidedCatalogStory(source,previous);
 const cues=current.lines.filter(line=>line.speakerName==='시점 전환');expect(cues).toHaveLength(6);
 for(const line of cues){expect(line.presentation?.transition).toMatchObject({type:'perspective-blackout',title:line.text});expect(compileStoryScene(current,line.id,1,{mode:'play'}).transitionOnly).toBe(true);}
 expect(current.lines.map(({presentation,...line})=>line)).toEqual(previous.lines.map(({presentation,...line})=>line));
 expect(previous).toEqual(before);
 const authored={...previous,title:'내가 고친 작품'};expect(resolveProvidedCatalogStory(source,authored)).toBe(authored);
});
