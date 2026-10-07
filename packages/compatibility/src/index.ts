import seonnyeo from '../../../tests/fixtures/stories/seonnyeo.json';
import heungbu from '../../../tests/fixtures/stories/heungbu.json';
import onggojib from '../../../tests/fixtures/stories/onggojib.json';
import rabbit from '../../../tests/fixtures/stories/rabbit.json';
import { parseStoryDocument, type StoryProject } from '@knolstory/story-domain';
export const LEGACY_BASELINE = '18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b';
export type RepresentativeStoryId = 'seonnyeo' | 'heungbu' | 'onggojib' | 'rabbit';
const rawStories = [{ id: 'seonnyeo', label: '선녀와 나무꾼', project: seonnyeo }, { id: 'heungbu', label: '흥부와 놀부', project: heungbu }, { id: 'onggojib', label: '옹고집전', project: onggojib }, { id: 'rabbit', label: '별주부전', project: rabbit }] as const;
export const representativeStories = rawStories.map(story => {
  const loaded = parseStoryDocument(story.project, { savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-fixture' });
  if (!loaded.ok) throw new Error(`${story.id}: ${JSON.stringify(loaded.issues)}`);
  return { id: story.id, label: story.label, project: loaded.document.project as StoryProject };
});
export function getRepresentativeStory(id: RepresentativeStoryId) {
  const story = representativeStories.find(story => story.id === id);
  if (!story) throw new Error('대표 작품을 찾을 수 없어요.');
  const loaded = parseStoryDocument(story.project, { savedAt: '2026-10-06T00:00:00.000Z', appVersion: 'knolstory-next-fixture' });
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
  return loaded.document;
}
export * from './story-table';
export * from './shortstory';
export * from './excel';

export * from "./classic-stories";

export * from "./story-direction";
