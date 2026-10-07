export type { StoryProject, StoryLine, Chapter, StoryPlanning, StoryCharacter } from './legacy/story-data';
export * from './legacy/story-project-document';
export * from './legacy/story-stage-composition';
export * from './legacy/story-flow';
export * from './legacy/story-presentation';
export * from './legacy/story-cover';
export * from './legacy/cover-design';
import { parseStoryDocument, type StoryDocumentEnvelope } from './legacy/story-project-document';
import type { StoryLine } from './legacy/story-data';

/** Export validates the complete document and never rewrites the caller's data. */
export function serializeStoryDocument(document: StoryDocumentEnvelope): string {
  const loaded = parseStoryDocument(document);
  if (!loaded.ok) throw new Error(loaded.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
  return JSON.stringify(loaded.document, null, 2);
}

/** Preserve every unedited field, including flow, actors, cues, planning and cover. */
export function updateStoryLine(document: StoryDocumentEnvelope, lineId: string, patch: Partial<Omit<StoryLine, 'id' | 'chapterId'>>): StoryDocumentEnvelope {
  if (!document.project.lines.some(line => line.id === lineId)) throw new Error('수정할 컷을 찾을 수 없어요.');
  const candidate = { ...document, project: { ...document.project, lines: document.project.lines.map(line => line.id === lineId ? { ...line, ...structuredClone(patch) } : line) } };
  const loaded = parseStoryDocument(candidate);
  if (!loaded.ok) throw new Error(loaded.issues.map(issue => issue.message).join('\n'));
  return loaded.document;
}

export * from "./legacy/story-audio";

export * from './legacy/chapter-identity';
