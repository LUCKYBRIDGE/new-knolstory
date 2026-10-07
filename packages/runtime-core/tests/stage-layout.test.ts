import { describe,it,expect } from 'vitest';
import fixtures from './stage-layout-baseline.json';
import viewFixtures from './stage-view-baseline.json';
import { resolveStageLayout,type LayoutActor } from '../src/stage-layout';
import { stageShouldMirror,stageCharacterScale,stageSharedActor,stagePlacementClass } from '../src/stage-view';
import { resolveAsset } from '@knolstory/asset-registry';
describe('canonical baseline stage geometry',()=>{
  it.each(fixtures)('preserves frozen geometry and authored placement for $input.width / $input.actors.length actors',({input,expected})=>{
    const before=JSON.stringify(input);
    const actual=resolveStageLayout(input.width,input.baseHeight,input.actors as LayoutActor[],input.contentWidth,input.maxVisibleHeight);
    const {actors:oldActors,...oldRails}=expected;
    const {actors:newActors,...newRails}=actual;
    expect(newRails).toEqual(oldRails);
    newActors.forEach((actor,index)=>{
      const previous=oldActors[index];
      // REFINE: default silhouette centers spread outward. Frozen legacy JSON remains evidence;
      // dimensions, alpha geometry, scale and manual/centered placement still match exactly.
      if(actor.xAnchor!==undefined||actor.centered){expect(actor).toEqual(previous);return;}
      const {x:oldX,visibleLeft:oldLeft,visibleRight:oldRight,...oldGeometry}=previous;
      const {x:newX,visibleLeft:newLeft,visibleRight:newRight,...newGeometry}=actor;
      expect(newGeometry).toEqual(oldGeometry);
      const hasManualNeighbor=input.actors.some(a=>a.side===actor.side&&'xAnchor' in a);
      if(hasManualNeighbor){expect([newX,newLeft,newRight]).toEqual([oldX,oldLeft,oldRight]);return;}
      if(actor.side==='left')expect(newLeft+newRight).toBeLessThanOrEqual(oldLeft+oldRight+1e-8);
      else expect(newLeft+newRight).toBeGreaterThanOrEqual(oldLeft+oldRight-1e-8);
    });
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each(viewFixtures)('preserves baseline facing/framing and refines small-person readability for $id', fixture => {
    expect(stagePlacementClass(fixture.id)).toBe(fixture.placement);
    const asset=resolveAsset(fixture.id);
    const small=asset?.group==='어린 자라'||asset?.story==='옹고집전'&&['아이','둘째 아이','막내 아이'].includes(asset.group)||asset?.story==='선녀와 나무꾼'&&asset.group==='두 아이';
    const scale=small?.98*Math.min(1.15,Math.max(1,.82/((asset?.geometry?.bottom??.82)-(asset?.geometry?.top??0)))):fixture.scale;
    expect(stageCharacterScale(fixture.id)).toBe(scale);
    expect(stageSharedActor(fixture.id)).toBe(fixture.shared);
    expect(stageShouldMirror(fixture.id, 'left')).toBe(fixture.leftMirrored);
    expect(stageShouldMirror(fixture.id, 'right')).toBe(fixture.rightMirrored);
  });
  it('rejects invalid dimensions and more than four actors',()=>{
    expect(()=>resolveStageLayout(0,100,[])).toThrow(RangeError);
    expect(()=>resolveStageLayout(100,100,Array.from({length:5},()=>fixtures.find(fixture=>fixture.input.actors.length===1)!.input.actors[0]) as LayoutActor[])).toThrow(RangeError);
  });
  it('preserves facing, mounted, shared and framing exceptions',()=>{
    expect(stageShouldMirror('heungbu.character.swallow','right')).toBe(true);
    expect(stageShouldMirror('unknown','right')).toBe(false);
    expect(stageCharacterScale('seonnyeo.character.classic-woodcutter-riding-horse')).toBe(1.4);
    expect(stageSharedActor('seonnyeo.character.classic-woodcutter-in-bucket')).toBe(true);
    expect(stagePlacementClass('seonnyeo.character.classic-woodcutter-in-bucket')).toBe('framing-full');
  });
});
