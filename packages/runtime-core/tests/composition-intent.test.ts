import { describe, expect, it } from 'vitest';
import { resolveAsset } from '@knolstory/asset-registry';
import { isStageComposition, type StageComposition } from '@knolstory/story-domain';
import { compileStoryScene, createBlankStoryProject, patchStoryLine } from '../src/index';
import { stageCharacterScale } from '../src/stage-view';

const child = 'onggojib.character.child-pixel';
const adult = 'onggojib.character.classic-master';
const blank = () => createBlankStoryProject({ id: 'intent', chapterId: 'chapter', lineId: 'cut' });
const centerX = (rect: { x: number; width: number }) => rect.x + rect.width / 2;

describe('authored composition intent', () => {
  it('accepts original facing while rejecting unknown facing values', () => {
    const composition = { leftActors: [{ key: 'child', assetId: child, facing: 'original' }], rightActors: [] };
    expect(isStageComposition(composition)).toBe(true);
    expect(isStageComposition({ ...composition, leftActors: [{ ...composition.leftActors[0], facing: 'sideways' }] })).toBe(false);
  });
  it('preserves original art orientation independently of side', () => {
    for (const side of ['left', 'right'] as const) {
      const stageComposition = { leftActors: [], rightActors: [], [side === 'left' ? 'leftActors' : 'rightActors']: [{ key: 'adult', assetId: adult, facing: 'original' }] } as unknown as StageComposition;
      const project = patchStoryLine(blank(), 'cut', { stageComposition });
      expect(compileStoryScene(project, 'cut', 1).actors[0].flipX).toBe(false);
    }
  });
  it('keeps an explicitly centered actor centered when a second actor shares its side', () => {
    const project = patchStoryLine(blank(), 'cut', { stageComposition: { leftActors: [{ key: 'child', assetId: child, position: 'center' }, { key: 'adult', assetId: adult }], rightActors: [] } });
    const actor = compileStoryScene(project, 'cut', 1).actors[0];
    const geometry = resolveAsset(child)!.geometry!;
    const left = actor.flipX ? 1 - geometry.right : geometry.left;
    const right = actor.flipX ? 1 - geometry.left : geometry.right;
    expect(actor.rect.x + actor.rect.width * (left + right) / 2).toBeCloseTo(640, 6);
  });
  it('retains explicit manual anchors ahead of center and authored size', () => {
    const composition: StageComposition = { leftActors: [{ key: 'adult', assetId: adult, position: 'center', xAnchor: 40, scaleMultiplier: .8 }], rightActors: [] };
    const project = patchStoryLine(blank(), 'cut', { stageComposition: composition });
    expect(centerX(compileStoryScene(project, 'cut', 1).actors[0].rect)).toBeCloseTo(512, 6);
    expect(project.lines[0].stageComposition).toEqual(composition);
  });
  it('keeps child body scale smaller than adult instead of equalizing heights', () => {
    const project = patchStoryLine(blank(), 'cut', { stageComposition: { leftActors: [{ key: 'child', assetId: child }], rightActors: [{ key: 'adult', assetId: adult }] } });
    const actors = compileStoryScene(project, 'cut', 1).actors;
    expect(stageCharacterScale(child)).toBeCloseTo(1.127, 6);
    expect(stageCharacterScale(adult)).toBe(1);
    const childGeometry=resolveAsset(child)!.geometry!,adultGeometry=resolveAsset(adult)!.geometry!;
    const paintedRatio=actors[0].rect.height*(childGeometry.bottom-childGeometry.top)/(actors[1].rect.height*(adultGeometry.bottom-adultGeometry.top));
    expect(paintedRatio).toBeGreaterThan(.88);expect(paintedRatio).toBeLessThan(1);
    for (const [index, id] of [child, adult].entries()) {
      const geometry = resolveAsset(id)!.geometry!;
      expect(actors[index].rect.y + actors[index].rect.height * geometry.top).toBeGreaterThanOrEqual(8);
      expect(actors[index].rect.y + actors[index].rect.height * geometry.bottom).toBeGreaterThan(510);
    }
  });
  it('keeps readable upper bodies while the textbox covers some lower body', () => {
    const project = patchStoryLine(blank(), 'cut', { stageComposition: { leftActors: [{ key: 'child', assetId: child, scaleMultiplier: .9 }], rightActors: [{ key: 'adult', assetId: adult }] } });
    const actors = compileStoryScene(project, 'cut', 1).actors;
    for (const [index, assetId] of [child, adult].entries()) {
      const geometry = resolveAsset(assetId)!.geometry!;
      const rect = actors[index].rect;
      expect(rect.y + rect.height * geometry.bottom).toBeGreaterThan(510);
      expect(rect.y + rect.height * geometry.top).toBeGreaterThanOrEqual(0);
    }
    expect(actors[0].rect.height / actors[1].rect.height).toBeCloseTo(stageCharacterScale(child) * .9, 6);
  });
  it('honors explicit actor exits over chapter defaults while dialogue and background remain independent', () => {
    const source = blank();
    const project = { ...source, chapters: source.chapters.map(chapter => ({ ...chapter, leftAssetId: adult })) };
    const inherited = patchStoryLine(project, 'cut', { inheritActors: true });
    expect(compileStoryScene(inherited, 'cut', 1).actors).toHaveLength(1);
    const empty = patchStoryLine(inherited, 'cut', { stageComposition: { leftActors: [], rightActors: [] }, type: 'dialogue', speakerName: '나', text: '나는 조용히 생각했다.', backgroundMode: 'none', backgroundId: '' });
    const scene = compileStoryScene(empty, 'cut', 2);
    expect(scene.actors).toEqual([]);
    expect(scene.background).toBeUndefined();
    expect(scene.dialogue).toEqual({ speaker: '나', text: '나는 조용히 생각했다.' });
    expect(compileStoryScene(patchStoryLine(empty, 'cut', { inheritActors: true }), 'cut', 3).actors).toHaveLength(1);
  });
});
