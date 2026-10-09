/** Optional, additive v1 cut metadata. Durations are milliseconds. */
export const STORY_EFFECTS = [
  { type: "shake", label: "💥 화면 흔들림", hint: "쿵! 충격이나 놀람" },
  { type: "flash-red", label: "🔴 붉은 빛", hint: "위기나 경고를 한 번 강조" },
  { type: "fade-black", label: "🌑 암전", hint: "어두워졌다가 다시 밝아져요" },
  { type: "crack", label: "⚡ 화면 갈라짐", hint: "도술이나 비밀이 드러나는 순간" },
  { type: "spotlight", label: "🔦 집중 조명", hint: "무대 가운데로 시선을 모아요" },
] as const;
export type StorySceneEffect = {
  type: typeof STORY_EFFECTS[number]["type"];
  intensity: "soft" | "strong";
  trigger: "scene-enter" | "with-dialogue" | "after-delay";
  delayMs: number;
};
export function isStorySceneEffect(value: unknown): value is StorySceneEffect {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return STORY_EFFECTS.some(e => e.type === v.type) &&
    (v.intensity === "soft" || v.intensity === "strong") &&
    typeof v.trigger === "string" && ["scene-enter", "with-dialogue", "after-delay"].includes(v.trigger) &&
    typeof v.delayMs === "number" && Number.isFinite(v.delayMs) &&
    v.delayMs >= 0 && v.delayMs <= 10000;
}
