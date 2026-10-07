// Ported from story-maker baseline 18da4fc:app/story-stage-view.ts.
import { ASSET_CATALOG } from "@knolstory/asset-registry";
const assets = new Map(ASSET_CATALOG.map(asset => [asset.id, asset]));
export const CHARACTER_FACING = new Map<string, "left" | "right">([
  ["seonnyeo.character.classic-woodcutter-holding-robe", "right"],
  ["seonnyeo.character.classic-woodcutter-in-bucket", "right"],
  ["seonnyeo.character.classic-celestial-horse", "right"],
  ["seonnyeo.character.classic-woodcutter-riding-horse", "right"],
  ["seonnyeo.character.classic-horse-startled-by-porridge", "right"],
  ["seonnyeo.character.classic-woodcutter-fallen", "right"],
  ["seonnyeo.character.classic-celestial-horse-departing", "right"],

  ["rabbit-turtle.character.classic-turtle-portrait", "left"],
  ["rabbit-turtle.character.rabbit-shocked", "right"],
  ["rabbit-turtle.character.rabbit-thinking", "right"],
  ["rabbit-turtle.character.rabbit-suspicious", "right"],
  ["rabbit-turtle.character.rabbit-speaking-truth", "left"],
  ["rabbit-turtle.character.classic-rabbit-laugh", "right"],
  ["rabbit-turtle.character.turtle-resolve", "left"],
  ["rabbit-turtle.character.turtle-offer", "left"],
  ["rabbit-turtle.character.turtle-tired", "left"],
  ["rabbit-turtle.character.dragonking-sick-elder-attached", "left"],
  ["onggojib.character.classic-master", "left"],
  ["onggojib.character.classic-master-talisman", "right"],
  ["onggojib.character.classic-mother", "left"],
  ["onggojib.character.classic-mother-warm", "left"],
  ["onggojib.character.classic-servant-door", "right"],
  ["onggojib.character.classic-servant-usher", "right"],
  ["rabbit-turtle.character.turtle-unified-720x900", "left"],
  ["rabbit-turtle.character.turtle-child-unified-720x900", "left"],
  ["rabbit-turtle.character.rabbit-white-unified-720x900", "right"],
  ["rabbit-turtle.character.dragonking-unified-720x900", "left"],
  ["rabbit-turtle.character.dragonking-young-unified-720x900", "left"],
  ["rabbit-turtle.character.dragonking-recovered-unified-720x900", "left"],
  ["rabbit-turtle.character.physician-unified-720x900", "right"],
  ["heungbu.character.swallow", "right"],
]);

// These composites still represent one adult's pose, so use the adult slot width.
const SEONNYEO_ADULT_COMPOSITES = new Set([
  "seonnyeo.character.classic-fairy-carrying-children",
  "seonnyeo.character.classic-fairy-holding-first-baby",
  "seonnyeo.character.classic-woodcutter-in-bucket",
  "seonnyeo.character.classic-woodcutter-riding-horse",
  "seonnyeo.character.classic-horse-startled-by-porridge",
]);
const SEONNYEO_MOUNTED = new Set([
  "seonnyeo.character.classic-woodcutter-riding-horse",
  "seonnyeo.character.classic-horse-startled-by-porridge",
]);

export function stagePlacementClass(assetId: string) {
  if (SEONNYEO_ADULT_COMPOSITES.has(assetId)) return "framing-full";
  const framing = assets.get(assetId)?.framing;
  return framing === "상반신" ? "framing-upper"
    : framing === "여러 인물" ? "framing-group"
    : framing === "전신" ? "framing-full" : "";
}

export function stageShouldMirror(assetId: string, side: "left" | "right") {
  const facing = CHARACTER_FACING.get(assetId) || (assetId.startsWith("seonnyeo.character.") ? "left" : undefined);
  return Boolean(facing && facing !== (side === "left" ? "right" : "left"));
}

export function stageSharedActor(id: string) {
  return id === "rabbit-turtle.character.classic-riding" || [
        "seonnyeo.character.classic-woodcutter-in-bucket",
        "seonnyeo.character.classic-woodcutter-riding-horse",
        "seonnyeo.character.classic-horse-startled-by-porridge",
      ].includes(id);
}

function isSmallPerson(id: string) {
  const asset = assets.get(id);
  return asset?.story === "옹고집전" && ["아이", "둘째 아이", "막내 아이"].includes(asset.group)
    || asset?.story === "선녀와 나무꾼" && asset.group === "두 아이"
    || (asset?.story === "별주부전" || asset?.story === "토끼와 자라") && asset.group === "어린 자라";
}
export function stageCharacterScale(id: string) {
  const asset = assets.get(id);
  // Dialogue-side readability: a small stature cue, not a dramatic child/adult shrink.
  // Compensate only some extra transparent canvas padding, with a strict 15% ceiling.
  const smallPerson = isSmallPerson(id);
  if (smallPerson) {
    const visibleFraction = asset?.geometry ? asset.geometry.bottom - asset.geometry.top : .82;
    return .98 * Math.min(1.15, Math.max(1, .82 / visibleFraction));
  }
  return SEONNYEO_MOUNTED.has(id) ? 1.4
        : asset?.story === "선녀와 나무꾼" && asset.group === "사슴" ? 0.72
        : asset?.story === "선녀와 나무꾼" && asset.group === "수탉" ? 0.48
        : asset?.story === "선녀와 나무꾼" && asset.group === "날개옷" ? 0.65 : 1;
}

/** Responsive dialogue slots normalize transparent margins, keeping a subtle stature cue. */
export function stageReadableCharacterScale(id: string) {
  const asset = assets.get(id);
  const fraction = asset?.geometry ? asset.geometry.bottom - asset.geometry.top : .82;
  const small = isSmallPerson(id);
  const special = SEONNYEO_MOUNTED.has(id) || asset?.story === "선녀와 나무꾼" && ["사슴", "수탉", "날개옷"].includes(asset.group);
  return special ? stageCharacterScale(id) : .82 / Math.max(.35, fraction) * (small ? .98 : 1);
}
