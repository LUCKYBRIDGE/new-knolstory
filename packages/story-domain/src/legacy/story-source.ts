export type LinearCreationMode = "rewrite" | "continue";
export type LinearCreationSource = {
  mode: LinearCreationMode;
  sourceStartChoiceLineId: string;
  writingStartLineId: string;
  prefixLineIds: string[];
  choices: { lineId: string; optionId: string; label: string }[];
  sourceRevision: string;
};

export function isLinearCreationSource(value: unknown): value is LinearCreationSource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const id = (s: unknown) => typeof s === "string" && s.trim().length > 0 && s.length <= 200;
  if (!Object.keys(v).every(k => ["mode", "sourceStartChoiceLineId", "writingStartLineId", "prefixLineIds", "choices", "sourceRevision"].includes(k))) return false;
  return (v.mode === "rewrite" || v.mode === "continue") && id(v.sourceStartChoiceLineId) && id(v.writingStartLineId) &&
    typeof v.sourceRevision === "string" && v.sourceRevision.length <= 200 &&
    Array.isArray(v.prefixLineIds) && v.prefixLineIds.length <= 10000 && v.prefixLineIds.every(id) &&
    new Set(v.prefixLineIds).size === v.prefixLineIds.length && !v.prefixLineIds.includes(v.writingStartLineId) &&
    Array.isArray(v.choices) && v.choices.length > 0 && v.choices.length <= 10000 &&
    v.choices.every(c => c && typeof c === "object" && Object.keys(c).every(k => ["lineId", "optionId", "label"].includes(k)) &&
      id(c.lineId) && id(c.optionId) && typeof c.label === "string" && c.label.length <= 2000) &&
    new Set(v.choices.map(c => c.lineId)).size === v.choices.length && v.choices.some(c => c.lineId === v.sourceStartChoiceLineId);
}

/** Provenance travels with the editable project. Absence means an unknown legacy origin. */
export type StorySource =
  | { kind: "blank" }
  | { kind: "baseEdition"; baseStoryId: string; baseEditionId: string; linearSetup?: true; linearCreation?: LinearCreationSource }
  | { kind: "publication"; publicationId: string; originalTitle: string; originalAuthorDisplayName: string; originalFingerprint: string }
  | { kind: "sharedFile"; originalTitle: string; originalAuthorDisplayName: string; originalFingerprint: string };

export function isStorySource(value: unknown): value is StorySource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const text = (key: string) => typeof v[key] === "string";
  const nonempty = (key: string) => text(key) && (v[key] as string).trim().length > 0;
  if (v.kind === "blank") return true;
  if (v.kind === "baseEdition") return nonempty("baseStoryId") && nonempty("baseEditionId") &&
    (v.linearSetup === undefined || v.linearSetup === true) &&
    (v.linearCreation === undefined || isLinearCreationSource(v.linearCreation));
  if (v.kind !== "publication" && v.kind !== "sharedFile") return false;
  return (v.kind !== "publication" || nonempty("publicationId")) && text("originalTitle") &&
    text("originalAuthorDisplayName") && nonempty("originalFingerprint");
}
