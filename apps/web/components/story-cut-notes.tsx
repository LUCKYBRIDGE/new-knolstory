'use client';
import type {StoryLine} from '@knolstory/story-domain';
import styles from './story-cut-notes.module.css';
type Props={line:StoryLine;patch:(values:Partial<StoryLine>)=>void;onComposing?:(value:boolean)=>void;disabled?:boolean};
const notes=[['purposeNote','이 컷의 목적'],['emotionNote','인물의 감정'],['directionNote','연출 메모']] as const;
export function StoryCutNotes({line,patch,onComposing,disabled=false}:Props){
 return <details key={line.id} data-cut-notes className={styles.notes}><summary>이 컷의 작업 메모</summary>
  <fieldset disabled={disabled}><legend>이 컷의 작업 정보</legend><p>작가용 제목과 메모입니다. 작품을 읽는 화면에는 표시하지 않습니다. 연출 메모는 실제 연출 설정과 별개입니다.</p>
   <label>컷 작업 제목<input aria-label="컷 작업 제목" value={line.workingTitle??''} maxLength={200} onCompositionStart={()=>onComposing?.(true)} onCompositionEnd={()=>onComposing?.(false)} onChange={event=>patch({workingTitle:event.target.value})}/></label>
   {notes.map(([field,label])=><label key={field}>{label}<textarea aria-label={label} rows={3} value={line[field]} maxLength={20000} onCompositionStart={()=>onComposing?.(true)} onCompositionEnd={()=>onComposing?.(false)} onChange={event=>patch({[field]:event.target.value})}/></label>)}
  </fieldset>
 </details>;
}
