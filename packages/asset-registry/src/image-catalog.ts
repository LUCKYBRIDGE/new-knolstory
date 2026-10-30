import catalog from './catalog.json';
import backgroundSizes from './background-sizes.json';
import characters from './characters.json';
export type AssetGeometry = Readonly<{left:number; right:number; top:number; bottom:number; width:number; height:number}>;
export type Asset = Readonly<{
  group: string; framing?: string; backgroundRole?: string; id: string; displayName: string; label: string; story: string; type: 'character'|'background';
  src: string; runtimePath: string; revision: string; geometry: AssetGeometry | null;
  metadata: Readonly<Record<string, unknown>>;
}>;
function freezeTree<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
/** Stable source IDs and measured geometry; versioned local derivatives retain original lineage. */
export const ASSET_CATALOG: readonly Asset[] = freezeTree(catalog.map(asset => ({
  ...asset, type: asset.type as Asset['type'], runtimePath: asset.src.slice(1),
  geometry: asset.geometry ? Object.freeze({...asset.geometry}) : null,
  metadata: Object.freeze({...asset.metadata}),
})));
const byId = new Map(ASSET_CATALOG.map(asset => [asset.id, asset]));
export function resolveAsset(id: string): Asset | undefined { return byId.get(id); }
export const STORY_CHARACTERS: readonly Readonly<(typeof characters)[number]>[] = freezeTree(characters);
export const LEGACY_ASSET_BASELINE = '18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b';

/** Dimensions read from the fixed legacy image bytes for canonical cover/contain framing. */
export function getBackgroundSize(id: string): Readonly<{ width: number; height: number }> | undefined {
  const size = (backgroundSizes as Record<string, { width: number; height: number }>)[id];
  return size ? { ...size } : undefined;
}
