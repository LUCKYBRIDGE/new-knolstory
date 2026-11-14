import {orderedStoryFlowLines,type StoryProject} from '@knolstory/story-domain';
import {pinImplicitFlow,reorderStoryChapters} from '@knolstory/runtime-core';
type Line=StoryProject['lines'][number];type Chapter=StoryProject['chapters'][number];
/**
 * Where a class writing task starts. The original edition is one straight line, so a chapter is enough;
 * the adaptation branches, so it starts at a choice point, and the teacher also says which paths
 * the student writes: every path, one path (the others stay as they are), or a new extra choice.
 *
 * Stored as `chapter:<id>`, `choice:<line>`, `choice:<line>:option:<option>` or `choice:<line>:new`.
 */
export type StartOption=Readonly<{value:string;label:string}>;
export type BranchScope=Readonly<{kind:'all'}>|Readonly<{kind:'option';optionId:string}>|Readonly<{kind:'new'}>;
export type StartPoint=Readonly<{kind:'chapter';chapterId:string}>|Readonly<{kind:'choice';lineId:string;scope:BranchScope}>;
const STORED=/^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$/;
const clip=(text:string,size:number)=>text.length>size?`${text.slice(0,size-1)}…`:text;
const letter=(index:number)=>String.fromCharCode(65+index);
export function parseStartPoint(point:string):StartPoint{
 if(point.startsWith('chapter:'))return {kind:'chapter',chapterId:point.slice(8)};
 if(!point.startsWith('choice:'))throw Error('과제의 시작 지점을 알 수 없어요.');
 const rest=point.slice(7),option=rest.indexOf(':option:');
 if(rest.endsWith(':new'))return {kind:'choice',lineId:rest.slice(0,-4),scope:{kind:'new'}};
 if(option>0)return {kind:'choice',lineId:rest.slice(0,option),scope:{kind:'option',optionId:rest.slice(option+8)}};
 return {kind:'choice',lineId:rest,scope:{kind:'all'}};
}
export function startPointOptions(project:StoryProject,edition:'original'|'knolstory'):StartOption[]{
 if(edition==='original')return [...project.chapters].sort((a,b)=>a.order-b.order).slice(1).map((chapter,index)=>({value:`chapter:${chapter.id}`,label:`${index+2}장 · ${clip(chapter.title,24)}부터`}));
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 return orderedStoryFlowLines(project).filter(line=>line.flow?.type==='choice').map((line,index)=>{
  const options=line.flow?.type==='choice'?line.flow.options.map(option=>option.label).join(' / '):'';
  return {value:`choice:${line.id}`,label:clip(`선택 ${index+1} · ${chapters.get(line.chapterId)?.title??''} (${options})`,60)};
 });
}
/** For a choice point: which paths the student writes. */
export function branchScopeOptions(project:StoryProject,choicePoint:string):StartOption[]{
 const point=parseStartPoint(choicePoint);if(point.kind!=='choice')return [];
 const line=project.lines.find(item=>item.id===point.lineId);if(line?.flow?.type!=='choice')return [];
 const base=`choice:${point.lineId}`;
 return [
  {value:base,label:'모든 갈래 · 선택지 뒤를 모두 새로 써요'},
  ...line.flow.options.map((option,index)=>({value:`${base}:option:${option.id}`,label:clip(`${letter(index)} 갈래만 · ‘${option.label}’ 뒤를 새로 써요 (다른 갈래는 그대로)`,80)})),
  ...(line.flow.options.length<4?[{value:`${base}:new`,label:'새 선택지 더하기 · 원래 갈래는 그대로 두고 새 갈래를 써요'}]:[]),
 ].filter(option=>STORED.test(option.value));
}
export function startPointLabel(project:StoryProject,point:string):string|null{
 const parsed=parseStartPoint(point);
 if(parsed.kind==='chapter')return startPointOptions(project,'original').find(option=>option.value===point)?.label??null;
 const choice=startPointOptions(project,'knolstory').find(option=>option.value===`choice:${parsed.lineId}`)?.label;
 if(!choice)return null;
 if(parsed.scope.kind==='all')return choice;
 const line=project.lines.find(item=>item.id===parsed.lineId);
 if(parsed.scope.kind==='new')return clip(`${choice} · 새 선택지 더하기`,120);
 const optionId=parsed.scope.optionId,index=line?.flow?.type==='choice'?line.flow.options.findIndex(option=>option.id===optionId):-1;
 return index<0?null:clip(`${choice} · ${letter(index)} 갈래만`,120);
}
const blankLine=(id:string,chapterId:string,ending:boolean):Line=>({id,chapterId,order:1,type:'narration',speaker:'narration',speakerName:'',text:'',leftAssetId:'',rightAssetId:'',backgroundId:'',purposeNote:'',emotionNote:'',directionNote:'',...(ending?{flow:{type:'goto',targetLineId:null}}:{})});
/** Successors in reading order: no flow means the next ordered cut. */
function successors(line:Line,next:Line|undefined):string[]{
 if(line.ending?.endsStory)return [];
 const flow=line.flow;
 if(!flow)return next?[next.id]:[];
 if(flow.type==='choice')return flow.options.map(option=>option.targetLineId).filter((id):id is string=>!!id);
 return [flow.targetLineId,...(flow.routes??[]).map(route=>route.targetLineId)].filter((id):id is string=>!!id);
}
/** Keeps targets that stay; others become an unfinished link ("") for the student to fill. */
function retarget(line:Line,keep:(id:string)=>boolean,fallback:string):Line{
 const flow=line.flow;if(!flow)return line;
 const fix=(id:string|null)=>id===null||id===''||keep(id)?id:fallback;
 if(flow.type==='choice')return {...line,flow:{...flow,options:flow.options.map(option=>({...option,targetLineId:fix(option.targetLineId)}))}};
 return {...line,flow:{...flow,targetLineId:fix(flow.targetLineId),...(flow.routes?{routes:flow.routes.filter(route=>route.targetLineId===null||keep(route.targetLineId))}:{})}};
}
export type TaskStart=Readonly<{project:StoryProject;startLineId:string|null}>;
/** The manuscript a student starts from, and the blank cut where their writing begins. */
export function trimToStartPoint(project:StoryProject,point:string|null|undefined,newId:()=>string):TaskStart{
 if(!point)return {project,startLineId:null};
 const parsed=parseStartPoint(point);
 if(parsed.kind==='chapter'){
  const start=project.chapters.find(chapter=>chapter.id===parsed.chapterId);if(!start)throw Error('과제의 시작 장을 찾지 못했어요.');
  const before=new Set(project.chapters.filter(chapter=>chapter.order<start.order).map(chapter=>chapter.id));
  const blank=blankLine(newId(),start.id,false),kept=new Set([...project.lines.filter(line=>before.has(line.chapterId)).map(line=>line.id),blank.id]);
  const lines=[...project.lines.filter(line=>before.has(line.chapterId)).map(line=>retarget(line,target=>kept.has(target),blank.id)),blank];
  return {project:finish(project,lines,project.chapters.filter(chapter=>chapter.order<=start.order)),startLineId:blank.id};
 }
 const ordered=orderedStoryFlowLines(project),index=new Map(ordered.map((line,at)=>[line.id,at]));
 const choice=ordered.find(line=>line.id===parsed.lineId);if(!choice||choice.flow?.type!=='choice')throw Error('과제의 시작 분기점을 찾지 못했어요.');
 const scope=parsed.scope;
 if(scope.kind==='option'&&!choice.flow.options.some(option=>option.id===scope.optionId))throw Error('과제의 갈래를 찾지 못했어요.');
 if(scope.kind==='new'&&choice.flow.options.length>=4)throw Error('이 분기점에는 선택지를 더 넣을 수 없어요.');
 const next=new Map<string,string[]>(),parents=new Map<string,string[]>();
 ordered.forEach((line,at)=>{const targets=successors(line,ordered[at+1]);next.set(line.id,targets);for(const target of targets)parents.set(target,[...(parents.get(target)??[]),line.id]);});
 // Every cut that can reach the choice point stays; reading continues naturally up to it.
 const kept=new Set([choice.id]),queue=[choice.id];
 while(queue.length){for(const parent of parents.get(queue.pop()!)??[])if(!kept.has(parent)){kept.add(parent);queue.push(parent);}}
 // Paths the student does not rewrite keep their whole original story.
 const untouched=scope.kind==='all'?[]:choice.flow.options.filter(option=>scope.kind==='new'||option.id!==scope.optionId);
 const forward=untouched.map(option=>option.targetLineId).filter((id):id is string=>!!id&&index.has(id));
 while(forward.length){const id=forward.pop()!;if(kept.has(id))continue;kept.add(id);forward.push(...(next.get(id)??[]));}
 const host=project.chapters.find(chapter=>chapter.id===choice.chapterId)!,top=Math.max(...project.chapters.map(chapter=>chapter.order));
 const number=(host.chapterNumber??host.order)+1;
 const blankChapter=(title:string,at:number,branch:string):Chapter=>{const {branchLabel:_host,...rest}=host;return {...rest,id:newId(),order:top+at+1,title,chapterNumber:number,branchLabel:branch,summary:'',purpose:'',keyEvents:'',nextChapterIdea:''};};
 const written=scope.kind==='all'?choice.flow.options.map((option,at)=>({option,at}))
  :scope.kind==='option'?choice.flow.options.map((option,at)=>({option,at})).filter(item=>item.option.id===scope.optionId)
  :[{option:{id:newId(),label:'새 선택지',targetLineId:''},at:choice.flow.options.length}];
 const branches=written.map(({option,at},order)=>{const chapter=blankChapter(scope.kind==='new'?'새 갈래':`${option.label} 이후`,order,letter(at));return {option,chapter,line:blankLine(newId(),chapter.id,true)};});
 const target=new Map(branches.map(branch=>[branch.option.id,branch.line.id]));
 const options=[...choice.flow.options,...(scope.kind==='new'?[branches[0]!.option]:[])].map(option=>({...option,targetLineId:target.get(option.id)??option.targetLineId}));
 const lines=ordered.filter(line=>kept.has(line.id)).sort((a,b)=>index.get(a.id)!-index.get(b.id)!).map(line=>line.id===choice.id
  ?{...line,flow:{type:'choice' as const,options}}
  :retarget(line,id=>kept.has(id),''));
 const chapterIds=new Set(lines.map(line=>line.chapterId));
 const keptChapters=project.chapters.filter(chapter=>chapterIds.has(chapter.id));
 const before=finish(project,lines,keptChapters);
 const after=finish(project,[...lines,...branches.map(branch=>branch.line)],[...keptChapters,...branches.map(branch=>branch.chapter)]);
 // New path chapters sit right after the choice's chapter, without changing where any kept cut leads.
 const sorted=[...keptChapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id),at=sorted.indexOf(host.id)+1;
 const arranged=reorderStoryChapters(pinImplicitFlow(before,after),[...sorted.slice(0,at),...branches.map(branch=>branch.chapter.id),...sorted.slice(at)]);
 return {project:arranged,startLineId:branches[0]!.line.id};
}
function finish(project:StoryProject,lines:Line[],chapters:Chapter[]):StoryProject{
 const ids=new Set(lines.map(line=>line.id));
 const {continuation,...rest}=project;
 return {...rest,chapters,lines,...(continuation&&ids.has(continuation.lineId)?{continuation}:{})};
}
