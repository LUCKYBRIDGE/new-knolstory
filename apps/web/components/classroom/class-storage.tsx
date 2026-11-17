'use client';
import type {Classroom} from '../../lib/classroom-api';
import {formatBytes} from '../../lib/online-storage';
import styles from './classroom.module.css';

type Level='ok'|'warn'|'full'|'over';
const messages:Record<Exclude<Level,'ok'>,string>={
 warn:'80%를 넘었어요. 지난 과제나 쓰지 않는 온라인 작품을 정리해 두면 좋아요.',
 full:'거의 찼어요. 곧 학생들이 개인 작품을 온라인에 올리지 못해요. 과제 제출은 계속 받아요.',
 over:'가득 찼어요. 개인 작품 업로드가 멈췄고 과제 제출만 받고 있어요. 지난 과제나 쓰지 않는 작품을 정리해 주세요.',
};
/** Teacher view of the one storage pool the teacher and the class share (300MB, 2026-11-18).
 * `quiet` hides it until it is at least 80% full, for tabs other than the student list. */
export function ClassStorage({classroom,quiet=false}:{classroom:Classroom;quiet?:boolean}){
 const storage=classroom.storage;
 if(!storage)return null;
 const ratio=storage.bytes/storage.limit,level:Level=ratio>=1?'over':ratio>=0.95?'full':ratio>=0.8?'warn':'ok';
 if(quiet&&level==='ok')return null;
 const users=[...classroom.students].filter(student=>(student.storageBytes??0)>0).sort((a,b)=>(b.storageBytes??0)-(a.storageBytes??0)).slice(0,5);
 return <section className={`${styles.card} ${styles.storage}`} aria-label="학급 저장 공간" data-level={level}>
  <p className={styles.storageLine}><strong>학급 저장 공간</strong><span>{formatBytes(storage.bytes)} / {formatBytes(storage.limit)}</span></p>
  <meter min={0} max={storage.limit} low={storage.limit*0.8} high={storage.limit*0.95} optimum={0} value={Math.min(storage.bytes,storage.limit)} aria-label={`학급 저장 공간 ${Math.round(ratio*100)}% 사용`}/>
  {level!=='ok'&&<p className={styles.storageMessage} role="status">{messages[level]}</p>}
  {level==='ok'&&<p className={styles.hint}>선생님과 학생의 온라인 작품, 과제 제출이 함께 쓰는 공간이에요. 학생 한 명은 {formatBytes(storage.studentLimit)}까지 써요.</p>}
  {users.length>0&&<details className={styles.storageUsers}><summary>많이 쓰는 학생</summary><ul>{users.map(student=><li key={student.number}><span>{student.number}번{student.name?` ${student.name}`:''}</span><span>{formatBytes(student.storageBytes??0)} / {formatBytes(storage.studentLimit)}</span></li>)}</ul></details>}
 </section>;
}
