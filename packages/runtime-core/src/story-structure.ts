import {chapterLabel,createStoryDocument,parseStoryDocument,resolveStageComposition,stageProjection,type Chapter,type StoryLine,type StoryProject} from '@knolstory/story-domain';
import {analyzeStoryFlow} from './flow-analysis';
import {syncBranchNumbering} from './branch-numbering-sync';
import {assertNoNewLoop} from './flow-loop-guard';

/**
 * Moving chapters and cuts, and putting new chapters between existing ones.
 * Reading follows the new place: a cut without its own link goes on to whatever is stored next.
 * Links a writer set (선택지·도착 컷·이야기 끝) never change. A move that would leave a cut
 * the reader can no longer reach is refused, so nothing written is lost from the story.
 */
function validate(project:StoryProject):StoryProject{
 const candidate={...project,updatedAt:new Date().toISOString()};
 const result=parseStoryDocument(createStoryDocument({project:candidate,savedAt:candidate.updatedAt,appVersion:'knolstory-next'}));
 if(!result.ok)throw new Error(result.issues.map(issue=>issue.message).join('\n'));
 return candidate;
}
const sortedChapters=(project:Pick<StoryProject,'chapters'>)=>[...project.chapters].sort((a,b)=>a.order-b.order);
const chapterCuts=(project:Pick<StoryProject,'lines'>,chapterId:string)=>project.lines.filter(line=>line.chapterId===chapterId).sort((a,b)=>a.order-b.order);
function requireChapter(project:StoryProject,id:string):Chapter{const found=project.chapters.find(chapter=>chapter.id===id);if(!found)throw new Error('이야기 장을 찾을 수 없어요.');return found;}
function requireCut(project:StoryProject,id:string):StoryLine{const found=project.lines.find(line=>line.id===id);if(!found)throw new Error('이야기 컷을 찾을 수 없어요.');return found;}

/** Chapter numbers that only repeat the position follow the new position; numbers a writer set stay. */
function positional(chapters:readonly Chapter[]):boolean{
 return chapters.every(chapter=>!chapter.branchLabel?.trim()&&(chapter.chapterNumber===undefined||chapter.chapterNumber===chapter.order));
}
function arrange(project:StoryProject,ids:readonly string[],extra:readonly Chapter[]=[]):Chapter[]{
 const all=[...project.chapters,...extra],follow=positional(project.chapters);
 return ids.map((id,index)=>{
  const chapter=all.find(item=>item.id===id)!;
  // New chapters take their number from where they are put.
  if(follow||extra.includes(chapter)){const {chapterNumber:_number,...rest}=chapter;return {...rest,order:index+1};}
  return {...chapter,order:index+1};
 });
}

function cutLabel(project:StoryProject,lineId:string):string{
 const line=project.lines.find(item=>item.id===lineId),chapter=line&&project.chapters.find(item=>item.id===line.chapterId);
 return line&&chapter?`${chapterLabel(chapter).split(' · ')[0]} ${line.order}컷`:'컷';
}
/** Refuse a change that leaves an existing cut unreachable, or new cuts nobody reads. */
function assertReachable(before:StoryProject,after:StoryProject,added:readonly string[]=[]):StoryProject{
 assertNoNewLoop(before,after);
 const was=new Set(analyzeStoryFlow(before).nodes.filter(node=>!node.reachable).map(node=>node.lineId));
 const lost=analyzeStoryFlow(after).nodes.filter(node=>!node.reachable&&!was.has(node.lineId));
 if(!lost.length)return after;
 const fresh=lost.filter(node=>added.includes(node.lineId));
 if(fresh.length===lost.length)throw new Error('이 자리에 넣으면 이야기를 읽을 때 닿지 않아요. 앞 장의 마지막 컷이 선택지나 이야기 끝이면 그 앞이나 다른 장 뒤를 골라 주세요.');
 // Name cuts as the writer sees them now, before the move.
 const names=lost.filter(node=>!added.includes(node.lineId)).slice(0,3).map(node=>cutLabel(before,node.lineId));
 throw new Error(`이렇게 옮기면 ${names.join(', ')}에 닿을 수 없게 돼요. 선택지나 도착 컷을 확인하고 다른 자리를 골라 주세요.`);
}

