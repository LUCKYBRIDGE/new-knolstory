import {ClassroomError} from './errors';
export type MissionKind='reading'|'worksheet'|'custom';
export type ReadingFormat='original'|'knolstory'|'shortstory';
export type MissionQuestion=Readonly<{id:string;prompt:string}>;
export type MissionInput=Readonly<{title:string;description:string;criteria:string;kind:MissionKind;storyKey:string|null;readingFormat:ReadingFormat;questions:readonly MissionQuestion[]}>;
export type MissionSubmission=Readonly<{answers:Record<string,string>;note:string}>;
export type MissionReview=Readonly<{reviewStatus:null|'passed'|'revise';feedback:string;expectedSubmittedAt:number|null}>;
const invalid=()=>new ClassroomError(400,'INVALID_REQUEST');
function object(value:unknown,keys:readonly string[],required:readonly string[]=keys):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();
 const input=value as Record<string,unknown>;
 if(Object.keys(input).some(key=>!keys.includes(key))||required.some(key=>!Object.hasOwn(input,key)))throw invalid();
 return input;
}
function text(value:unknown,max:number,required=false){
 if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)||required&&!value.trim())throw invalid();
 return value;
}
export function missionInput(value:unknown):MissionInput{
 const input=object(value,['title','description','criteria','kind','storyKey','readingFormat','questions'],['title','description','criteria','kind','readingFormat','questions']);
 if(!['reading','worksheet','custom'].includes(input.kind as string)||!['original','knolstory','shortstory'].includes(input.readingFormat as string))throw invalid();
 const storyKey=input.storyKey??null;
 if(storyKey!==null&&!['rabbit','onggojib','seonnyeo','heungbu'].includes(storyKey as string))throw invalid();
 if(!Array.isArray(input.questions)||input.questions.length>8||input.kind==='worksheet'&&!input.questions.length)throw invalid();
 const questions=input.questions.map(item=>{
  const row=object(item,['id','prompt']);if(typeof row.id!=='string'||!/^q[1-8]$/.test(row.id))throw invalid();
  return {id:row.id,prompt:text(row.prompt,400,true).trim()};
 });
 if(new Set(questions.map(q=>q.id)).size!==questions.length)throw invalid();
 return {title:text(input.title,80,true).trim(),description:text(input.description,2000),criteria:text(input.criteria,2000),kind:input.kind as MissionKind,storyKey:storyKey as string|null,readingFormat:input.readingFormat as ReadingFormat,questions};
}
export function missionSubmission(value:unknown,questions:readonly MissionQuestion[]):MissionSubmission{
 const input=object(value,['answers','note']),answers=object(input.answers,questions.map(q=>q.id),questions.map(q=>q.id));
 return {answers:Object.fromEntries(questions.map(q=>[q.id,text(answers[q.id],2000,true)])),note:text(input.note,2000)};
}
export function missionReview(value:unknown):MissionReview{
 const input=object(value,['reviewStatus','feedback','expectedSubmittedAt']);
 if(input.reviewStatus!==null&&input.reviewStatus!=='passed'&&input.reviewStatus!=='revise')throw invalid();
 if(input.expectedSubmittedAt!==null&&(typeof input.expectedSubmittedAt!=='number'||!Number.isSafeInteger(input.expectedSubmittedAt)||input.expectedSubmittedAt<0))throw invalid();
 return {reviewStatus:input.reviewStatus as MissionReview['reviewStatus'],feedback:text(input.feedback,2000,input.reviewStatus==='revise'),expectedSubmittedAt:input.expectedSubmittedAt as number|null};
}
/** Optional due date: epoch milliseconds or null to clear. */
export function dueAt(value:unknown):number|null{
 if(value===null)return null;
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw invalid();return value;
}
export function missionPatch(value:unknown):{open?:boolean;dueAt?:number|null}{
 const input=object(value,['open','dueAt'],[]);
 if(input.open===undefined&&input.dueAt===undefined)throw invalid();
 if(input.open!==undefined&&typeof input.open!=='boolean')throw invalid();
 return {...(input.open!==undefined?{open:input.open as boolean}:{}),...(input.dueAt!==undefined?{dueAt:dueAt(input.dueAt)}:{})};
}
export function missionOpen(value:unknown):boolean{
 const input=object(value,['open']);if(typeof input.open!=='boolean')throw invalid();return input.open;
}
