import type { StoryPlanning } from "./story-data";

export type StoryStageKey =
  | "opening"
  | "middle"
  | "crisis"
  | "climax"
  | "ending";

export type StoryArcKey = StoryStageKey;

export type StoryStructureMode = StoryPlanning["structureMode"];

export const STORY_STAGE_ORDER: readonly StoryStageKey[] = [
  "opening",
  "middle",
  "crisis",
  "climax",
  "ending",
] as const;

export function isStoryStageKey(value: unknown): value is StoryStageKey {
  return (
    typeof value === "string" &&
    (STORY_STAGE_ORDER as readonly string[]).includes(value)
  );
}

export function canonicalizeStoryStageKeys(keys: unknown): StoryStageKey[] {
  if (!Array.isArray(keys)) return [];
  const set = new Set(keys.filter(isStoryStageKey));
  return STORY_STAGE_ORDER.filter((key) => set.has(key));
}
