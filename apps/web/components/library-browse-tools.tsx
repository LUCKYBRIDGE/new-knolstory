'use client';
import {useEffect,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import styles from './local-bookshelf.module.css';

type Props={
 filter:string; query:string; onFilter:(value:string)=>void; onQuery:(value:string)=>void;
 canRestore:boolean; accountMenu?:ReactNode; onIntroduction?:()=>void; resultCount:number;
};

/** Hangul input confirms a syllable with Enter; that key belongs to the input method, not to us. */
const composingKey=(event:KeyboardEvent<HTMLInputElement>)=>event.nativeEvent.isComposing||event.nativeEvent.keyCode===229;

/**
 * The library's one header row (2026-11-23): account, 책 소개, the collection select and a magnifier.
 * The magnifier turns the same row into a search field; closing keeps the query, and the magnifier
 * then carries a dot and the query in its name so the active search stays discoverable.
 */
export function LibraryBrowseTools({filter,query,onFilter,onQuery,canRestore,accountMenu,onIntroduction,resultCount}:Props){
 const [searching,setSearching]=useState(false);
 const input=useRef<HTMLInputElement>(null),toggle=useRef<HTMLButtonElement>(null),returnFocus=useRef(false);
 useEffect(()=>{
  if(searching){input.current?.focus();return;}
  if(returnFocus.current){returnFocus.current=false;toggle.current?.focus();}
 },[searching]);
 const close=()=>{returnFocus.current=true;setSearching(false);};
 const active=query.trim();
 return <><div className={styles.topBar} data-library-header data-searching={searching||undefined}>
  {searching?<div className={styles.searchRow} role="search" aria-label="서재에서 책 찾기">
   <svg className={styles.searchGlyph} viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
   <input ref={input} type="search" aria-label="책 찾기" maxLength={200} placeholder="제목이나 지은이" enterKeyHint="search" value={query}
    onChange={event=>onQuery(event.target.value)}
    onKeyDown={event=>{
     if(composingKey(event))return;
     if(event.key==='Enter'){event.preventDefault();close();}
     else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
    }}/>
   {query&&<button type="button" className={styles.iconButton} aria-label="검색어 지우기" onClick={()=>{onQuery('');input.current?.focus();}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}
   <button type="button" className={styles.closeSearch} onClick={close}>닫기</button>
  </div>:<>
   {accountMenu&&<div className={styles.account}>{accountMenu}</div>}
   {onIntroduction&&<button type="button" className={styles.introLink} onClick={onIntroduction}>책 소개</button>}
   <label className={styles.scope}><span className={styles.semantic}>책 분류</span><select aria-label="책 분류" value={filter} onChange={event=>onFilter(event.target.value)}>
    <option value="all">모든 작품</option><option value="own">내 작품</option><option value="builtin">기본 작품</option>{canRestore&&<option value="deleted">삭제한 작품</option>}
   </select></label>
   <button ref={toggle} type="button" className={styles.iconButton} data-search-toggle data-active={active?'true':undefined} aria-label={active?`책 찾기 · ‘${active}’ 찾는 중`:'책 찾기'} aria-expanded={false} onClick={()=>setSearching(true)}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
   </button>
  </>}
 </div>
 {!searching&&active&&<p className={styles.queryChip}><button type="button" className={styles.queryOpen} onClick={()=>setSearching(true)}>‘{active}’ · {resultCount}권</button><button type="button" className={styles.iconButton} aria-label={`‘${active}’ 검색어 지우기`} onClick={()=>onQuery('')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button></p>}
 </>;
}
