import { describe,it,expect } from 'vitest';
import { DEFAULT_COVER } from '@knolstory/story-domain';
import { getShortStoryOriginal, encodeShortStory, decodeShortStory } from '@knolstory/compatibility';
import { applyShortStoryCover, shortStoryCoverProject } from './shortstory-cover';
describe('reuse three-face cover recipe without story runtime conversion',()=>{
 it('renders existing saved layers and maps applied title/author/cover while preserving all pages',()=>{
  const original=getShortStoryOriginal('rabbit'),metadata=shortStoryCoverProject(original);expect(metadata.cover!.backgroundId).toBe(original.cover.backgroundId);expect(metadata.lines).toEqual([]);expect(metadata.chapters).toEqual([]);
  const changed=applyShortStoryCover(original,{...DEFAULT_COVER,backgroundId:original.cover.backgroundId,author:'나',subtitle:'나의 소개',authorNote:'작가의 말'},'내 표지');expect(changed.pages).toEqual(original.pages);expect(changed.cover.design?.faces.front.elements.length).toBeGreaterThan(0);expect(changed.cover.design?.faces.spine).toBeTruthy();expect(changed.cover.design?.faces.back).toBeTruthy();expect(decodeShortStory(encodeShortStory(changed))).toEqual(changed);expect(original.title).toBe('별주부전');
 });
});
