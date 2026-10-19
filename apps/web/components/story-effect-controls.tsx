'use client';
import {useState} from 'react';
import {PRESENTATION_EFFECTS,type StoryEffectCue,type StoryPresentation,type StageComposition,type StoryProject} from '@knolstory/story-domain';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {EffectStartControls} from './effect-start-controls';
import {StoryBranchConditionField} from './story-branch-condition-field';
import {CutRangeEnd} from './cut-range-end';
import {SecondsInput} from './seconds-input';
import {actorLabel} from '../lib/actor-label';
import {arrangeEffectsSequentially,effectDurationMs,moveEffect} from '../lib/effect-authoring';
import styles from './story-effect-controls.module.css';

type Props={onPreviewFromBranch?:(sourceLineId:string)=>void;onProjectChange?:(project:StoryProject)=>void;project?:StoryProject;lineId?:string;value?:StoryPresentation;stage:StageComposition;onChange:(value:StoryPresentation|undefined)=>void};
const label=(name:string,index:number)=>index===0?name:`${index+1}번째 ${name}`;
const seconds=(milliseconds:number)=>`${Number((milliseconds/1000).toFixed(3))}초`;

export function StoryEffectControls({project,lineId,value,stage,onChange,onProjectChange,onPreviewFromBranch}:Props){
 const effects=value?.effects??[];
 const [undo,setUndo]=useState<{value:StoryPresentation|undefined}|null>(null);
 const [message,setMessage]=useState('');
 const actors=[...stage.leftActors,...stage.rightActors];
 const hasFollowing=!!value?.clearFollowingEffects||!project||project.lines.some(line=>line.presentation?.effects?.some(effect=>effect.scope==='following'));
 const [clearingWasAvailable]=useState(hasFollowing);
 const canClear=clearingWasAvailable||hasFollowing;
 const apply=(next:StoryPresentation)=>{setUndo({value});setMessage('');onChange(next);};
 const update=(index:number,patch:Partial<StoryEffectCue>)=>apply({...value,effects:effects.map((effect,i)=>i===index?{...effect,...patch}:effect)});
 const targetLabel=(effect:StoryEffectCue)=>effect.target?.kind==='actor'?actorLabel(stage,effect.target.actorKey):effect.target?.kind==='background'?'배경 이미지':'화면 전체';
 function sequential(){
  const arranged=arrangeEffectsSequentially(effects);
  if(!arranged){setMessage('순서대로 시작하려면 앞 효과들의 지속 시간을 줄여 주세요. 시작 시점은 10초까지 설정할 수 있어요.');return;}
  apply({...value,effects:arranged});
 }
 function cancel(){
  if(!undo)return;
  // Preserve changes to looks, transitions or actors made since this effect edit.
  const restored={...value,effects:undo.value?.effects,clearFollowingEffects:undo.value?.clearFollowingEffects};
  onChange(undo.value===undefined&&Object.values(restored).every(item=>item===undefined)?undefined:restored);
  setUndo(null);setMessage('마지막 효과 변경을 취소했어요.');
 }
 return <div className={styles.controls} data-testid="story-effect-controls">
  {canClear&&<label className={styles.clear}><input type="checkbox" aria-label="이어지는 효과 끝내기" checked={value?.clearFollowingEffects??false} onChange={event=>apply({...value,clearFollowingEffects:event.target.checked})}/>이전 컷부터 이어진 효과 끝내기</label>}
  {(effects.length?effects:[undefined]).map((effect,index)=><details key={index} className={styles.card} open={index===0||undefined}>
   <summary><strong>{index+1}번째 효과{effect?` · ${PRESENTATION_EFFECTS.find(item=>item.type===effect.type)?.label}`:' 선택'}</strong>{effect&&<span>{targetLabel(effect)} · {effect.scope==='following'?effect.endLineId?'종료 컷까지 유지':'다음 컷에도 유지':'현재 컷만'} · {effect.trigger==='with-dialogue'?'대사 시작':'컷 시작'} {seconds(effect.delayMs??(effect.trigger==='after-delay'?1000:0))} 뒤 · {seconds(effectDurationMs(effect))} 동안 · {effect.repeat==='loop'?'반복':'한 번'}</span>}</summary>
   <div className={styles.fields}>
    <label className={styles.full}>효과<select aria-label={label('효과',index)} value={effect?.type??''} onChange={event=>event.target.value?effect?update(index,{type:event.target.value as StoryEffectCue['type']}):apply({...value,effects:[{type:event.target.value as StoryEffectCue['type'],intensity:'normal'}]}):apply({...value,effects:effects.filter((_,i)=>i!==index)})}><option value="">효과 없음</option>{PRESENTATION_EFFECTS.map(item=><option key={item.type} value={item.type}>{item.label} · {item.hint}</option>)}</select></label>
    {effect&&<>
     <StoryBranchConditionField project={project} value={effect.branchCondition} label={label('효과 갈래 조건',index)} onChange={branchCondition=>update(index,{branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/>
     <label>대상<select aria-label={label('효과 대상',index)} value={effect.target?.kind==='actor'?`actor:${effect.target.actorKey}`:effect.target?.kind??'screen'} onChange={event=>update(index,{target:event.target.value.startsWith('actor:')?{kind:'actor',actorKey:event.target.value.slice(6)}:{kind:event.target.value as 'screen'|'background'}})}><option value="screen">화면 전체</option><option value="background">배경 이미지</option>{actors.map(actor=><option key={actor.key} value={`actor:${actor.key}`}>{actorLabel(stage,actor.key)} · {(()=>{const asset=resolveAsset(actor.assetId);return asset?assetDisplayName(asset):'인물';})()} 이미지</option>)}{effect.target?.kind==='actor'&&!actors.some(actor=>actor.key===(effect.target as {actorKey:string}).actorKey)&&<option value={`actor:${effect.target.actorKey}`}>이 컷에 없는 인물 (다른 컷에서 유지)</option>}</select></label>
     <label>적용 범위<select aria-label={label('효과 적용 범위',index)} value={effect.scope??'cut'} onChange={event=>update(index,{scope:event.target.value as 'cut'|'following',...(event.target.value==='cut'?{endLineId:undefined}:{})})}><option value="cut">현재 컷만</option><option value="following">다음 컷에도 유지</option></select></label>
     {effect.scope==='following'&&<CutRangeEnd project={project} lineId={lineId} value={effect.endLineId} label={label('효과 종료 컷',index)} onChange={endLineId=>update(index,{endLineId,id:effect.id??crypto.randomUUID()})}/>}
     <label>시작<select aria-label={label('효과 시작',index)} value={effect.trigger??'scene-enter'} onChange={event=>update(index,{trigger:event.target.value as StoryEffectCue['trigger']})}><option value="scene-enter">컷 시작 때</option><option value="with-dialogue">대사와 함께</option><option value="after-delay">컷 시작 후 대기</option></select></label>
     <SecondsInput label={label('효과 대기 시간',index)} valueMs={effect.delayMs??(effect.trigger==='after-delay'?1000:0)} onChange={delayMs=>update(index,{delayMs})}/>
     <SecondsInput label={label('효과 지속 시간',index)} valueMs={effectDurationMs(effect)} onChange={durationMs=>update(index,{durationMs})}/>
     <label>강도<select aria-label={label('효과 강도',index)} value={effect.intensity??'normal'} onChange={event=>update(index,{intensity:event.target.value as StoryEffectCue['intensity']})}><option value="soft">약하게</option><option value="normal">보통</option><option value="strong">강하게</option></select></label>
     <label>반복<select aria-label={label('효과 반복',index)} value={effect.repeat??'once'} onChange={event=>update(index,{repeat:event.target.value as 'once'|'loop'})}><option value="once">한 번</option><option value="loop">계속 반복</option></select></label>
     {effect.repeat==='loop'&&<SecondsInput label={label('효과 반복 간격',index)} minMs={400} valueMs={effect.periodMs??2400} onChange={periodMs=>update(index,{periodMs})}/>}
     <div className={`${styles.actions} ${styles.full}`}>
      {index>0&&<button type="button" aria-label={`${index+1}번째 효과 위로`} onClick={()=>apply({...value,effects:moveEffect(effects,index,-1)})}>위로</button>}
      {index<effects.length-1&&<button type="button" aria-label={`${index+1}번째 효과 아래로`} onClick={()=>apply({...value,effects:moveEffect(effects,index,1)})}>아래로</button>}
      <button type="button" onClick={()=>apply({...value,effects:effects.filter((_,i)=>i!==index)})}>{index+1}번째 효과 제거</button>
     </div>
    </>}
   </div>
  </details>)}
  <div className={styles.actions}>
   {effects.length>0&&effects.length<3&&<button type="button" onClick={()=>apply({...value,effects:[...effects,{type:'shake',intensity:'normal'}]})}>효과 추가</button>}
   {effects.length>1&&<button type="button" onClick={sequential}>순서대로 시작</button>}
   {undo&&<button type="button" onClick={cancel}>마지막 효과 변경 취소</button>}
  </div>
  {project&&lineId&&onProjectChange&&<EffectStartControls key={`${project.id}/${lineId}`} project={project} lineId={lineId} onChange={onProjectChange} onMoved={()=>setUndo(null)}/>}
  {message&&<p className={styles.hint} role="status">{message}</p>}
  {(effects.length>1||effects.some(effect=>effect.repeat==='loop'))&&<p className={styles.hint}>최대 3개. 위로·아래로는 목록 순서만 바꿉니다. 순서대로 시작은 각 효과의 대기 시간을 조정해 앞 효과가 끝나면 다음 효과를 시작하게 합니다. 반복 효과는 계속 이어질 수 있어요. 지속 시간이 0초면 효과를 표시하지 않습니다. 없는 인물의 효과는 표시되지 않으며 움직임 줄이기를 따릅니다.</p>}
 </div>;
}
