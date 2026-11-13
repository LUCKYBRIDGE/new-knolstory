'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {onlineEnabled} from '../../lib/online-mode';
import {useClassroomMe,type ClassroomMeState,type ClassroomRoleState} from '../use-classroom-me';
import {ServiceNavigation} from '../service-navigation';
import type {ServiceSection} from '../../lib/service-navigation';
import {ClassroomBook} from './classroom-art';
import {TeacherUpgradeDialog} from './teacher-upgrade-dialog';
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
 if(state.role==='guest'||!roles.includes(state.role))return <><ServiceNavigation role={state.role} active={null}/><NextStep state={state} roles={roles}/></>;
 return <><ServiceNavigation role={state.role} active={active}/>{children(state)}</>;
}

/** A page the account cannot open still says what to do next, with the action right there. */
function NextStep({state,roles}:{state:ClassroomMeState;roles:readonly ClassroomRoleState[]}){
 const [upgrading,setUpgrading]=useState(false),[upgraded,setUpgraded]=useState(false);
 const forTeachers=roles.includes('teacher'),forAdmins=!forTeachers&&roles.includes('admin');
 let title='',body='',action:ReactNode=null;
 if(state.role==='guest'){
  title='로그인이 필요해요';
  body=forAdmins?'관리자 계정으로 로그인해 주세요.':'선생님은 카카오 계정으로 로그인해요. 학생은 선생님이 알려 준 학급 코드로 들어와요.';
  action=<><a className={`${styles.btn} ${styles.primary}`} href="/api/v1/auth/kakao/start">카카오로 로그인</a>{!forAdmins&&<Link className={styles.btn} href="/student">학생 로그인</Link>}</>;
 }else if(state.role==='member'&&forTeachers){
  title=upgraded?'교사로 등록했어요':'교사 등록을 하면 학급을 열 수 있어요';
  body=upgraded?'잠시 뒤 교사 대시보드가 열려요.':'운영자에게 받은 교사 등록 코드를 넣으면 학급 만들기, 학생 계정, 과제와 미션을 쓸 수 있어요.';
  action=upgraded?null:<button className={`${styles.btn} ${styles.primary}`} onClick={()=>setUpgrading(true)}>교사 등록 코드 넣기</button>;
 }else if(state.role==='student'){
  title='학생 계정으로 로그인되어 있어요';
  body='내 과제와 미션은 ‘내 과제’에서 볼 수 있어요.';
  action=<Link className={`${styles.btn} ${styles.primary}`} href="/student">내 과제로 가기</Link>;
 }else if((state.role==='teacher'||state.role==='admin')&&!forTeachers&&!forAdmins){
  title='교사 계정으로 로그인되어 있어요';
  body='학생 화면은 학생 계정으로 들어가요. 학생 계정과 접속 QR은 학생 탭에서 만들 수 있어요.';
  action=<Link className={`${styles.btn} ${styles.primary}`} href="/teacher?tab=students">학생 탭으로 가기</Link>;
 }else{
  title='관리자만 열 수 있는 화면이에요';
  body=state.role==='teacher'?'교사 대시보드에서 학급을 관리할 수 있어요.':'이 계정으로는 열 수 없어요. 서재로 돌아가 주세요.';
  action=state.role==='teacher'?<Link className={`${styles.btn} ${styles.primary}`} href="/teacher">교사 대시보드로 가기</Link>:<Link className={styles.btn} href="/?view=library">서재로 가기</Link>;
 }
 return <section className={`${styles.card} ${styles.nextStep}`} aria-label={title}>
  <h2>{title}</h2><p className={styles.hint}>{body}</p>{action&&<div className={styles.nextActions}>{action}</div>}
  {upgrading&&state.session&&<TeacherUpgradeDialog csrf={state.session.csrf} onClose={()=>setUpgrading(false)} onDone={()=>{setUpgrading(false);setUpgraded(true);window.dispatchEvent(new Event('knolstory-account-session-changed'));state.refresh();}}/>}
 </section>;
}
