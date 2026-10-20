import type { Chapter, StoryLine } from './story-data';

/** Retired act numbering is not another story hierarchy. Keep the actual title. */
export function normalizeChapterTitle(title:string):string {
  return title.replace(/^\s*(?:제\s*)?[0-9]+\s*막(?=\s|[:：·.\-]|$)[\s:：·.\-]*/u,'');
}

/** A chapter's narrative identity is independent of its list order and its cuts. */
export function chapterLabel(chapter: Pick<Chapter, 'order' | 'title' | 'chapterNumber' | 'branchLabel'>): string {
  const number = chapter.chapterNumber ?? chapter.order;
  const identity = `${number}장${chapter.branchLabel?.trim() ?? ''}`;
  const title = normalizeChapterTitle(chapter.title).trim();
  if (!title) return identity;
  // Old files often put numbering into the title. Preserve that authored label once.
  const prefix = title.match(/^\d+\s*장(?:[A-Za-z]+)?(?=\s|[·:：.-]|$)/u);
  if (prefix) {
    if (chapter.chapterNumber === undefined || prefix[0] === identity) return title;
    const content = title.slice(prefix[0].length).replace(/^[\s·:：.-]+/u, '');
    return content ? `${identity} · ${content}` : identity;
  }
  return `${identity} · ${title}`;
}
export function cutLabel(chapter: Chapter, cut: Pick<StoryLine, 'order'>): string {
  return `${chapterLabel(chapter)} · ${cut.order}컷`;
}
