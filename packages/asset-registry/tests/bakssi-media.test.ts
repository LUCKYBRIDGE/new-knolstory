import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
import {isRuntimeImagePath} from '../../runtime-contract/src';
import {getBackgroundSize, isSelectableAsset, resolveAsset, searchAssets} from '../src';

type Generation = {
  id: string;
  role: 'character' | 'stage' | 'cover' | 'page' | 'creative';
  source: string;
  sourceSha256: string;
  output: string;
  outputSha256: string;
  dimensions: {width: number; height: number};
};
const generation = JSON.parse(readFileSync('assets/source/bakssi/generation.json', 'utf8')) as {assets: Generation[]};
const digest = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

it('resolves each reviewed Bakssi illustration, original and versioned runtime derivative', () => {
  const {assets} = generation;
  const ids = assets.map(row => row.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toEqual(expect.arrayContaining(['bakssi-character-bakssi', 'bakssi-shortstory-cover', 'bakssi-shortstory-page-01']));

  for (const row of assets) {
    const asset = resolveAsset(row.id);
    expect(asset, row.id).toBeDefined();
    expect(asset!.metadata.storyPackIds).toEqual(['bakssi']);
    expect(asset!.revision).toBe(row.outputSha256);
    expect(digest(row.source)).toBe(row.sourceSha256);
    expect(digest(row.output)).toBe(row.outputSha256);
    expect(isRuntimeImagePath(asset!.runtimePath)).toBe(row.role !== 'page' && row.role !== 'creative');

    if (row.role === 'character') {
      expect(asset!.geometry).toMatchObject({width: 800, height: 1200, bottom: .96});
      expect(isSelectableAsset(asset)).toBe(true);
    } else {
      expect(getBackgroundSize(row.id)).toEqual(row.dimensions);
      expect(asset!.metadata.containsCharacters).toBe(row.role !== 'stage');
      expect(isSelectableAsset(asset)).toBe(row.role === 'stage');
      expect(isSelectableAsset(asset, true)).toBe(true);
      if (row.role === 'creative') {
        expect(asset!.metadata.shortStoryCollection).toBe('creative');
        expect(asset!.metadata.storyRelation).toBe('independent-event');
      }
    }
  }

  expect(isRuntimeImagePath('assets/bakssi-v1/bakssi-stage-unreviewed.webp')).toBe(false);
  expect(searchAssets({type: 'character', filters: {storyPackIds: ['bakssi']}, search: '박씨'}))
    .toEqual(expect.arrayContaining([resolveAsset('bakssi-character-bakssi')]));
});
