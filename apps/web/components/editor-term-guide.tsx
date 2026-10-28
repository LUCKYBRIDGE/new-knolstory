'use client';
import dialogSurface from './story-dialog-surface.module.css';
import {useEffect,useId,useRef,useState} from 'react';
import {editorTermCategories,findEditorTerms,type EditorTermCategory} from '../lib/editor-terms';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {useEditorKeyboard} from './use-editor-keyboard';
import styles from './editor-term-guide.module.css';

export function EditorTermGuide(){
 const [open,setOpen]=useState(false);
 return <><button type="button" aria-haspopup="dialog" onClick={()=>setOpen(true)}>편집 용어 안내</button>{open&&<TermDialog onClose={()=>setOpen(false)}/>}</>;
}
function TermDialog({onClose}:{onClose:()=>void}){
 const keyboard=useEditorKeyboard('[data-keyboard-dialog=terms]');
 const ref=useRef<HTMLDialogElement>(null),titleId=useId(),composing=useRef(false);
 const [query,setQuery]=useState(''),[category,setCategory]=useState<EditorTermCategory>('전체');
 const terms=findEditorTerms(query,category);
 useEffect(()=>{
  const opener=document.activeElement as HTMLElement|null,dialog=ref.current;
  dialog?.showModal();dialog?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  return()=>{dialog?.close();if(opener?.isConnected)opener.focus();};
 },[]);
 return <dialog ref={ref} data-keyboard-dialog="terms" data-keyboard-occluded={keyboard.occluded} className={`${styles.dialog} ${dialogSurface.surface}`} aria-labelledby={titleId} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{if(event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||composing.current){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}return;}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}else trapDialogTab(event,ref.current);}} onCancel={event=>{event.preventDefault();event.stopPropagation();if(!composing.current)onClose();}}>
  <div className={styles.shell}>
   <header className={styles.header}><div><h2 id={titleId}>편집 용어 안내</h2><p>화면에서 쓰는 이름과 기능의 뜻을 확인하세요. 이전 이름으로도 찾을 수 있어요.</p></div><button type="button" onClick={onClose} aria-label="편집 용어 안내 닫기">닫기</button></header>
   <div className={styles.findbar}><label className={styles.search}>용어 검색<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="예: 환경음, 화자, 점수, 초"/></label><label>분류<select aria-label="분류" value={category} onChange={event=>setCategory(event.target.value as EditorTermCategory)}>{editorTermCategories.map(item=><option key={item}>{item}</option>)}</select></label><button type="button" disabled={!query&&category==='전체'} onClick={()=>{setQuery('');setCategory('전체');}}>검색 초기화</button></div>
   <p className={styles.count} role="status">{terms.length}개 용어</p>
   <div className={styles.body}>{terms.length===0?<p>찾는 용어가 없어요. 다른 말로 검색하거나 분류를 전체로 바꿔 보세요.</p>:<dl className={styles.list}>{terms.map(term=><div key={term.name}><dt>{term.name}<small>{term.category}</small></dt><dd>{term.aliases&&<details className={styles.aliases}><summary>이전 이름·검색어</summary><p>{term.aliases}</p></details>}<p>{term.description}</p><p className={styles.example}>예: {term.example}</p></dd></div>)}</dl>}</div>
  </div>
 </dialog>;
}
