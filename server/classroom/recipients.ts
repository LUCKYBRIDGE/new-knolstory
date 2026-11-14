import type {SqlClient} from '../storage/postgres-save-port';
import {ClassroomError} from './errors';

/** Request shape: null for the whole class, or 1–30 distinct student numbers. */
export function recipientNumbers(value:unknown):number[]|null{
 if(value===null)return null;
 if(!Array.isArray(value)||value.length<1||value.length>30||value.some(n=>!Number.isInteger(n)||n<1||n>30)||new Set(value).size!==value.length)throw new ClassroomError(400,'INVALID_REQUEST');
 return [...value as number[]].sort((a,b)=>a-b);
}
/** Student numbers → account ids in this class. Every number must exist. */
export async function recipientIds(client:SqlClient,classroomId:unknown,numbers:readonly number[]|null):Promise<string[]|null>{
 if(numbers===null)return null;
 const rows=(await client.query('SELECT account_id FROM knolstory_class.students WHERE classroom_id=$1 AND number=ANY($2::int[])',[classroomId,numbers])).rows;
 if(rows.length!==numbers.length)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
 return rows.map(row=>String(row.account_id));
}
/** SELECT expression giving the current numbers of a task's recipients (NULL = whole class). */
export const recipientNumbersSql=(alias:string)=>`CASE WHEN ${alias}.recipient_ids IS NULL THEN NULL ELSE ARRAY(SELECT rs.number FROM knolstory_class.students rs WHERE rs.account_id=ANY(${alias}.recipient_ids) ORDER BY rs.number) END AS recipient_numbers`;
/** WHERE condition: the task is for this student. `param` is the student's account id placeholder. */
export const forStudentSql=(alias:string,param:string)=>`(${alias}.recipient_ids IS NULL OR ${param}::uuid=ANY(${alias}.recipient_ids))`;
export function readRecipients(row:Record<string,unknown>):number[]|null{
 const value=row.recipient_numbers;
 if(value===null||value===undefined)return null;
 if(!Array.isArray(value))throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
 return value.map(Number);
}
