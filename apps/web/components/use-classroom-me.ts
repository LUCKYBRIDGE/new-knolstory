'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {onlineEnabled} from '../lib/online-mode';
import {classMe,type ClassroomMe} from '../lib/classroom-api';
import {ALL_EDITING_ALLOWED,type EditingPermissions} from '../lib/editing-permissions';
import type {AccountSession} from '../lib/account-api';
import {useAccountSession} from './use-account-session';
export type ClassroomRoleState='guest'|'member'|'teacher'|'student'|'admin';
export type ClassroomMeState=Readonly<{loading:boolean;role:ClassroomRoleState;permissions:EditingPermissions;me:ClassroomMe|null;session:AccountSession|null;error:string;refresh:()=>void}>;
/** Role lookup for an already-known account session (the library shares one session with the account menu). */
export function useClassroomMeFor(session:AccountSession|null,sessionLoading:boolean):ClassroomMeState{
 const [state,setState]=useState<{accountId:string|null;me:ClassroomMe|null;loading:boolean;error:string}>({accountId:null,me:null,loading:onlineEnabled,error:''});
 const generation=useRef(0),accountId=session?.accountId??null;
 const load=useCallback(()=>{
  const request=++generation.current;
  if(!onlineEnabled||!accountId){setState(value=>value.me===null&&!value.loading&&!value.error?value:{accountId:null,me:null,loading:false,error:''});return;}
  setState(value=>({...value,loading:true,error:''}));
  classMe().then(me=>{if(request===generation.current)setState({accountId,me,loading:false,error:''});}).catch(()=>{if(request===generation.current)setState({accountId,me:null,loading:false,error:'학급 정보를 확인하지 못했어요.'});});
 },[accountId]);
 // Deferred like use-account-session so the effect itself never sets state synchronously.
 useEffect(()=>{const timer=window.setTimeout(load,0);return()=>{window.clearTimeout(timer);generation.current++;};},[load]);
 const me=state.accountId===accountId&&accountId?state.me:null;
 const role:ClassroomRoleState=!me?'guest':me.role;
 const permissions=me?.role==='student'?me.student?.permissions??ALL_EDITING_ALLOWED:ALL_EDITING_ALLOWED;
 return {loading:sessionLoading||state.loading||!!accountId&&state.accountId!==accountId,role,permissions,me,session,error:state.accountId===accountId?state.error:'',refresh:load};
}
/** For the editor: `{loading, role, permissions}`. Permissions are ALL_EDITING_ALLOWED unless the signed-in account is a student. */
export function useClassroomMe():ClassroomMeState{
 const account=useAccountSession();
 return useClassroomMeFor(account.session,account.loading);
}
