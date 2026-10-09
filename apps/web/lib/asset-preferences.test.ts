import { describe, expect, it } from 'vitest';
import { ASSET_PREFERENCES_KEY, readAssetPreferences, recordRecentAsset, toggleAssetFavorite, writeAssetPreferences } from './asset-preferences';
describe('asset preferences', () => {
  it('isolates persisted data to the Next namespace and returns immutable favorites/recent', () => {
    const original = { favoriteIds: ['one'], recentIds: ['one', 'two'] };
    const favorite = toggleAssetFavorite(original, 'two');
    const recent = recordRecentAsset(favorite, 'two');
    expect(original).toEqual({ favoriteIds: ['one'], recentIds: ['one', 'two'] });
    expect(recent).toEqual({ favoriteIds: ['one', 'two'], recentIds: ['two', 'one'] });
    const entries = new Map<string, string>();
    writeAssetPreferences({ setItem: (key, value) => { entries.set(key, value); } }, recent);
    expect([...entries.keys()]).toEqual([ASSET_PREFERENCES_KEY]);
    expect(readAssetPreferences({ getItem: key => entries.get(key) ?? null })).toEqual(recent);
  });
  it('validates persisted arrays and exposes corrupt or unavailable storage', () => {
    expect(readAssetPreferences({ getItem: () => '{"favoriteIds":["a",3,"a"],"recentIds":null}' })).toEqual({ favoriteIds: ['a'], recentIds: [] });
    expect(() => readAssetPreferences({ getItem: () => 'broken' })).toThrow();
    expect(() => writeAssetPreferences({ setItem: () => { throw new Error('quota'); } }, { favoriteIds: [], recentIds: [] })).toThrow('quota');
  });
});
