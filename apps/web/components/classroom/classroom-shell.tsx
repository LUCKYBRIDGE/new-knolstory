'use client';
import type {ReactNode} from 'react';
import {onlineEnabled} from '../../lib/online-mode';
import {useClassroomMe,type ClassroomMeState,type ClassroomRoleState} from '../use-classroom-me';
import styles from './classroom.module.css';
type Props={title:string;roles:readonly ClassroomRoleState[];guest?:ReactNode;children:(state:ClassroomMeState)=>ReactNode};
/** Shared frame for /teacher, /student and /admin: online switch, role gate and the way back to the library. */
export function ClassroomShell({title,roles,guest,children}:Props){
 return <main className={styles.page} aria-label={title}><div className={styles.wrap}>
  <div className={styles.top}><a className={styles.back} href="/?view=library">서재로</a><h1>{title}</h1></div>
  {onlineEnabled?<Gate roles={roles} guest={guest}>{children}</Gate>:<p className={styles.card} role="status">온라인 기능이 꺼져 있어요. 이 기기의 작품은 그대로 쓸 수 있어요.</p>}
 </div></main>;
}
function Gate({roles,guest,children}:Omit<Props,'title'>){
 const state=useClassroomMe();
 if(state.loading)return <p className={styles.card} role="status">확인 중이에요.</p>;
 if(state.error)return <p className={styles.card} role="alert">{state.error} 잠시 뒤 다시 열어 주세요.</p>;
 if(state.role==='guest'&&guest)return <>{guest}</>;
 if(state.role==='guest')return <p className={styles.card}>먼저 서재에서 로그인해 주세요.</p>;
 if(!roles.includes(state.role))return <p className={styles.card} role="status">이 계정으로는 열 수 없는 화면이에요.</p>;
 return <>{children(state)}</>;
}
