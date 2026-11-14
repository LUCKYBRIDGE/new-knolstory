import {orderedStoryFlowLines,type StoryProject} from '@knolstory/story-domain';
type Line=StoryProject['lines'][number];type Chapter=StoryProject['chapters'][number];
/**
 * Where a class writing task starts. The original edition is one straight line, so a chapter is enough;
 * the adaptation branches, so it starts at a choice point. Everything that leads to the start point stays,
 * everything after it is left blank for the student.
 */
export type StartOption=Readonly<{value:string;label:string}>;
const clip=(text:string,size:number)=>text.length>size?`${text.slice(0,size-1)}…`:text;
export function startPointOptions(project:StoryProject,edition:'original'|'knolstory'):StartOption[]{
 if(edition==='original')return [...project.chapters].sort((a,b)=>a.order-b.order).slice(1).map((chapter,index)=>({value:`chapter:${chapter.id}`,label:`${index+2}장 · ${clip(chapter.title,24)}부터`}));
 const chapters=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 return orderedStoryFlowLines(project).filter(line=>line.flow?.type==='choice').map((line,index)=>{
  const options=line.flow?.type==='choice'?line.flow.options.map(option=>option.label).join(' / '):'';
  return {value:`choice:${line.id}`,label:clip(`선택 ${index+1} · ${chapters.get(line.chapterId)?.title??''} (${options})`,60)};
 });
}
export function startPointLabel(project:StoryProject,point:string):string|null{
 return startPointOptions(project,point.startsWith('chapter:')?'original':'knolstory').find(option=>option.value===point)?.label??null;
}
const blankLine=(id:string,chapterId:string,ending:boolean):Line=>({id,chapterId,order:1,type:'narration',speaker:'narration',speakerName:'',text:'',leftAssetId:'',rightAssetId:'',backgroundId:'',purposeNote:'',emotionNote:'',directionNote:'',...(ending?{flow:{type:'goto',targetLineId:null}}:{})});
/** Successors in reading order: no flow means the next ordered cut. */
function successors(line:Line,next:Line|undefined):string[]{
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
export function trimToStartPoint(project:StoryProject,point:string|null|undefined,newId:()=>string):StoryProject{
 if(!point)return project;
 const [kind,id]=[point.slice(0,point.indexOf(':')),point.slice(point.indexOf(':')+1)];
 if(kind==='chapter'){
  const start=project.chapters.find(chapter=>chapter.id===id);if(!start)throw Error('과제의 시작 장을 찾지 못했어요.');
  const before=new Set(project.chapters.filter(chapter=>chapter.order<start.order).map(chapter=>chapter.id));
  const blank=blankLine(newId(),start.id,false),kept=new Set([...project.lines.filter(line=>before.has(line.chapterId)).map(line=>line.id),blank.id]);
  const lines=[...project.lines.filter(line=>before.has(line.chapterId)).map(line=>retarget(line,target=>kept.has(target),blank.id)),blank];
  return finish(project,lines,project.chapters.filter(chapter=>chapter.order<=start.order));
 }
 if(kind!=='choice')throw Error('과제의 시작 지점을 알 수 없어요.');
 const ordered=orderedStoryFlowLines(project),index=new Map(ordered.map((line,at)=>[line.id,at]));
 const choice=ordered.find(line=>line.id===id);if(!choice||choice.flow?.type!=='choice')throw Error('과제의 시작 분기점을 찾지 못했어요.');
 // Every cut that can reach the choice point stays; reading continues naturally up to it.
 const parents=new Map<string,string[]>();
 ordered.forEach((line,at)=>{for(const target of successors(line,ordered[at+1]))parents.set(target,[...(parents.get(target)??[]),line.id]);});
 const kept=new Set([choice.id]),queue=[choice.id];
 while(queue.length){for(const parent of parents.get(queue.pop()!)??[])if(!kept.has(parent)){kept.add(parent);queue.push(parent);}}
 const host=project.chapters.find(chapter=>chapter.id===choice.chapterId)!,top=Math.max(...project.chapters.map(chapter=>chapter.order));
 const branches=choice.flow.options.map((option,at)=>{const chapter:Chapter={...host,id:newId(),order:top+at+1,title:`${option.label} 이후`,summary:'',purpose:'',keyEvents:'',nextChapterIdea:'',...(host.branchLabel!==undefined?{branchLabel:option.label}:{})};return {option,chapter,line:blankLine(newId(),chapter.id,true)};});
 const lines=ordered.filter(line=>kept.has(line.id)).sort((a,b)=>index.get(a.id)!-index.get(b.id)!).map(line=>line.id===choice.id
  ?{...line,flow:{type:'choice' as const,options:branches.map(({option,line:blank})=>({...option,targetLineId:blank.id}))}}
  :retarget(line,target=>kept.has(target),''));
 const chapterIds=new Set(lines.map(line=>line.chapterId));
 return finish(project,[...lines,...branches.map(branch=>branch.line)],[...project.chapters.filter(chapter=>chapterIds.has(chapter.id)),...branches.map(branch=>branch.chapter)]);
}
function finish(project:StoryProject,lines:Line[],chapters:Chapter[]):StoryProject{
 const ids=new Set(lines.map(line=>line.id));
 const {continuation,...rest}=project;
 return {...rest,chapters,lines,...(continuation&&ids.has(continuation.lineId)?{continuation}:{})};
}
