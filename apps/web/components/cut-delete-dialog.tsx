"use client";
import {useEffect,useRef} from "react";
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from "./authoring-import-dialog.module.css";
export function CutDeleteDialog({text,incomingLinks,connections=[],rangeEnds=[],branchConditions=[],onCancel,onDelete}:{text:string;incomingLinks:number;connections?:readonly {id:string;label:string;kind?:string}[];rangeEnds?:readonly {label:string}[];branchConditions?:readonly {label:string;kind?:string}[];onCancel():void;onDelete():void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const opener=document.activeElement as HTMLElement|null; const dialog=ref.current; dialog?.showModal();return()=>{dialog?.close();opener?.focus();};},[]);
  return <dialog ref={ref} className={styles.dialog} aria-label="컷 삭제 확인" onKeyDown={event=>trapDialogTab(event,ref.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onCancel();}}>
    <div>
      <h2>이 컷을 삭제할까요?</h2><p className={styles.title}>{text||'글이 없는 컷'}</p>
      <section aria-label="이 컷으로 이어지는 선택과 조건"><h3>이 컷으로 이어지는 곳</h3>{connections.length?<ul>{connections.map(item=><li key={item.id}>{item.label}</li>)}</ul>:<p>다른 컷이나 선택지에서 이 컷으로 이동하도록 정한 곳은 없어요.</p>}{incomingLinks>0&&<p>삭제하면 이 컷으로 오도록 정한 선택이나 조건의 도착지를 다시 정해야 해요.</p>}<p>앞뒤 컷이 순서대로 이어지는 흐름도 달라질 수 있어요.</p></section>
      <p>삭제 직후 ‘삭제 되돌리기’로 삭제 전 상태를 복원할 수 있습니다. 다른 내용을 수정하면 이 복원은 종료됩니다.</p>
      {!!rangeEnds.length&&<section role="alert"><p>이 컷에서 끝나도록 정한 연출·소리가 {rangeEnds.length}개 있습니다. 아래 항목의 끝나는 위치를 다른 컷으로 바꾼 뒤 삭제해 주세요. 삭제해도 효과가 계속 이어지도록 임의 변경하지 않습니다.</p><ul>{rangeEnds.map((item,index)=><li key={index}>{item.label}</li>)}</ul></section>}
      {!!branchConditions.length&&<section role="alert"><p>{branchConditions.some(item=>item.kind==='visibility')?'이 컷에서 고른 선택을 사용하는 컷 표시 조건·연출·소리가':'이 컷에서 고른 선택에 따라 나오는 연출·소리가'} {branchConditions.length}개 있습니다. 아래 항목의 연결된 선택지를 바꾸거나 해제한 뒤 삭제해 주세요.</p><ul>{branchConditions.map((item,index)=><li key={index}>{item.label}</li>)}</ul></section>}
      <div className={styles.actions}><button autoFocus onClick={onCancel}>삭제 취소</button><button className={styles.danger} disabled={rangeEnds.length>0||branchConditions.length>0} onClick={onDelete}>삭제 실행</button></div>
    </div>
  </dialog>;
}
