import type { Chapter } from "./story-data";

/**
 * The picture-book page a chapter grew out of (StoryDocument v9).
 * Only registered asset IDs travel with the work; image files and account data never do.
 * It is an authoring reference: reading and playback never show it.
 */
export type PicturebookSketch = {
  backgroundId: string;
  leftAssetId: string;
  rightAssetId: string;
  /** Review version of the stage recipe that was offered when the chapter was made. */
  recipeVersion?: number;
};

const SKETCH_KEYS = ["backgroundId", "leftAssetId", "rightAssetId", "recipeVersion"];

export function isPicturebookSketch(value: unknown): value is PicturebookSketch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const sketch = value as Record<string, unknown>;
  if (Object.keys(sketch).some(key => !SKETCH_KEYS.includes(key))) return false;
  const id = (item: unknown) => typeof item === "string" && item.length <= 200;
  if (!id(sketch.backgroundId) || !id(sketch.leftAssetId) || !id(sketch.rightAssetId)) return false;
  if (!sketch.backgroundId && !sketch.leftAssetId && !sketch.rightAssetId) return false;
  return sketch.recipeVersion === undefined || (Number.isSafeInteger(sketch.recipeVersion) && (sketch.recipeVersion as number) >= 1);
}

/**
 * New chapters made from an existing one (splits, branches, joins) start without the sketch:
 * the starting picture stays with the chapter that was made from the page.
 */
export function withoutPicturebookSketch<T extends Chapter>(chapter: T): Omit<T, "picturebookSketch"> {
  const { picturebookSketch: _sketch, ...rest } = chapter;
  return rest;
}
