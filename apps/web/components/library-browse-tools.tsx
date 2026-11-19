'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {NewStoryForm} from './new-story-form';
import styles from './local-bookshelf.module.css';

type Props={
 filter:string; query:string; onFilter:(value:string)=>void; onQuery:(value:string)=>void;
 createMenu:RefObject<HTMLDetailsElement|null>; disabled:boolean; canRestore:boolean;
 onCreate:(title:string)=>boolean; onImport:(file:File)=>void;
};

export function LibraryBrowseTools({filter,query,onFilter,onQuery,createMenu,disabled,canRestore,onCreate,onImport}:Props){
 const searchMenu=useRef<HTMLDetailsElement>(null);
 const composing=useRef(false);
 function close(menu:HTMLDetailsElement,returnFocus=false){
  menu.open=false;
  if(returnFocus)menu.querySelector<HTMLElement>('summary')?.focus();
 }
 useEffect(()=>{
  const menus=()=>[searchMenu.current,createMenu.current];
  const dismiss=(event:PointerEvent)=>{
   for(const menu of menus())if(menu?.open&&event.target instanceof Node&&!menu.contains(event.target))close(menu);
  };
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.isComposing||event.keyCode===229||composing.current)return;
   for(const menu of menus())if(menu?.open)close(menu,true);
  };
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[createMenu]);
 function opened(menu:HTMLDetailsElement,other:HTMLDetailsElement|null){
  if(!menu.open)return;
  if(other?.open)close(other);
  menu.querySelector<HTMLInputElement>('input:not([type=file]):not([disabled])')?.focus();
 }
 return <div className={styles.browse} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onBlurCapture={()=>{composing.current=false;}}>
  <div className={styles.switcher} role="group" aria-label="선반 선택">
   <button type="button" aria-pressed={filter==='all'} onClick={()=>onFilter('all')}>모든 작품</button>
   <button type="button" aria-pressed={filter==='own'} onClick={()=>onFilter('own')}>내 작품</button>
  </div>
  <div className={styles.browseActions}>
   <details ref={searchMenu} className={styles.tools} data-testid="library-tools" onToggle={event=>opened(event.currentTarget,createMenu.current)}>
    <summary>책 검색</summary><div className={styles.toolsPanel}>
     <label className={styles.search}>책 찾기<input type="search" maxLength={200} placeholder="제목이나 지은이" value={query} onKeyDown={event=>{
      if(event.key==='Enter'&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229&&!composing.current&&searchMenu.current){event.preventDefault();close(searchMenu.current,true);}
     }} onChange={event=>onQuery(event.target.value)}/></label>
     <label className={styles.scope}>책 분류<select aria-label="책 분류" value={filter} onChange={event=>{onFilter(event.target.value);if(searchMenu.current)close(searchMenu.current,true);}}>
      <option value="all">모든 작품</option><option value="own">내 작품</option><option value="builtin">기본 작품</option>{canRestore&&<option value="deleted">삭제한 작품</option>}
     </select></label>
    </div>
   </details>
   <details ref={createMenu} className={styles.tools} data-testid="library-create" onToggle={event=>opened(event.currentTarget,searchMenu.current)}>
    <summary>새 작품</summary><div className={styles.toolsPanel}>
     <NewStoryForm disabled={disabled} onCreate={onCreate} onCancel={()=>{if(createMenu.current)close(createMenu.current,true);}}/>
     <label className={styles.import}>작품 파일 가져오기<input type="file" accept=".knolstory" aria-label="서재 작품 파일 가져오기" disabled={disabled} onChange={event=>{const file=event.target.files?.[0];if(file)onImport(file);event.target.value='';}}/></label>
    </div>
   </details>
  </div>
  {filter==='own'&&<a className={styles.pictureShelf} href="/shortstory?mode=library">그림책 보관함</a>}
  {(query.trim()||filter==='builtin'||filter==='deleted')&&<div className={styles.filterSummary}>
   {filter==='builtin'?'기본 작품':filter==='deleted'?'삭제한 작품':''}{query.trim()&&<button type="button" aria-label={`‘${query}’ 검색 지우기`} onClick={()=>onQuery('')}>{query} ×</button>}
  </div>}
 </div>;
}
