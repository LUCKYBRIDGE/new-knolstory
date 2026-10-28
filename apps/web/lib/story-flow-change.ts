import type {StoryLine} from '@knolstory/story-domain';
export type FlowMode='linear'|'goto'|'choice'|'ending';
export function flowMode(line:StoryLine):FlowMode {
 return line.ending?.endsStory||line.flow?.type==='goto'&&line.flow.targetLineId===null?'ending':line.flow?.type??'linear';
}
/** A pure proposal: callers decide whether to commit after protecting authored rules. */
export function prepareFlowChange(line:StoryLine,next:FlowMode):Readonly<{patch:Partial<StoryLine>;warning:string}>|null {
 if(flowMode(line)===next)return null;
 const removed:string[]=[];
 if(line.flow?.type==='choice'){
  removed.push(`선택지 ${line.flow.options.length}개`);
  const changes=line.flow.options.reduce((count,option)=>count+(option.effects?.length??0),0),conditions=line.flow.options.filter(option=>option.condition!==undefined).length;
  if(changes)removed.push(`선택 시 점수 변화 ${changes}개`);
  if(conditions)removed.push(`선택지 표시 조건 ${conditions}개`);
 }
 if(line.flow?.type==='goto'){
  if(line.flow.routes?.length)removed.push(`점수 조건 ${line.flow.routes.length}개`);
  if(line.flow.targetLineId)removed.push('기본 도착 컷 연결');
 }
 if(line.ending||line.flow?.type==='goto'&&line.flow.targetLineId===null)removed.push('끝맺음 설정');
 return {warning:removed.length?`${removed.join(', ')}${removed.at(-1)?.endsWith('개')?'가':'이'} 없어집니다.`:'',patch:{ending:undefined,flow:next==='linear'?undefined:next==='goto'?{type:'goto',targetLineId:''}:next==='ending'?{type:'goto',targetLineId:null}:{type:'choice',options:[{id:`${line.id}-choice-1`,label:'선택 1',targetLineId:''},{id:`${line.id}-choice-2`,label:'선택 2',targetLineId:''}]}}};
}
