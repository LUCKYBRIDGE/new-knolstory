/** Typed client for /api/v1/class (docs/architecture/classroom-design.md §6). Credentials stay in the session cookie; CSRF comes from the account session. */
import type {AuthoringJsonbSnapshot} from '@knolstory/compatibility';
export type ClassroomRole='member'|'teacher'|'student'|'admin';
import {ALL_EDITING_ALLOWED,EDITING_PRESETS,resolveEditingPermissions,type EditingPermissions} from './editing-permissions';
export {ALL_EDITING_ALLOWED,EDITING_PRESETS,resolveEditingPermissions,describeEditingPermissions,type EditingPermissions} from './editing-permissions';
export type ClassroomSummary=Readonly<{id:string;name:string;classCode:string;studentCount:number}>;
export type ClassroomStudent=Readonly<{number:number;name:string;password:string;permissions:EditingPermissions|null;hasQr:boolean}>;
export type Classroom=ClassroomSummary&Readonly<{defaultPermissions:EditingPermissions;students:readonly ClassroomStudent[]}>;
export type AssignmentFormat='knolstory'|'shortstory';
export type Assignment=Readonly<{format:AssignmentFormat;id:string;title:string;description:string;storyKey:string|null;open:boolean;createdAt:number;submittedAt?:number|null}>;
export type SubmissionRow=Readonly<{number:number;name:string;submittedAt:number}>;
export type SubmissionDocument=Readonly<{document:AuthoringJsonbSnapshot;submittedAt:number}>;
export type StudentSelf=Readonly<{number:number;name:string;classId:string;className:string;permissions:EditingPermissions}>;
export type ClassroomMe=Readonly<{role:ClassroomRole;account:Readonly<{id:string}>;classroom?:ClassroomSummary;student?:StudentSelf}>;

/** Buttons for the teacher dashboard, in display order. */
export const PERMISSION_PRESETS:readonly Readonly<{id:keyof typeof EDITING_PRESETS;label:string;permissions:EditingPermissions}>[]=[
 {id:'textOnly',label:'글만',permissions:EDITING_PRESETS.textOnly},
 {id:'textAndImages',label:'글·이미지',permissions:EDITING_PRESETS.textAndImages},
 {id:'all',label:'전체',permissions:EDITING_PRESETS.all},
];
export const PERMISSION_FIELDS:readonly Readonly<{key:'images'|'characters'|'audio'|'direction'|'choices'|'newWorks';label:string}>[]=[
 {key:'images',label:'이미지 고르기'},{key:'characters',label:'인물 배치'},{key:'audio',label:'음향'},{key:'direction',label:'연출'},{key:'choices',label:'선택지·점수'},{key:'newWorks',label:'새 작품 만들기·가져오기'},
];
export const effectivePermissions=resolveEditingPermissions;
export function samePermissions(a:EditingPermissions,b:EditingPermissions){return a.images===b.images&&a.characters===b.characters&&a.audio===b.audio&&a.direction===b.direction&&a.choices===b.choices&&a.newWorks===b.newWorks&&a.forcedStoryKey===b.forcedStoryKey;}
export function presetLabel(value:EditingPermissions):string{return PERMISSION_PRESETS.find(item=>samePermissions(item.permissions,value))?.label??'직접 고름';}

