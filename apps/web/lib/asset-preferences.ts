export const ASSET_PREFERENCES_KEY = 'knolstory-asset-preferences-v1';
export type AssetPreferences = Readonly<{ favoriteIds: readonly string[]; recentIds: readonly string[] }>;
const EMPTY: AssetPreferences = { favoriteIds: [], recentIds: [] };
function ids(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 500) : [];
}
export function readAssetPreferences(storage: Pick<Storage, 'getItem'>): AssetPreferences {
  const raw = storage.getItem(ASSET_PREFERENCES_KEY);
  if (!raw) return EMPTY;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('이미지 자료실 설정을 읽지 못했습니다.');
  const data = parsed as Record<string, unknown>;
  return { favoriteIds: ids(data.favoriteIds), recentIds: ids(data.recentIds) };
}
export function toggleAssetFavorite(preferences: AssetPreferences, id: string): AssetPreferences {
  return { ...preferences, favoriteIds: preferences.favoriteIds.includes(id) ? preferences.favoriteIds.filter(value => value !== id) : [...preferences.favoriteIds, id] };
}
export function recordRecentAsset(preferences: AssetPreferences, id: string): AssetPreferences {
  return { ...preferences, recentIds: [id, ...preferences.recentIds.filter(value => value !== id)].slice(0, 100) };
}
export function writeAssetPreferences(storage: Pick<Storage, 'setItem'>, preferences: AssetPreferences): void {
  storage.setItem(ASSET_PREFERENCES_KEY, JSON.stringify(preferences));
}
