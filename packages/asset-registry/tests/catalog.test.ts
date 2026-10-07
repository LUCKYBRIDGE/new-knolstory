import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ASSET_CATALOG, resolveAsset } from '../src/index';
describe('baseline asset registry', () => {
  it('resolves every stable ID with byte-verified revision and character geometry', () => {
    expect(ASSET_CATALOG).toHaveLength(421);
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
  it('does not resolve invented or prototype IDs', () => {
    expect(resolveAsset('missing')).toBeUndefined();
    expect(resolveAsset('__proto__')).toBeUndefined();
  });
});
