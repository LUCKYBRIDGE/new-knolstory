'use client';
import {useState} from 'react';
import {PRESENTATION_LOOKS,PRESENTATION_TRANSITIONS,type StoryPresentation,type StoryTransition} from '@knolstory/story-domain';
import {SecondsInput} from './seconds-input';
import styles from './story-workspace.module.css';
type Props={part?:'transition'|'look'|'all';value?:StoryPresentation;onChange:(value:StoryPresentation|undefined)=>void};
export function StoryTransitionControls({value,onChange,part='all'}:Props){
 const transition=value?.transition;
 const [undo,setUndo]=useState<{value:StoryPresentation|undefined}|null>(null);
 const apply=(next:StoryPresentation)=>{setUndo({value});onChange(next);};
 const patchTransition=(patch:Partial<StoryTransition>)=>{if(transition)apply({...value,transition:{...transition,...patch}});};
 return <>
  {part!=='transition'&&<div><label>분위기<select aria-label="분위기" value={value?.look?.type??''} onChange={event=>apply({...value,look:event.target.value?{...value?.look,type:event.target.value as NonNullable<StoryPresentation['look']>['type'],intensity:value?.look?.intensity??'normal'}:undefined})}><option value="">기본</option>{PRESENTATION_LOOKS.map(look=><option key={look.type} value={look.type}>{look.label}</option>)}</select></label>
  {value?.look&&<label>분위기 강도<select aria-label="분위기 강도" value={value.look.intensity??'normal'} onChange={event=>apply({...value,look:{...value.look!,intensity:event.target.value as NonNullable<StoryPresentation['look']>['intensity']}})}><option value="soft">약하게</option><option value="normal">보통</option><option value="strong">강하게</option></select></label>}
  </div>}{part!=='look'&&<div><label>화면 전환<select aria-label="화면 전환" value={transition?.type??''} onChange={event=>apply({...value,transition:event.target.value?{...transition,type:event.target.value as StoryTransition['type'],durationMs:transition?.durationMs??900,mode:transition?.mode??'auto'}:undefined})}><option value="">전환 없음</option>{PRESENTATION_TRANSITIONS.map(item=><option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
  {transition&&<>
   <SecondsInput label="화면 전환 시간" valueMs={transition.durationMs??900} onChange={durationMs=>patchTransition({durationMs})}/>
   <label>전환 진행 방식<select aria-label="전환 진행 방식" value={transition.mode??'auto'} onChange={event=>patchTransition({mode:event.target.value as StoryTransition['mode']})}><option value="auto">시간이 지나면 장면으로</option><option value="confirm">독자가 확인하면 장면으로</option></select></label>
   <p className={styles.hint}>전환이 끝나면 인물 동작과 효과의 시작 시간을 셉니다. 확인 방식은 독자가 버튼을 누를 때까지 읽기를 기다립니다.</p>
   <details><summary>전환에 표시할 글</summary>
    <label>전환 문구<input aria-label="전환 문구" maxLength={2000} value={transition.cue??''} onChange={event=>patchTransition({cue:event.target.value})}/></label>
    <label>전환 제목<input aria-label="전환 제목" maxLength={2000} value={transition.title??''} onChange={event=>patchTransition({title:event.target.value})}/></label>
    <label>전환 설명<textarea aria-label="전환 설명" maxLength={2000} value={transition.description??''} onChange={event=>patchTransition({description:event.target.value})}/></label>
    {transition.mode==='confirm'&&<label>전환 확인 버튼 문구<input aria-label="전환 확인 버튼 문구" maxLength={2000} value={transition.actionLabel??''} placeholder="장면으로" onChange={event=>patchTransition({actionLabel:event.target.value})}/></label>}
   </details>
  </>}
  </div>}{undo&&<button type="button" onClick={()=>{if(undo){const restored={...value,look:part==='transition'?value?.look:undo.value?.look,transition:part==='look'?value?.transition:undo.value?.transition};onChange(undo.value===undefined&&Object.values(restored).every(item=>item===undefined)?undefined:restored);setUndo(null);}}}>{part==='transition'?'마지막 전환 변경 취소':part==='look'?'마지막 분위기 변경 취소':'마지막 전환·분위기 변경 취소'}</button>}
 </>;
}
