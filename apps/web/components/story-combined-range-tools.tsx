'use client';
import {useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import type {CombinedEditingEntry} from '../lib/combined-editing-tracks';
import {splitContinuousAudioRange} from '../lib/continuous-audio-split';
import {editCombinedRange,type CombinedRangeUndo} from '../lib/combined-range-edit';
type Props={project:StoryProject;entry:CombinedEditingEntry;disabled:boolean;onChange:(project:StoryProject)=>void;onSelectCut:(id:string)=>void;onUndoReady:(undo:CombinedRangeUndo)=>void};
export function StoryCombinedRangeTools(p:Props){
 const source=p.project.lines.find(line=>line.id===p.entry.sourceLineId),cuts=p.project.lines.filter(line=>line.chapterId===source?.chapterId).sort((a,b)=>a.order-b.order);
 const [start,setStart]=useState(p.entry.sourceLineId??''),[end,setEnd]=useState(cuts[p.entry.endCutIndex]?.id??''),[message,setMessage]=useState(''),[split,setSplit]=useState(cuts[p.entry.startCutIndex+1]?.id??'');
 if(!source||!(p.entry.target==='music'||p.entry.target==='ambience'||p.entry.target==='effects'))return null;
 if(p.entry.target==='effects'&&source.presentation?.effects?.[p.entry.cueIndex??-1]?.scope!=='following')return null;
 const sequence=p.entry.target!=='effects'&&source.audio?.[p.entry.target]?.action==='sequence';
 const divide=()=>{try{if(p.entry.target!=='music'&&p.entry.target!=='ambience')return;const result=splitContinuousAudioRange(p.project,source!.id,p.entry.target,split);p.onChange(result.project);p.onUndoReady(result.undo);p.onSelectCut(split);setMessage('컷 구간을 나눴어요. 뒤 구간의 소리를 따로 편집할 수 있어요.');}catch(error){setMessage(error instanceof Error?error.message:'구간을 나누지 못했어요.');}};
 const apply=()=>{try{const result=editCombinedRange(p.project,{sourceLineId:source.id,target:p.entry.target,cueIndex:p.entry.cueIndex},start,end);p.onChange(result.project);p.onUndoReady(result.undo);p.onSelectCut(start);setMessage('사용할 컷 구간을 바꿨어요.');}catch(error){setMessage(error instanceof Error?error.message:'구간을 바꾸지 못했어요.');}};
 return <details data-combined-range-tools><summary>사용할 컷 구간 조정</summary><fieldset disabled={p.disabled}><label>시작 컷<select aria-label="통합 구간 시작 컷" value={start} onChange={event=>setStart(event.target.value)}>{cuts.map((line,index)=><option key={line.id} value={line.id}>{index+1}컷</option>)}</select></label><label>종료 컷<select aria-label="통합 구간 종료 컷" value={end} onChange={event=>setEnd(event.target.value)}>{cuts.map((line,index)=><option key={line.id} value={line.id}>{index+1}컷까지</option>)}</select></label><button type="button" onClick={apply}>구간 적용</button><small>종료 컷까지 사용해요. 시작을 옮기면 그 컷에서 소리·효과를 새로 시작해요. 원본 파일은 바뀌지 않아요.</small>{!sequence&&p.entry.target!=='effects'&&p.entry.endCutIndex>p.entry.startCutIndex&&<details data-continuous-split><summary>컷 구간 나누기</summary><label>뒤 구간 시작 컷<select aria-label="소리 구간 나눌 컷" value={split} onChange={event=>setSplit(event.target.value)}>{cuts.slice(p.entry.startCutIndex+1,p.entry.endCutIndex+1).map(line=><option key={line.id} value={line.id}>{cuts.findIndex(item=>item.id===line.id)+1}컷부터</option>)}</select></label><button type="button" onClick={divide}>이 컷부터 두 구간으로 나누기</button><small>앞·뒤 구간의 소리를 따로 바꿀 수 있어요. 나누기만 하면 같은 소리는 이어 재생해요. 원본의 초 단위 자르기와는 달라요.</small></details>}{sequence&&<small>순서 재생의 시작을 옮기면 새 시작 컷에서 첫 음원부터 재생해요. 음원별 사용 구간과 순서는 유지해요.</small>}</fieldset>{message&&<p role="status">{message}</p>}</details>;
}