export class ClassroomError extends Error{
 constructor(readonly code:string,readonly status:number){super(classroomErrorMessage(code));this.name='ClassroomError';}
}
const messages:ReadonlyMap<string,string>=new Map([
 ['SESSION_REQUIRED','다시 로그인해 주세요.'],['ROLE_NOT_ALLOWED','이 계정으로는 할 수 없는 일이에요.'],
 ['CLASSROOM_EXISTS','이미 학급이 있어요.'],['CLASSROOM_NOT_FOUND','학급을 찾지 못했어요.'],
 ['STUDENT_LIMIT','학생은 30명까지 만들 수 있어요.'],['STUDENT_NOT_FOUND','학생을 찾지 못했어요.'],
 ['INVALID_LOGIN','학급 코드, 번호 또는 비밀번호를 다시 확인해 주세요.'],['INVALID_TEACHER_CODE','교사 등록 코드가 맞지 않아요.'],
 ['ASSIGNMENT_FORMAT_MISMATCH','과제 유형과 같은 작품을 선택해 주세요. 놀스토리·숏스토리를 확인해 주세요.'],['ASSIGNMENT_CLOSED','이미 닫힌 과제예요.'],['ASSIGNMENT_NOT_FOUND','과제를 찾지 못했어요.'],
 ['INVALID_DOCUMENT','이 작품은 제출할 수 없어요. 서비스에 등록된 그림과 소리만 쓸 수 있어요.'],['INVALID_REQUEST','입력한 내용을 다시 확인해 주세요.'],
 ['QR_REISSUE_REQUIRED','이전에 만든 QR을 인쇄하려면 한 번 다시 만들어야 해요. 이전 QR은 더 이상 쓸 수 없어요.'],['CLASSROOM_UNAVAILABLE','학급 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'],
 ['RATE_LIMITED','지금 요청이 많아요. 잠시 뒤 다시 시도해 주세요.'],
]);
export function classroomErrorMessage(code:string){return messages.get(code)??'학급 서비스를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.';}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
type Fetcher=typeof fetch;
const BASE='/api/v1/class';
async function call(path:string,fetcher:Fetcher,options:Readonly<{method?:string;csrf?:string;body?:unknown;allow404?:boolean}>={}):Promise<Record<string,unknown>|unknown[]|null>{
 const headers:Record<string,string>={};
 if(options.csrf)headers['x-csrf-token']=options.csrf;
 if(options.body!==undefined)headers['content-type']='application/json';
 let response:Response,value:unknown;
 try{
  response=await fetcher(BASE+path,{credentials:'same-origin',cache:'no-store',redirect:'error',method:options.method??'GET',headers,...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
  value=await response.json();
 }catch{throw new ClassroomError('SERVICE_UNAVAILABLE',503);}
 if(response.status===404&&options.allow404)return null;
 if(!response.ok){
  const error=object(value)&&object(value.error)?value.error:{};
  throw new ClassroomError(typeof error.code==='string'?error.code:response.status===401?'SESSION_REQUIRED':'SERVICE_UNAVAILABLE',response.status);
 }
 if(!object(value)||value.success!==true||!(object(value.data)||Array.isArray(value.data)))throw new ClassroomError('INVALID_RESPONSE',502);
 return value.data as Record<string,unknown>|unknown[];
}
async function obj(path:string,fetcher:Fetcher,options?:Parameters<typeof call>[2]):Promise<Record<string,unknown>>{
 const data=await call(path,fetcher,options);if(!object(data))throw new ClassroomError('INVALID_RESPONSE',502);return data;
}
const csrfOf=(csrf:string)=>{if(typeof csrf!=='string'||!csrf)throw new ClassroomError('SESSION_REQUIRED',401);return csrf;};
const asClassroom=(data:Record<string,unknown>)=>{if(typeof data.id!=='string'||!Array.isArray(data.students)||!object(data.defaultPermissions))throw new ClassroomError('INVALID_RESPONSE',502);return data as unknown as Classroom;};
const asAssignment=(data:Record<string,unknown>)=>{if(typeof data.id!=='string'||typeof data.title!=='string')throw new ClassroomError('INVALID_RESPONSE',502);if(data.format!==undefined&&data.format!=='knolstory'&&data.format!=='shortstory')throw new ClassroomError('INVALID_RESPONSE',502);return {...data,format:data.format??'knolstory'} as Assignment;};
const seg=(value:string|number)=>encodeURIComponent(String(value));

/** Returns null when nobody is signed in. */
export async function classMe(fetcher:Fetcher=fetch):Promise<ClassroomMe|null>{
 let data:Record<string,unknown>;
 try{data=await obj('/me',fetcher);}catch(issue){if(issue instanceof ClassroomError&&issue.status===401)return null;throw issue;}
 if(!['member','teacher','student','admin'].includes(data.role as string)||!object(data.account)||typeof data.account.id!=='string')throw new ClassroomError('INVALID_RESPONSE',502);
 return data as unknown as ClassroomMe;
}
export const teacherUpgrade=(code:string,csrf:string,fetcher:Fetcher=fetch)=>obj('/teacher-upgrade',fetcher,{method:'POST',csrf:csrfOf(csrf),body:{code}});
export async function adminTeacherCodeUpdatedAt(fetcher:Fetcher=fetch):Promise<number|null>{const data=await obj('/admin/teacher-code',fetcher);return typeof data.updatedAt==='number'?data.updatedAt:null;}
export async function adminSetTeacherCode(code:string,csrf:string,fetcher:Fetcher=fetch):Promise<number|null>{const data=await obj('/admin/teacher-code',fetcher,{method:'PUT',csrf:csrfOf(csrf),body:{code}});return typeof data.updatedAt==='number'?data.updatedAt:null;}
export const classroomCreate=async(name:string,csrf:string,fetcher:Fetcher=fetch)=>asClassroom(await obj('/classroom',fetcher,{method:'POST',csrf:csrfOf(csrf),body:{name}}));
/** Returns null when the teacher has not opened a class yet. */
export async function classroomRead(fetcher:Fetcher=fetch):Promise<Classroom|null>{const data=await call('/classroom',fetcher,{allow404:true});return data===null?null:asClassroom(Array.isArray(data)?{}:data);}
export const classroomUpdate=async(patch:Readonly<{name?:string;regenerateCode?:true;defaultPermissions?:EditingPermissions}>,csrf:string,fetcher:Fetcher=fetch)=>asClassroom(await obj('/classroom',fetcher,{method:'PATCH',csrf:csrfOf(csrf),body:patch}));
export const studentsCreate=async(count:number,csrf:string,fetcher:Fetcher=fetch)=>asClassroom(await obj('/classroom/students',fetcher,{method:'POST',csrf:csrfOf(csrf),body:{count}}));
export const studentUpdate=(number:number,patch:Readonly<{name?:string;password?:string;permissions?:EditingPermissions|null}>,csrf:string,fetcher:Fetcher=fetch)=>obj(`/classroom/students/${seg(number)}`,fetcher,{method:'PATCH',csrf:csrfOf(csrf),body:patch}) as Promise<unknown> as Promise<ClassroomStudent>;
export const studentsPermissions=async(numbers:readonly number[],permissions:EditingPermissions|null,csrf:string,fetcher:Fetcher=fetch)=>asClassroom(await obj('/classroom/students/permissions',fetcher,{method:'POST',csrf:csrfOf(csrf),body:{numbers,permissions}}));
export const studentDelete=async(number:number,csrf:string,fetcher:Fetcher=fetch)=>asClassroom(await obj(`/classroom/students/${seg(number)}`,fetcher,{method:'DELETE',csrf:csrfOf(csrf)}));
export async function studentQr(number:number,csrf:string,fetcher:Fetcher=fetch):Promise<string>{const data=await obj(`/classroom/students/${seg(number)}/qr`,fetcher,{method:'POST',csrf:csrfOf(csrf)});if(typeof data.url!=='string')throw new ClassroomError('INVALID_RESPONSE',502);return data.url;}
export const studentLogin=(input:Readonly<{classCode:string;number:number;password:string}>,fetcher:Fetcher=fetch)=>obj('/student-login',fetcher,{method:'POST',body:input});
export const qrLogin=(token:string,fetcher:Fetcher=fetch)=>obj('/qr-login',fetcher,{method:'POST',body:{token}});
export async function assignmentList(fetcher:Fetcher=fetch):Promise<Assignment[]>{const data=await call('/classroom/assignments',fetcher);if(!Array.isArray(data))throw new ClassroomError('INVALID_RESPONSE',502);return data.map(item=>asAssignment(item as Record<string,unknown>)).map(item=>item);}
export const assignmentCreate=async(input:Readonly<{title:string;description?:string;storyKey?:string;format?:AssignmentFormat}>,csrf:string,fetcher:Fetcher=fetch)=>asAssignment(await obj('/classroom/assignments',fetcher,{method:'POST',csrf:csrfOf(csrf),body:input}));
export const assignmentUpdate=async(id:string,patch:Readonly<{title?:string;description?:string;open?:boolean}>,csrf:string,fetcher:Fetcher=fetch)=>asAssignment(await obj(`/classroom/assignments/${seg(id)}`,fetcher,{method:'PATCH',csrf:csrfOf(csrf),body:patch}));
export async function submissionList(id:string,fetcher:Fetcher=fetch):Promise<SubmissionRow[]>{const data=await call(`/classroom/assignments/${seg(id)}/submissions`,fetcher);if(!Array.isArray(data))throw new ClassroomError('INVALID_RESPONSE',502);return data as SubmissionRow[];}
export const submissionOpen=(id:string,number:number,fetcher:Fetcher=fetch)=>obj(`/classroom/assignments/${seg(id)}/submissions/${seg(number)}`,fetcher) as Promise<unknown> as Promise<SubmissionDocument>;
export async function submissionPut(id:string,document:AuthoringJsonbSnapshot,csrf:string,fetcher:Fetcher=fetch):Promise<number>{const data=await obj(`/classroom/assignments/${seg(id)}/submission`,fetcher,{method:'PUT',csrf:csrfOf(csrf),body:{document}});if(typeof data.submittedAt!=='number')throw new ClassroomError('INVALID_RESPONSE',502);return data.submittedAt;}
/** Returns null when this student has not submitted yet. */
export async function submissionMine(id:string,fetcher:Fetcher=fetch):Promise<SubmissionDocument|null>{
 try{return await obj(`/classroom/assignments/${seg(id)}/submission`,fetcher) as unknown as SubmissionDocument;}
 catch(issue){if(issue instanceof ClassroomError&&issue.status===404)return null;throw issue;}
}


export type StudentQrCard=Readonly<{number:number;name:string;url:string}>;
export type StudentQrPrint=Readonly<{className:string;classCode:string;cards:readonly StudentQrCard[]}>;
export async function prepareStudentQrPrint(numbers:readonly number[],csrf:string,replaceExisting=false,fetcher:Fetcher=fetch):Promise<StudentQrPrint>{
 const data=await obj('/classroom/qr-print',fetcher,{method:'POST',csrf:csrfOf(csrf),body:{numbers,...(replaceExisting?{replaceExisting:true}:{})}});
 if(typeof data.className!=='string'||typeof data.classCode!=='string'||!Array.isArray(data.cards)||data.cards.length!==numbers.length)throw new ClassroomError('INVALID_RESPONSE',502);
 const cards=data.cards.map((card:unknown)=>{
  if(!object(card)||!Number.isInteger(card.number)||!numbers.includes(card.number as number)||typeof card.name!=='string'||typeof card.url!=='string')throw new ClassroomError('INVALID_RESPONSE',502);
  let url:URL;try{url=new URL(card.url);}catch{throw new ClassroomError('INVALID_RESPONSE',502);}
  if(!['http:','https:'].includes(url.protocol)||!(url.searchParams.get('q')??url.searchParams.get('class-login')))throw new ClassroomError('INVALID_RESPONSE',502);
  return {number:card.number as number,name:card.name,url:card.url};
 });
 if(new Set(cards.map(card=>card.number)).size!==cards.length)throw new ClassroomError('INVALID_RESPONSE',502);
 return {className:data.className,classCode:data.classCode,cards};
}
