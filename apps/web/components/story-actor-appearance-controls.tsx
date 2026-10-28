'use client';
import {useId,useState} from 'react';
import type {StageComposition,StoryPresentation} from '@knolstory/story-domain';
import {appearanceTargets,opacityFromPercent,patchActorAppearance,resetActorAppearance,type ActorSide,type AppearancePatch} from '../lib/actor-appearance';
import styles from './story-actor-appearance-controls.module.css';

type Props={stage?:StageComposition;onPlaceActors?:()=>void;inline?:boolean;value?:StoryPresentation;onChange:(value:StoryPresentation)=>void};
const sideName=(side:ActorSide)=>side==='left'?'왼쪽 인물 전체':'오른쪽 인물 전체';
export function StoryActorAppearanceControls({value,onChange,inline=false,stage,onPlaceActors}:Props){
 const update=(side:ActorSide,patch:AppearancePatch)=>onChange(patchActorAppearance(value,side,patch));
 const sides=appearanceTargets(stage,value);
 const count=(side:ActorSide)=>stage?.[side==='left'?'leftActors':'rightActors'].length;
 const content=sides.length?<>
  <p className={styles.hint}>현재 컷의 왼쪽 또는 오른쪽 인물 전체에 적용합니다. 개별 인물의 위치와 이미지는 배경·인물 편집에서 조정하세요.</p>
  <div className={styles.groups} data-single={sides.length===1}>{sides.map(side=>{
   const appearance=value?.actors?.[side];
   return <fieldset key={side}><legend>{sideName(side)}{count(side)!==undefined?` · ${count(side)}명`:null}</legend>{count(side)===0&&<p className={styles.hint}>현재 컷에는 {side==='left'?'왼쪽':'오른쪽'} 인물이 없습니다. 저장된 설정은 유지되며 인물을 배치하면 적용됩니다.</p>}
    <label>강조<select aria-label={`${sideName(side)} 강조`} value={appearance?.emphasis??'normal'} onChange={event=>update(side,{emphasis:event.target.value as 'normal'|'dim'})}><option value="normal">보통 밝기</option><option value="dim">어둡게 (다른 인물 강조)</option></select></label>
    <OpacityInput key={side} label={`${sideName(side)} 보이는 정도`} value={appearance?.opacity??1} onChange={opacity=>update(side,{opacity})}/>
    <label className={styles.checkbox}><input type="checkbox" aria-label={`${sideName(side)} 반투명 표현`} checked={appearance?.spectral??false} onChange={event=>update(side,{spectral:event.target.checked})}/>반투명 표현 (유령·환상)</label>
    {(appearance?.opacity!==undefined||appearance?.emphasis!==undefined||appearance?.spectral!==undefined)&&<button type="button" onClick={()=>onChange(resetActorAppearance(value,side))}>{sideName(side)} 밝기·투명도 초기화</button>}
   </fieldset>;
  })}</div>
  <p className={styles.hint}>보이는 정도 100%는 선명하게, 0%는 보이지 않게 표시합니다. 밝기·투명도 초기화는 밝기·투명도·반투명 표현을 기본값으로 되돌리며 위치·크기·방향은 보존합니다. 무대의 ‘이 컷부터 재생’으로 확인하세요.</p>
 </>:<><p className={styles.hint}>현재 컷에 배치된 인물이 없습니다. 인물을 배치한 뒤 밝기·투명도를 조정할 수 있어요.</p>{onPlaceActors&&<button type="button" onClick={onPlaceActors}>인물 배치하기</button>}</>;
 return inline?<section className={styles.controls} data-testid="story-actor-appearance-controls">{content}</section>:<details className={styles.controls} data-testid="story-actor-appearance-controls"><summary>인물 강조·투명도</summary>{content}</details>;
}
function OpacityInput({label,value,onChange}:{label:string;value:number;onChange:(opacity:number)=>void}){
 const [draft,setDraft]=useState(String(Number((value*100).toFixed(3))));
 const [error,setError]=useState('');
 const errorId=useId();
 const [source,setSource]=useState(value);
 if(source!==value){setSource(value);setDraft(String(Number((value*100).toFixed(3))));setError('');}
 function commit(){
  const next=opacityFromPercent(draft);
  if(next===null){setDraft(String(Number((value*100).toFixed(3))));setError('0~100% 사이의 값을 입력해 주세요. 기존 값은 유지됩니다.');return;}
  setError('');if(next!==value)onChange(next);
 }
 return <label>{label} (%)<input type="number" inputMode="decimal" min={0} max={100} step="0.1" aria-label={`${label} (%)`} aria-invalid={error?true:undefined} aria-describedby={error?errorId:undefined} value={draft} onChange={event=>{setDraft(event.target.value);setError('');}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/>{error&&<small id={errorId} role="alert">{error}</small>}</label>;
}
