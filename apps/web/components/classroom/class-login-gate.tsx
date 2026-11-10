'use client';
import {useEffect,useState} from 'react';
import {onlineEnabled} from '../../lib/online-mode';
import {qrLogin,ClassroomError} from '../../lib/classroom-api';
import styles from './classroom.module.css';
/** Opened with ?class-login=<token>: remove the token from the address, log in, then go to /student. */
export function ClassLoginGate(){
 const [state,setState]=useState<'idle'|'busy'|'failed'>('idle'),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!onlineEnabled)return;
  const url=new URL(location.href),token=url.searchParams.get('class-login');
  if(!token)return;
  url.searchParams.delete('class-login');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  let live=true;
  const timer=window.setTimeout(()=>{
   setState('busy');
   qrLogin(token).then(()=>{window.dispatchEvent(new Event('knolstory-account-session-changed'));location.assign('/student');}).catch(issue=>{if(!live)return;setMessage(issue instanceof ClassroomError&&issue.code==='INVALID_LOGIN'?'이 QR은 더 쓸 수 없어요. 선생님께 새 QR을 받아 주세요.':'로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.');setState('failed');});
  },0);
  return()=>{live=false;window.clearTimeout(timer);};
 },[]);
 if(state==='idle')return null;
 return <div className={styles.gate} role={state==='failed'?'alertdialog':'status'} aria-label="학생 QR 로그인"><div>
  <p>{state==='busy'?'학생 로그인 중이에요.':message}</p>
  {state==='failed'&&<button className={styles.btn} onClick={()=>setState('idle')}>닫기</button>}
 </div></div>;
}
