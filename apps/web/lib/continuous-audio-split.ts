import {createStoryDocument,parseStoryDocument,orderedStoryFlowLines,storyFlowTargets,storyBranchConditionTerms,type StoryProject} from '@knolstory/story-domain';
import type {CombinedRangeUndo} from './combined-range-edit';
/** Split authored cut ownership, never infer elapsed audio time from reader-controlled cuts. */
export function splitContinuousAudioRange(project:StoryProject,sourceLineId:string,target:'music'|'ambience',splitLineId:string):{project:StoryProject;undo:CombinedRangeUndo}{
 const source=project.lines.find(line=>line.id===sourceLineId),cue=source?.audio?.[target];
 if(cue?.action==='sequence')throw Error('순서 재생은 컷 사이의 재생 위치를 알 수 없어 구간을 나눌 수 없어요. 음원 목록에서 사용 구간을 편집해 주세요.');
 if(!source||cue?.action!=='play')throw Error('컷에서 시작한 배경음·주변 소리를 선택해 주세요.');
 const cuts=project.lines.filter(line=>line.chapterId===source.chapterId).sort((a,b)=>a.order-b.order),from=cuts.findIndex(line=>line.id===source.id),at=cuts.findIndex(line=>line.id===splitLineId);
 let end=cue.endLineId?cuts.findIndex(line=>line.id===cue.endLineId):cuts.length-1;
 for(let index=from+1;index<=end;index++){const next=cuts[index].audio?.[target];if(next&&next.action!=='maintain'){end=index-1;break;}}
 if(at<=from||at>end)throw Error('소리가 이어지는 구간 안에서 시작 컷보다 뒤의 컷을 선택해 주세요.');
 if(cuts.slice(from,end+1).some(line=>line.visibility))throw Error('이 소리 구간에는 컷 표시 조건이 있어요. 숨겨지는 컷에서 소리가 끊길 수 있어 나누지 않았어요. 표시 조건이 없는 구간을 선택해 주세요.');
 const ordered=orderedStoryFlowLines(project),edges=ordered.map((line,index)=>({id:line.id,targets:[...new Set(storyFlowTargets(ordered,index))]}));
 if(cue.branchCondition){const owner=ordered.findIndex(line=>line.id===source.id);if(storyBranchConditionTerms(cue.branchCondition).some(term=>{const at=ordered.findIndex(line=>line.id===term.sourceLineId);return at<0||at>=owner;}))throw Error('이 소리보다 앞에서 선택하는 조건만 구간을 나눌 수 있어요. 연결을 먼저 확인해 주세요.');}
 const arrivals=new Map<string,typeof edges>();for(const edge of edges)for(const destination of edge.targets)if(destination!==null)arrivals.set(destination,[...(arrivals.get(destination)??[]),edge]);
 for(let index=from+1;index<=end;index++){
  const previous=cuts[index-1].id,current=cuts[index].id,incoming=arrivals.get(current)??[];
  if(incoming.length!==1||incoming[0].id!==previous||incoming[0].targets.length!==1)throw Error('이 구간에는 건너뛰거나 합류하는 연결이 있어요. 재생 경로가 달라질 수 있어 나누지 않았어요.');
 }
 const right=cuts[at],ids=[source.id,right.id];
 const snapshot=(p:StoryProject)=>ids.map(lineId=>{const line=p.lines.find(cut=>cut.id===lineId)!;return {lineId,audio:structuredClone(line.audio),presentation:structuredClone(line.presentation)};});
 const before=snapshot(project),next={...project,updatedAt:new Date().toISOString(),lines:project.lines.map(line=>line.id===source.id?{...line,audio:{...line.audio,[target]:{...cue,endLineId:cuts[at-1].id}}}:line.id===right.id?{...line,audio:{...line.audio,[target]:structuredClone(cue)}}:line)};
 const checked=parseStoryDocument(createStoryDocument({project:next,savedAt:new Date().toISOString(),appVersion:'continuous-split'}));if(!checked.ok)throw Error(checked.issues.map(issue=>issue.message).join('\n'));
 return {project:next,undo:{projectId:project.id,target,before,after:snapshot(next)}};
}
