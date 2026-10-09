import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {resetActorPlacement} from '../src/reset-actor-placement';
import {compileStoryScene} from '../src/story-runtime';
import {createStoryDocument,serializeStoryDocument,parseStoryDocument} from '@knolstory/story-domain';
it('resets both direct placement and legacy side override through a saved file',()=>{
 const p=getRepresentativeStory('onggojib').project,l=p.lines[0];
 const project={...p,lines:p.lines.map(line=>line.id===l.id?{...line,inheritActors:false,stageComposition:{leftActors:[{key:'a',assetId:'onggojib.character.classic-master',xAnchor:30,scaleMultiplier:.8,position:'center' as const}],rightActors:[]},presentation:{actors:{left:{xAnchor:70,scaleMultiplier:1.2,facing:'left' as const,emphasis:'dim' as const}}}}:line)};
 const next=resetActorPlacement(project,l.id,'a');
 const loaded=parseStoryDocument(serializeStoryDocument(createStoryDocument({project:next,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'test'})));
 expect(loaded.ok).toBe(true);if(!loaded.ok)return;
 expect(loaded.document.project.lines[0].presentation?.actors?.left).toEqual({emphasis:'dim'});
 expect(loaded.document.project.lines[0].stageComposition?.leftActors[0].xAnchor).toBeUndefined();
 expect(compileStoryScene(next,l.id,1)).toEqual(compileStoryScene(loaded.document.project,l.id,1));
 expect(()=>resetActorPlacement(project,l.id,'missing')).toThrow();
});
