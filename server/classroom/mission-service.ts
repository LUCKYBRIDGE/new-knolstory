import {randomUUID} from 'node:crypto';
import type {SqlClient,SqlPool} from '../storage/postgres-save-port';
import {ClassroomError} from './errors';
import {schoolYearStart} from './season-calendar';
import {dueAt as dueAtInput,missionInput,missionPatch,missionReview,missionSubmission,type MissionInput} from './mission-contract';
import type {Role} from './service';
import {forStudentSql,readRecipients,recipientIds,recipientNumbers,recipientNumbersSql} from './recipients';
export type MissionProgress={answers:Record<string,string>;note:string;submittedAt:number|null;reviewStatus:null|'passed'|'revise';feedback:string;reviewedAt:number|null};
export type MissionView=MissionInput&{archived?:true;id:string;open:boolean;createdAt:number;dueAt:number|null;recipients?:number[]|null;progress?:MissionProgress};
export type MissionStudentProgress=MissionProgress&{number:number;name:string};
/** One entry of what a student handed in and what the teacher decided, oldest first. */
export type MissionHistoryEntry={event:'submitted'|'passed'|'revise'|'cleared';at:number;answers?:Record<string,string>;note?:string;feedback?:string};
const HISTORY_LIMIT=30;
const unavailable=()=>new ClassroomError(503,'MISSION_UNAVAILABLE');
const id=(value:unknown)=>{if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw new ClassroomError(400,'INVALID_REQUEST');return value;};
const text=(value:unknown)=>{if(typeof value!=='string')throw unavailable();return value;};
function time(value:unknown):number{const result=typeof value==='string'?Number(value):value;if(typeof result!=='number'||!Number.isSafeInteger(result)||result<0)throw unavailable();return result;}
const nullableTime=(value:unknown)=>value===null||value===undefined?null:time(value);
function progress(row:Record<string,unknown>):MissionProgress{
 const answers=row.answers??{};
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.values(answers).some(v=>typeof v!=='string'))throw unavailable();
 const status=row.review_status??null;if(status!==null&&status!=='passed'&&status!=='revise')throw unavailable();
 return {answers:answers as Record<string,string>,note:row.note===null||row.note===undefined?'':text(row.note),submittedAt:nullableTime(row.submitted_at),reviewStatus:status,feedback:row.feedback===null||row.feedback===undefined?'':text(row.feedback),reviewedAt:nullableTime(row.reviewed_at)};
}
function mission(row:Record<string,unknown>,own=false):MissionView{
 let input:MissionInput;try{input=missionInput({title:row.title,description:row.description,criteria:row.criteria,kind:row.kind,storyKey:row.story_key,readingFormat:row.reading_format,questions:row.questions});}catch{throw unavailable();}
 if(typeof row.open!=='boolean')throw unavailable();
 return {...input,id:text(row.id),open:row.open,createdAt:time(row.created_at),dueAt:nullableTime(row.due_at),...(own?{progress:progress(row)}:{recipients:readRecipients(row)})};
}
function historyEntry(row:Record<string,unknown>):MissionHistoryEntry{
 const event=row.event;if(event!=='submitted'&&event!=='passed'&&event!=='revise'&&event!=='cleared')throw unavailable();
 if(event==='submitted'){
  const answers=row.answers;
  if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.values(answers).some(v=>typeof v!=='string'))throw unavailable();
  return {event,at:time(row.at),answers:answers as Record<string,string>,note:text(row.note)};
 }
 return {event,at:time(row.at),feedback:text(row.feedback)};
}
async function recordHistory(client:SqlClient,missionId:string,studentId:string,entry:Readonly<{event:MissionHistoryEntry['event'];at:number;answers?:Record<string,string>;note?:string;feedback?:string}>){
 await client.query('INSERT INTO knolstory_class.mission_history(id,mission_id,student_account_id,event,answers,note,feedback,at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8)',
  [randomUUID(),missionId,studentId,entry.event,entry.answers?JSON.stringify(entry.answers):null,entry.note??'',entry.feedback??'',entry.at]);
 // Keep each student's latest records for a mission; the newest state also lives in mission_progress.
 await client.query('DELETE FROM knolstory_class.mission_history WHERE id IN (SELECT id FROM knolstory_class.mission_history WHERE mission_id=$1 AND student_account_id=$2 ORDER BY seq DESC OFFSET $3)',[missionId,studentId,HISTORY_LIMIT]);
}
const readHistory=async(client:SqlClient,missionId:string,studentId:string)=>(await client.query('SELECT event,answers,note,feedback,at FROM knolstory_class.mission_history WHERE mission_id=$1 AND student_account_id=$2 ORDER BY seq',[missionId,studentId])).rows.map(historyEntry);
/** Missions are service data: none of these operations reads or changes authored StoryDocuments. */
export function createMissionService(pool:SqlPool,clock:()=>number=Date.now){
 const now=()=>time(clock());
 async function transaction<T>(operation:(client:SqlClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();let destroy=false;
  try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');const result=await operation(client);await client.query('COMMIT');return result;}
  catch(error){try{await client.query('ROLLBACK');}catch(rollback){destroy=true;throw new AggregateError([error,rollback],'Mission transaction and rollback failed.');}throw error;}
  finally{if(destroy)client.release(true);else client.release();}
 }
 async function read<T>(operation:(client:SqlClient)=>Promise<T>){const client=await pool.connect();try{return await operation(client);}finally{client.release();}}
 async function teacherRoom(client:SqlClient,teacherId:string){
  id(teacherId);const row=(await client.query("SELECT c.id FROM knolstory_class.classrooms c JOIN knolstory_auth.accounts a ON a.id=c.teacher_account_id WHERE c.teacher_account_id=$1 AND a.status='active'",[teacherId])).rows[0];
  if(!row)throw new ClassroomError(404,'CLASSROOM_NOT_FOUND');return text(row.id);
 }
 async function studentRoom(client:SqlClient,accountId:string){
  id(accountId);const row=(await client.query("SELECT s.classroom_id FROM knolstory_class.students s JOIN knolstory_auth.accounts a ON a.id=s.account_id WHERE s.account_id=$1 AND a.status='active'",[accountId])).rows[0];
  if(!row)throw new ClassroomError(403,'ROLE_NOT_ALLOWED');return text(row.classroom_id);
 }
 async function lockedMission(client:SqlClient,classroomId:string,missionId:string,write=true){
  id(missionId);const row=(await client.query('SELECT * FROM knolstory_class.missions WHERE id=$1 AND classroom_id=$2 FOR UPDATE',[missionId,classroomId])).rows[0];
  if(!row)throw new ClassroomError(404,'MISSION_NOT_FOUND');
  if(write&&time(row.created_at)<schoolYearStart(now()))throw new ClassroomError(409,'SEASON_ARCHIVED');
  return row;
 }
 return {
  async listMissions(accountId:string,role:Role):Promise<MissionView[]>{
   if(!['teacher','admin','student'].includes(role))throw new ClassroomError(403,'ROLE_NOT_ALLOWED');
   return read(async client=>{
    const room=role==='student'?await studentRoom(client,accountId):await teacherRoom(client,accountId);
    const student=role==='student';
    const result=await client.query(`SELECT m.*,p.answers,p.note,p.submitted_at,p.review_status,p.feedback,p.reviewed_at,${recipientNumbersSql('m')} FROM knolstory_class.missions m LEFT JOIN knolstory_class.mission_progress p ON p.mission_id=m.id AND p.student_account_id=$2 WHERE m.classroom_id=$1${student?` AND ${forStudentSql('m','$2')}`:''} ORDER BY m.created_at DESC,m.id`,[room,student?accountId:null]);
    return result.rows.map(row=>({...mission(row,role==='student'),...(time(row.created_at)<schoolYearStart(now())?{archived:true as const,open:false}:{})}));
   });
  },
  async createMission(teacherId:string,value:unknown):Promise<MissionView>{
   // The due date sits beside the mission content; the content contract stays unchanged.
   const {dueAt:rawDue,recipients:rawRecipients,...content}=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{} as Record<string,unknown>;
   const input=missionInput(value&&typeof value==='object'&&!Array.isArray(value)?content:value),due=rawDue===undefined?null:dueAtInput(rawDue),numbers=rawRecipients===undefined?null:recipientNumbers(rawRecipients);
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId),recipients=await recipientIds(client,room,numbers);
    const result=await client.query(`INSERT INTO knolstory_class.missions AS m(id,classroom_id,title,description,criteria,kind,story_key,reading_format,questions,created_at,due_at,recipient_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::uuid[]) RETURNING m.*,${recipientNumbersSql('m')}`,[randomUUID(),room,input.title,input.description,input.criteria,input.kind,input.storyKey,input.readingFormat,JSON.stringify(input.questions),now(),due,recipients]);
    return mission(result.rows[0]!);
   });
  },
  async setMissionOpen(teacherId:string,missionId:string,value:unknown):Promise<MissionView>{
   const patch=missionPatch(value);
   return transaction(async client=>{const room=await teacherRoom(client,teacherId),current=await lockedMission(client,room,missionId);const recipients=patch.recipients===undefined?current.recipient_ids??null:await recipientIds(client,room,patch.recipients);const result=await client.query(`UPDATE knolstory_class.missions AS m SET open=$2,due_at=$3,recipient_ids=$4::uuid[] WHERE m.id=$1 RETURNING m.*,${recipientNumbersSql('m')}`,[missionId,patch.open??current.open,patch.dueAt===undefined?current.due_at??null:patch.dueAt,recipients]);return mission(result.rows[0]!);});
  },
  async submitMission(accountId:string,missionId:string,value:unknown):Promise<{submittedAt:number}>{
   return transaction(async client=>{
    const room=await studentRoom(client,accountId),row=await lockedMission(client,room,missionId);
    if(Array.isArray(row.recipient_ids)&&!row.recipient_ids.includes(accountId.toLowerCase()))throw new ClassroomError(404,'MISSION_NOT_FOUND');
    if(!row.open)throw new ClassroomError(409,'MISSION_CLOSED');
    const input=missionSubmission(value,mission(row).questions);
    const previous=(await client.query('SELECT submitted_at,review_status FROM knolstory_class.mission_progress WHERE mission_id=$1 AND student_account_id=$2 FOR UPDATE',[missionId,accountId])).rows[0];
    // A passed sheet is finished; handing it in again would silently undo the teacher's pass.
    if(previous?.review_status==='passed')throw new ClassroomError(409,'MISSION_PASSED');
    const prior=nullableTime(previous?.submitted_at),submittedAt=time(Math.max(now(),prior===null?0:prior+1));
    await client.query(`INSERT INTO knolstory_class.mission_progress(mission_id,student_account_id,answers,note,submitted_at) VALUES($1,$2,$3::jsonb,$4,$5) ON CONFLICT(mission_id,student_account_id) DO UPDATE SET answers=EXCLUDED.answers,note=EXCLUDED.note,submitted_at=EXCLUDED.submitted_at,review_status=NULL`,[missionId,accountId,JSON.stringify(input.answers),input.note,submittedAt]);
    await recordHistory(client,missionId,accountId,{event:'submitted',at:submittedAt,answers:input.answers,note:input.note});
    return {submittedAt};
   });
  },
  async listMissionProgress(teacherId:string,missionId:string):Promise<MissionStudentProgress[]>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId),row=await lockedMission(client,room,missionId,false);
    const result=await client.query(`SELECT s.number,s.name,p.answers,p.note,p.submitted_at,p.review_status,p.feedback,p.reviewed_at FROM knolstory_class.students s LEFT JOIN knolstory_class.mission_progress p ON p.student_account_id=s.account_id AND p.mission_id=$2 WHERE s.classroom_id=$1 AND ($3::uuid[] IS NULL OR s.account_id=ANY($3::uuid[])) ORDER BY s.number`,[room,missionId,row.recipient_ids??null]);
    return result.rows.map(row=>({...progress(row),number:time(row.number),name:text(row.name)}));
   });
  },
  async reviewMission(teacherId:string,missionId:string,number:number,value:unknown):Promise<MissionStudentProgress>{
   if(!Number.isInteger(number)||number<1||number>30)throw new ClassroomError(400,'INVALID_REQUEST');const input=missionReview(value);
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId);await lockedMission(client,room,missionId);
    const student=(await client.query('SELECT account_id,name,number FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2 FOR UPDATE',[room,number])).rows[0];
    if(!student)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    const previous=(await client.query('SELECT * FROM knolstory_class.mission_progress WHERE mission_id=$1 AND student_account_id=$2 FOR UPDATE',[missionId,student.account_id])).rows[0];
    if(nullableTime(previous?.submitted_at)!==input.expectedSubmittedAt)throw new ClassroomError(409,'MISSION_SUBMISSION_CHANGED');
    const result=await client.query(`INSERT INTO knolstory_class.mission_progress(mission_id,student_account_id,review_status,feedback,reviewed_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(mission_id,student_account_id) DO UPDATE SET review_status=EXCLUDED.review_status,feedback=EXCLUDED.feedback,reviewed_at=EXCLUDED.reviewed_at RETURNING *`,[missionId,student.account_id,input.reviewStatus,input.feedback,now()]);
    const saved=progress(result.rows[0]!);
    await recordHistory(client,missionId,text(student.account_id),{event:input.reviewStatus??'cleared',at:saved.reviewedAt??now(),feedback:saved.feedback});
    return {...saved,number,name:text(student.name)};
   });
  },
  /** A student's handed-in sheets and the teacher's decisions for one mission, oldest first. */
  async missionHistoryFor(teacherId:string,missionId:string,number:number):Promise<MissionHistoryEntry[]>{
   if(!Number.isInteger(number)||number<1||number>30)throw new ClassroomError(400,'INVALID_REQUEST');
   return read(async client=>{
    const room=await teacherRoom(client,teacherId);id(missionId);
    if(!(await client.query('SELECT 1 FROM knolstory_class.missions WHERE id=$1 AND classroom_id=$2',[missionId,room])).rows[0])throw new ClassroomError(404,'MISSION_NOT_FOUND');
    const student=(await client.query('SELECT account_id FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2',[room,number])).rows[0];
    if(!student)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    return readHistory(client,missionId,text(student.account_id));
   });
  },
  async myMissionHistory(accountId:string,missionId:string):Promise<MissionHistoryEntry[]>{
   return read(async client=>{
    const room=await studentRoom(client,accountId);id(missionId);
    const row=(await client.query('SELECT recipient_ids FROM knolstory_class.missions WHERE id=$1 AND classroom_id=$2',[missionId,room])).rows[0];
    if(!row||Array.isArray(row.recipient_ids)&&!row.recipient_ids.includes(accountId.toLowerCase()))throw new ClassroomError(404,'MISSION_NOT_FOUND');
    return readHistory(client,missionId,accountId);
   });
  },
 };
}
