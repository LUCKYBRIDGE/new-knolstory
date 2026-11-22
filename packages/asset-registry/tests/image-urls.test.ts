import { describe, expect, it } from 'vitest';
import catalog from '../src/catalog.json';
import previews from '../src/image-previews.json';
import { ASSET_CATALOG, imagePreviewPath, imageUrlVersion } from '../src/index';

describe('catalogue image URLs', () => {
  it('versions every original by its source revision and keeps the runtime path unversioned', () => {
    for (const [index, asset] of ASSET_CATALOG.entries()) {
      const source = catalog[index]!;
      expect(asset.id).toBe(source.id);
      expect(asset.revision).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.src).toBe(`${source.src}?v=${asset.revision.slice(0, previews.hashLength)}`);
      expect(asset.runtimePath).toBe(source.src.slice(1));
      expect(asset.runtimePath).not.toContain('?');
    }
  });
  it('registers one revision-named preview per source for picker, shelf and page-list cards', () => {
    expect(previews.directory).toMatch(/^assets\/previews\/v\d+$/);
    expect(previews.directory.endsWith(`/v${previews.version}`)).toBe(true);
    for (const asset of ASSET_CATALOG) {
      expect(asset.previewSrc).toBe(`/${previews.directory}/${imageUrlVersion(asset.revision)}.webp`);
      expect(imagePreviewPath(asset.revision)).toBe(asset.previewSrc);
    }
    const byPreview = new Map<string, Set<string>>();
    for (const asset of ASSET_CATALOG) byPreview.set(asset.previewSrc, (byPreview.get(asset.previewSrc) ?? new Set()).add(asset.revision));
    expect([...byPreview.values()].every(revisions => revisions.size === 1)).toBe(true);
  });
});
