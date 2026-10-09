import { describe, expect, it } from 'vitest';
import { type Asset, ASSET_CATALOG, assetDisplayName, facetLabel, facetValues, isSelectableAsset, matchesAssetSearch, rankAssets, searchAssets } from '../src/index';

describe('legacy asset query reuse', () => {
  it('shows friendly labels rather than file names', () => { const a=ASSET_CATALOG.find(asset=>asset.id==='rabbit-turtle.background.rabbit-palace-reveal')!;expect(assetDisplayName(a)).toBe('용궁 · 토끼의 진실');expect(assetDisplayName({...a,displayName:'named',label:'label'})).toBe('named');expect(assetDisplayName({...a,displayName:'a.webp',label:'a.webp'})).toContain(a.group); });
  it('uses Korean aliases and intersects words rather than concatenating a query', () => {
    const angry = ASSET_CATALOG.find(asset => asset.id === 'heungbu.character.nolbu-angry')!;
    expect(matchesAssetSearch(angry, '놀부 화난')).toBe(true);
    expect(matchesAssetSearch(angry, '놀부 행복한')).toBe(false);
    expect(searchAssets({ type: 'character', search: '화난' }).length).toBeGreaterThan(0);
  });
  it('matches OR within a facet and AND across facets using canonical metadata', () => {
    const results = searchAssets({ type: 'character', filters: { expressions: ['화남', '기쁨'], characterIds: ['heungbu.nolbu'] } });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(asset => facetValues(asset, 'characterIds').includes('heungbu.nolbu'))).toBe(true);
    expect(results.every(asset => facetValues(asset, 'expressions').some(value => ['화남', '기쁨'].includes(value)))).toBe(true);
    expect(facetLabel('characterIds', 'rabbit-turtle.dragonking')).toBe('용왕');
    expect(facetLabel('storyPackIds', 'rabbit-turtle')).toBe('별주부전');
  });
  it('excludes unselectable new assets while preserving the selected hidden card', () => {
    const hidden = ASSET_CATALOG.find(asset => asset.metadata.pickerVisibility === 'hidden')!;
    expect(isSelectableAsset(hidden)).toBe(false);
    expect(searchAssets({ type: hidden.type }).some(asset => asset.id === hidden.id)).toBe(false);
    expect(searchAssets({ type: hidden.type, currentAssetId: hidden.id, search: '없는검색어', view: 'favorites' })[0]).toBe(hidden);
  });
  it('ranks current, same character, chapter, favorites and recents without mutating catalog', () => {
    const assets = ASSET_CATALOG.filter(isSelectableAsset).slice(0, 6);
    const ranked = rankAssets(assets, { currentAssetId: assets[5].id, chapterAssetIds: [assets[4].id], favoriteIds: [assets[3].id], recentIds: [assets[2].id] });
    expect(ranked[0]).toBe(assets[5]);
    expect(assets[0]).not.toBe(ranked[0]);
    const recent = searchAssets({ type: 'background', view: 'recent', recentIds: assets.filter(asset => asset.type === 'background').map(asset => asset.id).reverse() });
    expect(recent.map(asset => asset.id)).toEqual(assets.filter(asset => asset.type === 'background').map(asset => asset.id).reverse());
  });
  it('keeps quality decisions separate from ranking and exposes every legacy facet', () => {
    const original = searchAssets({ type: 'character' })[0];
    const withMetadata = (metadata: Record<string, unknown>): Asset => ({ ...original, metadata: { ...original.metadata, ...metadata } });
    expect(isSelectableAsset(undefined)).toBe(false);
    expect(isSelectableAsset(withMetadata({ qualityStatus: 'draft' }))).toBe(false);
    expect(isSelectableAsset(withMetadata({ qualityReview: { decision: 'MANUAL-REVIEW' } }))).toBe(false);
    expect(isSelectableAsset(withMetadata({ qualityStatus: 'secondary', pickerVisibility: 'secondary', qualityReview: {} }))).toBe(true);
    expect(facetValues(withMetadata({ background: { space: 'indoor', season: '겨울' } }), 'seasons')).toEqual(['겨울']);
    expect(facetLabel('spaces', 'indoor')).toBe('실내');
    expect(facetLabel('bodyFramings', 'upper')).toBe('상반신');
    const sibling = searchAssets({ type: 'character', sameCharacterAssetId: original.id }).find(asset => asset.id !== original.id)!;
    expect(sibling).toBeDefined();
    const unrelated = searchAssets({ type: 'character' }).find(asset => !facetValues(asset, 'characterIds').some(id => facetValues(original, 'characterIds').includes(id)))!;
    expect(rankAssets([unrelated, sibling], { currentCharacterIds: facetValues(original, 'characterIds'), chapterAssetIds: [unrelated.id], favoriteIds: [unrelated.id] })[0]).toBe(sibling);
  });
  it('browses all story catalogs and scopes chapter/favorites/same character explicitly', () => {
    expect(new Set(searchAssets({ type: 'character' }).map(asset => asset.story)).size).toBeGreaterThan(3);
    const asset = searchAssets({ type: 'character' })[0];
    expect(searchAssets({ type: 'character', view: 'chapter', chapterAssetIds: [asset.id] })).toEqual([asset]);
    expect(searchAssets({ type: 'character', view: 'favorites', favoriteIds: [asset.id] })).toEqual([asset]);
    expect(searchAssets({ type: 'character', sameCharacterAssetId: asset.id }).every(other => facetValues(other, 'characterIds').some(id => facetValues(asset, 'characterIds').includes(id)))).toBe(true);
  });
});
