import { describe, expect, it } from 'vitest';
import { ASSET_CATALOG, resolveAsset } from '@knolstory/asset-registry';
import { resolveStageLayout, type LayoutActor } from '../src/stage-layout';
import { stageCharacterScale } from '../src/stage-view';

const actor = (key: string, side: LayoutActor['side'], extra: Partial<LayoutActor> = {}): LayoutActor => ({
  key, side, geometry: resolveAsset('rabbit-turtle.character.dragonking-command')!.geometry!, scale: .72, ...extra,
});
const layout = (actors: readonly LayoutActor[]) => resolveStageLayout(1280, 400, actors, 980, 500);
const center = (a: ReturnType<typeof layout>['actors'][number]) => (a.visibleLeft + a.visibleRight) / 2;

describe('wider automatic character placement', () => {
  it('opens more central space for actual catalog silhouettes without changing their size', () => {
    const input = [actor('left', 'left'), actor('right', 'right')];
    const before = JSON.stringify(input);
    const placed = layout(input).actors;
    expect(center(placed[0])).toBeCloseTo(287.2);
    expect(center(placed[1])).toBeCloseTo(992.8);
    expect(center(placed[1]) - center(placed[0])).toBeGreaterThan(980 * (.76 - .24));
    expect(placed.map(a => a.height)).toEqual([288, 288]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('spreads both same-side pairs toward their outer rails', () => {
    const placed = layout([actor('l1', 'left'), actor('l2', 'left'), actor('r1', 'right'), actor('r2', 'right')]).actors;
    expect((center(placed[0]) + center(placed[1])) / 2).toBeLessThan(150 + 980 * .25);
    expect((center(placed[2]) + center(placed[3])) / 2).toBeGreaterThan(150 + 980 * .75);
    expect(placed[1].visibleRight).toBeLessThan(placed[2].visibleLeft);
  });

  it('keeps authored anchors, scales and explicitly centered actors', () => {
    const placed = layout([actor('manual-left', 'left', { xAnchor: 40, scale: .9 }), actor('manual-right', 'right', { xAnchor: 60, scale: .8 })]).actors;
    expect(placed[0].x + placed[0].width / 2).toBeCloseTo(512);
    expect(placed[1].x + placed[1].width / 2).toBeCloseTo(768);
    expect(placed.map(a => a.effectiveScale)).toEqual([.9, .8]);
    expect(center(layout([actor('shared', 'left', { centered: true })]).actors[0])).toBe(640);
  });

  it.each([1, 2, 4])('keeps %i automatic actual-asset actors within visible safe rails', count => {
    const resolved = layout(Array.from({ length: count }, (_, i) => actor(`actor-${i}`, i < Math.ceil(count / 2) ? 'left' : 'right')));
    for (const a of resolved.actors) {
      expect(a.visibleLeft).toBeGreaterThanOrEqual(resolved.safeLeft - 1e-8);
      expect(a.visibleRight).toBeLessThanOrEqual(resolved.safeRight + 1e-8);
    }
  });

  it('contains every catalog silhouette in single and four-actor layouts without mutating asset data', () => {
    const catalogBefore = JSON.stringify(ASSET_CATALOG);
    for (const asset of ASSET_CATALOG.filter(a => a.type === 'character' && a.geometry)) {
      for (const count of [1, 4]) {
        const actors = Array.from({ length: count }, (_, i) => actor(`${asset.id}-${i}`, i < Math.ceil(count / 2) ? 'left' : 'right', {
          geometry: asset.geometry!, scale: stageCharacterScale(asset.id), mirrored: i % 2 === 1,
        }));
        const resolved = layout(actors);
        for (const a of resolved.actors) {
          expect(a.visibleLeft, `${asset.id}: left safe rail`).toBeGreaterThanOrEqual(resolved.safeLeft - 1e-8);
          expect(a.visibleRight, `${asset.id}: right safe rail`).toBeLessThanOrEqual(resolved.safeRight + 1e-8);
          expect(a.height * (a.geometry.bottom - a.geometry.top)).toBeLessThanOrEqual(500 + 1e-8);
        }
      }
    }
    expect(JSON.stringify(ASSET_CATALOG)).toBe(catalogBefore);
  });
});
