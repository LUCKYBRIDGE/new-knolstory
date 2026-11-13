import type {ClassroomRoleState} from '../components/use-classroom-me';
export type ServiceSection='library'|'assignments'|'students'|'settings'|'admin';
export type ServiceLink=Readonly<{section:ServiceSection;label:string;href:string}>;
export function serviceLinks(role:ClassroomRoleState):readonly ServiceLink[]{
 const library:ServiceLink={section:'library',label:'서재',href:'/?view=library'};
 const teaching:ServiceLink[]=[library,{section:'assignments',label:'과제',href:'/teacher'},{section:'students',label:'학생',href:'/teacher?tab=students'}];
 if(role==='admin')return [...teaching,{section:'admin',label:'관리',href:'/admin'}];
 if(role==='teacher')return teaching;
 if(role==='student')return [library,{section:'assignments',label:'내 과제',href:'/student'}];
 return [library];
}
export function teacherPanelFromSearch(search:string):Exclude<ServiceSection,'library'|'admin'>{
 const panel=new URLSearchParams(search).get('tab');
 return panel==='students'||panel==='settings'?panel:'assignments';
}
