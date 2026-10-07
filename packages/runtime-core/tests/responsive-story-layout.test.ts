import { describe, expect, it } from 'vitest';
import { representativeStories } from '@knolstory/compatibility';
import { resolveAsset } from '@knolstory/asset-registry';
import { compileStoryScene, createBlankStoryProject, patchStoryLine, resolveBackgroundRect, resolveStoryViewport } from '../src/index';
const child = 'onggojib.character.child-pixel';
const adult = 'onggojib.character.classic-master';
const source = () => patchStoryLine(createBlankStoryProject({ id: 'responsive', chapterId: 'chapter', lineId: 'cut' }), 'cut', {
  type:'dialogue',speaker:'left',speakerName:'아이',
  backgroundId: 'rabbit-turtle.background.rabbit-turtle-bg-grassland',
  stageComposition: { leftActors: [{ key: 'child', assetId: child }], rightActors: [{ key: 'adult', assetId: adult }] },
});

describe('responsive story framing', () => {
  it('uses actual viewport aspect ratios and rejects invalid measurements', () => {
    expect(resolveStoryViewport({ width: 390, height: 844 })).toMatchObject({ width: 720, height: 1558 });
    expect(resolveStoryViewport({ width: 1000, height: 450 })).toMatchObject({ width: 1280, height: 576 });
    for (const viewport of [{ width: 0, height: 400 }, { width: 400, height: NaN }]) expect(() => resolveStoryViewport(viewport)).toThrow();
  });
  it('covers portrait backgrounds and moves the crop toward the authored focal point', () => {
    const centered = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover');
    const right = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover', { x: 1, y: .5 });
    expect(centered.height).toBe(1600); expect(centered.width).toBeGreaterThan(720);
    expect(right.x + right.width).toBeCloseTo(720); expect(right.x).toBeLessThan(centered.x);
    const contained = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'contain');
    expect(contained.width).toBe(720); expect(contained.y).toBeGreaterThan(0);
    expect(() => resolveBackgroundRect({ width: 0, height: 900 }, { width: 720, height: 1600 }, 'cover')).toThrow();
    expect(() => resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover', { x: 2, y: .5 })).toThrow();
  });
  it.each([{ width: 390, height: 844 }, { width: 1000, height: 450 }, { width: 1280, height: 720 }])('keeps readable mildly different people and lower-body textbox overlap in $width × $height', viewport => {
    const project = source();
    const before = JSON.stringify(project);
    const scene = compileStoryScene(project, 'cut', 1, { mode: 'edit', viewport });
    expect(scene.viewportVersion).toBe(1);
    expect(scene.textboxRect).toBeDefined();
    expect(scene.dialogueStyle!.fontSize * viewport.width / scene.width).toBeGreaterThanOrEqual(16);
    const painted = scene.actors.map((actor, i) => {
      const geometry = resolveAsset(i === 0 ? child : adult)!.geometry!;
      expect(actor.rect.y + actor.rect.height * geometry.top).toBeGreaterThanOrEqual(8);
      expect(actor.rect.y + actor.rect.height * geometry.bottom).toBeGreaterThan(scene.textboxRect!.y);
      return actor.rect.height * (geometry.bottom - geometry.top);
    });
    if(viewport.width<viewport.height){expect(scene.actors.map(a=>a.id)).toEqual(['child']);}
    else {expect(painted[0] / painted[1]).toBeGreaterThan(.9); expect(painted[0] / painted[1]).toBeLessThan(1);}
    expect(scene.background!.rect).toBeDefined();
    expect(JSON.stringify(project)).toBe(before);
  });
  it.each(representativeStories)('compiles all inherited cuts of $label in portrait and wide displays', ({project}) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      for (const line of project.lines) {
        const scene = compileStoryScene(project, line.id, 1, { mode: 'edit', viewport });
        expect(scene.actors.every(a => Number.isFinite(a.rect.x) && Number.isFinite(a.rect.y))).toBe(true);
        expect(scene.textboxRect!.y + scene.textboxRect!.height).toBeLessThanOrEqual(scene.height);
        expect(scene.dialogue.text).toBe(line.text);
      }
    }
  }, 15000);
  it('keeps enough text height at small landscape preview sizes', () => {
    const view = resolveStoryViewport({ width: 390, height: 176 });
    expect(view.textboxRect.height).toBeGreaterThan(view.dialogueStyle.fontSize * 3 + 48);
    expect(view.textboxRect.y + view.textboxRect.height).toBeLessThan(view.height);
  });
  it('preserves manual anchors, center intent, original facing and empty POV cuts', () => {
    const project = patchStoryLine(source(), 'cut', { stageComposition: { leftActors: [{ key: 'adult', assetId: adult, position: 'center', facing: 'original', xAnchor: 40, scaleMultiplier: .8 }], rightActors: [] } });
    const scene = compileStoryScene(project, 'cut', 1, { mode: 'edit', viewport: { width:1280,height:720 } });
    expect(scene.actors[0].rect.x + scene.actors[0].rect.width / 2).toBeCloseTo(scene.width * .4);
    expect(scene.actors[0].flipX).toBe(false);
    const empty = patchStoryLine(project, 'cut', { stageComposition: { leftActors: [], rightActors: [] }, speakerName: '나' });
    expect(compileStoryScene(empty, 'cut', 2, { mode: 'edit', viewport: { width: 390, height: 844 } }).actors).toEqual([]);
  });
});

it('fills the responsive viewport for scene artwork and allows explicit whole-picture framing',()=>{
 const p=representativeStories.find(story=>story.id==='onggojib')!.project,l=p.lines[0];
 const first=compileStoryScene(p,l.id,1,{mode:'edit',viewport:{width:390,height:844}});
 expect(first.background?.fit).toBe('cover');
 const next={...p,lines:p.lines.map(line=>line.id===l.id?{...line,presentation:{...line.presentation,backgroundFit:'contain' as const}}:line)};
 expect(compileStoryScene(next,l.id,2,{mode:'edit',viewport:{width:390,height:844}}).background?.fit).toBe('contain');
});

it('keeps preview dialogue readable when a preset is fitted into a smaller actual display',()=>{
 const viewport=resolveStoryViewport({width:1280,height:720},{width:374,height:440});
 expect(viewport.dialogueStyle.fontSize*Math.min(374/viewport.width,440/viewport.height)).toBeGreaterThanOrEqual(17);
});
