'use client';
import {useState} from 'react';
import {studentQr,studentUpdate,studentsPermissions,studentDelete,ClassroomError,PERMISSION_PRESETS,effectivePermissions,presetLabel,type Classroom,type ClassroomStudent,type EditingPermissions} from '../../lib/classroom-api';
import {ClassroomDialog} from './classroom-dialog';
import {PermissionEditor} from './permission-editor';
import {QrCode} from './qr-code';
import styles from './classroom.module.css';
type Run=<T>(action:()=>Promise<T>)=>Promise<T|undefined>;
type Props={classroom:Classroom;csrf:string;run:Run;onChanged:(next?:Classroom)=>void};
type Dialog={kind:'password'|'qr'|'permissions'|'delete';student:ClassroomStudent}|null;
export function StudentTable({classroom,csrf,run,onChanged}:Props){
 const [selected,setSelected]=useState<ReadonlySet<number>>(new Set()),[dialog,setDialog]=useState<Dialog>(null);
 const numbers=classroom.students.map(student=>student.number),all=numbers.length>0&&numbers.every(number=>selected.has(number));
 const toggle=(number:number)=>setSelected(current=>{const next=new Set(current);if(next.has(number))next.delete(number);else next.add(number);return next;});
 const chosen=[...selected].filter(number=>numbers.includes(number));
 async function bulk(permissions:EditingPermissions|null){const next=await run(()=>studentsPermissions(chosen,permissions,csrf));if(next){onChanged(next);setSelected(new Set());}}
 if(!classroom.students.length)return <p className={styles.hint}>아직 학생이 없어요. 위에서 학생을 만들어 주세요.</p>;
 return <>
  <div className={styles.tableWrap}><table className={styles.table}>
   <caption className={styles.hint} style={{textAlign:'left'}}>학생 {classroom.students.length}명</caption>
   <thead><tr><th><input type="checkbox" className={styles.check} checked={all} aria-label="학생 모두 선택" onChange={()=>setSelected(all?new Set():new Set(numbers))}/></th><th>번호</th><th>이름</th><th>비밀번호</th><th>QR</th><th>편집 허용</th><th>관리</th></tr></thead>
   <tbody>{classroom.students.map(student=><StudentRow key={student.number} student={student} classroom={classroom} checked={selected.has(student.number)} onToggle={()=>toggle(student.number)} csrf={csrf} run={run} onChanged={onChanged} open={kind=>setDialog({kind,student})}/>)}</tbody>
  </table></div>
  {chosen.length>0&&<div className={styles.bulk} role="region" aria-label="선택한 학생에게 적용">
   <strong>{chosen.length}명 선택</strong>
   {PERMISSION_PRESETS.map(preset=><button key={preset.id} className={styles.btn} onClick={()=>void bulk(preset.permissions)}>{preset.label}으로 적용</button>)}
   <button className={styles.btn} onClick={()=>void bulk(null)}>기본값 사용</button>
   <button className={styles.btn} onClick={()=>setSelected(new Set())}>선택 해제</button>
  </div>}
  {dialog?.kind==='password'&&<PasswordDialog student={dialog.student} onClose={()=>setDialog(null)} onSave={async password=>{const done=await run(()=>studentUpdate(dialog.student.number,{password},csrf));if(done){onChanged();setDialog(null);}}}/>}
  {dialog?.kind==='qr'&&<QrDialog student={dialog.student} csrf={csrf} onClose={()=>{setDialog(null);onChanged();}}/>}
  {dialog?.kind==='permissions'&&<PermissionDialog student={dialog.student} classDefault={classroom.defaultPermissions} onClose={()=>setDialog(null)} onSave={async value=>{const done=await run(()=>studentUpdate(dialog.student.number,{permissions:value},csrf));if(done){onChanged();setDialog(null);}}}/>}
  {dialog?.kind==='delete'&&<ClassroomDialog title={`${dialog.student.number}번 학생 지우기`} onClose={()=>setDialog(null)}>
   <p>{dialog.student.name||`${dialog.student.number}번`} 계정을 지워요. 이 학생이 낸 과제도 함께 사라질 수 있어요.</p>
   <div className={styles.dialogActions}><button className={styles.btn} onClick={()=>setDialog(null)}>취소</button><button className={`${styles.btn} ${styles.primary}`} onClick={()=>void run(()=>studentDelete(dialog.student.number,csrf)).then(next=>{if(next){onChanged(next);setDialog(null);}})}>지우기</button></div>
  </ClassroomDialog>}
 </>;
}
function StudentRow({student,classroom,checked,onToggle,csrf,run,onChanged,open}:{student:ClassroomStudent;classroom:Classroom;checked:boolean;onToggle:()=>void;csrf:string;run:Run;onChanged:()=>void;open:(kind:'password'|'qr'|'permissions'|'delete')=>void}){
 const [name,setName]=useState(student.name),[shown,setShown]=useState(false);
 const effective=effectivePermissions(student.permissions,classroom.defaultPermissions);
 const label=`${student.number}번`;
 return <tr data-student={student.number}>
  <td><input type="checkbox" className={styles.check} checked={checked} onChange={onToggle} aria-label={`${label} 선택`}/></td>
  <td>{student.number}</td>
  <td><div className={styles.row} style={{flexWrap:'nowrap'}}><input className={styles.cellInput} value={name} maxLength={20} size={8} aria-label={`${label} 이름`} onChange={event=>setName(event.target.value)}/>
   <button className={styles.btn} disabled={name===student.name} aria-label={`${label} 이름 저장`} onClick={()=>void run(()=>studentUpdate(student.number,{name:name.trim()},csrf)).then(done=>{if(done)onChanged();})}>수정</button></div></td>
  <td><span className={styles.pw} aria-label={`${label} 비밀번호`}>{shown?student.password:'••••'}</span> <button className={styles.btn} aria-pressed={shown} aria-label={`${label} 비밀번호 ${shown?'가리기':'보기'}`} onClick={()=>setShown(!shown)}>{shown?'가리기':'보기'}</button> <button className={styles.btn} aria-label={`${label} 비밀번호 바꾸기`} onClick={()=>open('password')}>바꾸기</button></td>
  <td><button className={styles.btn} aria-label={`${label} QR 보기`} onClick={()=>open('qr')}>QR 보기</button></td>
  <td>{student.permissions?presetLabel(effective):`기본값 (${presetLabel(effective)})`} <button className={styles.btn} aria-label={`${label} 편집 허용 바꾸기`} onClick={()=>open('permissions')}>편집</button></td>
  <td><button className={`${styles.btn} ${styles.danger}`} aria-label={`${label} 지우기`} onClick={()=>open('delete')}>지우기</button></td>
 </tr>;
}
function PasswordDialog({student,onClose,onSave}:{student:ClassroomStudent;onClose:()=>void;onSave:(password:string)=>Promise<void>}){
 const [value,setValue]=useState(''),[error,setError]=useState('');
 return <ClassroomDialog title={`${student.number}번 비밀번호 바꾸기`} onClose={onClose}>
  <form onSubmit={event=>{event.preventDefault();if(value.length<4||value.length>20){setError('비밀번호는 4자 이상 20자 이하로 써 주세요.');return;}void onSave(value);}}>
   <label className={styles.field}>새 비밀번호<input value={value} onChange={event=>setValue(event.target.value)} autoComplete="off" maxLength={20}/></label>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.dialogActions}><button type="button" className={styles.btn} onClick={onClose}>닫기</button><button className={`${styles.btn} ${styles.primary}`}>바꾸기</button></div>
  </form>
 </ClassroomDialog>;
}
function QrDialog({student,csrf,onClose}:{student:ClassroomStudent;csrf:string;onClose:()=>void}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function create(){
  setBusy(true);setError('');
  try{setUrl(await studentQr(student.number,csrf));}catch(issue){setError(issue instanceof ClassroomError?issue.message:'QR을 만들지 못했어요.');}finally{setBusy(false);}
 }
 return <ClassroomDialog title={`${student.number}번 QR 접속`} onClose={onClose}>
  {url?<><QrCode value={url} label={`${student.number}번 학생 QR`}/><p className={styles.qrUrl}>{url}</p><p>이 QR로 비밀번호 없이 들어올 수 있어요. 학생에게만 보여 주세요.</p></>
   :<><p>{student.hasQr?'새 QR을 만들면 이전 QR은 쓸 수 없어요.':'이 학생의 QR을 만들어요.'}</p><div className={styles.dialogActions}><button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={()=>void create()}>{student.hasQr?'새 QR 만들기':'QR 만들기'}</button></div></>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <div className={styles.dialogActions}><button className={styles.btn} onClick={onClose}>닫기</button></div>
 </ClassroomDialog>;
}
function PermissionDialog({student,classDefault,onClose,onSave}:{student:ClassroomStudent;classDefault:EditingPermissions;onClose:()=>void;onSave:(value:EditingPermissions|null)=>Promise<void>}){
 const [draft,setDraft]=useState<EditingPermissions>(effectivePermissions(student.permissions,classDefault));
 return <ClassroomDialog title={`${student.number}번 편집 허용`} onClose={onClose}>
  <p>이 학생에게만 다르게 정해요.</p>
  <PermissionEditor value={draft} onChange={setDraft}/>
  <div className={styles.dialogActions}><button className={styles.btn} onClick={onClose}>닫기</button><button className={styles.btn} onClick={()=>void onSave(null)}>기본값 사용</button><button className={`${styles.btn} ${styles.primary}`} onClick={()=>void onSave(draft)}>저장</button></div>
 </ClassroomDialog>;
}
