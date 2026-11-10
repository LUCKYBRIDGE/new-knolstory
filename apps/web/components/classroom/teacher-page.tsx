'use client';
import {ClassroomShell} from './classroom-shell';
import {TeacherDashboard} from './teacher-dashboard';
export function TeacherPage(){
 return <ClassroomShell title="교사 대시보드" roles={['teacher','admin']}>{state=>state.session?<TeacherDashboard session={state.session}/>:null}</ClassroomShell>;
}
