'use client';
import {useEffect,useState} from 'react';
import {onlineEnabled} from '../../lib/online-mode';
import {qrLogin,ClassroomError} from '../../lib/classroom-api';
import styles from './classroom.module.css';
let pendingToken:string|null=null;
/** Opened with ?q=<token> or the existing ?class-login=<token>: remove the token from the address, log in, then go to /student. */
export function ClassLoginGate(){
 const [state,setState]=useState<'idle'|'busy'|'failed'>('idle'),[message,setMessage]=useState(''),[retryable,setRetryable]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!onlineEnabled)return;
  const url=new URL(location.href),fromUrl=url.searchParams.get('q')??url.searchParams.get('class-login');
  // Strict-mode effects run twice; the first run already removed the token from the address.
  if(fromUrl){pendingToken=fromUrl;url.searchParams.delete('class-login');url.searchParams.delete('q');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);}
  const token=pendingToken;
  if(!token)return;
  let live=true;
  const timer=window.setTimeout(()=>void attempt(),0);
  return()=>{live=false;window.clearTimeout(timer);};
  async function attempt(){
   setState('busy');
   qrLogin(token!).then(()=>{pendingToken=null;window.dispatchEvent(new Event('knolstory-account-session-changed'));location.assign('/student');}).catch(issue=>{if(!live)return;setMessage(issue instanceof ClassroomError&&issue.code==='INVALID_LOGIN'?'이 QR은 더 쓸 수 없어요. 선생님께 새 QR을 받아 주세요.':'로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.');setRetryable(!(issue instanceof ClassroomError&&issue.code==='INVALID_LOGIN'));setState('failed');});
  }
 },[retry]);
 if(state==='idle')return null;
 return <div className={styles.gate} role={state==='failed'?'alertdialog':'status'} aria-label="학생 QR 로그인"><div>
  <p>{state==='busy'?'학생 로그인 중이에요.':message}</p>
  {state==='failed'&&<div className={styles.row}>
   {/* The class code login always works, whatever happened to the card. */}
   <a className={`${styles.btn} ${styles.primary}`} href="/student">학급 코드로 들어가기</a>
   {retryable&&<button className={styles.btn} onClick={()=>setRetry(value=>value+1)}>다시 시도</button>}
   <button className={styles.btn} onClick={()=>setState('idle')}>닫기</button>
  </div>}
 </div></div>;
}
