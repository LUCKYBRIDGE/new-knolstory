import { describe,it,expect } from 'vitest';
import fixtures from './stage-layout-baseline.json';
import viewFixtures from './stage-view-baseline.json';
import { resolveStageLayout,type LayoutActor } from '../src/stage-layout';
import { stageShouldMirror,stageCharacterScale,stageSharedActor,stagePlacementClass } from '../src/stage-view';
describe('canonical baseline stage geometry',()=>{
  it.each(fixtures)('preserves frozen geometry and authored placement for $input.width / $input.actors.length actors',({input,expected})=>{
    const before=JSON.stringify(input);
    const actual=resolveStageLayout(input.width,input.baseHeight,input.actors as LayoutActor[],input.contentWidth,input.maxVisibleHeight);
    const {actors:oldActors,...oldRails}=expected;
    const {actors:newActors,...newRails}=actual;
    expect(newRails).toEqual(oldRails);
    const automatic=input.actors.every(actor=>!('xAnchor' in actor)&&!('centered' in actor&&actor.centered));
    const sharedFitChanged=automatic&&newActors.some((actor,index)=>actor.height!==oldActors[index].height);
    if(sharedFitChanged){
      // A crowded automatic cast now shares one fit across both sides. Compare
      // to the source geometry, not the historical per-side shrink snapshot.
      const sourceHeights=input.actors.map(actor=>Math.min(input.baseHeight*actor.scale,input.maxVisibleHeight/(actor.geometry.bottom-actor.geometry.top)));
      const sharedFactor=newActors[0].height/sourceHeights[0];
      expect(sharedFactor).toBeGreaterThan(0);expect(sharedFactor).toBeLessThanOrEqual(1);
      for(const [index,actor] of newActors.entries()){
        const previous=oldActors[index],source=input.actors[index];
        const {height:_oh,width:_ow,visibleWidth:_ov,effectiveScale:_os,bottom:_ob,x:_ox,visibleLeft:_ol,visibleRight:_or,...oldIdentity}=previous;
        const {height:_nh,width:_nw,visibleWidth:_nv,effectiveScale:_ns,bottom:_nb,x:_nx,visibleLeft:_nl,visibleRight:_nr,...newIdentity}=actor;
        expect(newIdentity).toEqual(oldIdentity);
        expect(actor.height/sourceHeights[index]).toBeCloseTo(sharedFactor,8);
        expect(actor.width/actor.height).toBeCloseTo(source.geometry.width/source.geometry.height,8);
        expect(actor.effectiveScale).toBeCloseTo(actor.height/input.baseHeight,8);
        expect(actor.visibleWidth).toBeCloseTo(actor.width*(actor.alphaRight-actor.alphaLeft),8);
        expect(actor.bottom).toBeCloseTo(Math.max(24,Math.ceil(input.baseHeight*.06))-actor.height*(1-source.geometry.bottom),8);
        expect(actor.visibleLeft).toBeGreaterThanOrEqual(actual.safeLeft-1e-8);
        expect(actor.visibleRight).toBeLessThanOrEqual(actual.safeRight+1e-8);
      }
      expect(JSON.stringify(input)).toBe(before);return;
    }
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
  it.each(viewFixtures)('preserves baseline facing/framing and uses canvas-relative child stature for $id', fixture => {
    expect(stagePlacementClass(fixture.id)).toBe(fixture.placement);
    // Frozen baseline remains historical evidence. Current child artwork encodes
    // stature in a shared canvas, including three source-preserving padded
    // derivatives. A runtime child multiplier would shrink that artwork twice.
    const canvasRelativeChildren=new Set([
      'onggojib.character.child-pixel','onggojib.character.second-child-hesitant-pixel',
      'onggojib.character.second-child-pixel','onggojib.character.youngest-child-cautious-pixel',
      'onggojib.character.youngest-child-pixel','creative.character.onggojib-child-wave',
      'creative.character.onggojib-child-listening','rabbit-turtle.character.turtle-child-unified-720x900',
      'rabbit-turtle.character.turtle-child-flashback','seonnyeo.character.classic-children',
    ]);
    expect(stageCharacterScale(fixture.id)).toBe(canvasRelativeChildren.has(fixture.id)?1:fixture.scale);
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
