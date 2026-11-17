import type {SqlClient} from '../storage/postgres-save-port';
import {DocumentServiceError} from './validation';

/** Student works always start with the class number ("07_"); the web app adds it and locks it.
 * The server checks it too, so no path can store a student work without it. */
export function snapshotTitle(snapshot:unknown):string{
 const content=(snapshot as {content?:{format?:string;project?:{title?:unknown};document?:{project?:{title?:unknown}}}})?.content;
 const title=content?.format==='shortstory'?content.project?.title:content?.document?.project?.title;
 return typeof title==='string'?title:'';
}
export async function assertStudentTitle(client:SqlClient,accountId:string,snapshot:unknown){
 const row=(await client.query('SELECT number FROM knolstory_class.students WHERE account_id=$1',[accountId])).rows[0];
 if(!row)return;
 const prefix=`${String(Number(row.number)).padStart(2,'0')}_`;
 if(!snapshotTitle(snapshot).startsWith(prefix))throw new DocumentServiceError('STUDENT_NUMBER_TITLE',422);
}
