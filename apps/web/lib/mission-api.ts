import {ClassroomError} from './classroom-api';
import type {BuiltinWorkId} from './builtin-works';

export type MissionProgress={answers:Record<string,string>;note:string;submittedAt:number|null;reviewStatus:'passed'|'revise'|null;feedback:string;reviewedAt:number|null};
export type Mission={id:string;title:string;description:string;criteria:string;kind:'reading'|'worksheet'|'custom';storyKey:BuiltinWorkId|null;readingFormat:'original'|'knolstory'|'shortstory';questions:{id:string;prompt:string}[];open:boolean;createdAt:number;dueAt?:number|null;progress?:MissionProgress};
export type MissionKind=Mission['kind'];
export type ReadingFormat=Mission['readingFormat'];
/** What a teacher sends to assign a mission; also the shape of a provided mission before it is copied. */
export type MissionDraft=Pick<Mission,'title'|'description'|'criteria'|'kind'|'storyKey'|'readingFormat'|'questions'>;
export type MissionStudentProgress=MissionProgress&{number:number;name:string};
export type MissionReviewInput={reviewStatus:'passed'|'revise'|null;feedback:string;expectedSubmittedAt:number|null};
export const MISSION_LIMITS={title:80,text:2000,prompt:400,questions:8} as const;
const message:Record<string,string>={MISSION_CLOSED:'마감된 과제예요.',MISSION_NOT_FOUND:'과제를 찾지 못했어요.',MISSION_SUBMISSION_CHANGED:'학생이 활동지를 다시 제출했어요. 새 답변을 확인해 주세요.',MISSION_UNAVAILABLE:'과제를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.',REQUEST_TOO_LARGE:'글이 너무 길어요. 조금 줄여서 다시 보내 주세요.'};
export class MissionError extends ClassroomError{
 constructor(code:string,status:number){super(code,status);this.message=message[code]??this.message;}
}
async function request(path:string,fetcher:typeof fetch,csrf?:string,body?:unknown,method:'PUT'|'POST'|'PATCH'='PUT'):Promise<unknown>{
 const headers=body===undefined?undefined:{'content-type':'application/json','x-csrf-token':csrf??''};
 let response:Response,value;
 try{response=await fetcher(`/api/v1/class/classroom/missions${path}`,{method:body===undefined?'GET':method,headers,credentials:'same-origin',redirect:'error',cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)})});}
 catch(issue){if(issue instanceof DOMException&&issue.name==='AbortError')throw issue;throw new MissionError('SERVICE_UNAVAILABLE',503);}
 try{value=await response.json();}catch{throw new MissionError('INVALID_RESPONSE',response.status);}
 if(!response.ok||value?.success!==true)throw new MissionError(typeof value?.error?.code==='string'?value.error.code:'INVALID_RESPONSE',response.status);
 return value.data;
}
export async function missionList(fetcher:typeof fetch=fetch):Promise<Mission[]>{
 const data=await request('',fetcher);
 if(!Array.isArray(data)||data.some(mission=>typeof mission?.id!=='string'||typeof mission.title!=='string'||!Array.isArray(mission.questions)))throw new MissionError('INVALID_RESPONSE',502);
 return data;
}
export async function missionSubmit(id:string,body:{answers:Record<string,string>;note:string},csrf:string,fetcher:typeof fetch=fetch):Promise<{submittedAt:number}>{
 const data=await request(`/${encodeURIComponent(id)}/submission`,fetcher,csrf,body);
 if(!data||typeof data!=='object'||!('submittedAt' in data)||typeof data.submittedAt!=='number'||!Number.isSafeInteger(data.submittedAt)||data.submittedAt<0)throw new MissionError('INVALID_RESPONSE',502);
 return {submittedAt:data.submittedAt};
}
const isMission=(value:unknown):value is Mission=>!!value&&typeof value==='object'&&typeof (value as Mission).id==='string'&&typeof (value as Mission).title==='string'&&Array.isArray((value as Mission).questions)&&typeof (value as Mission).open==='boolean';
const isProgress=(value:unknown):value is MissionStudentProgress=>!!value&&typeof value==='object'&&Number.isInteger((value as MissionStudentProgress).number)&&typeof (value as MissionStudentProgress).name==='string'&&!!(value as MissionStudentProgress).answers&&typeof (value as MissionStudentProgress).answers==='object';
/** Teacher: assigns a new mission to the class. */
export async function missionCreate(draft:MissionDraft&{dueAt?:number|null},csrf:string,fetcher:typeof fetch=fetch):Promise<Mission>{
 const data=await request('',fetcher,csrf,draft,'POST');if(!isMission(data))throw new MissionError('INVALID_RESPONSE',502);return data;
}
/** Teacher: closes a mission to new answers or opens it again. */
export async function missionSetOpen(id:string,open:boolean,csrf:string,fetcher:typeof fetch=fetch):Promise<Mission>{
 const data=await request(`/${encodeURIComponent(id)}`,fetcher,csrf,{open},'PATCH');if(!isMission(data))throw new MissionError('INVALID_RESPONSE',502);return data;
}
/** Teacher: sets or clears the due date (end of the chosen day). */
export async function missionSetDue(id:string,dueAt:number|null,csrf:string,fetcher:typeof fetch=fetch):Promise<Mission>{
 const data=await request(`/${encodeURIComponent(id)}`,fetcher,csrf,{dueAt},'PATCH');if(!isMission(data))throw new MissionError('INVALID_RESPONSE',502);return data;
}
/** Teacher: every student in the class with what they sent and the current decision. */
export async function missionProgress(id:string,fetcher:typeof fetch=fetch):Promise<MissionStudentProgress[]>{
 const data=await request(`/${encodeURIComponent(id)}/progress`,fetcher);if(!Array.isArray(data)||!data.every(isProgress))throw new MissionError('INVALID_RESPONSE',502);return data;
}
/** Teacher: pass, ask for a rewrite, or clear the decision. `expectedSubmittedAt` is the answer the teacher read. */
export async function missionReview(id:string,number:number,input:MissionReviewInput,csrf:string,fetcher:typeof fetch=fetch):Promise<MissionStudentProgress>{
 const data=await request(`/${encodeURIComponent(id)}/progress/${encodeURIComponent(String(number))}`,fetcher,csrf,input);if(!isProgress(data))throw new MissionError('INVALID_RESPONSE',502);return data;
}
/** Where the student reads the mission's work. The main workspace opens the book's title page and offers the way back. */
export function missionReadingHref(mission:Pick<Mission,'storyKey'|'readingFormat'>):string|undefined{
 if(!mission.storyKey)return;
 if(mission.readingFormat==='shortstory')return `/shortstory?${new URLSearchParams({work:mission.storyKey,mode:'read',from:'mission'})}`;
 return `/?${new URLSearchParams({view:'library',readWork:mission.storyKey,readEdition:mission.readingFormat})}`;
}
export const missionKindLabel=(kind:MissionKind)=>kind==='reading'?'읽기 과제':kind==='worksheet'?'독후 활동지':'교실 활동';
export const readingFormatLabel=(format:ReadingFormat)=>format==='original'?'원작':format==='knolstory'?'각색':'숏스토리';
/** Built-in works have two KnolStory editions; older tasks without one start from the adaptation. */
export const editionLabel=(edition:'original'|'knolstory'|null|undefined)=>edition==='original'?'원작':'각색';
