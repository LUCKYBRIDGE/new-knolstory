'use client';
import type {EditorTool} from '../lib/workspace-storage';
import styles from './story-workspace.module.css';
type Props={activeTool:EditorTool;soundTool:boolean;disabled:boolean;onSelect:(tool:EditorTool,sound?:boolean)=>void};
const basics=[['text','글 편집'],['assets','배경·인물 편집']] as const;
const extras=[['flow','선택지 편집'],['presentation','연출 편집'],['cuts','컷 목록']] as const;
export function StoryEditorTools({activeTool,soundTool,disabled,onSelect}:Props){
 return <nav className={styles.mobileTools} aria-label="편집 도구">
  {basics.map(([tool,label])=><button key={tool} disabled={disabled} aria-label={label} title={label} aria-pressed={activeTool===tool} onClick={()=>onSelect(tool)}>{label.replace(/ 편집$/,'')}</button>)}
  <details data-additional-tools className={styles.extraTools} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector<HTMLElement>('summary')?.focus();event.stopPropagation();}}} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))event.currentTarget.open=false;}}>
   <summary aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}>추가 편집</summary>
   <div className={styles.controls}>{extras.map(([tool,label])=><button key={tool} disabled={disabled} aria-label={label} aria-pressed={activeTool===tool&&!soundTool} onClick={event=>{onSelect(tool);event.currentTarget.closest('details')?.removeAttribute('open');}}>{label.replace(/ 편집$/,'')}</button>)}
    <button disabled={disabled} aria-label="음향 편집" title="음향 편집" aria-pressed={activeTool==='presentation'&&soundTool} onClick={event=>{onSelect('presentation',true);event.currentTarget.closest('details')?.removeAttribute('open');}}>음향</button>
   </div>
  </details>
 </nav>;
}
