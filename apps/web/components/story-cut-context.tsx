'use client';
import {chapterLabel,cutLabel,type StoryProject,type StoryLine} from '@knolstory/story-domain';
import {adjacentManuscriptCuts} from './editor-context';
import styles from './story-workspace.module.css';
type Props={project:StoryProject;line:StoryLine;ordered:StoryLine[];onSelect:(id:string)=>void;disabled:boolean};
export function StoryCutPosition(p:Props){return <label className={styles.cutPosition}><span className={styles.cutPositionLabel}>현재 장 · 컷</span><select aria-label="현재 장과 컷 이동" value={p.line.id} disabled={p.disabled} onChange={event=>p.onSelect(event.target.value)}>{p.project.chapters.map(chapter=><optgroup key={chapter.id} label={chapterLabel(chapter)}>{p.ordered.filter(cut=>cut.chapterId===chapter.id).map(cut=><option key={cut.id} value={cut.id}>{cutLabel(chapter,cut)} · {cut.text.slice(0,36)||'빈 컷'}</option>)}</optgroup>)}</select></label>;}
export function StoryAdjacentCut(p:Props&{direction:'previous'|'next'}){
 const cut=adjacentManuscriptCuts(p.ordered,p.line.id)[p.direction];
 const label=p.direction==='previous'?'이전 컷':'다음 컷';
 if(!cut)return <div className={styles.adjacentCut}><strong>{p.direction==='previous'?'이전 컷':'다음 컷'}</strong><span>{p.direction==='previous'?'첫 원고 컷입니다':'마지막 원고 컷입니다'}</span></div>;
 const chapter=p.project.chapters.find(item=>item.id===cut.chapterId)!;
 return <div className={styles.adjacentCut} data-adjacent-cut={p.direction}><button type="button" disabled={p.disabled} onClick={()=>p.onSelect(cut.id)}>{label} · {cutLabel(chapter,cut)}</button><span>{cut.speakerName||'해설'} · {cut.text||'아직 글이 없는 컷'}</span></div>;
}
