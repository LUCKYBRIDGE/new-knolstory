'use client';
import {ClassroomShell} from './classroom-shell';
import {AdminPanel} from './admin-panel';
export function AdminPage(){
 return <ClassroomShell title="관리자" roles={['admin']}>{state=>state.session?<AdminPanel csrf={state.session.csrf}/>:null}</ClassroomShell>;
}
