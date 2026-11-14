'use client';
import {useEffect,useRef,useState} from 'react';
import type {StorySplitMode} from '@knolstory/runtime-core';
import {trapDialogTab} from '../lib/dialog-keyboard';
import base from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
import styles from './story-split-dialog.module.css';

type Props={sourceLabel:string;nextChapterNumber:number;continuationLabel:string|null;error:string;onCancel:()=>void;onSplit:(input:{labels:string[];mode:StorySplitMode})=>void};
const letter=(index:number)=>String.fromCharCode(65+index);
/** One step from a plain cut to a fork: choices, where each path goes, and a preview of the new chapters. */
export function StorySplitDialog(p:Props){
 const ref=useRef<HTMLDialogElement>(null);
 const [labels,setLabels]=useState(['','']);
 const [mode,setMode]=useState<StorySplitMode>(p.continuationLabel?'rejoin':'separate');
 useEffect(()=>{const dialog=ref.current,opener=document.activeElement as HTMLElement|null;dialog?.showModal();dialog?.querySelector<HTMLInputElement>('input')?.focus();return()=>{dialog?.close();if(opener?.isConnected)opener.focus();};},[]);
 const keepsStory=mode==='separate'&&!!p.continuationLabel;
 const filled=labels.every(label=>label.trim());
 const preview=labels.map((label,index)=>({letter:letter(index),label:label.trim()||`선택 ${index+1}`,existing:keepsStory&&index===0}));
 return <dialog ref={ref} className={`${base.dialog} ${surface.surface} ${styles.dialog}`} aria-label="여기서 이야기 나누기" onCancel={event=>{event.preventDefault();event.stopPropagation();p.onCancel();}} onKeyDown={event=>trapDialogTab(event,ref.current)}>
  <h2>여기서 이야기 나누기</h2>
  <p>{p.sourceLabel} 다음에 읽는 사람이 고를 선택지를 적어 주세요.</p>
  <form onSubmit={event=>{event.preventDefault();if(filled)p.onSplit({labels,mode});}}>
   <fieldset className={styles.choices}><legend>선택지</legend>
    {labels.map((label,index)=><div key={index} className={styles.choice}><span aria-hidden="true">{letter(index)}</span><input aria-label={`선택지 ${letter(index)} 문구`} value={label} maxLength={80} placeholder={index===0?'예: 숲으로 들어간다':index===1?'예: 강을 건넌다':'예: 집으로 돌아간다'} onChange={event=>setLabels(current=>current.map((item,at)=>at===index?event.target.value:item))}/>{index===2&&<button type="button" aria-label="선택지 C 빼기" onClick={()=>setLabels(current=>current.slice(0,2))}>빼기</button>}</div>)}
    {labels.length<3&&<button type="button" className={styles.add} onClick={()=>setLabels(current=>[...current,''])}>+ 선택지 하나 더</button>}
   </fieldset>
   <fieldset className={styles.modes}><legend>갈래가 끝나면</legend>
    <label><input type="radio" name="split-mode" checked={mode==='rejoin'} disabled={!p.continuationLabel} onChange={()=>setMode('rejoin')}/><span><b>다시 만나요</b><small>{p.continuationLabel?`각 갈래를 쓴 뒤 지금 이어지는 이야기(${p.continuationLabel})로 돌아와요.`:'이 컷 뒤에 이어지는 이야기가 없어요.'}</small></span></label>
    <label><input type="radio" name="split-mode" checked={mode==='separate'} onChange={()=>setMode('separate')}/><span><b>각자 끝나요</b><small>{p.continuationLabel?'지금 이어지는 이야기는 A 갈래가 되고, 새 갈래는 따로 끝나요.':'갈래마다 따로 끝나요.'}</small></span></label>
   </fieldset>
   <div className={styles.preview} aria-label="만들어질 갈래 미리보기"><strong>만들어질 갈래</strong>
    <ol>{preview.map(item=><li key={item.letter}><b>{item.letter}</b><span>{item.label}</span><small>{item.existing?`지금 이야기 → ${p.continuationLabel}`:`새 장 ${p.nextChapterNumber}장${item.letter} · 빈 첫 컷${mode==='rejoin'?' → 다시 만남':' → 끝'}`}</small></li>)}</ol>
    <small>새 장은 지금 장 바로 뒤에 놓여요. 기존 컷의 글과 연결은 그대로예요.</small>
   </div>
   {p.error&&<p role="alert">{p.error}</p>}
   <div className={base.actions}><button type="button" onClick={p.onCancel}>취소</button><button type="submit" className={base.primary} disabled={!filled}>{filled?'나누고 첫 갈래 쓰기':'선택지 문구를 모두 적어 주세요'}</button></div>
  </form>
 </dialog>;
}
