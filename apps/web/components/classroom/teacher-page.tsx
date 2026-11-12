'use client';
import {useEffect,useState} from 'react';
import {ClassroomShell} from './classroom-shell';
import {TeacherDashboard,type TeacherPanel} from './teacher-dashboard';
import {teacherPanelFromSearch} from '../../lib/service-navigation';
export function TeacherPage(){
 const [panel,setPanel]=useState<TeacherPanel|null>(null);
 useEffect(()=>{
  const sync=()=>setPanel(teacherPanelFromSearch(window.location.search));
  const timer=window.setTimeout(sync,0);
  window.addEventListener('popstate',sync);
  return()=>{window.clearTimeout(timer);window.removeEventListener('popstate',sync);};
 },[]);
 return <ClassroomShell title="교사 대시보드" roles={['teacher','admin']} active={panel??'assignments'}>{state=>state.session&&panel?<TeacherDashboard key={state.session.accountId} session={state.session} panel={panel}/>:null}</ClassroomShell>;
}
