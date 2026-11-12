import type {ClassroomRoleState} from '../components/use-classroom-me';
export type ServiceSection='library'|'assignments'|'students'|'settings';
export type ServiceLink=Readonly<{section:ServiceSection;label:string;href:string}>;
export function serviceLinks(role:ClassroomRoleState):readonly ServiceLink[]{
 const library:ServiceLink={section:'library',label:'서재',href:'/?view=library'};
 if(role==='teacher'||role==='admin')return [library,{section:'assignments',label:'과제',href:'/teacher'},{section:'students',label:'학생',href:'/teacher?tab=students'}];
 if(role==='student')return [library,{section:'assignments',label:'내 과제',href:'/student'}];
 return [library];
}
export function teacherPanelFromSearch(search:string):Exclude<ServiceSection,'library'>{
 const panel=new URLSearchParams(search).get('tab');
 return panel==='students'||panel==='settings'?panel:'assignments';
}
