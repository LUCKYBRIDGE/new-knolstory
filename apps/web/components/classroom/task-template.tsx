'use client';
import {useState} from 'react';
import {templatePut,type Assignment} from '../../lib/classroom-api';
import {listLocalWorks,localWorkSnapshot,type LocalWorkChoice} from '../../lib/classroom-local';
import {documentList,documentRead} from '../../lib/document-api';
import {ClassroomDialog} from './classroom-dialog';
import styles from './classroom.module.css';

type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
type Choice=LocalWorkChoice&{online?:boolean};
/** The teacher's own work that students start a writing task from (a copy each, kept per device).
 * Changing it later never touches copies students already started. */
export function TaskTemplate({item,csrf,run,onChanged}:{item:Assignment;csrf:string;run:Run;onChanged:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[choices,setChoices]=useState<Choice[]|null>(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false);
 const shortstory=item.format==='shortstory';
 async function start(){
  setOpen(true);setKey('');setChoices(null);
  const device=listLocalWorks().filter(work=>work.key.startsWith('shortstory:')===shortstory);
  let online:Choice[]=[];
  try{online=(await documentList()).documents.filter(doc=>!doc.deletedAt&&doc.format===item.format).map(doc=>({key:`online:${doc.recordId}`,title:doc.title||'제목 없는 작품',online:true}));}catch{/* The device list is still offered. */}
  setChoices([...device,...online]);
 }
 async function choose(){
  if(!key||busy)return;setBusy(true);
  try{
   const done=await run(async()=>templatePut(item.id,key.startsWith('online:')?(await documentRead(key.slice(7))).snapshot:await localWorkSnapshot(key),csrf));
   if(done!==undefined){setOpen(false);await onChanged();}
  }finally{setBusy(false);}
 }
 async function remove(){setBusy(true);try{const done=await run(()=>templatePut(item.id,null,csrf));if(done!==undefined)await onChanged();}finally{setBusy(false);}}
 const device=choices?.filter(choice=>!choice.online)??[],online=choices?.filter(choice=>choice.online)??[];
 return <div className={styles.templateRow}>
  <span>{item.template?<>시작 작품 · <strong>{item.template.title}</strong></>:item.storyKey?'시작 작품 없음 · 학생은 바탕 작품으로 시작해요':'시작 작품 없음 · 학생은 빈 작품으로 시작해요'}</span>
  <button className={styles.btn} disabled={busy} aria-label={`${item.title} 시작 작품 ${item.template?'바꾸기':'정하기'}`} onClick={()=>void start()}>{item.template?'시작 작품 바꾸기':'시작 작품 정하기'}</button>
  {item.template&&<button className={`${styles.btn} ${styles.danger}`} disabled={busy} aria-label={`${item.title} 시작 작품 빼기`} onClick={()=>void remove()}>시작 작품 빼기</button>}
  {open&&<ClassroomDialog title="시작 작품 정하기" onClose={()=>setOpen(false)}>
   <p>선생님이 만든 작품을 학생마다 한 부씩 나눠 주고, 학생은 그 사본에 이어서 써요. 나중에 바꿔도 이미 시작한 학생의 작품은 그대로예요.{item.storyKey&&' 시작 작품을 정하면 바탕 작품 대신 이 작품으로 시작해요.'}</p>
   {choices===null?<p role="status">작품을 불러오고 있어요.</p>:choices.length===0?<p>{shortstory?'숏스토리':'놀스토리'} 작품이 없어요. 서재에서 나눠 줄 작품을 먼저 만들어 주세요.</p>
    :<label className={styles.field}>나눠 줄 작품<select aria-label="나눠 줄 작품" value={key} onChange={event=>setKey(event.target.value)}><option value="">작품을 골라 주세요</option>
     {device.length>0&&<optgroup label="이 기기">{device.map(choice=><option key={choice.key} value={choice.key}>{choice.title}</option>)}</optgroup>}
     {online.length>0&&<optgroup label="내 온라인 작품">{online.map(choice=><option key={choice.key} value={choice.key}>{choice.title}</option>)}</optgroup>}
    </select></label>}
   <div className={styles.dialogActions}><button className={styles.btn} onClick={()=>setOpen(false)}>취소</button><button className={`${styles.btn} ${styles.primary}`} disabled={!key||busy} onClick={()=>void choose()}>{busy?'올리는 중…':'시작 작품으로 정하기'}</button></div>
  </ClassroomDialog>}
 </div>;
}
