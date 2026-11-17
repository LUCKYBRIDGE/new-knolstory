'use client';
import {useState} from 'react';
import {ClassroomError,submissionMine} from '../../lib/classroom-api';
import {OnlineDocumentError} from '../../lib/document-api';
import {importAsNew,importOverwrite,planImport,type ImportPlan} from '../../lib/submission-import';
import {titleBody} from '../../lib/student-title';
import {TitleInput} from '../title-input';
import {ClassroomDialog} from './classroom-dialog';
import styles from './classroom.module.css';

const message=(issue:unknown)=>issue instanceof OnlineDocumentError||issue instanceof ClassroomError?issue.message:issue instanceof Error?issue.message:'가져오지 못했어요. 잠시 뒤 다시 해 주세요.';
/** Copies a handed-in work into the student's personal online works. A same-named work asks first:
 * keep both under a new name, or replace the old one after a second confirmation. */
export function SubmissionImport({assignmentId,accountId,csrf,disabled=false}:{assignmentId:string;accountId:string;csrf:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [plan,setPlan]=useState<ImportPlan|null>(null),[name,setName]=useState(''),[overwrite,setOverwrite]=useState(false);
 const done=(title:string)=>{setPlan(null);setOverwrite(false);setNotice(`‘${title}’을 내 온라인 작품으로 가져왔어요. 서재에서 열 수 있어요.`);};
 async function step(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(issue){setError(message(issue));}finally{setBusy(false);}}
 const start=()=>step(async()=>{
  const saved=await submissionMine(assignmentId);
  if(!saved)throw Error('제출본을 찾지 못했어요.');
  const next=await planImport(saved.document,accountId);
  if(!next.existing){await importAsNew(next,next.title,csrf,accountId);done(next.title);return;}
  setPlan(next);setName(next.suggestion);setOverwrite(false);
 });
 const taken=plan!==null&&name.trim()===plan.title;
 return <>
  <button className={styles.btn} disabled={disabled||busy} onClick={()=>void start()}>{busy&&!plan?'가져오는 중…':'내 온라인 작품으로 가져오기'}</button>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}{error&&!plan&&<p className={styles.error} role="alert">{error}</p>}
  {plan&&<ClassroomDialog title="같은 이름의 작품이 있어요" onClose={()=>setPlan(null)}>
   {!overwrite?<>
    <p>내 온라인 작품에 ‘{plan.title}’이 이미 있어요. 새 이름으로 따로 두거나, 기존 작품을 제출본으로 바꿀 수 있어요.</p>
    <label className={styles.field}>새 이름<TitleInput aria-label="새 이름" value={name} maxLength={200} onChange={setName}/></label>
    {taken&&<p role="status">기존 작품과 다른 이름을 써 주세요.</p>}
    {error&&<p role="alert">{error}</p>}
    <div className={styles.dialogActions}>
     <button className={styles.btn} disabled={busy} onClick={()=>setPlan(null)}>취소</button>
     <button className={styles.btn} disabled={busy} onClick={()=>setOverwrite(true)}>기존 작품 덮어쓰기</button>
     <button className={`${styles.btn} ${styles.primary}`} disabled={busy||taken||!titleBody(name).trim()} onClick={()=>void step(async()=>{await importAsNew(plan,name.trim(),csrf,accountId);done(name.trim());})}>새 이름으로 가져오기</button>
    </div>
   </>:<>
    <p>‘{plan.title}’의 지금 내용이 제출본으로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.</p>
    {error&&<p role="alert">{error}</p>}
    <div className={styles.dialogActions}>
     <button className={styles.btn} disabled={busy} onClick={()=>setOverwrite(false)}>돌아가기</button>
     <button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>void step(async()=>{await importOverwrite(plan,csrf,accountId);done(plan.title);})}>덮어쓰기</button>
    </div>
   </>}
  </ClassroomDialog>}
 </>;
}
