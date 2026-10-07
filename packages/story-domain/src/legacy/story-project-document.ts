import { canonicalizeProjectStage } from "./story-stage-composition";
import { canonicalizeProjectPresentation } from "./story-presentation";
import type { StoryProject } from "./story-data";
import {
  normalizeAndValidateStoryProject,
  type StoryDocumentIssue,
} from "./story-project-validation";

export type { StoryDocumentIssue } from "./story-project-validation";

export const STORY_DOCUMENT_TYPE = "story-maker-project" as const;
export const CURRENT_SCHEMA_VERSION = 5 as const;

export type StoryDocumentEnvelope = {
  documentType: typeof STORY_DOCUMENT_TYPE;
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  savedAt: string;
  appVersion: string;
  assetCatalogVersion?: string;
  project: StoryProject;
};

export type StoryDocumentEnvelopeV4 = Omit<StoryDocumentEnvelope, "schemaVersion"> & { schemaVersion: 4 };
export type StoryDocumentEnvelopeV3 = Omit<StoryDocumentEnvelope, "schemaVersion"> & { schemaVersion: 3 };
export type StoryDocumentEnvelopeV2 = Omit<StoryDocumentEnvelope, "schemaVersion"> & {schemaVersion: 2};
export type StoryDocumentEnvelopeV1 = Omit<StoryDocumentEnvelope, "schemaVersion" | "project"> & {
  schemaVersion: 1;
  project: Omit<StoryProject, "lines"> & {lines: (Omit<StoryProject["lines"][number], "presentation"> & {effect?: import("./story-scene-effect").StorySceneEffect})[]};
};

export type CreateStoryDocumentInput = {
  project: StoryProject;
  savedAt: string;
  appVersion: string;
  assetCatalogVersion?: string;
};

export type LegacyDocumentMetadata = Omit<
  CreateStoryDocumentInput,
  "project"
>;

export type StoryDocumentLoadResult =
  | { ok: true; source: "current" | "legacy-v1"; document: StoryDocumentEnvelope }
  | { ok: false; issues: StoryDocumentIssue[] };

