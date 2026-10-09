'use client';
import {PRESENTATION_EFFECTS,type StoryEffectCue,type StoryPresentation,type StageComposition} from '@knolstory/story-domain';
import styles from './story-workspace.module.css';
import {actorLabel} from '../lib/actor-label';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
type Props={value?:StoryPresentation;stage:StageComposition;onChange:(value:StoryPresentation)=>void};
export function StoryEffectControls({value,stage,onChange}:Props){
 const effects=value?.effects??[];
 const update=(index:number,patch:Partial<StoryEffectCue>)=>onChange({...value,effects:effects.map((effect,i)=>i===index?{...effect,...patch}:effect)});
 const label=(name:string,index:number)=>index===0?name:`${index+1}번째 ${name}`;
 return <>
  <label><input type="checkbox" aria-label="이어지는 효과 끝내기" checked={value?.clearFollowingEffects??false} onChange={event=>onChange({...value,clearFollowingEffects:event.target.checked})}/>이 컷에서 이전부터 이어진 효과 끝내기</label>
  {(effects.length?effects:[undefined]).map((effect,index)=><fieldset key={index}><legend>{index+1}번째 효과</legend>
   <label>효과<select aria-label={label('효과',index)} value={effect?.type??''} onChange={event=>event.target.value?effect?update(index,{type:event.target.value as StoryEffectCue['type']}):onChange({...value,effects:[{type:event.target.value as StoryEffectCue['type'],intensity:'normal'}]}):onChange({...value,effects:effects.filter((_,i)=>i!==index)})}><option value="">효과 없음</option>{PRESENTATION_EFFECTS.map(item=><option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
   {effect&&<>
    <label>대상<select aria-label={label('효과 대상',index)} value={effect.target?.kind==='actor'?`actor:${effect.target.actorKey}`:effect.target?.kind??'screen'} onChange={event=>update(index,{target:event.target.value.startsWith('actor:')?{kind:'actor',actorKey:event.target.value.slice(6)}:{kind:event.target.value as 'screen'|'background'}})}><option value="screen">화면 전체</option><option value="background">배경 이미지</option>{[...stage.leftActors,...stage.rightActors].map(actor=><option key={actor.key} value={`actor:${actor.key}`}>{actorLabel(stage,actor.key)} · {(()=>{const asset=resolveAsset(actor.assetId);return asset?assetDisplayName(asset):'인물';})()} 이미지</option>)}</select></label>
    <label>적용 범위<select aria-label={label('효과 적용 범위',index)} value={effect.scope??'cut'} onChange={event=>update(index,{scope:event.target.value as 'cut'|'following'})}><option value="cut">이 컷에서만</option><option value="following">다음 컷에도 이어서</option></select></label>
    <label>반복<select aria-label={label('효과 반복',index)} value={effect.repeat??'once'} onChange={event=>update(index,{repeat:event.target.value as 'once'|'loop'})}><option value="once">한 번</option><option value="loop">반복</option></select></label>
    {effect.repeat==='loop'&&<label>반복 간격 (ms)<input type="number" min={400} max={10000} aria-label={label('효과 반복 간격',index)} value={effect.periodMs??2400} onChange={event=>{const periodMs=event.target.valueAsNumber;if(Number.isFinite(periodMs)&&periodMs>=400&&periodMs<=10000)update(index,{periodMs})}}/></label>}
    <label>강도<select aria-label={label('효과 강도',index)} value={effect.intensity??'normal'} onChange={event=>update(index,{intensity:event.target.value as StoryEffectCue['intensity']})}><option value="soft">부드럽게</option><option value="normal">보통</option><option value="strong">강하게</option></select></label>
    <label>시작<select aria-label={label('효과 시작',index)} value={effect.trigger??'scene-enter'} onChange={event=>update(index,{trigger:event.target.value as StoryEffectCue['trigger']})}><option value="scene-enter">컷 시작</option><option value="with-dialogue">대사와 함께</option><option value="after-delay">잠시 후</option></select></label>
    <label>대기 시간 (ms)<input type="number" aria-label={label('효과 대기 시간',index)} min={0} max={10000} value={effect.delayMs??(effect.trigger==='after-delay'?1000:0)} onChange={event=>{const delayMs=event.target.valueAsNumber;if(Number.isFinite(delayMs)&&delayMs>=0&&delayMs<=10000)update(index,{delayMs})}}/></label>
    <button type="button" onClick={()=>onChange({...value,effects:effects.filter((_,i)=>i!==index)})}>{index+1}번째 효과 제거</button>
   </>}
  </fieldset>)}
  {effects.length>0&&effects.length<3&&<button type="button" onClick={()=>onChange({...value,effects:[...effects,{type:'shake',intensity:'normal'}]})}>효과 추가</button>}
  <p className={styles.hint}>배경·인물·화면 효과를 최대 3개 함께 설정할 수 있어요. 이어지는 효과는 실제 선택한 경로에서만 유지합니다. 대상 인물이 없는 컷에서는 인물 효과가 보이지 않습니다. 반복 효과는 움직임 줄이기를 따릅니다.</p>
 </>;
}
