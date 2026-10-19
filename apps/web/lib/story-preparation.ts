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

export type MemoField = PreparationMemo['fields'][number];
const orderedFields = (memo: PreparationMemo) => memo.fields.slice().sort((a,b)=>a.order-b.order);
const numberedFields = (fields: MemoField[]) => fields.map((field,index)=>({...field,order:index+1}));
function requireMemoField(memo:PreparationMemo,id:string):MemoField {
  const field=memo.fields.find(f=>f.id===id);
  if(!field) throw new Error('수정할 메모 항목을 찾을 수 없어요.');
  return field;
}
function requireFieldLabel(label:string) {
  if(!label.trim()) throw new Error('항목 이름을 입력해 주세요.');
}
export function addMemoField(memo:PreparationMemo,id:string,label:string):PreparationMemo {
  requireFieldLabel(label);
  if(!id.trim()||memo.fields.some(f=>f.id===id)) throw new Error('메모 항목 ID를 다시 확인해 주세요.');
  return {...memo,fields:[...memo.fields,{id,label,value:'',order:Math.max(0,...memo.fields.map(f=>f.order))+1,source:'custom'}]};
}
export function renameMemoField(memo:PreparationMemo,id:string,label:string):PreparationMemo {
  requireMemoField(memo,id);requireFieldLabel(label);
  return {...memo,fields:memo.fields.map(f=>f.id===id?{...f,label}:f)};
}
export function moveMemoField(memo:PreparationMemo,id:string,direction:-1|1):PreparationMemo {
  requireMemoField(memo,id);
  const fields=orderedFields(memo),index=fields.findIndex(f=>f.id===id),target=index+direction;
  if(target<0||target>=fields.length)return memo;
  const moved=fields.map((field,i)=>i===index?fields[target]:i===target?fields[index]:field);
  return {...memo,fields:numberedFields(moved)};
}
export function deleteMemoField(memo:PreparationMemo,id:string):PreparationMemo {
  requireMemoField(memo,id);
  return {...memo,fields:numberedFields(orderedFields(memo).filter(f=>f.id!==id))};
}
/** Restore only the removed field so edits made after deletion survive undo. */
export function restoreMemoField(memo:PreparationMemo,field:MemoField,index:number):PreparationMemo {
  if(memo.fields.some(f=>f.id===field.id))return memo;
  const fields=orderedFields(memo),position=Math.max(0,Math.min(index,fields.length));
  return {...memo,fields:numberedFields([...fields.slice(0,position),field,...fields.slice(position)])};
}
export type MemoFilter = {query?:string;kind?:PreparationMemo['kind']|'';scope?:'all'|'work'|'current';lineId?:string;chapterId?:string};
/** A cut link's accompanying chapter is context, not a link to every cut in that chapter. */
export function relatedPreparationMemos(memos:PreparationMemo[],lineId:string,chapterId:string):PreparationMemo[]{
 return filterPreparationMemos(memos,{}).filter(memo=>{
  const cuts=[memo.linkedLineId,...memo.linkedLineIds??[]].filter(Boolean);
  return cuts.includes(lineId)||(memo.linkedChapterIds??[]).includes(chapterId)||(!cuts.length&&memo.linkedChapterId===chapterId);
 });
}
export function filterPreparationMemos(memos:PreparationMemo[],filter:MemoFilter):PreparationMemo[] {
  const query=(filter.query??'').trim().toLocaleLowerCase();
  return memos.filter(memo=>{
    if(filter.kind&&memo.kind!==filter.kind)return false;
    const lineIds=[memo.linkedLineId,...memo.linkedLineIds??[]].filter(Boolean);
    const chapterIds=[memo.linkedChapterId,...memo.linkedChapterIds??[]].filter(Boolean);
    if(filter.scope==='work'&&(lineIds.length||chapterIds.length))return false;
    if(filter.scope==='current'&&!((filter.lineId&&lineIds.includes(filter.lineId))||(filter.chapterId&&chapterIds.includes(filter.chapterId))))return false;
    const content=[memo.title,...memo.linkedCharacterNames??[],...memo.fields.flatMap(f=>[f.label,f.value])].join('\n').toLocaleLowerCase();
    return !query||content.includes(query);
  }).slice().sort((a,b)=>a.order-b.order);
}
