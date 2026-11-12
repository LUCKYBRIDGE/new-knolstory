'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
type Props={reason:string;notice:string;busy:'checking'|'saving'|null;onCancel:()=>void;onRetry:()=>void;onSave:()=>void;onContinue:()=>void};
/** Local shelf navigation is recoverable even when browser recovery storage is unavailable. */
export function LibraryReturnDialog({reason,notice,busy,onCancel,onRetry,onSave,onContinue}:Props){
 const ref=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null,dialog=ref.current;dialog?.showModal();cancel.current?.focus({preventScroll:true});const frame=requestAnimationFrame(()=>cancel.current?.focus({preventScroll:true}));return()=>{cancelAnimationFrame(frame);dialog?.close();const target=opener?.isConnected&&opener.checkVisibility()?opener:document.querySelector<HTMLElement>('[data-work-menu]>summary');target?.focus({preventScroll:true});};},[]);
 return <dialog ref={ref} className={`${styles.dialog} ${surface.surface}`} aria-label="서재로 이동할까요?" onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();if(busy!=='saving')onCancel();}}>
  <h2>서재로 이동할까요?</h2><p>{reason}</p><p>지금 원고는 이 탭에 그대로 있어요. 임시 보관이 끝나지 않았다면 새로고침하거나 탭을 닫을 때 바꾼 내용이 사라질 수 있어요.</p>
  <p>지키고 싶은 내용은 먼저 작품 파일로 저장하세요. 서재로 가도 이 탭에서 원고를 다시 열 수 있어요.</p>
  {busy==='checking'&&<p role="status">임시 보관을 다시 확인하고 있어요.</p>}{busy==='saving'&&<p role="status">작품 파일을 저장하고 있어요.</p>}{notice&&<p role="status">{notice}</p>}
  <div className={styles.actions} style={{flexWrap:'wrap'}}><button type="button" disabled={!!busy} onClick={onSave}>작품 파일 저장하고 서재로</button><button type="button" disabled={!!busy} onClick={onRetry}>임시 보관 다시 시도</button><button type="button" ref={cancel} disabled={busy==='saving'} autoFocus onClick={onCancel}>계속 편집하기</button><button type="button" disabled={busy==='saving'} onClick={onContinue}>서재로 이동</button></div>
 </dialog>;
}
