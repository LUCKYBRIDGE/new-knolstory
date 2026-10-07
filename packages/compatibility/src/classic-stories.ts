import seonnyeo from '../../../tests/fixtures/stories/seonnyeo-classic.json';
import heungbu from '../../../tests/fixtures/stories/heungbu-classic.json';
import onggojib from '../../../tests/fixtures/stories/onggojib-classic.json';
import rabbit from '../../../tests/fixtures/stories/rabbit-classic.json';
import { parseStoryDocument, type StoryDocumentEnvelope, type StoryProject } from '@knolstory/story-domain';

export type ClassicStoryId = 'seonnyeo-classic' | 'heungbu-classic' | 'onggojib-classic' | 'rabbit-classic';

// PRESERVE: getClassicReading() manuscripts extracted by scripts/extract-legacy-content.py
// from story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b, never the legacy checkout.
// Catalog IDs distinguish original readings; the authored project/chapter/cut IDs stay intact.
const originals = [
  { id: 'seonnyeo-classic', label: '선녀와 나무꾼', project: seonnyeo },
  { id: 'heungbu-classic', label: '흥부전', project: heungbu },
  { id: 'onggojib-classic', label: '옹고집전', project: onggojib },
  { id: 'rabbit-classic', label: '별주부전', project: rabbit },
] as const;

function loadOriginal(story: (typeof originals)[number]): StoryDocumentEnvelope {
  const loaded = parseStoryDocument(story.project, {
    savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-fixture',
  });
  if (!loaded.ok) throw new Error(`${story.id}: ${JSON.stringify(loaded.issues)}`);
  return loaded.document;
}

export const classicStories: readonly Readonly<{
  id: ClassicStoryId; label: string; project: StoryProject;
}>[] = originals.map(story => ({ id: story.id, label: story.label, project: loadOriginal(story).project }));

/** A validated, independent copy of the original manuscript, suitable for reading or editing. */
export function getClassicStory(id: ClassicStoryId): StoryDocumentEnvelope {
  const story = originals.find(story => story.id === id);
  if (!story) throw new Error('원작을 찾을 수 없어요.');
  return loadOriginal(story);
}
