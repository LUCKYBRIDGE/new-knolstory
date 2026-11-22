import { createHash } from 'node:crypto';

type CatalogRow = {
  type: string;
  metadata?: Record<string, unknown>;
};

/**
 * The picker tag review can change these facets. Keep the historical comparison
 * over every other catalogue field, including image paths, revisions and rights.
 */
export function withoutPickerTags(row: CatalogRow): CatalogRow {
  if (!row.metadata) return row;
  const metadata = { ...row.metadata };
  if (row.type === 'character') {
    delete metadata.storyUses;
    delete metadata.expressions;
    delete metadata.actions;
  }
  if (row.type === 'background' && metadata.background && typeof metadata.background === 'object') {
    const remaining = { ...metadata.background as Record<string, unknown> };
    for (const key of ['space', 'time', 'season', 'weather', 'mood', 'state']) delete remaining[key];
    if (Object.keys(remaining).length) metadata.background = remaining;
    else delete metadata.background;
  }
  return { ...row, metadata };
}

export function stableCatalogDigest(rows: readonly CatalogRow[]): string {
  return createHash('sha256').update(JSON.stringify(rows.map(withoutPickerTags))).digest('hex');
}
