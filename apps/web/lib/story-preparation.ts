import { chapterLabel, type StoryCover, type StoryPlanning, type StoryProject } from '@knolstory/story-domain';
import {DEFAULT_COVER} from '@knolstory/story-domain';
export type PreparationMemo = StoryProject['creativeMemos'][number];
export function updatePreparationInfo(project: StoryProject, patch: Partial<Pick<StoryProject,'title'|'description'>>): StoryProject {
  return {...project,...patch};
}
export function updatePreparationCover(project: StoryProject, patch: Partial<StoryCover>): StoryProject {
  return {...project,cover:{...DEFAULT_COVER,...project.cover,...patch}};
}
export function updatePreparationPlanning(project: StoryProject, patch: Partial<StoryPlanning>): StoryProject {
  return {...project,planning:{...project.planning,...patch}};
}
export function addPreparationMemo(project: StoryProject, id: string, now: string, lineId?: string): StoryProject {
  if (!id || project.creativeMemos.some(m=>m.id===id)) throw new Error('메모 이름을 다시 확인해 주세요.');
  const line=project.lines.find(l=>l.id===lineId);
  if(lineId && !line) throw new Error('메모를 연결할 컷을 찾을 수 없어요.');
  const memo:PreparationMemo={id,kind:'free',title:'새 메모',order:Math.max(0,...project.creativeMemos.map(m=>m.order))+1,createdAt:now,updatedAt:now,
    fields:[{id:`${id}-body`,label:'메모 내용',value:'',source:'default',order:1}],
    ...(line?{linkedLineId:line.id,linkedChapterId:line.chapterId}:{})};
  return {...project,creativeMemos:[...project.creativeMemos,memo]};
}
export function updatePreparationMemo(project: StoryProject,id:string,patch:Partial<Omit<PreparationMemo,'id'|'createdAt'>>):StoryProject {
  if(!project.creativeMemos.some(m=>m.id===id)) throw new Error('수정할 메모를 찾을 수 없어요.');
  return {...project,creativeMemos:project.creativeMemos.map(m=>m.id===id?{...m,...patch}:m)};
}
export function deletePreparationMemo(project:StoryProject,id:string):StoryProject {
  return {...project,creativeMemos:project.creativeMemos.filter(m=>m.id!==id)};
}
export function memoDestinations(project:StoryProject,memo:PreparationMemo):{key:string;label:string;lineId?:string;missing:boolean}[] {
  const lineIds=[...new Set([memo.linkedLineId,...memo.linkedLineIds??[]].filter((s):s is string=>Boolean(s)))];
  // The legacy singular chapter paired with a cut identifies its parent, not an extra destination.
  const parent=project.lines.find(l=>l.id===memo.linkedLineId)?.chapterId;
  const chapterIds=[...new Set([memo.linkedChapterId===parent?undefined:memo.linkedChapterId,...memo.linkedChapterIds??[]].filter((s):s is string=>Boolean(s)))];
  const cuts=lineIds.map(id=>{
    const line=project.lines.find(l=>l.id===id); const chapter=project.chapters.find(c=>c.id===line?.chapterId);
    const index=project.lines.filter(l=>l.chapterId===chapter?.id).slice().sort((a,b)=>a.order-b.order).findIndex(l=>l.id===id);
    return {key:`cut:${id}`,label:chapter?`${chapterLabel(chapter)} · ${index+1}컷`:'연결한 컷을 찾을 수 없어요',lineId:chapter?line?.id:undefined,missing:!chapter};
  });
  return [...cuts,...chapterIds.map(id=>{
    const chapter=project.chapters.find(c=>c.id===id);
    const first=project.lines.filter(l=>l.chapterId===id).slice().sort((a,b)=>a.order-b.order)[0];
    return {key:`chapter:${id}`,label:chapter?chapterLabel(chapter):'연결한 장을 찾을 수 없어요',lineId:first?.id,missing:!chapter||!first};
  })];
}
