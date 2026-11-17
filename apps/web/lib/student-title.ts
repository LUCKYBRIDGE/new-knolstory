import {prepareJsonbSnapshot,type AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import {currentStudentNumber,studentNumberLabel,withStudentNumber} from './student-file-prefix';

/** Student works always start with the class number ("07_"), which the student cannot change.
 * Teachers sort submissions, files and works by it. Other accounts are unaffected. */
export const studentPrefix=(number:number|null=currentStudentNumber())=>number===null?'':`${studentNumberLabel(number)}_`;
/** The part of a title a student may edit: everything after the fixed number. */
export const titleBody=(title:string,number:number|null=currentStudentNumber())=>number===null?title:title.replace(/^\s*\d{1,2}_/,'');
export const studentTitle=(title:string,number:number|null=currentStudentNumber())=>withStudentNumber(title,number);

function titleOf(content:AuthoringJsonbSnapshot['content']):string{return content.format==='shortstory'?content.project.title:content.document.project.title;}
/** The same work with the student's number in front of its title, ready to upload or hand in. */
export async function withStudentTitle(snapshot:AuthoringJsonbSnapshot,number:number|null=currentStudentNumber()):Promise<AuthoringJsonbSnapshot>{
 if(number===null)return snapshot;
 const current=titleOf(snapshot.content),fixed=studentTitle(current,number);
 if(fixed===current)return snapshot;
 const content=structuredClone(snapshot.content);
 if(content.format==='shortstory')content.project.title=fixed;else content.document.project.title=fixed;
 return prepareJsonbSnapshot(content);
}
