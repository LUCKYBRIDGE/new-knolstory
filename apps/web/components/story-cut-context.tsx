'use client';
import {chapterLabel,chaptersForDisplay,cutLabel,type StoryProject,type StoryLine} from '@knolstory/story-domain';
import {adjacentManuscriptCuts} from './editor-context';
import styles from './story-workspace.module.css';
type Props={project:StoryProject;line:StoryLine;ordered:StoryLine[];onSelect:(id:string)=>void|boolean;disabled:boolean};
/** ‘2장A · 3컷’: the chapter's number and branch with the cut number, without the chapter title. */
function shortPosition(project:StoryProject,line:StoryLine){
 const chapter=project.chapters.find(item=>item.id===line.chapterId);if(!chapter)return `${line.order}컷`;
 const branch=chapter.branchLabel?.trim()??'';
 return `${chapter.chapterNumber??chapter.order}장${branch?(/^[A-Za-z]+$/u.test(branch)?branch:` ${branch}`):''} · ${line.order}컷`;
}
/**
 * Chapter and cut navigation for every focus screen (2026-11-24 rules): one top-bar slot of 44px,
 * ‹ and › from the open editing screen (`stepsTarget`) around a short ‘1장 · 3컷’ label. The native
 * select lies over the label, so the full list (chapter title, opening words) opens on demand only.
 */
export function StoryCutPosition({stepsTarget,...p}:Props&{stepsTarget?:(node:HTMLSpanElement|null)=>void}){
 return <div className={styles.cutNav} data-cut-nav><span ref={stepsTarget} className={styles.cutSteps}/><label className={styles.cutPosition}><span className={styles.cutPositionLabel}>현재 장 · 컷</span><span className={styles.cutShort} aria-hidden="true">{shortPosition(p.project,p.line)}<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><select aria-label="현재 장과 컷 이동" value={p.line.id} disabled={p.disabled} onChange={event=>{if(p.onSelect(event.target.value)===false)event.currentTarget.value=p.line.id;}}>{chaptersForDisplay(p.project.chapters).map(chapter=><optgroup key={chapter.id} label={chapterLabel(chapter)}>{p.ordered.filter(cut=>cut.chapterId===chapter.id).map(cut=><option key={cut.id} value={cut.id}>{cutLabel(chapter,cut)} · {cut.text.slice(0,36)||'빈 컷'}</option>)}</optgroup>)}</select></label></div>;
}
export function StoryAdjacentCut(p:Props&{direction:'previous'|'next'}){
 const cut=adjacentManuscriptCuts(p.ordered,p.line.id)[p.direction];
 const label=p.direction==='previous'?'이전 컷':'다음 컷';
 if(!cut)return <div className={styles.adjacentCut}><strong>{p.direction==='previous'?'이전 컷':'다음 컷'}</strong><span>{p.direction==='previous'?'첫 원고 컷이에요':'마지막 원고 컷이에요'}</span></div>;
 const chapter=p.project.chapters.find(item=>item.id===cut.chapterId)!;
 return <div className={styles.adjacentCut} data-adjacent-cut={p.direction}><button type="button" disabled={p.disabled} onClick={()=>p.onSelect(cut.id)}>{label} · {cutLabel(chapter,cut)}</button><span>{cut.speakerName||'해설'} · {cut.text||'아직 글이 없는 컷'}</span></div>;
}
