export type CreativeMemoKind =
  | "free"
  | "character"
  | "relationship"
  | "place"
  | "event"
  | "task";

export type CreativeMemoFieldSource = "default" | "recommended" | "custom";

export type CreativeMemoField = {
  id: string;
  label: string;
  value: string;
  order: number;
  source: CreativeMemoFieldSource;
};

export type CreativeMemo = {
  id: string;
  kind: CreativeMemoKind;
  title: string;
  linkedChapterIds?: string[];
  linkedLineIds?: string[];
  linkedCharacterNames?: string[];
  linkedChapterId?: string;
  linkedLineId?: string;
  fields: CreativeMemoField[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

function isMemoKind(value: unknown): value is CreativeMemoKind {
  return ["free", "character", "relationship", "place", "event", "task"].includes(
    String(value),
  );
}

function isFieldSource(value: unknown): value is CreativeMemoFieldSource {
  return ["default", "recommended", "custom"].includes(String(value));
}

export function normalizeCreativeMemos(value: unknown): CreativeMemo[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((memo): memo is Record<string, unknown> => Boolean(memo && typeof memo === "object"))
    .map((memo, memoIndex) => {
      const kind = isMemoKind(memo.kind) ? memo.kind : "free";
      const createdAt =
        typeof memo.createdAt === "string" && memo.createdAt
          ? memo.createdAt
          : new Date(0).toISOString();
      const rawFields = Array.isArray(memo.fields) ? memo.fields : [];
      const fields = rawFields
        .filter(
          (field): field is Record<string, unknown> =>
            Boolean(field && typeof field === "object"),
        )
        .map((field, fieldIndex) => ({
          id:
            typeof field.id === "string" && field.id
              ? field.id
              : `${String(memo.id || `memo-${memoIndex + 1}`)}-field-${fieldIndex + 1}`,
          label: typeof field.label === "string" ? field.label : "항목",
          value: typeof field.value === "string" ? field.value : "",
          order:
            typeof field.order === "number" && Number.isFinite(field.order)
              ? field.order
              : fieldIndex + 1,
          source: isFieldSource(field.source) ? field.source : "custom",
        }))
        .sort((a, b) => a.order - b.order)
        .map((field, index) => ({ ...field, order: index + 1 }));
      return {
        id:
          typeof memo.id === "string" && memo.id
            ? memo.id
            : `memo-${memoIndex + 1}`,
        kind,
        title: typeof memo.title === "string" ? memo.title : "",
        linkedChapterId:
          typeof memo.linkedChapterId === "string"
            ? memo.linkedChapterId
            : undefined,
        linkedLineId:
          typeof memo.linkedLineId === "string" ? memo.linkedLineId : undefined,
        ...Object.fromEntries(["linkedChapterIds", "linkedLineIds", "linkedCharacterNames"].filter(key => Array.isArray(memo[key])).map(key => [key, (memo[key] as unknown[]).filter((v): v is string => typeof v === "string")])),
        fields,
        order:
          typeof memo.order === "number" && Number.isFinite(memo.order)
            ? memo.order
            : memoIndex + 1,
        createdAt,
        updatedAt:
          typeof memo.updatedAt === "string" && memo.updatedAt
            ? memo.updatedAt
            : createdAt,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((memo, index) => ({ ...memo, order: index + 1 }));
}
