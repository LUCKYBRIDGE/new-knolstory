'use client';
import {chapterLabel,chaptersForDisplay,cutLabel,type StoryProject,type StoryLine} from '@knolstory/story-domain';
import {adjacentManuscriptCuts} from './editor-context';
import styles from './story-workspace.module.css';
import {FocusSurface} from './a2ui/focus-surface';
import {cutPlaceSurface,CUT_PLACE_EVENT,CUT_STEP_EVENT,type CutSteps} from './a2ui/editor-surfaces';
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
export function StoryCutPosition({steps,...p}:Props&{steps?:(CutSteps&{step:(direction:'previous'|'next')=>void})|null}){
 // A2UI: drawn from the focus editor catalog (CutNavigator), with the open screen's ‹ › as its IconButtons.
 const chapter=p.project.chapters.find(item=>item.id===p.line.chapterId);
 const groups=chaptersForDisplay(p.project.chapters).map(item=>({label:chapterLabel(item),options:p.ordered.filter(cut=>cut.chapterId===item.id).map(cut=>({value:cut.id,label:`${cutLabel(item,cut)} · ${cut.text.slice(0,36)||'빈 컷'}`}))}));
 const surface=cutPlaceSurface({short:shortPosition(p.project,p.line),value:p.line.id,groups,disabled:p.disabled,chapter:chapter?.chapterNumber??chapter?.order??1,cut:p.line.order,steps});
 return <FocusSurface inline surface={surface} rootId="place" device="tablet"
  attrs={component=>component.id==='place'?{className:styles.cutNav,'data-cut-nav':''}:component.component==='IconButton'?{className:'','data-cut-step':String(component.id)}:undefined}
  skin={{cutPosition:styles.cutPosition,cutPositionLabel:styles.cutPositionLabel,cutShort:styles.cutShort}}
  onAction={({action})=>{const event='event' in action?action.event:undefined;const id=event?.context?.value;if(event?.name===CUT_PLACE_EVENT&&typeof id==='string')p.onSelect(id);
   const direction=event?.context?.direction;if(event?.name===CUT_STEP_EVENT&&(direction==='previous'||direction==='next'))steps?.step(direction);}}/>;
}
export function StoryAdjacentCut(p:Props&{direction:'previous'|'next'}){
 const cut=adjacentManuscriptCuts(p.ordered,p.line.id)[p.direction];
 const label=p.direction==='previous'?'이전 컷':'다음 컷';
 if(!cut)return <div className={styles.adjacentCut}><strong>{p.direction==='previous'?'이전 컷':'다음 컷'}</strong><span>{p.direction==='previous'?'첫 원고 컷이에요':'마지막 원고 컷이에요'}</span></div>;
 const chapter=p.project.chapters.find(item=>item.id===cut.chapterId)!;
 return <div className={styles.adjacentCut} data-adjacent-cut={p.direction}><button type="button" disabled={p.disabled} onClick={()=>p.onSelect(cut.id)}>{label} · {cutLabel(chapter,cut)}</button><span>{cut.speakerName||'해설'} · {cut.text||'아직 글이 없는 컷'}</span></div>;
}
