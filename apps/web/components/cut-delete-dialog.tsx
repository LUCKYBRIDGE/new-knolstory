"use client";
import {useEffect,useRef} from "react";
import styles from "./story-flow-map.module.css";
export function CutDeleteDialog({text,incomingLinks,onCancel,onDelete}:{text:string;incomingLinks:number;onCancel():void;onDelete():void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const opener=document.activeElement as HTMLElement|null; const dialog=ref.current; dialog?.showModal();return()=>{dialog?.close();opener?.focus();};},[]);
  return <dialog ref={ref} className={styles.dialog} aria-label="컷 삭제 확인" onCancel={event=>{event.preventDefault();onCancel();}}>
    <div className={styles.body}>
      <h2>이 컷을 삭제할까요?</h2><p>{text||'글이 없는 컷'}</p>
      <p>이 컷으로 오는 명시 연결 {incomingLinks}개는 ‘연결 대기’로 바뀝니다. 순서대로 읽는 앞뒤 컷의 진행도 바뀔 수 있습니다.</p>
      <p>삭제 직후 ‘삭제 되돌리기’로 삭제 전 상태를 복원할 수 있습니다. 다른 내용을 수정하면 이 복원은 종료됩니다.</p>
      <button onClick={onCancel}>삭제 취소</button><button onClick={onDelete}>삭제 실행</button>
    </div>
  </dialog>;
}
