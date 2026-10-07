/** Shared, local cover recipe. No React, catalog, persistence or network imports. */
export const COVER_FACE_IDS = ["front", "spine", "back"] as const;
export const COVER_FACE_PRESETS = ["picturebook", "arch", "cloth", "literary", "banded", "character", "cameo", "poster"] as const;
export const COVER_DESIGN_LIMITS = { textPerFace: 12, imagesPerFace: 4, characters: 500, bytes: 128 * 1024, history: 40 } as const;
export type CoverFaceId = typeof COVER_FACE_IDS[number];
export type CoverFacePresetId = typeof COVER_FACE_PRESETS[number];
export type CoverBox = { x: number; y: number; w: number; h: number };
export type CoverTextBinding = "project.title" | "project.description" | "cover.author" | "cover.subtitle" | "cover.authorNote";
export type CoverTextElement = {
  id: string; type: "text"; role: "title" | "subtitle" | "author" | "description" | "authorNote" | "edition" | "imprint" | "number" | "custom";
  region: "face" | "band";
  content: { bind: CoverTextBinding } | { text: string };
  box: CoverBox;
  style: { fontId: "serif" | "sans" | "rounded" | "handwriting"; fontSize: number; color: string; align: "left" | "center" | "right"; writing: "horizontal" | "vertical" };
};
export type CoverImageElement = {
  id: string; type: "image"; role: "scene" | "actor" | "custom";
  assetId: string; assetType: "background" | "character"; box: CoverBox;
  frame: "rect" | "arch" | "oval";
  crop: { fit: "contain" | "cover"; zoom: number; x: number; y: number };
};
export type CoverElement = CoverTextElement | CoverImageElement;
export type CoverDesign = {
  version: 1; trim: "trade-300-435";
  finish: { stock: "cream" | "matte" | "cloth"; color: string; ink: string; accent: string; texture: "normal" | "subtle" | "none" };
  band: { enabled: boolean; designId: "classic" | "cream" | "ruled" | "stripe" };
  faces: Record<CoverFaceId, { preset: CoverFacePresetId; elements: CoverElement[] }>;
};
const record = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const keys = (value: unknown, expected: readonly string[]): value is Record<string, unknown> => record(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const oneOf = (value: unknown, options: readonly string[]) => typeof value === "string" && options.includes(value);
const range = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const color = (value: unknown) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
const text = (value: unknown) => typeof value === "string" && value.length <= COVER_DESIGN_LIMITS.characters * 2 && Array.from(value).length <= COVER_DESIGN_LIMITS.characters;
const id = (value: unknown) => typeof value === "string" && /^[a-z\d][a-z\d_-]{0,63}$/i.test(value);
function box(value: unknown): value is CoverBox {
  return keys(value, ["x", "y", "w", "h"]) && range(value.x, 0, 1) && range(value.y, 0, 1) && range(value.w, .02, 1) && range(value.h, .02, 1) && value.x + value.w <= 1 + 1e-9 && value.y + value.h <= 1 + 1e-9;
}
function element(value: unknown): value is CoverElement {
  if (!record(value) || !id(value.id) || !box(value.box)) return false;
  if (value.type === "text") {
    if (!keys(value, ["id", "type", "role", "region", "content", "box", "style"]) || !oneOf(value.role, ["title", "subtitle", "author", "description", "authorNote", "edition", "imprint", "number", "custom"]) || !oneOf(value.region, ["face", "band"])) return false;
    const content = value.content, style = value.style;
    return (keys(content, ["text"]) && text(content.text) || keys(content, ["bind"]) && oneOf(content.bind, ["project.title", "project.description", "cover.author", "cover.subtitle", "cover.authorNote"])) &&
      keys(style, ["fontId", "fontSize", "color", "align", "writing"]) && oneOf(style.fontId, ["serif", "sans", "rounded", "handwriting"]) && range(style.fontSize, .015, 1) && color(style.color) && oneOf(style.align, ["left", "center", "right"]) && oneOf(style.writing, ["horizontal", "vertical"]);
  }
  if (value.type !== "image" || !keys(value, ["id", "type", "role", "assetId", "assetType", "box", "frame", "crop"]) || !oneOf(value.role, ["scene", "actor", "custom"]) || typeof value.assetId !== "string" || !/^[a-z\d][a-z\d._-]{0,199}$/i.test(value.assetId) || !oneOf(value.assetType, ["background", "character"]) || !oneOf(value.frame, ["rect", "arch", "oval"])) return false;
  const crop = value.crop;
  return keys(crop, ["fit", "zoom", "x", "y"]) && oneOf(crop.fit, ["contain", "cover"]) && range(crop.zoom, crop.fit === "cover" ? 1 : .5, 2) && range(crop.x, 0, 100) && range(crop.y, 0, 100);
}
export function coverDesignBytes(value: unknown): number {
  try { const serialized = JSON.stringify(value); return serialized === undefined ? Infinity : new TextEncoder().encode(serialized).byteLength; }
  catch { return Infinity; }
}
/** Reject unknown fields/versions rather than silently dropping a student's work. */
export function isCoverDesign(value: unknown): value is CoverDesign {
  if (!keys(value, ["version", "trim", "finish", "band", "faces"]) || value.version !== 1 || value.trim !== "trade-300-435" || !keys(value.faces, COVER_FACE_IDS)) return false;
  const finish = value.finish, band = value.band;
  if (!keys(finish, ["stock", "color", "ink", "accent", "texture"]) || !oneOf(finish.stock, ["cream", "matte", "cloth"]) || ![finish.color, finish.ink, finish.accent].every(color) || !oneOf(finish.texture, ["normal", "subtle", "none"]) || !keys(band, ["enabled", "designId"]) || typeof band.enabled !== "boolean" || !oneOf(band.designId, ["classic", "cream", "ruled", "stripe"])) return false;
  const ids = new Set<string>();
  for (const faceId of COVER_FACE_IDS) {
    const face = value.faces[faceId];
    if (!keys(face, ["preset", "elements"]) || !oneOf(face.preset, COVER_FACE_PRESETS) || !Array.isArray(face.elements) || face.elements.length > COVER_DESIGN_LIMITS.textPerFace + COVER_DESIGN_LIMITS.imagesPerFace || Object.keys(face.elements).length !== face.elements.length || !Object.keys(face.elements).every((key, index) => key === String(index))) return false;
    let texts = 0, images = 0;
    for (const item of face.elements) {
      if (!element(item) || ids.has(item.id)) return false;
      ids.add(item.id);
      if (item.type === "text") texts++; else images++;
    }
    if (texts > COVER_DESIGN_LIMITS.textPerFace || images > COVER_DESIGN_LIMITS.imagesPerFace) return false;
  }
  return coverDesignBytes(value) <= COVER_DESIGN_LIMITS.bytes;
}
export function cloneCoverDesign(value: unknown): CoverDesign {
  if (!isCoverDesign(value)) throw new RangeError("표지 글·그림 상자의 형식이나 범위를 확인해 주세요.");
  return structuredClone(value);
}
export function coverDesignAssetReferences(design?: CoverDesign) {
  const references = new Map<string, { id: string; type: "background" | "character" }>();
  if (design) for (const face of Object.values(design.faces)) for (const item of face.elements) if (item.type === "image") references.set(`${item.assetType}:${item.assetId}`, { id: item.assetId, type: item.assetType });
  return [...references.values()].sort((a, b) => a.id.localeCompare(b.id) || a.type.localeCompare(b.type));
}
