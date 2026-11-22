import { describe, expect, it } from 'vitest';
import { facetLabel, facetValues, matchesAssetSearch, resolveAsset, searchAssets, type Asset, type FacetKey } from '../src';
import { STORY_USE_LABELS } from '../src/asset-query';

const backgrounds = searchAssets({ type: 'background' });
const characters = searchAssets({ type: 'character' });
const tagged = (assets: readonly Asset[], key: FacetKey) =>
  assets.filter(asset => facetValues(asset, key).some(value => value.trim().length > 0));

describe('reviewed picker tag coverage', () => {
  it('keeps most selectable backgrounds searchable by time and mood', () => {
    expect(backgrounds.length).toBeGreaterThanOrEqual(72);
    expect(tagged(backgrounds, 'locations')).toHaveLength(backgrounds.length);
    expect(tagged(backgrounds, 'spaces')).toHaveLength(backgrounds.length);
    for (const key of ['times', 'moods'] as const) {
      expect(tagged(backgrounds, key).length / backgrounds.length, key).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('covers selectable character scene uses and distinguishes applicable emotional and action tags', () => {
    expect(characters.length).toBeGreaterThanOrEqual(412);
    const uses = Object.keys(STORY_USE_LABELS);
    for (const asset of characters) {
      const sceneUses = facetValues(asset, 'storyUses');
      expect(sceneUses.length, asset.id).toBeGreaterThan(0);
      expect(sceneUses.every(value => uses.includes(value)), asset.id).toBe(true);
    }
    for (const key of ['expressions', 'actions'] as const) {
      expect(tagged(characters, key).length / characters.length, key).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('finds reviewed weather, mood and action tags with Korean phrases', () => {
    const examples = [
      ['rabbit-turtle.background.rabbit-turtle-bg-shore', 'weather', '맑음', '맑은'],
      ['rabbit-turtle.background.rabbit-turtle-bg-shore', 'moods', '평온함', '고요한'],
      ['rabbit-turtle.character.classic-riding', 'actions', '타기', '탑승'],
      ['rabbit-turtle.character.classic-rabbit-leap', 'actions', '뛰어내리기', '뛰어 내리는'],
      ['seonnyeo.character.classic-woodcutter-fallen', 'actions', '넘어지기', '넘어짐'],
    ] as const;
    for (const [id, key, value, alias] of examples) {
      const asset = resolveAsset(id)!;
      expect(facetValues(asset, key)).toContain(value);
      expect(matchesAssetSearch(asset, alias), id + '/' + alias).toBe(true);
    }
  });

  it('matches the displayed scene-use and background-filter counts', () => {
    for (const [type, assets, keys] of [
      ['background', backgrounds, ['spaces', 'times', 'seasons', 'weather', 'moods', 'states']],
      ['character', characters, ['storyUses']],
    ] as const) {
      for (const key of keys) {
        const values = [...new Set(assets.flatMap(asset => facetValues(asset, key)))];
        expect(values.length, key).toBeGreaterThan(0);
        for (const value of values) {
          const expected = assets.filter(asset => facetValues(asset, key).includes(value));
          expect(searchAssets({ type, filters: { [key]: [value] } }).map(asset => asset.id), key + '/' + value)
            .toEqual(expected.map(asset => asset.id));
          expect(expected.every(asset => matchesAssetSearch(asset, facetLabel(key, value))), key + '/' + value).toBe(true);
        }
      }
    }
  });
});
