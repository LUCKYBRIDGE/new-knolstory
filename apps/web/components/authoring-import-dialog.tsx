'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';

export type AuthoringImportDialogProps={
 title:string;kind:'knolstory'|'shortstory';chapterCount?:number;cutCount?:number;pageCount?:number;resourceCount?:number;
 onApply:()=>void|Promise<void>;onCancel:()=>void;busy?:boolean;error?:string;
};
/** Receives only an already validated archive summary; applying is owned by the workspace. */
export function AuthoringImportDialog({title,kind,chapterCount=0,cutCount=0,pageCount=0,resourceCount=0,onApply,onCancel,busy=false,error}:AuthoringImportDialogProps){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();opener?.focus();};},[]);
 return <dialog ref={ref} className={styles.dialog} aria-label="작품 가져오기 확인" onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();if(!busy)onCancel();}}>
  <h2>작품 가져오기 확인</h2>
  <p className={styles.title}>{title||'제목 없는 작품'}</p>
  <dl><dt>작품 종류</dt><dd>{kind==='knolstory'?'놀스토리':'숏스토리'}</dd>
   {kind==='knolstory'?<><dt>장 · 컷</dt><dd>{chapterCount}장 · {cutCount}컷</dd><dt>첨부 오디오</dt><dd>{resourceCount}개</dd></>:<><dt>쪽</dt><dd>{pageCount}쪽</dd></>}
  </dl>
  <p>형식과 연결을 확인했습니다. 가져오면 독립된 내 사본으로 열립니다. 현재 작품과 기본 제공 원작은 덮어쓰지 않습니다.</p>
  {error&&<p role="alert">{error}</p>}
  <div className={styles.actions}><button autoFocus disabled={busy} onClick={onCancel}>가져오기 취소</button><button className={styles.primary} disabled={busy} onClick={()=>void onApply()}>내 사본으로 가져오기</button></div>
  {busy&&<p role="status">작품과 첨부 자료를 보관하고 있습니다.</p>}
 </dialog>;
}