const STRICT_ISO_UTC_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isStrictIsoUtcTimestamp(value: string) {
  if (!STRICT_ISO_UTC_TIMESTAMP.test(value)) return false;

  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

function requireNonBlank(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} must not be blank.`);
  }
}

export function createStoryDocument({
  project,
  savedAt,
  appVersion,
  assetCatalogVersion,
}: CreateStoryDocumentInput): StoryDocumentEnvelope {
  if (!isStrictIsoUtcTimestamp(savedAt)) {
    throw new Error("savedAt must be a strict ISO 8601 UTC timestamp.");
  }
  requireNonBlank(appVersion, "appVersion");
  if (assetCatalogVersion !== undefined) {
    requireNonBlank(assetCatalogVersion, "assetCatalogVersion");
  }

  return {
    documentType: STORY_DOCUMENT_TYPE,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt,
    appVersion,
    ...(assetCatalogVersion === undefined ? {} : { assetCatalogVersion }),
    project: canonicalizeProjectStage(canonicalizeProjectPresentation(structuredClone(project))),
  };
}

function failure(issues: StoryDocumentIssue[]): StoryDocumentLoadResult {
  return { ok: false, issues };
}

function createParsedDocument(
  project: StoryProject,
  metadata: LegacyDocumentMetadata,
  source: "current" | "legacy-v1",
): StoryDocumentLoadResult {
  try {
    return { ok: true, source, document: createStoryDocument({ ...metadata, project }) };
  } catch (error) {
    return failure([
      {
        code: "invalid-legacy-metadata",
        path: "$",
        message: error instanceof Error ? error.message : "Document metadata is invalid.",
      },
    ]);
  }
}

function parseVersionedDocument(value: Record<string, unknown>, version: 1 | 2 | 3 | 4 | 5): StoryDocumentLoadResult {
  const issues: StoryDocumentIssue[] = [];
  if (value.documentType !== STORY_DOCUMENT_TYPE) {
    issues.push({
      code: "unsupported-document-type",
      path: "$.documentType",
      message: `documentType must be '${STORY_DOCUMENT_TYPE}'.`,
    });
  }
  if (typeof value.savedAt !== "string" || !isStrictIsoUtcTimestamp(value.savedAt)) {
    issues.push({
      code: "invalid-value",
      path: "$.savedAt",
      message: "savedAt must be a strict ISO 8601 UTC timestamp.",
    });
  }
  if (typeof value.appVersion !== "string" || !value.appVersion.trim()) {
    issues.push({ code: "invalid-value", path: "$.appVersion", message: "appVersion must not be blank." });
  }
  if (
    value.assetCatalogVersion !== undefined &&
    (typeof value.assetCatalogVersion !== "string" || !value.assetCatalogVersion.trim())
  ) {
    issues.push({
      code: "invalid-value",
      path: "$.assetCatalogVersion",
      message: "assetCatalogVersion must not be blank when present.",
    });
  }
  const rawProject = value.project as {lines?: Record<string, unknown>[]} | undefined;
  if (Array.isArray(rawProject?.lines)) {
    rawProject.lines.forEach((line, index) => {
      const forbidden = version === 1 ? "presentation" : "effect";
      if (line && typeof line === "object" && forbidden in line) issues.push({code:"invalid-value",path:`$.project.lines[${index}].${forbidden}`,message:`${forbidden} is not allowed in this document version.`});
      if (version < 5 && line && typeof line === "object" && "backgroundMode" in line) issues.push({code:"invalid-value",path:`$.project.lines[${index}].backgroundMode`,message:"그림 없음 설정은 작품 버전 5에서 지원해요."});
    });
  }
  const normalized = normalizeAndValidateStoryProject(value.project);
  issues.push(...normalized.issues);
  if (issues.length > 0 || !normalized.project) return failure(issues);
  return createParsedDocument(
    normalized.project,
    {
      savedAt: value.savedAt as string,
      appVersion: value.appVersion as string,
      ...(value.assetCatalogVersion === undefined
        ? {}
        : { assetCatalogVersion: value.assetCatalogVersion as string }),
    },
    version === 1 ? "legacy-v1" : "current",
  );
}

export function parseStoryDocument(
  input: unknown,
  legacyMetadata?: LegacyDocumentMetadata,
): StoryDocumentLoadResult {
  if (typeof input === "string") return parseStoryDocumentJson(input, legacyMetadata);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure([
      { code: "invalid-type", path: "$", message: "Document input must be an object or JSON string." },
    ]);
  }
  const value = input as Record<string, unknown>;
  if ("documentType" in value || "schemaVersion" in value) {
    switch(value.schemaVersion) {
      case 1: return parseVersionedDocument(value, 1); // Strict v1 fields, then migrate through normalization.
      case 4: return parseVersionedDocument(value, 4);
      case 5: return parseVersionedDocument(value, 5);
      case 3: return parseVersionedDocument(value, 3);
      case 2: return parseVersionedDocument(value, 2); // Canonical only: reject legacy effect.
      default: return failure([{code:"unsupported-schema-version",path:"$.schemaVersion",message:"지원하지 않는 작품 버전이에요. 원본 파일을 보관해 주세요."}]);
    }
  }

  // Unversioned legacy projects cannot opt into a v5-only interpretation.
  if (Array.isArray(value.lines) && value.lines.some(line => line && typeof line === "object" && "backgroundMode" in line)) {
    return failure([{code:"invalid-value",path:"$.project.lines",message:"그림 없음 설정은 작품 버전 5에서 지원해요."}]);
  }
  const normalized = normalizeAndValidateStoryProject(value);
  if (normalized.issues.length > 0 || !normalized.project) return failure(normalized.issues);
  if (!legacyMetadata) {
    return failure([
      {
        code: "legacy-metadata-required",
        path: "$",
        message: "Legacy v1 projects need savedAt and appVersion migration metadata.",
      },
    ]);
  }
  return createParsedDocument(normalized.project, legacyMetadata, "legacy-v1");
}

export function parseStoryDocumentJson(
  raw: string,
  legacyMetadata?: LegacyDocumentMetadata,
): StoryDocumentLoadResult {
  try {
    return parseStoryDocument(JSON.parse(raw), legacyMetadata);
  } catch {
    return failure([
      { code: "invalid-json", path: "$", message: "Document JSON could not be parsed." },
    ]);
  }
}
