'use client';
import {useRef,useState} from 'react';
import {PRESENTATION_EFFECTS,type StoryEffectCue,type StoryPresentation,type StageComposition,type StoryProject} from '@knolstory/story-domain';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {DirectionChoice} from './story-direction-tips';
import {EffectStartControls} from './effect-start-controls';
import {StoryBranchConditionField} from './story-branch-condition-field';
import {CutRangeEnd} from './cut-range-end';
import {SecondsInput} from './seconds-input';
import {useEditorPreferences} from '../lib/editor-preferences';
import {actorLabel} from '../lib/actor-label';
import {effectClickStep,alignEffectToGuide,alignEffectStart,effectStartGuides,snapEffectStart,arrangeEffectsSequentially,effectDurationMs,moveEffect} from '../lib/effect-authoring';
import styles from './story-effect-controls.module.css';

type Props={initialSelectedEffect?:number;onPreviewFromBranch?:(sourceLineId:string)=>void;onProjectChange?:(project:StoryProject)=>void;project?:StoryProject;lineId?:string;value?:StoryPresentation;stage:StageComposition;onChange:(value:StoryPresentation|undefined)=>void};
const label=(name:string,index:number)=>index===0?name:`${index+1}번째 ${name}`;
const seconds=(milliseconds:number)=>`${Number((milliseconds/1000).toFixed(3))}초`;
const stableJson=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);

