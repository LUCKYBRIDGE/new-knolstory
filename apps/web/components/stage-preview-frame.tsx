'use client';
import type {ReactNode} from 'react';
import type {StoryLine} from '@knolstory/story-domain';
import styles from './stage-preview-frame.module.css';
type Props={children:ReactNode;editing:boolean;ordered:readonly StoryLine[];lineId:string;composing:boolean;onSelect:(id:string)=>void};
/** Keep the viewport parent stable when entering playback; gutters never cover authored art. */
export function StagePreviewFrame({children,editing,ordered,lineId,composing,onSelect}:Props){
 const index=ordered.findIndex(line=>line.id===lineId),previous=ordered[index-1],next=ordered[index+1];
 return <div className={`${styles.frame} ${!editing?styles.reading:''}`}>
  <button type="button" hidden={!editing} aria-label="미리보기 이전 컷" title="원고 순서의 이전 컷" disabled={composing||!previous} onClick={()=>previous&&onSelect(previous.id)}>‹</button>
  {children}
  <button type="button" hidden={!editing} aria-label="미리보기 다음 컷" title="원고 순서의 다음 컷" disabled={composing||!next} onClick={()=>next&&onSelect(next.id)}>›</button>
 </div>;
}
