'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {onlineEnabled} from '../../lib/online-mode';
import {useClassroomMe,type ClassroomMeState,type ClassroomRoleState} from '../use-classroom-me';
import {ServiceNavigation} from '../service-navigation';
import type {ServiceSection} from '../../lib/service-navigation';
import {ClassroomBook} from './classroom-art';
import styles from './classroom.module.css';
type Props={active?:ServiceSection|null;title:string;roles:readonly ClassroomRoleState[];guest?:ReactNode;children:(state:ClassroomMeState)=>ReactNode};
/** Shared frame for /teacher, /student and /admin: online switch, role gate and the way back to the library. */
export function ClassroomShell({title,roles,guest,children,active='assignments'}:Props){
 return <main className={styles.page} aria-label={title}><div className={styles.wrap}>
  <header className={styles.top}><Link className={styles.brand} href="/?view=library"><ClassroomBook small/><span>놀스토리<span className={styles.brandCaption}>함께 쓰는 이야기</span></span></Link><Link className={styles.back} href="/?view=library"><span aria-hidden="true">←</span> 서재로</Link></header><div className={styles.pageHeading}><span className={styles.eyebrow}>우리 반 이야기 작업실</span><h1>{title}</h1></div>
  {onlineEnabled?<Gate active={active} roles={roles} guest={guest}>{children}</Gate>:<p className={styles.card} role="status">온라인 기능이 꺼져 있어요. 이 기기의 작품은 그대로 쓸 수 있어요.</p>}
 </div></main>;
}
function Gate({roles,guest,children,active='assignments'}:Omit<Props,'title'>){
 const state=useClassroomMe();
 // Account rechecks (window focus, login changes) keep the open dashboard; only the first check shows a wait.
 const [settled,setSettled]=useState(false);
 if(!state.loading&&!settled)setSettled(true);
 if(state.loading&&!settled)return <p className={styles.card} role="status">확인 중이에요.</p>;
 if(state.error)return <p className={styles.card} role="alert">{state.error} 잠시 뒤 다시 열어 주세요.</p>;
 if(state.loading&&state.role==='guest')return <p className={styles.card} role="status">학급 정보를 확인하고 있어요.</p>;
 if(state.role==='guest'&&guest)return <><ServiceNavigation role="student" active={active}/>{guest}</>;
 if(state.role==='guest')return <p className={styles.card}>먼저 서재에서 로그인해 주세요.</p>;
 if(!roles.includes(state.role))return <p className={styles.card} role="status">이 계정으로는 열 수 없는 화면이에요.</p>;
 return <><ServiceNavigation role={state.role} active={active}/>{children(state)}</>;
}
