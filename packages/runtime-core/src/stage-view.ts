// Ported from story-maker baseline 18da4fc:app/story-stage-view.ts.
import { ASSET_CATALOG, assetCharacterIds } from "@knolstory/asset-registry";
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
  "seonnyeo.character.classic-woodcutter-riding-horse-staged-v1",
  "seonnyeo.character.classic-horse-startled-by-porridge-staged-v1",
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
        "seonnyeo.character.classic-woodcutter-riding-horse-staged-v1",
        "seonnyeo.character.classic-horse-startled-by-porridge-staged-v1",
      ].includes(id);
}

// Full-body source canvases retain intrinsic stature and pose, including
// transparent padding in the prepared child artwork. Never expand silhouettes
// to equal height or apply the source artwork reduction a second time.
// Art registered with a placement review is drawn at true stature on the
// standard canvas; the legacy corrections below must not shrink it again.
function placedToStandard(id: string) {
  return Boolean(assets.get(id)?.metadata.placementReview);
}

// Legacy (unreviewed) art, compared against the same stage and floor across all story packs.
const characterStature = new Map([
  ["creative.village-girl", .85],
  ["creative.young-traveler", .89],
  ["onggojib.second-child", .93],
  ["onggojib.youngest-child", .84],
  ["heungbu.swallow", .36],
]);
const expressionStature = new Map([
  ["onggojib.character.emotion-magistrate-sorrow-v3", .92],
  ["onggojib.character.emotion-stranger-anger-v3", .92],
  ["onggojib.character.emotion-stranger-mirth-v3", .92],
]);

export function stageCharacterScale(id: string) {
  const asset = assets.get(id);
  if (placedToStandard(id)) return 1;
  if (SEONNYEO_MOUNTED.has(id)) return 1.4;
  if (asset?.story === "선녀와 나무꾼") {
    if (asset.group === "사슴") return .72;
    if (asset.group === "수탉") return .48;
    if (asset.group === "날개옷") return .65;
  }
  if (asset?.type !== "character" || stagePlacementClass(id) !== "framing-full") return 1;
  const identities = assetCharacterIds(asset);
  // Shared artwork carries its own internal proportions.
  if (identities.length !== 1) return 1;
  return expressionStature.get(id) ?? characterStature.get(identities[0]) ?? 1;
}

/** Preserve full-body stature/pose; only cropped upper-body art needs margin normalization. */
export function stageReadableCharacterScale(id: string) {
  const scale = stageCharacterScale(id);
  if (stagePlacementClass(id) !== "framing-upper") return scale;
  const geometry = assets.get(id)?.geometry;
  const fraction = geometry ? geometry.bottom - geometry.top : .82;
  return scale * .82 / Math.max(.35, fraction);
}
