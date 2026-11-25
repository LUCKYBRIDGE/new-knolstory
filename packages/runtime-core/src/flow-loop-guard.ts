import {findStoryFlowIssues,type StoryProject} from '@knolstory/story-domain';

const loops=(project:Pick<StoryProject,'chapters'|'lines'>)=>new Set(findStoryFlowIssues(project).filter(issue=>issue.kind==='cycle').map(issue=>issue.lineId));
/** Refuse a move that makes reading go round the same cuts again and again where it did not before. */
export function assertNoNewLoop(before:Pick<StoryProject,'chapters'|'lines'>,after:StoryProject):StoryProject{
 const was=loops(before);
 if([...loops(after)].some(lineId=>!was.has(lineId)))throw new Error('이렇게 옮기면 이야기가 같은 컷들을 계속 되풀이하게 돼요. 이 컷에서 갈라진 길이 다시 만나는 곳보다 앞에 두거나, 다른 자리를 골라 주세요.');
 return after;
}
