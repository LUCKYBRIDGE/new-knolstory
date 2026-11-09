import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ASSET_CATALOG, getBackgroundSize, isSelectableAsset, resolveAsset, assetCharacterIds, matchesAssetSearch } from '../src/index';
describe('baseline asset registry', () => {
  it('resolves every stable ID with byte-verified revision and character geometry', () => {
    expect(ASSET_CATALOG.filter(a=>!a.metadata.layeredStoryAsset&&!a.metadata.generatedWeatherAsset&&!a.metadata.shortStoryCollection)).toHaveLength(421);
    expect(ASSET_CATALOG.filter(a=>a.metadata.layeredStoryAsset)).toHaveLength(11);
    expect(ASSET_CATALOG.filter(a=>a.metadata.generatedWeatherAsset)).toHaveLength(1);
    for (const asset of ASSET_CATALOG) {
      expect(resolveAsset(asset.id)).toBe(asset);
      const bytes = readFileSync(`apps/web/public${asset.src}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.revision);
      if (asset.type === 'character') {
        expect(asset.geometry?.width).toBeGreaterThan(0);
        expect(asset.geometry?.right).toBeGreaterThan(asset.geometry?.left ?? 0);
      }
    }
  });
  it('registers picture-book illustrations from the recorded scene and actor revisions', () => {
    const creative = ASSET_CATALOG.filter(asset => asset.metadata.shortStoryCollection === 'creative' && asset.metadata.generationMethod !== 'imagegen');
    expect(creative).toHaveLength(8);
    for (const asset of creative) {
      expect(asset.metadata.kind).toBe('scene-illustration');
      expect(isSelectableAsset(asset)).toBe(false);
      expect(isSelectableAsset(asset, true)).toBe(true);
      expect(getBackgroundSize(asset.id)).toEqual({width: 1280, height: 720});
      const layers = asset.metadata.sourceLayers as {id: string; sha256: string}[];
      expect(layers.map(layer => resolveAsset(layer.id)?.type)).toEqual(['background', 'character', 'character']);
      expect(layers.map(layer => resolveAsset(layer.id)?.revision)).toEqual(layers.map(layer => layer.sha256));
    }
  });
  it('registers generated picture-book scenes with verified character references', () => {
    const generated = ASSET_CATALOG.filter(asset => asset.metadata.generationMethod === 'imagegen');
    expect(generated).toHaveLength(48);
    for (const asset of generated) {
      expect(isSelectableAsset(asset)).toBe(false);
      expect(isSelectableAsset(asset, true)).toBe(true);
      const references = asset.metadata.referenceAssets as {id: string; sha256: string}[];
      expect(references.length).toBeGreaterThanOrEqual(2);
      for (const reference of references) expect(resolveAsset(reference.id)?.revision).toBe(reference.sha256);
      const size = getBackgroundSize(asset.id)!;
      expect(size.width / size.height).toBeCloseTo(16 / 9, 2);
    }
  });
  it('makes each new mystery an independent searchable scene with known character identities', () => {
    const scenes = [
      ['rabbit-wandering-shadow', ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['rabbit-cloud-fish', ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['heungbu-floating-chest', ['heungbu.heungbu', 'heungbu.street-girl']],
      ['heungbu-midnight-footprints', ['heungbu.heungbu', 'heungbu.street-girl']],
      ['seonnyeo-winter-reflection', ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['seonnyeo-floating-steps', ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['onggojib-walking-shoes', ['onggojib.stranger', 'onggojib.guard']],
      ['onggojib-noon-night-door', ['onggojib.stranger', 'onggojib.guard']],
    ] as const;
    for (const [slug, characters] of scenes) {
      const asset = resolveAsset(`shortstory.background.creative-${slug}-v1`);
      expect(asset, slug).toBeDefined();
      if (!asset) continue;
      expect(asset.metadata.shortStoryCollection).toBe('creative');
      expect(asset.metadata.storyRelation).toBe('independent-event');
      expect(asset.metadata.generationMethod).toBe('imagegen');
      expect(assetCharacterIds(asset)).toEqual(expect.arrayContaining([...characters]));
      expect(['수상', '기이', '신기'].some(query => matchesAssetSearch(asset, query))).toBe(true);
      const references = asset.metadata.referenceAssets as {id: string; sha256: string}[];
      const referenceCharacters = references.flatMap(reference => assetCharacterIds(resolveAsset(reference.id)!));
      expect(referenceCharacters).toEqual(expect.arrayContaining([...characters]));
    }
  });
  it('offers grounded independent events across all four casts', () => {
    const scenes = [
      ['rabbit-puppet-stage', '연극', ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['heungbu-ricecake-contest', '대회', ['heungbu.heungbu', 'heungbu.street-girl']],
      ['seonnyeo-drifting-raft', '뗏목', ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['onggojib-torn-drum', '북', ['onggojib.stranger', 'onggojib.guard']],
    ] as const;
    for (const [slug, query, characters] of scenes) {
      const asset = resolveAsset(`shortstory.background.creative-${slug}-v1`);
      expect(asset, slug).toBeDefined();
      if (!asset) continue;
      expect(asset.metadata.shortStoryCollection).toBe('creative');
      expect(asset.metadata.storyRelation).toBe('independent-event');
      expect(matchesAssetSearch(asset, query)).toBe(true);
      expect(assetCharacterIds(asset)).toEqual(expect.arrayContaining([...characters]));
      const references = asset.metadata.referenceAssets as {id: string; sha256: string}[];
      expect(references.flatMap(reference => assetCharacterIds(resolveAsset(reference.id)!)))
        .toEqual(expect.arrayContaining([...characters]));
    }
  });
  it('adds reusable independent situations to mix with familiar scenes across all four casts', () => {
    const scenes = [
      ['rabbit-crossroads', ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['rabbit-spilled-basket', ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['heungbu-shared-well', ['heungbu.heungbu', 'heungbu.street-girl']],
      ['heungbu-wind-laundry', ['heungbu.heungbu', 'heungbu.street-girl']],
      ['seonnyeo-broken-bridge', ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['seonnyeo-lost-bundle', ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['onggojib-market-scales', ['onggojib.stranger', 'onggojib.guard']],
      ['onggojib-rain-shelter', ['onggojib.stranger', 'onggojib.guard']],
    ] as const;
    for (const [slug, characters] of scenes) {
      const asset = resolveAsset(`shortstory.background.creative-${slug}-v1`);
      expect(asset, slug).toBeDefined();
      if (!asset) continue;
      expect(asset.metadata).toMatchObject({
        kind: 'scene-illustration',
        shortStoryCollection: 'creative',
        storyRelation: 'independent-event',
        generationMethod: 'imagegen',
      });
      expect(isSelectableAsset(asset, true)).toBe(true);
      expect(assetCharacterIds(asset)).toEqual(expect.arrayContaining([...characters]));
      expect(matchesAssetSearch(asset, asset.displayName)).toBe(true);
      const references = asset.metadata.referenceAssets as {id: string; sha256: string}[];
      expect(references.length).toBeGreaterThanOrEqual(2);
      expect(references.flatMap(reference => assetCharacterIds(resolveAsset(reference.id)!)))
        .toEqual(expect.arrayContaining([...characters]));
    }
  });
  it('links every ordered continuation to its independent event and prior scene', () => {
    const series = [
      ['rabbit-puppet-stage', ['rabbit-puppet-plan', 'rabbit-puppet-rebuild', 'rabbit-puppet-show', 'rabbit-puppet-invite', 'rabbit-puppet-lesson', 'rabbit-puppet-children'], ['rabbit-turtle.rabbit', 'rabbit-turtle.turtle']],
      ['heungbu-ricecake-contest', ['heungbu-ricecake-restart', 'heungbu-ricecake-advice', 'heungbu-ricecake-sharing', 'heungbu-ricecake-shortage', 'heungbu-ricecake-combine', 'heungbu-ricecake-joint-stall'], ['heungbu.heungbu', 'heungbu.street-girl']],
      ['seonnyeo-drifting-raft', ['seonnyeo-raft-rope', 'seonnyeo-raft-pull', 'seonnyeo-raft-unload', 'seonnyeo-raft-route', 'seonnyeo-raft-cart', 'seonnyeo-raft-delivery'], ['seonnyeo.fairy', 'seonnyeo.woodcutter']],
      ['onggojib-torn-drum', ['onggojib-drum-ideas', 'onggojib-drum-practice', 'onggojib-drum-festival', 'onggojib-drum-newcomer', 'onggojib-drum-coach', 'onggojib-drum-parade'], ['onggojib.stranger', 'onggojib.guard']],
    ] as const;
    const idFor = (slug: string) => `shortstory.background.creative-${slug}-v1`;
    for (const [baseSlug, continuations, characters] of series) {
      const parentId = idFor(baseSlug);
      for (const [index, slug] of continuations.entries()) {
        const asset = resolveAsset(idFor(slug));
        expect(asset, slug).toBeDefined();
        if (!asset) continue;
        expect(asset.metadata).toMatchObject({
          shortStoryCollection: 'creative',
          storyRelation: 'independent-event',
          parentEventId: parentId,
          seriesId: parentId,
          sequenceOrder: index + 2,
        });
        expect(assetCharacterIds(asset)).toEqual(expect.arrayContaining([...characters]));
        expect(matchesAssetSearch(asset, resolveAsset(parentId)!.displayName)).toBe(true);
        const references = asset.metadata.referenceAssets as {id: string; sha256: string}[];
        const priorId = index === 0 ? parentId : idFor(continuations[index - 1]!);
        expect(references.map(reference => reference.id)).toEqual(expect.arrayContaining([parentId, priorId]));
        expect(references.flatMap(reference => assetCharacterIds(resolveAsset(reference.id)!)))
          .toEqual(expect.arrayContaining([...characters]));
      }
    }
  });
  it('does not resolve invented or prototype IDs', () => {
    expect(resolveAsset('missing')).toBeUndefined();
    expect(resolveAsset('__proto__')).toBeUndefined();
  });
});
