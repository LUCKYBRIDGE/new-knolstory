import type {SqlClient} from '../storage/postgres-save-port';
import {DocumentServiceError} from './validation';

/** Online storage limits (2026-11-18). Size is what matters; work counts are generous.
 * A classroom's teacher and students share one pool. Sizes are upload sizes (UTF-8 JSON bytes);
 * PostgreSQL compresses them, so the disk use is several times smaller. */
const MB=1024*1024;
export const STORAGE_LIMITS={
 workBytes:16*MB,
 member:{works:5,bytes:30*MB},
 student:{works:5,bytes:10*MB},
 teacher:{works:100},
 classroomBytes:300*MB,
 /** Homework is never refused for a full pool until it is this far over. */
 submissionOverflowBytes:330*MB,
} as const;
export type StorageRole='member'|'teacher'|'student'|'admin';
export type StorageUsage=Readonly<{
 works:number;worksLimit:number|null;bytes:number;bytesLimit:number|null;workBytesLimit:number;
 classroom?:Readonly<{bytes:number;limit:number}>;
}>;
const big=(value:unknown)=>{const result=Number(value??0);if(!Number.isSafeInteger(result)||result<0)throw new DocumentServiceError('STORAGE_CONTRACT_VIOLATION',503);return result;};
export const uploadBytes=(snapshot:unknown)=>Buffer.byteLength(JSON.stringify(snapshot),'utf8');

async function classroomOf(client:SqlClient,accountId:string,role:StorageRole):Promise<string|null>{
 if(role==='teacher'||role==='admin')return (await client.query('SELECT id FROM knolstory_class.classrooms WHERE teacher_account_id=$1',[accountId])).rows[0]?.id as string|undefined??null;
 if(role==='student')return (await client.query('SELECT classroom_id FROM knolstory_class.students WHERE account_id=$1',[accountId])).rows[0]?.classroom_id as string|undefined??null;
 return null;
}
/** Serialize writes that share a pool so two saves at once cannot both pass the check. */
async function lockPool(client:SqlClient,key:string){await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['storage-pool:'+key]);}
export async function classroomBytes(client:SqlClient,classroomId:string):Promise<number>{
 const result=await client.query(`SELECT
  (SELECT COALESCE(sum(d.byte_length),0) FROM knolstory_storage.private_documents d WHERE d.owner_account_id IN
    (SELECT teacher_account_id FROM knolstory_class.classrooms WHERE id=$1 UNION ALL SELECT account_id FROM knolstory_class.students WHERE classroom_id=$1))
  +(SELECT COALESCE(sum(s.byte_length),0) FROM knolstory_class.submissions s JOIN knolstory_class.students st ON st.account_id=s.student_account_id WHERE st.classroom_id=$1) AS bytes`,[classroomId]);
 return big(result.rows[0]?.bytes);
}
/** Per student: personal online works plus submissions, for the teacher's usage view. */
export async function studentBytes(client:SqlClient,classroomId:string):Promise<Map<string,number>>{
 const result=await client.query(`SELECT st.account_id,
  (SELECT COALESCE(sum(d.byte_length),0) FROM knolstory_storage.private_documents d WHERE d.owner_account_id=st.account_id)
  +(SELECT COALESCE(sum(s.byte_length),0) FROM knolstory_class.submissions s WHERE s.student_account_id=st.account_id) AS bytes
  FROM knolstory_class.students st WHERE st.classroom_id=$1`,[classroomId]);
 return new Map(result.rows.map(row=>[String(row.account_id),big(row.bytes)]));
}
async function own(client:SqlClient,accountId:string,role:StorageRole){
 const docs=(await client.query('SELECT count(*) AS works,COALESCE(sum(byte_length),0) AS bytes FROM knolstory_storage.private_documents WHERE owner_account_id=$1',[accountId])).rows[0];
 const submitted=role==='student'?big((await client.query('SELECT COALESCE(sum(byte_length),0) AS bytes FROM knolstory_class.submissions WHERE student_account_id=$1',[accountId])).rows[0]?.bytes):0;
 return {works:big(docs?.works),bytes:big(docs?.bytes)+submitted};
}
export async function storageUsage(client:SqlClient,accountId:string,role:StorageRole):Promise<StorageUsage>{
 const mine=await own(client,accountId,role),room=await classroomOf(client,accountId,role);
 const limits=role==='member'||role==='student'?STORAGE_LIMITS[role]:role==='teacher'?{works:STORAGE_LIMITS.teacher.works,bytes:null}:{works:null,bytes:null};
 // A teacher without a classroom still has the classroom-sized allowance for their own works.
 const bytesLimit=limits.bytes??(role==='teacher'?STORAGE_LIMITS.classroomBytes:null);
 return {works:mine.works,worksLimit:limits.works,bytes:mine.bytes,bytesLimit,workBytesLimit:STORAGE_LIMITS.workBytes,
  ...(room&&role!=='admin'?{classroom:{bytes:await classroomBytes(client,room),limit:STORAGE_LIMITS.classroomBytes}}:{})};
}
/** Checks a personal online work write. `newWork` adds one to the count; `deltaBytes` is the size change. */
export async function assertCanStore(client:SqlClient,accountId:string,role:StorageRole,change:Readonly<{newWork:boolean;bytes:number;deltaBytes:number}>){
 if(change.bytes>STORAGE_LIMITS.workBytes)throw new DocumentServiceError('WORK_TOO_LARGE',413);
 if(role==='admin')return;
 const room=await classroomOf(client,accountId,role);
 await lockPool(client,room??accountId);
 const usage=await storageUsage(client,accountId,role);
 if(change.newWork&&usage.worksLimit!==null&&usage.works+1>usage.worksLimit)throw new DocumentServiceError('WORK_LIMIT_REACHED',409);
 if(change.deltaBytes<=0)return;
 if(usage.bytesLimit!==null&&usage.bytes+change.deltaBytes>usage.bytesLimit)throw new DocumentServiceError('ACCOUNT_STORAGE_FULL',409);
 if(usage.classroom&&usage.classroom.bytes+change.deltaBytes>usage.classroom.limit)throw new DocumentServiceError('CLASSROOM_STORAGE_FULL',409);
}
/** Homework: only the size of one work and the overflow ceiling of the shared pool apply. */
export async function assertCanSubmit(client:SqlClient,classroomId:string,deltaBytes:number,bytes:number):Promise<'ok'|'work-too-large'|'classroom-full'>{
 if(bytes>STORAGE_LIMITS.workBytes)return 'work-too-large';
 await lockPool(client,classroomId);
 if(deltaBytes>0&&await classroomBytes(client,classroomId)+deltaBytes>STORAGE_LIMITS.submissionOverflowBytes)return 'classroom-full';
 return 'ok';
}
