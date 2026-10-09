import { coverDesignAssetReferences, isCoverDesign, type CoverDesign } from "./cover-design";
import { STORY_ASSETS } from "./story-assets";

const coverAssetTypes = new Map(STORY_ASSETS.map(asset => [asset.id, asset.type]));

export const COVER_THEMES = {
  forest: { label: "숲의 이야기", paper: "#173d35", ink: "#fff4d8", accent: "#d7bb79" },
  night: { label: "별빛 모험", paper: "#202e50", ink: "#f5eddd", accent: "#dfbe77" },
  rose: { label: "따뜻한 동화", paper: "#743e4e", ink: "#fff1dc", accent: "#efc193" },
  cream: { label: "종이책", paper: "#eee1c6", ink: "#342b26", accent: "#866b40" },
} as const;
export const COVER_FONTS = {
  serif: { label: "책 느낌 명조", family: '"Knol Story Serif", serif' },
  sans: { label: "또렷한 고딕", family: '"Knol Story Sans", sans-serif' },
  rounded: { label: "동글동글 주아", family: '"Knol Jua", sans-serif' },
  handwriting: { label: "손글씨 (나눔 기반)", family: '"Knol Story Pen", cursive' },
} as const;
export const COVER_TITLE_SIZE = { min: 14, max: 80 } as const;
export type CoverPresetId = "classic" | "picture" | "bold" | "oval" | "arch" | "starlight" | "letter" | "poster";
/** Small, local design settings. Assets remain shared by ID; no rendered image is stored. */
export type StoryCoverComposition = {
  version: 1;
  backgroundFit: "fill" | "complete";
  backgroundX: number;
  backgroundY: number;
  backgroundZoom: number;
  characterX: number;
  characterBottom: number;
  characterScale: number;
  titleX: number;
  titleY: number;
  titleWidth: number;
  showEdition: boolean;
  textPanel: "auto" | "none";
};
export type StoryCover = {
  author: string;
  subtitle: string;
  authorNote: string;
  layout: "classic" | "picture" | "bold";
  theme: keyof typeof COVER_THEMES;
  font: keyof typeof COVER_FONTS;
  titlePosition: "top" | "middle" | "bottom";
  authorPosition: "under-title" | "bottom";
  align: "left" | "center";
  titleSize: number;
  titleColor: string;
  backgroundId: string;
  characterId: string;
  characterPosition: "left" | "center" | "right";
  composition?: StoryCoverComposition;
  presetId?: CoverPresetId;
  design?: CoverDesign;
};
export const DEFAULT_COVER: StoryCover = {
  author: "", subtitle: "", authorNote: "", layout: "classic", theme: "forest",
  font: "serif", titlePosition: "top", authorPosition: "bottom", align: "center",
  titleSize: 36, titleColor: "", backgroundId: "", characterId: "", characterPosition: "center",
};
export const COVER_FIELDS = [
  ["author", "표지 지은이"], ["subtitle", "표지 소개 문장"], ["authorNote", "작가의 말"],
  ["layout", "표지 배치"], ["theme", "표지 색감"], ["font", "표지 글꼴"],
  ["titlePosition", "표지 제목 위치"], ["authorPosition", "표지 지은이 위치"],
  ["align", "표지 글 정렬"], ["titleSize", "표지 제목 크기"], ["titleColor", "표지 제목 색"],
  ["backgroundId", "표지 배경 ID"], ["characterId", "표지 인물 ID"], ["characterPosition", "표지 인물 위치"],
  ["composition", "표지 자유 배치"],
  ["presetId", "표지 디자인"],
] as const;
export function isStoryCoverComposition(value: unknown): value is StoryCoverComposition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const ranges = {
    backgroundX: [0, 100], backgroundY: [0, 100], backgroundZoom: [1, 1.6],
    characterX: [15, 85], characterBottom: [0, 35], characterScale: [.5, 1.3],
    titleX: [10, 90], titleY: [5, 70], titleWidth: [50, 90],
  } as const;
  const keys = ["version", "backgroundFit", "showEdition", "textPanel", ...Object.keys(ranges)];
  return Object.keys(v).length === keys.length && Object.keys(v).every(key => keys.includes(key)) &&
    v.version === 1 && (v.backgroundFit === "fill" || v.backgroundFit === "complete") &&
    typeof v.showEdition === "boolean" && (v.textPanel === "auto" || v.textPanel === "none") &&
    Object.entries(ranges).every(([key, [min, max]]) =>
      typeof v[key] === "number" && Number.isFinite(v[key]) && v[key] >= min && v[key] <= max);
}
export function isStoryCover(value: unknown): value is StoryCover {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const oneOf = (key: string, values: string[]) => typeof v[key] === "string" && values.includes(v[key] as string);
  return ["author", "subtitle", "authorNote", "backgroundId", "characterId"].every(key => typeof v[key] === "string") &&
    oneOf("layout", ["classic", "picture", "bold"]) && oneOf("theme", Object.keys(COVER_THEMES)) &&
    oneOf("font", Object.keys(COVER_FONTS)) && oneOf("titlePosition", ["top", "middle", "bottom"]) &&
    oneOf("authorPosition", ["under-title", "bottom"]) && oneOf("align", ["left", "center"]) &&
    oneOf("characterPosition", ["left", "center", "right"]) &&
    typeof v.titleSize === "number" && Number.isFinite(v.titleSize) && v.titleSize >= COVER_TITLE_SIZE.min && v.titleSize <= COVER_TITLE_SIZE.max &&
    typeof v.titleColor === "string" && (v.titleColor === "" || /^#[\da-f]{6}$/i.test(v.titleColor)) &&
    (v.composition === undefined || isStoryCoverComposition(v.composition)) &&
    (v.presetId === undefined || COVER_PRESET_OPTIONS.some(option => option.id === v.presetId)) &&
    (v.design === undefined || isCoverDesign(v.design) && coverDesignAssetReferences(v.design).every(reference => coverAssetTypes.get(reference.id) === reference.type));
}
export const COVER_PRESET_OPTIONS = [
  { id: "classic", layout: "classic", label: "기본 책", description: "원래 책의 분위기를 살려요" },
  { id: "picture", layout: "picture", label: "장면형", description: "배경과 인물, 아래쪽 제목" },
  { id: "bold", layout: "bold", label: "인물형", description: "또렷한 제목과 작은 인물" },
  { id: "oval", layout: "classic", label: "타원 창", description: "둥근 풍경 속 주인공" },
  { id: "arch", layout: "classic", label: "아치 창", description: "이야기로 들어가는 문" },
  { id: "starlight", layout: "picture", label: "별빛 책", description: "큰 장면과 위쪽 제목" },
  { id: "letter", layout: "bold", label: "편지 책", description: "손글씨와 작은 주인공" },
  { id: "poster", layout: "picture", label: "포스터 책", description: "그림 위에 또렷한 제목" },
] as const;
