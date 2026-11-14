'use client';
import {useEffect,useRef,useState} from 'react';
import {onlineEnabled} from '../lib/online-mode';
import {accountGoogleLink} from '../lib/account-api';
import {rememberAccountReturn,accountCallbackNotice} from '../lib/account-return';
import {useAccountSession} from './use-account-session';
import {useBoundedAccountPanel} from './use-bounded-account-panel';
import {useClassroomMeFor} from './use-classroom-me';
import {TeacherUpgradeDialog} from './classroom/teacher-upgrade-dialog';
import styles from './account-menu.module.css';
type AccountState=ReturnType<typeof useAccountSession>;
type Props={beforeNavigate:()=>boolean;disabled?:boolean;returnTo?:'library'|'shortstory';account?:AccountState};
/** A shared account state avoids a second session request in the unified library. */
export function AccountMenu({account,...props}:Props){
 if(!onlineEnabled)return null;
 return account?<AccountMenuView {...props} account={account}/>:<ConnectedAccountMenu {...props}/>;
}
function ConnectedAccountMenu(props:Omit<Props,'account'>){
 const account=useAccountSession();
 return <AccountMenuView {...props} account={account}/>;
}
function AccountMenuView({account,beforeNavigate,disabled=false,returnTo='library'}:Omit<Props,'account'>&{account:AccountState}){
 const menu=useRef<HTMLDetailsElement>(null),busy=useRef(false);
 useBoundedAccountPanel(menu);
 const lifecycle=useRef({active:true}),guard=useRef(beforeNavigate),requestId=useRef(0),latestSession=useRef(account.session);
 useEffect(()=>{guard.current=beforeNavigate;},[beforeNavigate]);
 useEffect(()=>{const mounted=lifecycle.current;mounted.active=true;return()=>{mounted.active=false;};},[]);
 const classroom=useClassroomMeFor(account.session,account.loading),[upgrading,setUpgrading]=useState(false);
 const [pending,setPending]=useState(false),[notice,setNotice]=useState(''),[callback,setCallback]=useState({message:'',result:''});
 useEffect(()=>{
  const invalidate=()=>{requestId.current++;busy.current=false;setPending(false);};
  window.addEventListener('knolstory-account-session-changed',invalidate);
  return()=>window.removeEventListener('knolstory-account-session-changed',invalidate);
 },[]);
 useEffect(()=>{
  const previous=latestSession.current;latestSession.current=account.session;
  if(previous?.accountId===account.session?.accountId&&previous?.csrf===account.session?.csrf)return;
  const invalidated=++requestId.current;busy.current=false;
  const timer=window.setTimeout(()=>{if(requestId.current===invalidated)setPending(false);},0);
  return()=>window.clearTimeout(timer);
 },[account.session]);
 useEffect(()=>{const timer=window.setTimeout(()=>{const url=new URL(location.href),values=url.searchParams.getAll('auth');setCallback({message:accountCallbackNotice(location.search),result:values.length===1?values[0]!:''});url.searchParams.delete('auth');url.searchParams.delete('reason');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);},0);return()=>{window.clearTimeout(timer);};},[]);
 function navigate(destination:string){
  if(!lifecycle.current.active||!guard.current())return false;
  try{rememberAccountReturn(sessionStorage,Date.now(),returnTo);location.assign(destination);return true;}
  catch{setNotice('로그인 화면을 열지 못했어요. 현재 작품은 유지됩니다.');return false;}
 }
 /** Class pages leave the library, so the same work-protection check as login applies. */
 function go(path:string){if(!lifecycle.current.active||!guard.current())return;location.assign(path);}
 async function start(provider:'kakao'|'google',link=false){
  if(busy.current||disabled||account.loading)return;
  setNotice('');
  if(!link){navigate(`/api/v1/auth/${provider}/start`);return;}
  if(!account.session||!guard.current())return;
  const session=account.session,request=++requestId.current;
  const current=()=>lifecycle.current.active&&requestId.current===request&&latestSession.current?.accountId===session.accountId&&latestSession.current?.csrf===session.csrf;
  busy.current=true;setPending(true);
  try{const destination=await accountGoogleLink(session.csrf);if(current())navigate(destination);}
  catch{if(!current())return;setNotice('Google 연결을 시작하지 못했어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');await account.refresh();}
  finally{if(current()){busy.current=false;setPending(false);}}
 }
 const unavailable=disabled||pending||account.loading;
 const state=account.loading?'loading':account.error?'unknown':account.session?'signed-in':'signed-out';
 const summary=account.loading?'확인 중':account.session?'내 계정':'로그인';
 const stateLabel=account.loading?'로그인 확인 중':account.error?'로그인 상태 확인 필요':account.session?'로그인됨':'로그인 전';
 const callbackMessage=account.session&&!account.loading&&!account.error&&callback.result==='success'?'로그인했어요.':account.session&&!account.loading&&!account.error&&callback.result==='linked'?'Google 계정을 연결했어요. 이제 ‘연결한 Google로 로그인’도 쓸 수 있어요.':callback.message;
 const googleAvailable=account.config?.providers.google===true;
 // Students sign in with a class password or QR; only Kakao/Google members see linked sign-ins.
 const linked=classroom.role!=='student'&&account.session?.linkedProviders?.length?account.session.linkedProviders:undefined;
 const noProviders=account.config&&!account.config.providers.kakao&&!googleAvailable;
 return <><details ref={menu} className={styles.menu} data-account-menu><summary aria-label={`계정 · ${stateLabel}`}><svg className={styles.userIcon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21"/></svg><span>{summary}</span><span className={styles.stateDot} data-state={state} aria-hidden="true"/></summary><section aria-label="놀스토리 계정" className={styles.panel}>
  <strong>{stateLabel}</strong>
  <p>{returnTo==='shortstory'?'온라인 작품 메뉴에서 그림책을 업로드할 수 있어요.':'내 작품에서 온라인 보관 여부를 확인하고 업로드할 수 있어요.'} 작품 파일은 기기에 따로 저장해 주세요.</p>
  {callbackMessage&&<p role="status">{callbackMessage}</p>}{(notice||account.error)&&<p role="alert">{notice||account.error}</p>}
  {account.session?<>
   {linked&&<div className={styles.linked} aria-label="연결된 로그인"><span>연결된 로그인</span><ul>
    <li data-linked={linked.includes('kakao')}>{linked.includes('kakao')?'✓':'–'} 카카오</li>
    {(googleAvailable||linked.includes('google'))&&<li data-linked={linked.includes('google')}>{linked.includes('google')?'✓ Google 연결됨':'Google 연결 안 됨'}</li>}
   </ul></div>}
   {googleAvailable&&!linked?.includes('google')&&<button disabled={unavailable} onClick={()=>void start('google',true)}>Google 계정 연결</button>}
   {classroom.role==='member'&&<button disabled={unavailable} onClick={()=>setUpgrading(true)}>교사 등록</button>}
   {(classroom.role==='teacher'||classroom.role==='admin')&&<button disabled={unavailable} onClick={()=>go('/teacher')}>교사 대시보드</button>}
   {classroom.role==='student'&&<button disabled={unavailable} onClick={()=>go('/student')}>내 학급·과제</button>}
   {classroom.role==='admin'&&<button disabled={unavailable} onClick={()=>go('/admin')}>관리자</button>}
   <button disabled={unavailable} onClick={()=>void account.logout()}>로그아웃</button>
   <p className={styles.keepLocal}>로그아웃해도 이 기기의 원고는 유지돼요.</p>
  </>:<>
   <button className={styles.primary} disabled={unavailable||!account.config?.providers.kakao} onClick={()=>void start('kakao')}>카카오로 가입·로그인</button>
   {googleAvailable&&<><button disabled={unavailable} onClick={()=>void start('google')}>연결한 Google로 로그인</button><p>Google 로그인은 카카오로 가입한 뒤 연결한 계정에서 사용할 수 있어요.</p></>}
   <button disabled={unavailable} onClick={()=>go('/student')}>학생 로그인</button>
   {noProviders&&<p>로그인은 아직 준비 중이에요. 이 기기의 작품은 그대로 쓸 수 있어요.</p>}
  </>}
  <button className={styles.refresh} disabled={pending||account.loading} onClick={()=>{setNotice('');setCallback({message:'',result:''});void account.refresh();}}>로그인 상태 다시 확인</button>
 </section></details>
 {upgrading&&account.session&&<TeacherUpgradeDialog csrf={account.session.csrf} onClose={()=>setUpgrading(false)} onDone={()=>{setUpgrading(false);classroom.refresh();}}/>}</>;
}