export function StoryEffectControls({initialSelectedEffect=0,project,lineId,value,stage,onChange,onProjectChange,onPreviewFromBranch}:Props){
 const effects=value?.effects??[];
 const [undo,setUndo]=useState<{value:StoryPresentation|undefined;effects:StoryPresentation['effects'];clearFollowingEffects:StoryPresentation['clearFollowingEffects']}|null>(null);
 const [message,setMessage]=useState('');
 const [selectedEffect,setSelectedEffect]=useState(initialSelectedEffect);
 const [structureRevision,setStructureRevision]=useState(0);
 const [preferences,setPreferences]=useEditorPreferences(project?.id??'effect-controls');
 const {snap,showGuides}=preferences.effectAssistance??{snap:true,showGuides:true};
 const setAssistance=(patch:Partial<{snap:boolean;showGuides:boolean}>)=>setPreferences(current=>({...current,effectAssistance:{snap:true,showGuides:true,...current.effectAssistance,...patch}}));
 const [guide,setGuide]=useState<number|null>(null),[manualGuide,setManualGuide]=useState(1000);
 const pointerTiming=useRef(false),bypassSnap=useRef(false);
 const selectedIndex=Math.max(0,Math.min(selectedEffect,Math.max(0,effects.length-1)));
 const startGuides=effectStartGuides(effects,selectedIndex);
 const timelineEnd=Math.max(2000,...(showGuides?[manualGuide]:[]),...startGuides,...effects.map(effect=>(effect.delayMs??(effect.trigger==='after-delay'?1000:0))+effectDurationMs(effect)));
 const clockLabel=(effect:StoryEffectCue,index:number)=>effect.trigger==='on-click'?`${effectClickStep(effects,index)}번째 클릭`:effect.trigger==='with-dialogue'?'대사 시작':'컷 시작';
 const sameClock=(effect:StoryEffectCue,index:number)=>clockLabel(effect,index)===clockLabel(effects[selectedIndex]!,selectedIndex);
 const nameOf=(effect:StoryEffectCue)=>PRESENTATION_EFFECTS.find(item=>item.type===effect.type)?.label.replace(/^[^가-힣A-Za-z]+/u,'')??'효과';
 const actors=[...stage.leftActors,...stage.rightActors];
 const hasFollowing=!!value?.clearFollowingEffects||!project||project.lines.some(line=>line.presentation?.effects?.some(effect=>effect.scope==='following'));
 const [clearingWasAvailable]=useState(hasFollowing);
 const canClear=clearingWasAvailable||hasFollowing;
 const apply=(next:StoryPresentation)=>{setUndo({value,effects:next.effects,clearFollowingEffects:next.clearFollowingEffects});setMessage('');onChange(next);};
 const applyStructure=(next:StoryPresentation)=>{setStructureRevision(revision=>revision+1);apply(next);};
 const update=(index:number,patch:Partial<StoryEffectCue>)=>apply({...value,effects:effects.map((effect,i)=>i===index?{...effect,...patch}:effect)});
 const targetLabel=(effect:StoryEffectCue)=>effect.target?.kind==='actor'?actorLabel(stage,effect.target.actorKey):effect.target?.kind==='background'?'배경 이미지':'화면 전체';
 function alignStart(mode:'with-previous'|'after-previous'){
  const next=alignEffectStart(effects,selectedIndex,mode);
  if(!next){setMessage('이전 효과가 반복 중이거나 시작 시간이 10초를 넘으면 다음에 맞출 수 없어요.');return;}
  setGuide(next[selectedIndex]!.delayMs??0);apply({...value,effects:next});
 }
 function alignGuide(edge:'start'|'end'){
  const next=alignEffectToGuide(effects,selectedIndex,manualGuide,edge);
  if(!next){setMessage('끝을 맞추려면 반복을 끄고, 효과 길이보다 뒤에 보조선을 놓아 주세요.');return;}
  if(next[selectedIndex]!.delayMs===(effects[selectedIndex]!.delayMs??(effects[selectedIndex]!.trigger==='after-delay'?1000:0))){setGuide(manualGuide);setMessage('현재 효과 시작 위치를 유지했어요.');return;}
  setGuide(manualGuide);apply({...value,effects:next});
 }
 function changeStart(requested:number){
  const result=snap&&showGuides&&!bypassSnap.current?snapEffectStart(effects,selectedIndex,requested,pointerTiming.current?120:0,[manualGuide]):{delayMs:requested,guideMs:undefined};
  if(result){setGuide(result.guideMs??null);update(selectedIndex,{delayMs:result.delayMs});}
 }
 function sequential(){
  const arranged=arrangeEffectsSequentially(effects);
  if(!arranged){setMessage('순서대로 시작하려면 앞 효과의 반복을 끄거나 지속 시간을 줄여 주세요. 시작 시점은 10초까지 설정할 수 있어요.');return;}
  apply({...value,effects:arranged});
 }
 function cancel(){
  if(!undo)return;
  if(stableJson(value?.effects)!==stableJson(undo.effects)||value?.clearFollowingEffects!==undo.clearFollowingEffects){setMessage('이후 효과가 바뀌어 이전 변경을 취소하지 않았어요. 현재 내용을 유지합니다.');return;}
  // Preserve changes to looks, transitions or actors made since this effect edit.
  const restored={...value,effects:undo.value?.effects,clearFollowingEffects:undo.value?.clearFollowingEffects};
  onChange(undo.value===undefined&&Object.values(restored).every(item=>item===undefined)?undefined:restored);
  setStructureRevision(revision=>revision+1);
  setUndo(null);setMessage('마지막 효과 변경을 취소했어요.');
 }
 return <div className={styles.controls} data-testid="story-effect-controls">
  {canClear&&<label className={styles.clear}><input type="checkbox" aria-label="이어지는 효과 끝내기" checked={value?.clearFollowingEffects??false} onChange={event=>apply({...value,clearFollowingEffects:event.target.checked})}/>이전 컷부터 이어진 효과 끝내기</label>}
  {effects.length>0&&<div className={styles.timeline} role="group" aria-label="효과 순서와 시간">
   <header><strong>효과 순서와 시간</strong><span>0초 — {seconds(timelineEnd)}</span></header>
   {effects.map((effect,index)=>{const delay=effect.delayMs??(effect.trigger==='after-delay'?1000:0);return <button type="button" key={effect.id??index} aria-label={`${index+1}번째 효과 선택`} aria-pressed={index===selectedIndex} onClick={()=>setSelectedEffect(index)}><span className={styles.trackName}>{index+1}. {nameOf(effect)}<small>{targetLabel(effect)}</small></span><span className={styles.track}>{showGuides&&sameClock(effect,index)&&[...new Set([...startGuides,manualGuide])].map(time=><span aria-hidden="true" key={time} className={time===manualGuide||guide===time?styles.activeGuide:styles.guide} style={{left:`${time/timelineEnd*100}%`}}/>)}<span className={styles.bar} style={{left:`${delay/timelineEnd*100}%`,width:`${Math.max(1,effectDurationMs(effect)/timelineEnd*100)}%`}}/></span><span className={styles.trackTime}>{clockLabel(effect,index)} {seconds(delay)} 뒤 · {seconds(effectDurationMs(effect))}{effect.repeat==='loop'?' · 반복':''}</span></button>;})}
   <div className={styles.timingTools}><label>시작 맞추기<select aria-label="선택한 효과 시작 맞추기" value="" onChange={event=>{if(event.target.value)alignStart(event.target.value as 'with-previous'|'after-previous');}}><option value="">선택</option><option value="with-previous" disabled={selectedIndex===0}>이전 효과와 함께</option><option value="after-previous" disabled={selectedIndex===0||effects[selectedIndex-1]?.repeat==='loop'}>이전 효과 다음에</option></select></label></div>
   <label>선택한 효과 시작 시간<input type="range" aria-label={`${selectedIndex+1}번째 효과 시작 시간`} min="0" max="10000" step="1" value={effects[selectedIndex]!.delayMs??(effects[selectedIndex]!.trigger==='after-delay'?1000:0)} onPointerDown={event=>{pointerTiming.current=true;bypassSnap.current=event.shiftKey;}} onPointerUp={()=>{pointerTiming.current=false;bypassSnap.current=false;}} onPointerCancel={()=>{pointerTiming.current=false;bypassSnap.current=false;}} onKeyDown={event=>{pointerTiming.current=false;bypassSnap.current=false;const current=effects[selectedIndex]!.delayMs??(effects[selectedIndex]!.trigger==='after-delay'?1000:0);const step=event.shiftKey?10:100;const next=event.key==='Home'?0:event.key==='End'?10000:event.key==='ArrowRight'||event.key==='ArrowUp'?current+step:event.key==='ArrowLeft'||event.key==='ArrowDown'?current-step:null;if(next!==null){event.preventDefault();changeStart(Math.max(0,Math.min(10000,next)));}}} onChange={event=>changeStart(Number(event.target.value))}/></label>
   <details className={styles.assistance}><summary>배치 보조 설정</summary><div className={styles.assistanceBody}>
    <label className={styles.snap}><input type="checkbox" checked={showGuides} onChange={event=>{setAssistance({showGuides:event.target.checked});setGuide(null);}}/>보조선 표시</label>
    <label className={styles.snap}><input type="checkbox" disabled={!showGuides} checked={snap} onChange={event=>{setAssistance({snap:event.target.checked});setGuide(null);}}/>보조선에 맞추기</label>
    {showGuides&&<><label>보조선 이동 · {clockLabel(effects[selectedIndex]!,selectedIndex)} 기준<input type="range" aria-label="보조선 위치" min="0" max="10000" step="1" value={manualGuide} onKeyDown={event=>{const step=event.shiftKey?10:100;const next=event.key==='Home'?0:event.key==='End'?10000:event.key==='ArrowRight'||event.key==='ArrowUp'?manualGuide+step:event.key==='ArrowLeft'||event.key==='ArrowDown'?manualGuide-step:null;if(next!==null){event.preventDefault();setManualGuide(Math.max(0,Math.min(10000,next)));setGuide(null);}}} onChange={event=>{setManualGuide(Number(event.target.value));setGuide(null);}}/></label>
    <SecondsInput label="보조선 위치" valueMs={manualGuide} onChange={time=>{setManualGuide(time);setGuide(null);}}/>
    <div className={styles.actions}><button type="button" onClick={()=>alignGuide('start')}>시작을 보조선에 맞추기</button><button type="button" disabled={effects[selectedIndex]!.repeat==='loop'||manualGuide<effectDurationMs(effects[selectedIndex]!)} onClick={()=>alignGuide('end')}>끝을 보조선에 맞추기</button></div>
    <small>실선은 옮길 수 있는 보조선이에요. 반복 효과는 끝을 맞출 수 없어요. Shift를 누른 채 끌면 자동 맞춤을 잠시 꺼요. 시작 시간은 방향키로 0.1초, Shift+방향키로 0.01초씩 옮겨요.</small></>}
   </div></details>
   <span className={styles.guideStatus} role="status">{guide!==null?`${seconds(guide)} 보조선에 맞췄어요.`:''}</span><small>시작 맞추기는 현재 설정된 시간을 기준으로 적용해요. 시작 기준이 같은 효과끼리 맞춰요. 클릭 효과의 시간은 해당 클릭부터 셉니다.</small>
  </div>}
  {(effects.length?effects:[undefined]).map((effect,index)=><section key={index} className={styles.card} hidden={index!==selectedIndex} aria-label={`${index+1}번째 효과 설정`}>
   <header className={styles.effectHeading}><strong>{index+1}번째 효과{effect?` · ${PRESENTATION_EFFECTS.find(item=>item.type===effect.type)?.label}`:' 선택'}</strong>{effect&&<span>{targetLabel(effect)} · {effect.scope==='following'?effect.endLineId?'종료 컷까지 유지':'다음 컷에도 유지':'현재 컷만'} · {clockLabel(effect,index)} {seconds(effect.delayMs??(effect.trigger==='after-delay'?1000:0))} 뒤 · {seconds(effectDurationMs(effect))} 동안 · {effect.repeat==='loop'?'반복':'한 번'}</span>}</header>
   <div className={styles.fields} hidden={index!==selectedIndex}>
    <div className={styles.full}><DirectionChoice kind="effects" label={label('효과',index)} value={effect?.type??''} onUse={selected=>selected?effect?update(index,{type:selected as StoryEffectCue['type']}):applyStructure({...value,effects:[{type:selected as StoryEffectCue['type'],intensity:'normal'}]}):applyStructure({...value,effects:effects.filter((_,i)=>i!==index)})}><option value="">효과 없음</option>{PRESENTATION_EFFECTS.map(item=><option key={item.type} value={item.type}>{item.label}</option>)}</DirectionChoice></div>
    {effect&&<>
     <StoryBranchConditionField project={project} value={effect.branchCondition} label={label('효과 갈래 조건',index)} onChange={branchCondition=>update(index,{branchCondition})} onPreviewFromBranch={onPreviewFromBranch}/>
     <label>대상<select aria-label={label('효과 대상',index)} value={effect.target?.kind==='actor'?`actor:${effect.target.actorKey}`:effect.target?.kind??'screen'} onChange={event=>update(index,{target:event.target.value.startsWith('actor:')?{kind:'actor',actorKey:event.target.value.slice(6)}:{kind:event.target.value as 'screen'|'background'}})}><option value="screen">화면 전체</option><option value="background">배경 이미지</option>{actors.map(actor=><option key={actor.key} value={`actor:${actor.key}`}>{actorLabel(stage,actor.key)} · {(()=>{const asset=resolveAsset(actor.assetId);return asset?assetDisplayName(asset):'인물';})()} 이미지</option>)}{effect.target?.kind==='actor'&&!actors.some(actor=>actor.key===(effect.target as {actorKey:string}).actorKey)&&<option value={`actor:${effect.target.actorKey}`}>이 컷에 없는 인물 (다른 컷에서 유지)</option>}</select></label>
     <label>적용 범위<select aria-label={label('효과 적용 범위',index)} value={effect.scope??'cut'} onChange={event=>update(index,{scope:event.target.value as 'cut'|'following',...(event.target.value==='cut'?{endLineId:undefined}:{})})}><option value="cut">현재 컷만</option><option value="following">다음 컷에도 유지</option></select></label>
     {effect.scope==='following'&&<CutRangeEnd project={project} lineId={lineId} value={effect.endLineId} label={label('효과 종료 컷',index)} onChange={endLineId=>update(index,{endLineId,id:effect.id??crypto.randomUUID()})}/>}
     <label>시작<select aria-label={label('효과 시작',index)} value={effect.trigger??'scene-enter'} onChange={event=>update(index,{trigger:event.target.value as StoryEffectCue['trigger'],clickStep:event.target.value==='on-click'?effect.clickStep:undefined})}><option value="scene-enter">컷 시작 때</option><option value="with-dialogue">대사와 함께</option><option value="after-delay">컷 시작 후 대기</option><option value="on-click">클릭하면</option></select></label>
     {effect.trigger==='on-click'&&<label>클릭 순서<select aria-label={label('효과 클릭 순서',index)} value={effectClickStep(effects,index)} onChange={event=>update(index,{clickStep:Number(event.target.value)})}>{[1,2,3].map(step=><option key={step} value={step}>{step}번째 클릭</option>)}</select><small>같은 순서는 함께 시작해요. 조건에 맞는 효과만 실행해요.</small></label>}
     <SecondsInput key={`delay:${structureRevision}`} label={label('효과 대기 시간',index)} valueMs={effect.delayMs??(effect.trigger==='after-delay'?1000:0)} onChange={delayMs=>update(index,{delayMs})}/>
     <SecondsInput key={`duration:${structureRevision}`} label={label('효과 지속 시간',index)} valueMs={effectDurationMs(effect)} onChange={durationMs=>update(index,{durationMs})}/>
     <label>강도<select aria-label={label('효과 강도',index)} value={effect.intensity??'normal'} onChange={event=>update(index,{intensity:event.target.value as StoryEffectCue['intensity']})}><option value="soft">약하게</option><option value="normal">보통</option><option value="strong">강하게</option></select></label>
     <label>반복<select aria-label={label('효과 반복',index)} value={effect.repeat??'once'} onChange={event=>update(index,{repeat:event.target.value as 'once'|'loop'})}><option value="once">한 번</option><option value="loop">계속 반복</option></select></label>
     {effect.repeat==='loop'&&<SecondsInput key={`period:${structureRevision}`} label={label('효과 반복 간격',index)} minMs={400} valueMs={effect.periodMs??2400} onChange={periodMs=>update(index,{periodMs})}/>}
     <div className={`${styles.actions} ${styles.full}`}>
      {index>0&&<button type="button" aria-label={`${index+1}번째 효과 위로`} onClick={()=>{setSelectedEffect(index-1);applyStructure({...value,effects:moveEffect(effects,index,-1)});}}>위로</button>}
      {index<effects.length-1&&<button type="button" aria-label={`${index+1}번째 효과 아래로`} onClick={()=>{setSelectedEffect(index+1);applyStructure({...value,effects:moveEffect(effects,index,1)});}}>아래로</button>}
      <button type="button" onClick={()=>applyStructure({...value,effects:effects.filter((_,i)=>i!==index)})}>{index+1}번째 효과 제거</button>
     </div>
    </>}
   </div>
  </section>)}
  <div className={styles.actions}>
   {effects.length>0&&effects.length<3&&<button type="button" onClick={()=>{setSelectedEffect(effects.length);applyStructure({...value,effects:[...effects,{type:'shake',intensity:'normal'}]});}}>효과 추가</button>}
   {effects.length>1&&<button type="button" onClick={sequential}>순서대로 시작</button>}
   {undo&&<button type="button" onClick={cancel}>마지막 효과 변경 취소</button>}
  </div>
  {project&&lineId&&onProjectChange&&<EffectStartControls key={`${project.id}/${lineId}`} project={project} lineId={lineId} onChange={onProjectChange} onMoved={()=>setUndo(null)}/>}
  {message&&<p className={styles.hint} role="status">{message}</p>}
  {(effects.length>1||effects.some(effect=>effect.repeat==='loop'))&&<p className={styles.hint}>최대 3개. 위로·아래로는 목록 순서만 바꿉니다. 순서대로 시작은 각 효과의 대기 시간을 조정해 앞 효과가 끝나면 다음 효과를 시작하게 합니다. 반복 효과는 계속 이어질 수 있어요. 지속 시간이 0초면 효과를 표시하지 않습니다. 없는 인물의 효과는 표시되지 않으며 움직임 줄이기를 따릅니다.</p>}
 </div>;
}
