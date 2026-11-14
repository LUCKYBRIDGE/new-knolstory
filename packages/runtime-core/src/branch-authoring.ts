import {createStoryDocument,normalizeChapterTitle,orderedStoryFlowLines,parseStoryDocument,resolveStageComposition,stageProjection,type Chapter,type StoryLine,type StoryProject} from '@knolstory/story-domain';
import {duplicateStoryCut} from './editor-authoring';

/**
 * Branch authoring: whole-structure edits that writers ask for in story words
 * ("split the story here", "write this path on its own", "arrange chapters by reading order").
 * Every operation keeps where each existing cut leads, so reading never changes by accident.
 */
function validate(project:StoryProject):StoryProject{
 const candidate={...project,updatedAt:new Date().toISOString()};
 const result=parseStoryDocument(createStoryDocument({project:candidate,savedAt:candidate.updatedAt,appVersion:'knolstory-next'}));
 if(!result.ok)throw new Error(result.issues.map(issue=>issue.message).join('\n'));
 return candidate;
}
function nextOf(project:Pick<StoryProject,'chapters'|'lines'>){
 const ordered=orderedStoryFlowLines(project);
 return new Map(ordered.map((line,index)=>[line.id,ordered[index+1]?.id??null]));
}
/** Cuts without an explicit exit continue to the next stored cut. After a reorder, pin any whose next cut changed. */
export function pinImplicitFlow(before:Pick<StoryProject,'chapters'|'lines'>,after:StoryProject):StoryProject{
 const was=nextOf(before),now=nextOf(after);
 return {...after,lines:after.lines.map(line=>{
  if(line.flow||line.ending?.endsStory||!was.has(line.id))return line;
  const target=was.get(line.id)!;
  return target===now.get(line.id)?line:{...line,flow:{type:'goto',targetLineId:target}};
 })};
}
const titleNumbered=(chapter:Chapter)=>/^\d+\s*장/u.test(normalizeChapterTitle(chapter.title).trim());
/**
 * Store chapters in the given order. A chapter whose number came from its old position keeps that number,
 * so moving chapters never renames them; pass labels to renumber on purpose.
 */
export function reorderStoryChapters(project:StoryProject,ids:readonly string[],labels?:ReadonlyMap<string,{chapterNumber:number;branchLabel?:string}>):StoryProject{
 const sorted=[...project.chapters].sort((a,b)=>a.order-b.order);
 const listed=ids.filter(id=>sorted.some(chapter=>chapter.id===id));
 const sequence=[...listed,...sorted.map(chapter=>chapter.id).filter(id=>!listed.includes(id))];
 const chapters=project.chapters.map(chapter=>{
  const order=sequence.indexOf(chapter.id)+1,label=labels?.get(chapter.id);
  if(label){const {branchLabel:_old,...rest}=chapter;return {...rest,order,chapterNumber:label.chapterNumber,...(label.branchLabel?{branchLabel:label.branchLabel}:{})};}
  return order!==chapter.order&&chapter.chapterNumber===undefined&&!titleNumbered(chapter)?{...chapter,order,chapterNumber:chapter.order}:{...chapter,order};
 });
 return validate(pinImplicitFlow(project,{...project,chapters}));
}

export type StorySplitMode='rejoin'|'separate';
export type StorySplitCheck=Readonly<{ok:true;continuationLineId:string|null}>|Readonly<{ok:false;reason:string}>;
/** Whether a cut can become a fork, and where its story currently goes on. */
export function checkStorySplit(project:StoryProject,lineId:string):StorySplitCheck{
 const ordered=orderedStoryFlowLines(project),index=ordered.findIndex(line=>line.id===lineId),source=ordered[index];
 if(!source)return {ok:false,reason:'나눌 컷을 찾지 못했어요.'};
 if(source.flow?.type==='choice')return {ok:false,reason:'이미 선택지가 있는 컷이에요. 선택지 문구와 도착 컷을 고쳐 주세요.'};
 if(source.flow?.type==='goto'&&source.flow.routes?.length)return {ok:false,reason:'점수에 따라 길이 갈리는 컷이에요. 고급 설정에서 점수 연결을 먼저 정리해 주세요.'};
 const continuationLineId=source.ending?.endsStory?null:source.flow?.type==='goto'?source.flow.targetLineId||null:ordered[index+1]?.id??null;
 return {ok:true,continuationLineId};
}
export type StorySplitResult=Readonly<{project:StoryProject;newLineIds:readonly string[]}>;
/**
 * Turn one cut into a fork with 2–3 choices. Each new path gets its own chapter right after the source chapter.
 * rejoin: every path returns to the story that followed the cut.
 * separate: the story that followed becomes the first path; the new paths each end on their own.
 */
