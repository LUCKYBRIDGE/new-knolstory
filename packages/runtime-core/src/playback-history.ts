import {availableStoryChoices} from './story-scores';
import type {StoryProject} from '@knolstory/story-domain';
import {restorePlayback,type PlaybackState} from './story-runtime';
export type PlaybackLogEntry=Readonly<{pathIndex:number;lineId:string;chapterId:string;speaker:string;text:string;choiceLabel?:string;textPending?:true}>;
/** Encountered route. Current text requires renderer evidence; bounds count Unicode code points. */
export function playbackLog(project:StoryProject,state:PlaybackState,currentPage:Readonly<{lineId:string;endOffset:number}>|null=null):readonly PlaybackLogEntry[]{
 const valid=restorePlayback(project,state);
 return valid.path.map((lineId,pathIndex)=>{
  const line=project.lines.find(item=>item.id===lineId)!;
  const decision=valid.choiceHistory?.find(item=>item.pathIndex===pathIndex);
  const options=line.flow?.type==='choice'?line.flow.options:[];
  const destination=valid.path[pathIndex+1]??(valid.status==='ended'?null:undefined);
  const matches=options.filter(option=>option.targetLineId===destination);
  const choiceLabel=decision?options.find(option=>option.id===decision.choiceId)?.label:matches.length===1?matches[0].label:matches.length>1?'선택한 길 (이전 저장)':undefined;
  const active=pathIndex===valid.path.length-1&&valid.status!=='ended';
  const hasBound=currentPage?.lineId===lineId&&Number.isSafeInteger(currentPage.endOffset)&&currentPage.endOffset>=0;
  const endOffset=hasBound?currentPage!.endOffset:0;
  const text=active?Array.from(line.text).slice(0,endOffset).join(''):line.text;
  return {pathIndex,lineId,chapterId:line.chapterId,speaker:line.speakerName||(line.type==='narration'?'해설':'화자'),text,...(active&&!hasBound&&line.text?{textPending:true as const}:{}),...(choiceLabel?{choiceLabel}:{})};
 });
}
export function jumpPlayback(project:StoryProject,state:PlaybackState,pathIndex:number):PlaybackState{
 const valid=restorePlayback(project,state);
 if(!Number.isInteger(pathIndex)||pathIndex<0||pathIndex>=valid.path.length)throw new Error('지난 기록의 위치를 확인해 주세요.');
 const path=valid.path.slice(0,pathIndex+1),lineId=path.at(-1)!;
 const choices=valid.choiceHistory?.filter(item=>item.pathIndex<pathIndex);
 const next:PlaybackState={lineId,path,status:'reading',...(choices?{choiceHistory:choices}:{})};
 const line=project.lines.find(item=>item.id===lineId)!;
 return {...next,status:!line.ending?.endsStory&&line.flow?.type==='choice'?(availableStoryChoices(project,lineId,next).length?'choice':'pending'):'reading'};
}
