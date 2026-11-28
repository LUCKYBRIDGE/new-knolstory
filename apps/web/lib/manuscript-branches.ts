import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {storyPaths} from './story-path';

// 원고 · 갈래 줄: the manuscript stays one path, one chapter at a time. Under a choice cut a strip shows every way at once —
// where each goes, how long it is, its first line and where it leads on — and each way can be peeked at or opened.

type Line=StoryProject['lines'][number];
type Paths=ReturnType<typeof storyPaths>;
export type BranchWay=Readonly<{
 optionId:string;
 /** ‘A. 잔치 손님으로’ */
 mark:string;
 /** The way's first cut; absent while the option still waits for its cut. */
 lineId?:string;
 /** ‘2장 · 용궁 잔치 · 3컷’ */
 where?:string;
 /** The way's cuts until it leaves its chapter or meets a fork: ‘토끼: 용궁 잔치라니…’ */
 peek:readonly string[];
 /** ‘→ 4장 · 돌아온 토끼’, ‘이야기 끝’, … */
 leadsTo?:string;
 leadsToLineId?:string;
}>;
export type BranchStrip=Readonly<{choiceLineId:string;ways:readonly BranchWay[];note?:string}>;
export type BranchOrigin=Readonly<{choiceLineId:string;from:string;optionId:string;strip:BranchStrip}>;

const PEEK_CUTS=12,PEEK_CHARS=60;
const clip=(text:string)=>{const flat=text.replace(/\s+/g,' ').trim();return flat.length>PEEK_CHARS?`${flat.slice(0,PEEK_CHARS-1)}…`:flat;};
const who=(line:Line)=>line.type==='dialogue'?line.speakerName.trim()||'대사':'해설';
export const optionMark=(index:number,label:string)=>`${String.fromCharCode(65+index)}. ${label.trim()||'문구 없는 선택지'}`;

function chapterOf(project:StoryProject,line:Line){return project.chapters.find(chapter=>chapter.id===line.chapterId);}
function chapterName(project:StoryProject,line:Line){const chapter=chapterOf(project,line);return chapter?chapterLabel(chapter):'';}

/** Follow one way from its first cut while it stays a single path in one chapter. */
function walk(project:StoryProject,paths:Paths,lines:ReadonlyMap<string,Line>,first:Line){
 const cuts=[first],seen=new Set([first.id]);
 for(;;){
  const step=paths.next(cuts.at(-1)!.id);
  if(step.kind!=='next')return {cuts,step};
  const next=lines.get(step.lineId);
  if(!next||next.chapterId!==first.chapterId||seen.has(next.id)||cuts.length>=200)return {cuts,step};
  cuts.push(next);seen.add(next.id);
 }
}

function leads(project:StoryProject,lines:ReadonlyMap<string,Line>,step:ReturnType<Paths['next']>):{text:string;lineId?:string}{
 if(step.kind==='end')return {text:'이야기 끝'};
 if(step.kind==='pending')return {text:'다음이 아직 없어요'};
 if(step.kind==='choice')return {text:'→ 다음 갈림길'};
 if(step.kind==='routes')return {text:'→ 조건에 따라 나뉘어요'};
 const target=lines.get(step.lineId);
 return target?{text:`→ ${chapterName(project,target)}`,lineId:target.id}:{text:'다음이 아직 없어요'};
}

/** The ways out of a choice cut, or null when the cut has no choices. */
export function branchStrip(project:StoryProject,choiceLineId:string,paths:Paths=storyPaths(project)):BranchStrip|null{
 const step=paths.next(choiceLineId);
 if(step.kind!=='choice')return null;
 const lines=new Map(project.lines.map(line=>[line.id,line]));
 const ways=step.options.map((option,index):BranchWay=>{
  const mark=optionMark(index,option.label),first=option.lineId?lines.get(option.lineId):undefined;
  if(!first)return {optionId:option.id,mark,peek:[]};
  const {cuts,step:after}=walk(project,paths,lines,first),onward=leads(project,lines,after);
  return {optionId:option.id,mark,lineId:first.id,where:`${chapterName(project,first)} · ${cuts.length}컷`,
   peek:[...cuts.slice(0,cuts.length>PEEK_CUTS?PEEK_CUTS-1:PEEK_CUTS).map(cut=>`${who(cut)}: ${clip(cut.text)||'아직 글이 없어요.'}`),...(cuts.length>PEEK_CUTS?[`…그 뒤 ${cuts.length-PEEK_CUTS+1}컷 더`]:[])],leadsTo:onward.text,...(onward.lineId?{leadsToLineId:onward.lineId}:{})};
 });
 const meets=ways.map(way=>way.leadsToLineId);
 const together=ways.length>1&&meets.every(id=>id&&id===meets[0]);
 const empty=ways.filter(way=>!way.lineId).length;
 const note=together?`모든 갈래가 ${ways[0]!.leadsTo!.slice(2)}에서 다시 만나요.`:empty?`아직 비어 있는 갈래가 ${empty}개 있어요.`:undefined;
 return {choiceLineId,ways,...(note?{note}:{})};
}

/** When a chapter starts a way out of a choice in another chapter: where it came from, and the other ways. */
export function branchOrigin(project:StoryProject,firstLineId:string,paths:Paths=storyPaths(project)):BranchOrigin|null{
 const lines=new Map(project.lines.map(line=>[line.id,line])),first=lines.get(firstLineId);
 if(!first)return null;
 for(const id of paths.previous(firstLineId)){
  const choice=lines.get(id),step=paths.next(id);
  if(!choice||choice.chapterId===first.chapterId||step.kind!=='choice')continue;
  const option=step.options.find(item=>item.lineId===firstLineId);
  const strip=option?branchStrip(project,id,paths):null;
  if(!option||!strip)continue;
  return {choiceLineId:id,from:`${chapterName(project,choice)} · ${choice.order}컷`,optionId:option.id,strip};
 }
 return null;
}
