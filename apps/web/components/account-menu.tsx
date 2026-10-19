'use client';
import {useEffect,useRef,useState} from 'react';
import {accountGoogleLink} from '../lib/account-api';
import {rememberAccountReturn,accountCallbackNotice} from '../lib/account-return';
import {useAccountSession} from './use-account-session';
import {useBoundedAccountPanel} from './use-bounded-account-panel';
import styles from './account-menu.module.css';
type Props={beforeNavigate:()=>boolean;disabled?:boolean;returnTo?:'library'|'shortstory'};
export function AccountMenu({beforeNavigate,disabled=false,returnTo='library'}:Props){
 const account=useAccountSession(),menu=useRef<HTMLDetailsElement>(null),busy=useRef(false);
 useBoundedAccountPanel(menu);
 const lifecycle=useRef({active:true}),guard=useRef(beforeNavigate),requestId=useRef(0),latestSession=useRef(account.session);
 useEffect(()=>{guard.current=beforeNavigate;},[beforeNavigate]);
 useEffect(()=>{const mounted=lifecycle.current;mounted.active=true;return()=>{mounted.active=false;};},[]);
 const [pending,setPending]=useState(false),[notice,setNotice]=useState(''),[callback,setCallback]=useState('');
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
 useEffect(()=>{const timer=window.setTimeout(()=>{setCallback(accountCallbackNotice(location.search));const url=new URL(location.href);url.searchParams.delete('auth');url.searchParams.delete('reason');history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);},0);return()=>{window.clearTimeout(timer);};},[]);
 function navigate(destination:string){
  if(!lifecycle.current.active||!guard.current())return false;
  try{rememberAccountReturn(sessionStorage,Date.now(),returnTo);location.assign(destination);return true;}
  catch{setNotice('로그인 화면을 열지 못했어요. 현재 작품은 유지됩니다.');return false;}
 }
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
 return <details ref={menu} className={styles.menu} data-account-menu><summary>계정</summary><section aria-label="놀스토리 계정" className={styles.panel}>
  <strong>{account.loading?'로그인 확인 중':account.error?'로그인 상태 확인 필요':account.session?'로그인됨':'로그인 전'}</strong>
  <p>이 브라우저의 작품은 로그인이나 로그아웃 뒤에도 유지됩니다. 작품은 로컬 작품 파일로 저장하고, 온라인 작품 메뉴에서 별도로 업로드할 수 있어요.</p>
  {callback&&<p role="status">{callback}</p>}{(notice||account.error)&&<p role="alert">{notice||account.error}</p>}
  {account.session?<><button disabled={unavailable||!account.config?.providers.google} onClick={()=>void start('google',true)}>Google 계정 연결</button><button disabled={unavailable} onClick={()=>void account.logout()}>로그아웃</button></>:<><button disabled={unavailable||!account.config?.providers.kakao} onClick={()=>void start('kakao')}>카카오로 가입·로그인</button><button disabled={unavailable||!account.config?.providers.google} onClick={()=>void start('google')}>연결한 Google로 로그인</button><p>Google 로그인은 카카오로 가입한 뒤 연결한 계정에서 사용할 수 있어요.</p></>}
  {account.config&&(!account.config.providers.kakao||!account.config.providers.google)&&<p>일부 로그인 제공자는 설정 준비 중이에요.</p>}
  <button disabled={pending||account.loading} onClick={()=>{setNotice('');setCallback('');void account.refresh();}}>로그인 상태 다시 확인</button>
 </section></details>;
}
