import { ASSET_CATALOG, STORY_CHARACTERS, resolveAsset, type Asset } from './index';
/** Adapted from story-maker 18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b:
 * app/assets/asset-query.ts (facets, labels, Korean aliases, AND/OR matching, quality gate),
 * app/assets/asset-ranking.ts (rankAssets), app/story-asset-picker-utils.ts (normalization).
 * The original normalized fields are read from Asset.metadata; no second registry is created.
 */
export type FacetKey = 'storyPackIds'|'characterIds'|'artFamilies'|'kinds'|'expressions'|'storyUses'|'actions'|'variants'|'companionCharacterIds'|'compositions'|'bodyFramings'|'framings'|'locations'|'spaces'|'times'|'seasons'|'weather'|'moods'|'states'|'tags';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : typeof value === 'string' ? [value] : [];
const record = (value: unknown): Readonly<Record<string, unknown>> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {};
/** SceneFocusEditor friendlyAssetName: prefer authored labels over raw image filenames. */
export function assetDisplayName(asset: Asset): string {
  const isFile=(name:string)=>/\.(?:png|jpe?g|webp|gif)$/i.test(name);
  if(asset.displayName&&!isFile(asset.displayName)) return asset.displayName;
  if(asset.label&&!isFile(asset.label)) return asset.label;
  return [asset.group,...strings(asset.metadata.expressions),...strings(asset.metadata.actions)].filter(Boolean).join(' · ')||asset.story;
}
export function assetCharacterIds(asset: Asset): string[] {
  return [...new Set([...strings(asset.metadata.characterIds), ...strings(asset.metadata.containedCharacterIds)])];
}
export function facetValues(asset: Asset, key: FacetKey): string[] {
  const m = asset.metadata;
  const background = record(m.background);
  if (key === 'characterIds' || key === 'companionCharacterIds') return assetCharacterIds(asset);
  const fields: Partial<Record<FacetKey, unknown>> = {
    kinds: m.kind ?? asset.type, artFamilies: m.artFamily ?? 'unreviewed', storyPackIds: m.storyPackIds,
    storyUses: m.storyUses, expressions: m.expressions, actions: m.actions, variants: m.variantId,
    framings: m.framing ?? asset.framing, compositions: m.composition,
    bodyFramings: m.bodyFraming ?? (asset.type === 'character' ? 'unreviewed' : undefined),
    locations: background.location, spaces: background.space, times: background.time,
    seasons: background.season, weather: background.weather, moods: background.mood, states: background.state,
    tags: record(m.legacy).tags ?? record(asset).tags,
  };
  return strings(fields[key]).filter(Boolean);
}
function normalizeAssetSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ko').replace(/\.(?:png|webp|jpe?g)$/i, '').replace(/[·_\-\s]/g, '');
}
export const KIND_LABELS = { character: "캐릭터", background: "배경", prop: "소품", "scene-illustration": "장면 그림", poster: "포스터", cover: "표지", thumbnail: "썸네일", reference: "참고 그림" };
export const FRAMING_LABELS = { full: "전신", upper: "상반신", group: "여러 인물" };
export const COMPOSITION_LABELS = { single: "혼자 있는 그림", multiple: "함께 있는 그림" };
export const BODY_FRAMING_LABELS = { full: "전신", upper: "상반신", obscured: "몸 일부가 가려진 모습", unreviewed: "신체 구도 확인 전" };
export const STORY_USE_LABELS = { classic: "원작 장면", adaptation: "놀스토리 각색", creative: "자유 창작" };
export const ASSET_FACETS: { key: FacetKey; label: string; basic?: boolean }[] = [
  { key: "storyPackIds", label: "작품", basic: true }, { key: "characterIds", label: "캐릭터", basic: true },
  { key: "artFamilies", label: "그림 계열" },
  { key: "kinds", label: "종류", basic: true }, { key: "expressions", label: "감정·상태" },
  { key: "storyUses", label: "장면 용도", basic: true },
  { key: "actions", label: "행동" }, { key: "variants", label: "옷·모습" }, { key: "companionCharacterIds", label: "함께 있는 대상" },
  { key: "compositions", label: "등장 구성" }, { key: "bodyFramings", label: "신체 구도" }, { key: "framings", label: "이전 구도" },
  { key: "locations", label: "장소" }, { key: "spaces", label: "실내·실외" }, { key: "times", label: "시간" },
  { key: "seasons", label: "계절" }, { key: "weather", label: "날씨" }, { key: "moods", label: "분위기" },
  { key: "states", label: "장소 상태" }, { key: "tags", label: "기존 태그" },
];
export function facetLabel(key: FacetKey, value: string) {
  if (key === "artFamilies") return value === "unreviewed" ? "계열 확인 전" : ({
    "creative-watercolor-v1": "공용 수채화", "rabbit-land-pixel-v2": "별주부전 육지 픽셀",
    "onggojib-pixel-v2": "옹고집전 픽셀", "onggojib-watercolor-v2": "옹고집전 수채화",
    "onggojib-legacy-cover-v1": "옹고집전 이전 표지", "heungbu-traditional-picturebook": "흥부 전통 그림책",
    "seonnyeo-soft-picturebook": "선녀 부드러운 그림책", "seonnyeo-painted-v2": "선녀 회화",
    "heungbu-ink-watercolor-v2": "흥부 먹선·수채화", "rabbit-shortstory-pixel-painterly-v1": "별주부전 완성 삽화",
  } as Record<string,string>)[value] ?? value;
  if (key === "storyPackIds") return ASSET_CATALOG.find(asset => strings(asset.metadata.storyPackIds).includes(value))?.story ?? value;
  if (key === "characterIds") return STORY_CHARACTERS.find(character => character.id === value)?.name ?? value;
  if (key === "kinds") return KIND_LABELS[value as keyof typeof KIND_LABELS] ?? value;
  if (key === "storyUses") return STORY_USE_LABELS[value as keyof typeof STORY_USE_LABELS] ?? value;
  if (key === "framings") return FRAMING_LABELS[value as keyof typeof FRAMING_LABELS] ?? value;
  if (key === "compositions") return COMPOSITION_LABELS[value as keyof typeof COMPOSITION_LABELS] ?? value;
  if (key === "bodyFramings") return BODY_FRAMING_LABELS[value as keyof typeof BODY_FRAMING_LABELS] ?? value;
  if (key === "companionCharacterIds") return STORY_CHARACTERS.find(character => character.id === value)?.name ?? value;
  if (key === "spaces") return value === "indoor" ? "실내" : "실외";
  return value;
}
const SEARCH_ALIASES: Record<string, string[]> = {
  화남: ["화난", "성난", "화를 내는"], 슬픔: ["슬픈", "우는"], 생각: ["고민하는", "생각하는"],
  기쁨: ["기쁜", "웃는", "행복한"], 걱정: ["걱정하는", "불안한"], 일하기: ["일하는", "노동"],
  치료하기: ["치료", "제비 치료", "돌보는"], 나누기: ["나누는", "나눔"], 안기: ["안은", "안음", "안고"],
  걷기: ["걷는", "걸어가는", "걸음"], 달리기: ["달리는", "뛰는", "뛰어가는"],
  인사하기: ["인사", "고개 숙이기", "절하는"], 듣기: ["듣는", "경청"], 가리키기: ["가리키는", "손가락으로"],
};
const SEARCH_TERM_ALIASES: Record<string, string[]> = {
  안기: ["안은", "안음", "안고"], 안은: ["안기", "안음", "안고"], 안음: ["안기", "안은", "안고"],
  평상복: ["일반복"], 일반복: ["평상복"], 아이둘: ["두아이", "아이두명"], 두아이: ["아이둘", "아이두명"], 아이두명: ["두아이", "아이둘"],
};
export function matchesAssetSearch(asset: Asset, search = ''): boolean {
  const characterNames = STORY_CHARACTERS.filter(c => assetCharacterIds(asset).includes(c.id)).flatMap(c => [c.name, ...c.aliases]);
  const values = ASSET_FACETS.filter(f => f.key !== 'tags').flatMap(f => facetValues(asset, f.key).map(v => facetLabel(f.key, v)));
  const text = normalizeAssetSearch([asset.displayName, asset.label, asset.story, ...strings(asset.metadata.description), ...values,
    ...characterNames, ...values.flatMap(v => SEARCH_ALIASES[v] ?? []), ...facetValues(asset, 'tags'),
    ...strings(asset.metadata.aliases), ...strings(asset.metadata.searchTerms), ...strings(asset.metadata.subjects)].join(' '));
  return search.trim().split(/\s+/).filter(Boolean).every(term => {
    const normalized = normalizeAssetSearch(term);
    return [normalized, ...(SEARCH_TERM_ALIASES[normalized] ?? []).map(normalizeAssetSearch)].some(candidate => text.includes(candidate));
  });
}
export function isSelectableAsset(asset: Asset | undefined): asset is Asset {
  return !!asset && asset.metadata.pickerVisibility !== 'hidden'
    && ['approved', 'secondary'].includes(String(asset.metadata.qualityStatus))
    && !['REJECT', 'HIDE-DUPLICATE', 'MANUAL-REVIEW', 'LEGACY', 'REFERENCE-REMAKE'].includes(String(record(asset.metadata.qualityReview).decision ?? ''));
}
export type AssetRankingContext = Readonly<{
  currentAssetId?: string; currentCharacterIds?: readonly string[]; chapterAssetIds?: readonly string[];
  favoriteIds?: readonly string[]; recentIds?: readonly string[];
}>;
export function rankAssets(assets: readonly Asset[], context: AssetRankingContext, recentFirst = false): Asset[] {
  const favorites = context.favoriteIds ?? [];
  const recents = context.recentIds ?? [];
  const score = (asset: Asset) =>
    (asset.id === context.currentAssetId ? 10000 : 0) +
    (assetCharacterIds(asset).some(id => context.currentCharacterIds?.includes(id)) ? 4000 : 0) +
    (context.chapterAssetIds?.includes(asset.id) ? 2000 : 0) +
    (asset.metadata.pickerVisibility === 'primary' ? 300 : 0) +
    (favorites.includes(asset.id) ? 200 : 0) +
    (recents.includes(asset.id) ? 100 / (recents.indexOf(asset.id) + 1) : 0);
  return assets.slice().sort((a, b) => {
    if (recentFirst) {
      const index = (id: string) => recents.includes(id) ? recents.indexOf(id) : Infinity;
      const difference = index(a.id) - index(b.id);
      if (difference) return difference;
    }
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
}
export type AssetSearchOptions = AssetRankingContext & Readonly<{
  type: Asset['type']; search?: string; filters?: Partial<Record<FacetKey, readonly string[]>>;
  view?: 'all'|'chapter'|'favorites'|'recent'; sameCharacterAssetId?: string;
}>;
export function searchAssets(options: AssetSearchOptions): Asset[] {
  const sameCharacter = resolveAsset(options.sameCharacterAssetId ?? '');
  const characterIds = sameCharacter ? assetCharacterIds(sameCharacter) : [];
  const assets = ASSET_CATALOG.filter(asset => {
    if (asset.type !== options.type || !isSelectableAsset(asset)) return false;
    if (options.view === 'chapter' && !options.chapterAssetIds?.includes(asset.id)) return false;
    if (options.view === 'favorites' && !options.favoriteIds?.includes(asset.id)) return false;
    if (options.view === 'recent' && !options.recentIds?.includes(asset.id)) return false;
    if (sameCharacter && !assetCharacterIds(asset).some(id => characterIds.includes(id))) return false;
    return ASSET_FACETS.every(({ key }) => !options.filters?.[key]?.length || options.filters[key]!.some(value => facetValues(asset, key).includes(value)))
      && matchesAssetSearch(asset, options.search);
  });
  const current = resolveAsset(options.currentAssetId ?? '');
  // Retain a saved selection for inspection even when quality policy or active filters exclude it.
  const withCurrent = current?.type === options.type && !assets.includes(current) ? [current, ...assets] : assets;
  return rankAssets(withCurrent, { ...options, currentCharacterIds: options.currentCharacterIds ?? (current ? assetCharacterIds(current) : undefined) }, options.view === 'recent');
}