/** Place a chapter after another chapter (null: first). */
export function moveStoryChapter(project:StoryProject,chapterId:string,afterChapterId:string|null):StoryProject{
 requireChapter(project,chapterId);
 if(afterChapterId===chapterId)return project;
 if(afterChapterId!==null)requireChapter(project,afterChapterId);
 const rest=sortedChapters(project).map(chapter=>chapter.id).filter(id=>id!==chapterId);
 const at=afterChapterId===null?0:rest.indexOf(afterChapterId)+1;
 const ids=[...rest.slice(0,at),chapterId,...rest.slice(at)];
 if(ids.join('\n')===sortedChapters(project).map(chapter=>chapter.id).join('\n'))return project;
 return assertReachable(project,validate(syncBranchNumbering(project,{...project,chapters:arrange(project,ids)})));
}

/** Place a cut after another cut of any chapter (null: first cut of that chapter). Its stage stays as it looked. */
export function moveStoryCutTo(project:StoryProject,lineId:string,chapterId:string,afterLineId:string|null):StoryProject{
 const selected=requireCut(project,lineId),target=requireChapter(project,chapterId);
 if(afterLineId===lineId)return project;
 if(afterLineId!==null&&requireCut(project,afterLineId).chapterId!==chapterId)throw new Error('넣을 자리의 컷이 고른 장에 없어요.');
 if(selected.chapterId!==chapterId&&chapterCuts(project,selected.chapterId).length===1)throw new Error('장에 컷이 하나뿐이면 옮길 수 없어요. 장을 옮기거나 다른 컷을 먼저 더해 주세요.');
 const source=requireChapter(project,selected.chapterId),stage=resolveStageComposition(source,selected,project);
 const bg=selected.backgroundMode==='none'?'':selected.backgroundId||source.backgroundId||project.stageDefaults?.backgroundId||'';
 const moved:StoryLine={...selected,chapterId:target.id,inheritActors:false,stageComposition:stage,...stageProjection(stage),backgroundId:bg,...(!bg?{backgroundMode:'none' as const}:{})};
 const others=chapterCuts(project,target.id).filter(line=>line.id!==lineId);
 const at=afterLineId===null?0:others.findIndex(line=>line.id===afterLineId)+1;
 const placed=[...others.slice(0,at),moved,...others.slice(at)];
 if(selected.chapterId===chapterId&&placed.map(line=>line.id).join('\n')===chapterCuts(project,chapterId).map(line=>line.id).join('\n'))return project;
 const order=new Map(placed.map((line,index)=>[line.id,index+1]));
 const sourceOrder=new Map(chapterCuts(project,selected.chapterId).filter(line=>line.id!==lineId).map((line,index)=>[line.id,index+1]));
 const lines=project.lines.map(line=>line.id===lineId?{...moved,order:order.get(lineId)!}:order.has(line.id)?{...line,order:order.get(line.id)!}:sourceOrder.has(line.id)?{...line,order:sourceOrder.get(line.id)!}:line);
 const continuation=project.continuation?.lineId===lineId?{continuation:{...project.continuation,chapterId}}:{};
 return assertReachable(project,validate(syncBranchNumbering(project,{...project,lines,...continuation})));
}

export type StoryChapterAddition=Readonly<{chapters:readonly Chapter[];lines:readonly StoryLine[]}>;
/**
 * Put new chapters (with their cuts) after a chapter (null: before the first one), in the given order.
 * The chapter before reads on into the first new chapter; the last new chapter reads on into what followed.
 */
