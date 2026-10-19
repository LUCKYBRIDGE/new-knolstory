'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {accountConfig,accountSession,accountLogout,type AccountSession,type AccountConfig} from '../lib/account-api';
export function useAccountSession(){
 const [session,setSession]=useState<AccountSession|null>(null),[config,setConfig]=useState<AccountConfig|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0),mutating=useRef(false);
 const lifecycle=useRef({active:true});
 const refreshLocal=useCallback(async()=>{
  if(mutating.current)return;
  const request=++generation.current;setLoading(true);setError('');
  try{const [nextConfig,nextSession]=await Promise.all([accountConfig(),accountSession()]);if(request!==generation.current||!lifecycle.current.active)return;setConfig(nextConfig);setSession(nextSession);}
  catch{if(request===generation.current&&lifecycle.current.active){setConfig(null);setSession(null);setError('계정 서비스를 확인하지 못했어요. 기기의 작품은 계속 사용할 수 있어요.');}}
  finally{if(request===generation.current&&lifecycle.current.active)setLoading(false);}
 },[]);
 useEffect(()=>{const mounted=lifecycle.current;mounted.active=true;const timer=window.setTimeout(()=>void refreshLocal(),0);const focus=()=>void refreshLocal();const changed=()=>{generation.current++;setSession(null);void refreshLocal();};window.addEventListener('focus',focus);window.addEventListener('knolstory-account-session-changed',changed);return()=>{window.clearTimeout(timer);window.removeEventListener('focus',focus);window.removeEventListener('knolstory-account-session-changed',changed);mounted.active=false;};},[refreshLocal]);
 // Explicit rechecks invalidate every mounted consumer before fetching again.
 // Initial loads and focus checks stay local, so they cannot rebroadcast a loop.
 const refresh=useCallback(async()=>{window.dispatchEvent(new Event('knolstory-account-session-changed'));},[]);
 const logout=async()=>{
  if(!session||mutating.current)return;
  mutating.current=true;
  const request=++generation.current;setLoading(true);setError('');
  try{await accountLogout(session.csrf);mutating.current=false;if(lifecycle.current.active)setSession(null);window.dispatchEvent(new Event('knolstory-account-session-changed'));}
  catch{mutating.current=false;window.dispatchEvent(new Event('knolstory-account-session-changed'));if(lifecycle.current.active)setError('로그아웃을 확인하지 못했어요. 다시 시도해 주세요.');}
  finally{mutating.current=false;if(lifecycle.current.active&&request===generation.current)setLoading(false);}
 };
 return {session,config,loading,error,refresh,logout};
}
