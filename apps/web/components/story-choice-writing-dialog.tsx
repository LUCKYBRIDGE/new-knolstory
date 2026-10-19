'use client';
import {useEffect,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './authoring-import-dialog.module.css';
type Props={label:string;sourceLabel:string;closesLinearTail:boolean;error:string;onCancel:()=>void;onCreate:()=>void};
/** Optional branch creation is previewed without touching the current manuscript. */
export function StoryChoiceWritingDialog(p:Props){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=ref.current,opener=document.activeElement as HTMLElement|null;element?.showModal();element?.querySelector<HTMLElement>('button')?.focus();return()=>{element?.close();if(opener?.isConnected)opener.focus();};},[]);
 return <dialog ref={ref} className={styles.dialog} aria-label="새 갈래 작성" onCancel={event=>{event.preventDefault();event.stopPropagation();p.onCancel();}} onKeyDown={event=>trapDialogTab(event,ref.current)}><h2>새 갈래 작성</h2><p>{p.sourceLabel}의 선택지에 빈 첫 컷을 연결합니다.</p><p className={styles.title}>{p.label}</p><p>현재 장 자료와 인물 배치를 이어받고 새 컷의 글을 바로 씁니다. 다른 선택지와 기존 원고는 보존합니다. 작성 후 ‘현재 컷 연결 살펴보기’에서 이전 편집 컷으로 돌아갈 수 있어요.</p>{p.closesLinearTail&&<p>새 갈래가 기존 원고 뒤에 붙으므로, 순서대로 이어지던 기존 원고의 마지막은 이야기 끝으로 명시합니다. 기존 글이 새 갈래로 저절로 이어지지 않습니다.</p>}{p.error&&<p role="alert">{p.error}</p>}<div className={styles.actions}><button type="button" onClick={p.onCancel}>취소</button><button className={styles.primary} type="button" onClick={p.onCreate}>새 갈래 만들고 글쓰기</button></div></dialog>;
}