export function splitStoryHere(project:StoryProject,lineId:string,input:{labels:readonly string[];mode:StorySplitMode},createId:()=>string):StorySplitResult{
 const check=checkStorySplit(project,lineId);
 if(!check.ok)throw new Error(check.reason);
 const labels=input.labels.map(label=>label.trim());
 if(labels.length<2||labels.length>3||labels.some(label=>!label))throw new Error('선택지 문구를 2~3개 적어 주세요.');
 if(labels.some(label=>label.length>80))throw new Error('선택지 문구는 80자 이내로 적어 주세요.');
 const next=check.continuationLineId;
 if(input.mode==='rejoin'&&!next)throw new Error('이 컷 뒤에 이어지는 이야기가 없어요. ‘각자 끝나요’를 골라 주세요.');
 const source=project.lines.find(line=>line.id===lineId)!,chapter=project.chapters.find(item=>item.id===source.chapterId)!;
 const used=new Set([...project.lines,...project.chapters].map(item=>item.id));
 const fresh=()=>{const id=createId();if(!id||used.has(id))throw new Error('새 ID가 겹쳤어요. 다시 시도해 주세요.');used.add(id);return id;};
 const keepFirst=input.mode==='separate'&&!!next;
 const paths=labels.map((label,index)=>({label,index,optionId:fresh(),...(index===0&&keepFirst?{}:{chapterId:fresh(),lineId:fresh()})}));
 const number=(chapter.chapterNumber??chapter.order)+1;
 const composition=resolveStageComposition(chapter,source,project);
 const actorFields=source.inheritActors?{stageComposition:undefined,leftAssetId:'',rightAssetId:''}:{stageComposition:structuredClone(composition),...stageProjection(composition)};
 const newChapters:Chapter[]=[],newLines:StoryLine[]=[];
 // Cuts after the fork in the same chapter are the story that follows it: they get their own chapter,
 // so chapters read fork → paths → what follows, never back into the fork's chapter.
 const trailing=project.lines.filter(line=>line.chapterId===chapter.id&&line.order>source.order).sort((a,b)=>a.order-b.order);
 const {branchLabel:_sourceBranch,...plainChapter}=chapter;
 const following=trailing.length?{...plainChapter,id:fresh(),title:keepFirst?paths[0]!.label:'다시 만나는 이야기',order:chapter.order,chapterNumber:number+(keepFirst?0:1),...(keepFirst?{branchLabel:'A'}:{}),summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[]} satisfies Chapter:null;
 const moved=new Map(trailing.map((line,index)=>{
  const fields:Partial<StoryLine>={chapterId:following!.id,order:index+1};
  // The first moved cut can no longer inherit actors from the cut before it.
  if(index===0&&line.inheritActors){const stage=resolveStageComposition(chapter,line,project);Object.assign(fields,{inheritActors:false,stageComposition:stage,...stageProjection(stage)});}
  return [line.id,{...line,...fields}];
 }));
 for(const path of paths){
  if(!path.chapterId||!path.lineId)continue;
  newChapters.push({...chapter,id:path.chapterId,title:path.label,order:chapter.order,chapterNumber:number,branchLabel:String.fromCharCode(65+path.index),summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[]});
  newLines.push({...source,...actorFields,id:path.lineId,chapterId:path.chapterId,order:1,type:'narration',speaker:'narration',speakerName:'해설',text:'',textVariants:undefined,visibility:undefined,workingTitle:'',coSpeakerNames:[],purposeNote:'',emotionNote:'',directionNote:'',ending:undefined,audio:undefined,
   presentation:source.presentation?.actors?{actors:structuredClone(source.presentation.actors)}:undefined,
   flow:{type:'goto',targetLineId:input.mode==='rejoin'?next:null}});
 }
 const forked:StoryProject={...project,chapters:[...project.chapters,...(following?[following]:[]),...newChapters],lines:[...project.lines.map(line=>line.id===lineId
  ?{...line,ending:undefined,flow:{type:'choice' as const,options:paths.map(path=>({id:path.optionId,label:path.label,targetLineId:path.lineId??next}))}}
  :moved.get(line.id)??line),...newLines]};
 // The fork's own exit is now explicit; keep every other cut leading where it led before.
 const pinned=pinImplicitFlow(project,forked);
 const sorted=[...project.chapters].sort((a,b)=>a.order-b.order).map(item=>item.id);
 const at=sorted.indexOf(chapter.id)+1;
 const added=newChapters.map(item=>item.id),after=following?keepFirst?[following.id,...added]:[...added,following.id]:added;
 const ids=[...sorted.slice(0,at),...after,...sorted.slice(at)];
 return {project:reorderStoryChapters(pinned,ids),newLineIds:newLines.map(line=>line.id)};
}

/**
 * A cut reached from several paths is shared: editing it changes every path.
 * Give the path that comes from `fromLineId` its own copy; the copy then continues to the same next cut.
 */
export function separatePathCut(project:StoryProject,lineId:string,fromLineId:string,newLineId:string):StoryProject{
 const target=project.lines.find(line=>line.id===lineId),from=project.lines.find(line=>line.id===fromLineId);
 if(!target||!from)throw new Error('나눌 컷을 찾지 못했어요.');
 const was=nextOf(project);
 const leadsHere=(line:StoryLine)=>line.flow?.type==='choice'?line.flow.options.some(option=>option.targetLineId===lineId)
  :line.flow?.type==='goto'?line.flow.targetLineId===lineId||!!line.flow.routes?.some(route=>route.targetLineId===lineId)
  :!line.ending?.endsStory&&was.get(line.id)===lineId;
 const incoming=project.lines.filter(leadsHere);
 if(!leadsHere(from))throw new Error('이 길은 지금 컷으로 이어지지 않아요.');
 if(incoming.length<2)throw new Error('한 길에서만 오는 컷이라 따로 쓸 필요가 없어요.');
 const copied=pinImplicitFlow(project,duplicateStoryCut(project,lineId,newLineId));
 return validate({...copied,lines:copied.lines.map(line=>{
  if(line.id!==fromLineId)return line;
  if(line.flow?.type==='choice')return {...line,flow:{...line.flow,options:line.flow.options.map(option=>option.targetLineId===lineId?{...option,targetLineId:newLineId}:option)}};
  if(line.flow?.type==='goto')return {...line,flow:{...line.flow,targetLineId:line.flow.targetLineId===lineId?newLineId:line.flow.targetLineId,...(line.flow.routes?{routes:line.flow.routes.map(route=>route.targetLineId===lineId?{...route,targetLineId:newLineId}:route)}:{})}};
  return {...line,flow:{type:'goto',targetLineId:newLineId}};
 })});
}