export function insertStoryChapters(project:StoryProject,addition:StoryChapterAddition,afterChapterId:string|null):StoryProject{
 if(!addition.chapters.length)throw new Error('넣을 장이 없어요.');
 if(afterChapterId!==null)requireChapter(project,afterChapterId);
 const taken=new Set([...project.chapters.map(chapter=>chapter.id),...project.lines.map(line=>line.id)]);
 for(const id of [...addition.chapters.map(chapter=>chapter.id),...addition.lines.map(line=>line.id)])if(taken.has(id))throw new Error('새 장·컷 구분 정보가 겹쳤어요. 다시 시도해 주세요.');
 const added=[...addition.chapters].sort((a,b)=>a.order-b.order);
 const existing=sortedChapters(project).map(chapter=>chapter.id);
 const at=afterChapterId===null?0:existing.indexOf(afterChapterId)+1;
 const ids=[...existing.slice(0,at),...added.map(chapter=>chapter.id),...existing.slice(at)];
 const next=validate(syncBranchNumbering(project,{...project,chapters:arrange(project,ids,added),lines:[...project.lines,...structuredClone(addition.lines) as StoryLine[]]}));
 return assertReachable(project,next,addition.lines.map(line=>line.id));
}

export type ChapterPlace=Readonly<{afterChapterId:string|null;label:string;ok:boolean;reason?:string}>;
const probe=(id:string):StoryChapterAddition=>({chapters:[{id:`${id}-chapter`,order:1,title:'',summary:'',purpose:'',mood:'',keyEvents:'',nextChapterIdea:'',storyStageKeys:[],chapterSpeakerNames:[],characterAssetIds:[],backgroundAssetIds:[],backgroundId:'',leftAssetId:'',rightAssetId:''}],
 lines:[{id:`${id}-line`,chapterId:`${id}-chapter`,order:1,type:'narration',speaker:'narration',speakerName:'',text:'',purposeNote:'',emotionNote:'',directionNote:'',leftAssetId:'',rightAssetId:'',backgroundId:'',backgroundMode:'none',stageComposition:{leftActors:[],rightActors:[]}}]});
/** Every place new chapters could go, and why a place cannot be used. Labels use the chapter names the writer sees. */
export function chapterInsertPlaces(project:StoryProject):ChapterPlace[]{
 const chapters=sortedChapters(project);
 const places:{afterChapterId:string|null;label:string}[]=[{afterChapterId:null,label:'맨 앞 (1장 앞)'},...chapters.map((chapter,index)=>({afterChapterId:chapter.id,label:index===chapters.length-1?`맨 뒤 (${chapterLabel(chapter)} 뒤)`:`${chapterLabel(chapter)} 뒤`}))];
 return places.map(place=>{
  try{insertStoryChapters(project,probe('place-probe'),place.afterChapterId);return {...place,ok:true};}
  catch(issue){return {...place,ok:false,reason:issue instanceof Error?issue.message:'이 자리에는 넣을 수 없어요.'};}
 });
}
/** Every place a chapter could move to (after which chapter), with the reason a place is refused. */
export function chapterMovePlaces(project:StoryProject,chapterId:string):ChapterPlace[]{
 const chapters=sortedChapters(project),index=chapters.findIndex(chapter=>chapter.id===chapterId);
 const places=[{afterChapterId:null as string|null,label:'맨 앞'},...chapters.filter(chapter=>chapter.id!==chapterId).map(chapter=>({afterChapterId:chapter.id as string|null,label:`${chapterLabel(chapter)} 뒤`}))]
  // The place it already has is not a move.
  .filter(place=>place.afterChapterId!==(index>0?chapters[index-1]!.id:null));
 return places.map(place=>{
  try{moveStoryChapter(project,chapterId,place.afterChapterId);return {...place,ok:true};}
  catch(issue){return {...place,ok:false,reason:issue instanceof Error?issue.message:'이 자리로는 옮길 수 없어요.'};}
 });
}
