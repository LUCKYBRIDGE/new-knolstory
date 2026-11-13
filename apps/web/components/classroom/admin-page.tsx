'use client';
import {ClassroomShell} from './classroom-shell';
import {AdminPanel} from './admin-panel';
export function AdminPage(){
 return <ClassroomShell title="관리자" active="admin" roles={['admin']}>{state=>state.session?<AdminPanel key={state.session.accountId} csrf={state.session.csrf}/>:null}</ClassroomShell>;
}
