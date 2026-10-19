'use client';
import type {StoryProject,StoryLine} from '@knolstory/story-domain';
import {relatedPreparationMemos} from '../lib/story-preparation';
import styles from './editor-related-memos.module.css';
type Props={project:StoryProject;line:StoryLine;disabled:boolean;onOpen:(memoId?:string)=>void};
export function EditorRelatedMemos({project,line,disabled,onOpen}:Props){
 const memos=relatedPreparationMemos(project.creativeMemos,line.id,line.chapterId);
 const other=(project.creativeMemos??[]).filter(memo=>!memos.some(related=>related.id===memo.id));
 return <details key={`${project.id}/${line.id}`} className={styles.memos} data-related-memos><summary>창작 메모 보기 · {(project.creativeMemos??[]).length}개</summary><p>메모를 참고하며 현재 컷의 글을 쓸 수 있습니다.</p>{!memos.length&&<p>이 장·컷에 연결된 메모가 없습니다.</p>}
  <ul>{memos.map(memo=><li key={memo.id}><strong>{memo.title||'제목 없는 메모'}</strong>{memo.fields.slice().sort((a,b)=>a.order-b.order).map(field=><p key={field.id}><span>{field.label}</span>{field.value||'아직 내용이 없는 항목'}</p>)}<button type="button" disabled={disabled} onClick={()=>onOpen(memo.id)}>이 메모 수정 · {memo.title||'제목 없는 메모'}</button></li>)}</ul>
 {other.length>0&&<details><summary>다른 창작 메모 · {other.length}개</summary><ul>{other.map(memo=><li key={memo.id}><strong>{memo.title||'제목 없는 메모'}</strong>{memo.fields.slice().sort((a,b)=>a.order-b.order).map(field=><p key={field.id}><span>{field.label}</span>{field.value||'아직 내용이 없는 항목'}</p>)}<button type="button" disabled={disabled} onClick={()=>onOpen(memo.id)}>이 메모 수정 · {memo.title||'제목 없는 메모'}</button></li>)}</ul></details>}
 <button type="button" disabled={disabled} onClick={()=>onOpen('')}>창작 메모 관리</button></details>;
}
