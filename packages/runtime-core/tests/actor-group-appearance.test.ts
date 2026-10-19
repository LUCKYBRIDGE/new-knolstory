import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import {compileStoryScene} from '../src/story-runtime';

it('compiles appearance for every actor on a side while preserving authored placements',()=>{
 const source=getRepresentativeStory('onggojib').project,line=source.lines[0];
 const stageComposition={leftActors:[{key:'left-one',assetId:'onggojib.character.classic-master',xAnchor:20,scaleMultiplier:.9},{key:'left-two',assetId:'onggojib.character.classic-master',xAnchor:42,scaleMultiplier:1.1,facing:'left' as const}],rightActors:[{key:'right-one',assetId:'onggojib.character.classic-master',xAnchor:70},{key:'right-two',assetId:'onggojib.character.classic-master',xAnchor:89}]};
 const placement={left:{xAnchor:37,scaleMultiplier:1.2,facing:'right' as const},right:{xAnchor:73}};
 const baseline={...source,lines:source.lines.map(cut=>cut.id===line.id?{...cut,speaker:'narration' as const,inheritActors:false,stageComposition,presentation:{actors:placement}}:cut)};
 const project={...baseline,lines:baseline.lines.map(cut=>cut.id===line.id?{...cut,presentation:{actors:{left:{...placement.left,opacity:0,spectral:true,emphasis:'dim' as const},right:{...placement.right,opacity:.7,spectral:false,emphasis:'normal' as const}}}}:cut)};
 const before=JSON.stringify(project),scene=compileStoryScene(project,line.id,1),original=compileStoryScene(baseline,line.id,1);
 expect(scene.actors.filter(actor=>actor.id.startsWith('left')).map(actor=>[actor.opacity,actor.spectral,actor.emphasis])).toEqual([[0,true,'dim'],[0,true,'dim']]);
 expect(scene.actors.filter(actor=>actor.id.startsWith('right')).map(actor=>[actor.opacity,actor.spectral,actor.emphasis])).toEqual([[.7,false,'normal'],[.7,false,'normal']]);
 expect(scene.actors.map(actor=>[actor.id,actor.rect,actor.flipX])).toEqual(original.actors.map(actor=>[actor.id,actor.rect,actor.flipX]));expect(JSON.stringify(project)).toBe(before);
});

it('keeps legacy placement overrides first-only and group appearance on subsequent actors',async()=>{
 const {mergeActorOverride}=await import('../src/actor-overrides'),actor={key:'free',assetId:'character:test'},side={xAnchor:37,scaleMultiplier:1.2,facing:'left' as const,opacity:0,spectral:false,emphasis:'normal' as const};
 expect(mergeActorOverride(actor,0,side)).toEqual({...side,...actor});
 expect(mergeActorOverride(actor,1,side)).toEqual({opacity:0,spectral:false,emphasis:'normal',...actor});
 expect(mergeActorOverride(actor,1)).toEqual(actor);expect(mergeActorOverride({...actor,xAnchor:19},0,side).xAnchor).toBe(19);expect(side.xAnchor).toBe(37);expect(mergeActorOverride({...actor,facing:'original'},0,side).facing).toBe('original');
});
