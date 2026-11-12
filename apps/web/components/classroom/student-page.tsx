'use client';
import {ClassroomShell} from './classroom-shell';
import {StudentDashboard} from './student-dashboard';
import {StudentLoginForm} from './student-login-form';
export function StudentPage(){
 return <ClassroomShell title="내 학급·과제" roles={['student']} guest={<StudentLoginForm/>}>{state=>state.session&&state.me?.student?<StudentDashboard key={state.session.accountId} me={state.me} session={state.session}/>:null}</ClassroomShell>;
}
