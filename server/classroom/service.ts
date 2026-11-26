import {randomUUID} from 'node:crypto';
import type {SqlClient,SqlPool} from '../storage/postgres-save-port';
import {checkedSnapshot,DocumentServiceError} from '../documents/validation';
import {assertStudentTitle} from '../documents/student-title';
import {ownAmount,workAmount} from './work-amount';
import {snapshotTitle} from '../documents/student-title';
import {assertCanStoreTemplate,assertCanSubmit,classroomBytes,storageUsage,studentBytes,uploadBytes,STORAGE_LIMITS,type StorageUsage} from '../documents/quota';
import {ALLOW_ALL_PERMISSIONS,effectivePermissions,normalizePermissions,storedEditScope,type EditingPermissions,type EditScope} from './permissions';
import {decoyHash,decryptText,encryptText,generateClassCode,generateQrToken,generateStudentPassword,hashQrToken,hashSecret,verifySecret,validQrToken} from './secrets';

import {ClassroomError} from './errors';
import {schoolYearStart} from './season-calendar';
export {ClassroomError} from './errors';
import {createMissionService} from './mission-service';
import {seasonEntries} from './season-export';
import {missionReview} from './mission-contract';
import {forStudentSql,readRecipients,recipientIds,recipientNumbersSql} from './recipients';

export type Role='member'|'teacher'|'student'|'admin';
export type ClassroomServiceOptions=Readonly<{
 /** 32-byte AES-256-GCM key (KNOL_CLASSROOM_SECRET). */
 secret:Buffer;
 /** Accounts listed in KNOL_ADMIN_ACCOUNT_IDS. */
 adminAccountIds:readonly string[];
 /** Public site origin used to build QR login URLs. */
 origin:string;
 clock?:()=>number;
}>;
export type ClassroomSummary={id:string;name:string;classCode:string;studentCount:number;createdAt:number};
export type StudentView={number:number;name:string;password:string;permissions:EditingPermissions|null;hasQr:boolean;storageBytes:number};
export type ClassroomView=ClassroomSummary&{defaultPermissions:EditingPermissions;students:StudentView[];storage:{bytes:number;limit:number;studentLimit:number}};
export type QrPrintView={className:string;classCode:string;cards:{number:number;name:string;url:string}[]};
export type AssignmentFormat='knolstory'|'shortstory';
export type AssignmentView={archived?:true;editScope:EditScope|null;after:{id:string;title:string;passed?:boolean}|null;format:AssignmentFormat;template:{title:string}|null;checks:string[];targetAmount:number|null;draftCount?:number;draftSavedAt?:number|null;draftComment?:string;draftCommentedAt?:number|null;id:string;title:string;description:string;storyKey:string|null;shareUrl:string|null;dueAt:number|null;edition:'original'|'knolstory'|null;startPoint:string|null;startLabel:string|null;open:boolean;createdAt:number;submittedAt?:number|null;submittedCount?:number;passedCount?:number;recipients?:number[]|null;reviewStatus?:'passed'|'revise'|null;feedback?:string};
/** Service-wide numbers for the admin page. No names, passwords, codes or manuscripts. */
export type ProgressRow={number:number;name:string;draft:{savedAt:number;amount:number;chars:number;comment:string}|null;submission:{submittedAt:number;amount:number;chars:number;reviewStatus:'passed'|'revise'|null}|null};
export type SubmissionRow={number:number;name:string;submittedAt:number;reviewStatus:'passed'|'revise'|null;feedback:string;reviewedAt:number|null};
export type TeacherCodeView={code:string|null;paused:boolean;updatedAt:number|null};
export type LoginMethod='kakao'|'google'|'password'|'qr';
export type AdminAccessRow={id:string;role:'admin'|'teacher'|'student'|'member';provider:string|null;className:string|null;studentNumber:number|null;lastLoginAt:number|null;lastLoginMethod:LoginMethod|null};
export type AdminOverview={teacherCodeUpdatedAt:number|null;accounts:{member:number;teacher:number;student:number};classrooms:{name:string;studentCount:number;assignmentCount:number;openAssignmentCount:number;missionCount:number;passedMissionCount:number;createdAt:number}[]};
export type MeView={role:Role;account:{id:string};storage?:StorageUsage;classroom?:ClassroomSummary;student?:{number:number;name:string;classId:string;className:string;classCreatedAt:number;permissions:EditingPermissions}};

const MAX_STUDENTS=30;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const num=(value:unknown):number=>{const result=typeof value==='string'?Number(value):value;if(typeof result!=='number'||!Number.isSafeInteger(result))throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');return result;};
const text=(value:unknown):string=>{if(typeof value!=='string')throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');return value;};
function submissionRow(row:Record<string,unknown>):SubmissionRow{
 const status=row.review_status===undefined?null:row.review_status;if(status!==null&&status!=='passed'&&status!=='revise')throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
 return {number:num(row.number),name:text(row.name),submittedAt:num(row.submitted_at),reviewStatus:status,feedback:typeof row.feedback==='string'?row.feedback:'',reviewedAt:row.reviewed_at===null||row.reviewed_at===undefined?null:num(row.reviewed_at)};
}

/** Role lookup shared by the classroom and document routers. Returns null for unknown or inactive accounts. */
export function createRoleResolver(pool:SqlPool,adminAccountIds:readonly string[]){
 const admins=new Set(adminAccountIds.map(id=>id.toLowerCase()));
 return {
  async roleOf(accountId:string):Promise<Role|null>{
   if(typeof accountId!=='string'||!uuid.test(accountId.toLowerCase()))return null;
   const client=await pool.connect();
   try{
    const result=await client.query("SELECT role FROM knolstory_auth.accounts WHERE id=$1 AND status='active'",[accountId]);
    const role=result.rows[0]?.role;
    if(role===undefined)return null;
    if(!['member','teacher','student'].includes(role as string))throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
    return admins.has(accountId.toLowerCase())?'admin':role as Role;
   }finally{client.release();}
  },
 };
}

export function createClassroomService(pool:SqlPool,options:ClassroomServiceOptions){
 const clock=options.clock??Date.now,roles=createRoleResolver(pool,options.adminAccountIds),key=options.secret;
 const now=()=>{const value=clock();if(!Number.isSafeInteger(value)||value<0)throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');return value;};

 async function transaction<T>(operation:(client:SqlClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();let destroy=false;
  try{
   await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
   const result=await operation(client);await client.query('COMMIT');return result;
  }catch(error){
   try{await client.query('ROLLBACK');}catch(rollbackError){destroy=true;throw new AggregateError([error,rollbackError],'Classroom transaction and rollback failed.');}
   throw error;
  }finally{if(destroy)client.release(true);else client.release();}
 }
 async function read<T>(operation:(client:SqlClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();
  try{return await operation(client);}finally{client.release();}
 }
 async function readTeacherCode():Promise<TeacherCodeView>{
  return read(async client=>{
   const row=(await client.query('SELECT code_cipher,paused,updated_at FROM knolstory_class.teacher_codes WHERE id=1')).rows[0];
   if(!row)return {code:null,paused:false,updatedAt:null};
   let code:string|null=null;
   if(row.code_cipher!==null&&row.code_cipher!==undefined){try{code=decryptText(key,text(row.code_cipher),'teacher-code');}catch{code=null;}}
   return {code,paused:row.paused===true,updatedAt:num(row.updated_at)};
  });
 }
 const adminIds=new Set(options.adminAccountIds.map(id=>id.toLowerCase()));
 const password=(accountId:string,cipher:string)=>{try{return decryptText(key,cipher,accountId);}catch{return '';}};
 const storedPermissions=(value:unknown):EditingPermissions|null=>{
  if(value===null||value===undefined)return null;
  try{return normalizePermissions(value);}catch{return null;}
 };
 const defaults=(value:unknown):EditingPermissions=>effectivePermissions(null,value);

 async function teacherRoom(client:SqlClient,teacherId:string,lock=false){
  const result=await client.query(`SELECT id,name,class_code,default_permissions,created_at FROM knolstory_class.classrooms WHERE teacher_account_id=$1${lock?' FOR UPDATE':''}`,[teacherId]);
  const row=result.rows[0];
  if(!row)throw new ClassroomError(404,'CLASSROOM_NOT_FOUND');
  return row;
 }
 async function classroomView(client:SqlClient,row:Record<string,unknown>):Promise<ClassroomView>{
  const students=await client.query('SELECT account_id,number,name,password_cipher,permissions,qr_token_hash IS NOT NULL AS has_qr FROM knolstory_class.students WHERE classroom_id=$1 ORDER BY number',[row.id]);
  const used=await studentBytes(client,text(row.id));
  return {id:text(row.id),name:text(row.name),classCode:text(row.class_code),studentCount:students.rows.length,createdAt:num(row.created_at),defaultPermissions:defaults(row.default_permissions),
   students:students.rows.map(student=>studentView(student,used.get(text(student.account_id))??0)),
   storage:{bytes:await classroomBytes(client,text(row.id)),limit:STORAGE_LIMITS.classroomBytes,studentLimit:STORAGE_LIMITS.student.bytes+STORAGE_LIMITS.student.submissionBytes}};
 }
 function studentView(row:Record<string,unknown>,storageBytes=0):StudentView{
  return {number:num(row.number),name:text(row.name),password:password(text(row.account_id),text(row.password_cipher)),permissions:storedPermissions(row.permissions),hasQr:row.has_qr===true,storageBytes};
 }
 const STUDENT_COLUMNS='account_id,number,name,password_cipher,permissions,qr_token_hash IS NOT NULL AS has_qr';
 async function studentRow(client:SqlClient,classroomId:unknown,number:number){
  const result=await client.query(`SELECT ${STUDENT_COLUMNS} FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2 FOR UPDATE`,[classroomId,number]);
  if(!result.rows[0])throw new ClassroomError(404,'STUDENT_NOT_FOUND');
  return result.rows[0];
 }
 /** Task rules every assignment read returns: its edit scope and the earlier task it opens after. */
 const STAGE_COLUMNS='a.edit_scope,a.after_assignment_id,(SELECT p.title FROM knolstory_class.assignments p WHERE p.id=a.after_assignment_id) AS after_title';
 const assignmentFormat=(value:unknown):AssignmentFormat=>{
  if(value!=='knolstory'&&value!=='shortstory')throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
  return value;
 };
 const assignment=(row:Record<string,unknown>,withSubmission:boolean):AssignmentView=>({
  format:assignmentFormat(row.format),id:text(row.id),title:text(row.title),description:text(row.description),storyKey:row.story_key===null?null:text(row.story_key),shareUrl:row.share_url===null||row.share_url===undefined?null:text(row.share_url),dueAt:row.due_at===null||row.due_at===undefined?null:num(row.due_at),edition:row.edition==='original'||row.edition==='knolstory'?row.edition:null,startPoint:typeof row.start_point==='string'?row.start_point:null,startLabel:typeof row.start_label==='string'?row.start_label:null,open:row.open===true,createdAt:num(row.created_at),
  ...(num(row.created_at)<schoolYearStart(now())?{archived:true as const,open:false}:{}),
  template:typeof row.template_title==='string'?{title:row.template_title}:null,
  editScope:storedEditScope(row.edit_scope),
  after:typeof row.after_assignment_id==='string'?{id:row.after_assignment_id,title:typeof row.after_title==='string'?row.after_title:'',...(withSubmission?{passed:row.after_passed===true}:{})}:null,
  checks:Array.isArray(row.checks)?(row.checks as unknown[]).filter((item):item is string=>typeof item==='string'):[],
  targetAmount:row.target_amount===null||row.target_amount===undefined?null:num(row.target_amount),
  ...(withSubmission?{submittedAt:row.submitted_at===null||row.submitted_at===undefined?null:num(row.submitted_at)}:{recipients:readRecipients(row)}),
 });
 async function teacherAssignment(client:SqlClient,classroomId:unknown,id:string,lock=false){
  const result=await client.query(`SELECT id,title,description,story_key,format,open,created_at,share_url,due_at,edition,start_point,start_label,recipient_ids FROM knolstory_class.assignments WHERE id=$1 AND classroom_id=$2${lock?' FOR UPDATE':''}`,[id,classroomId]);
  if(!result.rows[0])throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
  if(lock&&num(result.rows[0].created_at)<schoolYearStart(now()))throw new ClassroomError(409,'SEASON_ARCHIVED');
  return result.rows[0];
 }
 /** A KnolStory task that follows a ShortStory task opens once the student's earlier work was passed. */
 async function assertStageOpen(client:SqlClient,afterId:unknown,accountId:string){
  if(afterId===null||afterId===undefined)return;
  const passed=(await client.query("SELECT 1 FROM knolstory_class.submissions WHERE assignment_id=$1 AND student_account_id=$2 AND review_status='passed'",[afterId,accountId])).rows[0];
  if(!passed)throw new ClassroomError(409,'STAGE_LOCKED');
 }
 async function studentContext(client:SqlClient,accountId:string){
  const result=await client.query('SELECT s.number,s.name,s.permissions,c.id AS classroom_id,c.name AS classroom_name,c.created_at AS classroom_created_at,c.default_permissions FROM knolstory_class.students s JOIN knolstory_class.classrooms c ON c.id=s.classroom_id WHERE s.account_id=$1',[accountId]);
  if(!result.rows[0])throw new ClassroomError(403,'ROLE_NOT_ALLOWED');
  return result.rows[0];
 }
 async function freshClassCode(client:SqlClient,classroomId:string){
  for(let attempt=0;attempt<12;attempt++){
   const code=generateClassCode();
   await client.query('SAVEPOINT class_code');
   try{
    await client.query('UPDATE knolstory_class.classrooms SET class_code=$2 WHERE id=$1',[classroomId,code]);
    await client.query('RELEASE SAVEPOINT class_code');return;
   }catch(error){
    if((error as {code?:string}).code!=='23505')throw error;
    await client.query('ROLLBACK TO SAVEPOINT class_code');
   }
  }
  throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
 }

 return {
  ...createMissionService(pool,clock),
  exportSeason:(teacher:string,year:number)=>seasonEntries(pool,teacher,year,now()),
  roleOf:roles.roleOf,
  async me(accountId:string,role:Role):Promise<MeView>{
   return read(async client=>{
    if(role==='student'){
     const row=await studentContext(client,accountId);
     return {role,account:{id:accountId},storage:await storageUsage(client,accountId,role),student:{number:num(row.number),name:text(row.name),classId:text(row.classroom_id),className:text(row.classroom_name),classCreatedAt:num(row.classroom_created_at),permissions:effectivePermissions(row.permissions,row.default_permissions)}};
    }
    if(role==='teacher'||role==='admin'){
     const result=await client.query('SELECT c.id,c.name,c.class_code,c.created_at,(SELECT count(*) FROM knolstory_class.students s WHERE s.classroom_id=c.id) AS student_count FROM knolstory_class.classrooms c WHERE c.teacher_account_id=$1',[accountId]);
     const row=result.rows[0];
     return {role,account:{id:accountId},storage:await storageUsage(client,accountId,role),...(row?{classroom:{id:text(row.id),name:text(row.name),classCode:text(row.class_code),studentCount:num(row.student_count),createdAt:num(row.created_at)}}:{})};
    }
    return {role,account:{id:accountId},storage:await storageUsage(client,accountId,role)};
   });
  },
  async teacherUpgrade(accountId:string,code:string):Promise<'teacher'>{
   const row=await read(async client=>(await client.query('SELECT code_hash,paused FROM knolstory_class.teacher_codes WHERE id=1')).rows[0]);
   const valid=await verifySecret(code,row?text(row.code_hash):await decoyHash())&&row!==undefined;
   if(!valid)throw new ClassroomError(403,'INVALID_TEACHER_CODE');
   if(row.paused===true)throw new ClassroomError(403,'TEACHER_CODE_PAUSED');
   return transaction(async client=>{
    const account=await client.query("SELECT role FROM knolstory_auth.accounts WHERE id=$1 AND status='active' FOR UPDATE",[accountId]);
    const role=account.rows[0]?.role;
    if(role==='teacher')return 'teacher' as const;
    if(role!=='member')throw new ClassroomError(403,'ROLE_NOT_ALLOWED');
    await client.query("UPDATE knolstory_auth.accounts SET role='teacher' WHERE id=$1",[accountId]);
    return 'teacher' as const;
   });
  },
  async adminOverview():Promise<AdminOverview>{
   return read(async client=>{
    const code=(await client.query('SELECT updated_at FROM knolstory_class.teacher_codes WHERE id=1')).rows[0];
    // An account that runs a classroom counts as a teacher even when its role is member (an admin may run a class).
    const roles=(await client.query(`SELECT CASE WHEN a.role='member' AND EXISTS(SELECT 1 FROM knolstory_class.classrooms c WHERE c.teacher_account_id=a.id) THEN 'teacher' ELSE a.role END AS role,count(*)::int AS n
      FROM knolstory_auth.accounts a WHERE a.status='active' GROUP BY 1`)).rows;
    const count=(role:string)=>num(roles.find(row=>row.role===role)?.n??0);
    const rooms=(await client.query(`SELECT c.name,c.created_at,
      (SELECT count(*)::int FROM knolstory_class.students s WHERE s.classroom_id=c.id) AS students,
      (SELECT count(*)::int FROM knolstory_class.assignments a WHERE a.classroom_id=c.id) AS assignments,
      (SELECT count(*)::int FROM knolstory_class.assignments a WHERE a.classroom_id=c.id AND a.open) AS open_assignments,
      (SELECT count(*)::int FROM knolstory_class.missions m WHERE m.classroom_id=c.id) AS missions,
      (SELECT count(*)::int FROM knolstory_class.mission_progress p JOIN knolstory_class.missions m ON m.id=p.mission_id WHERE m.classroom_id=c.id AND p.review_status='passed') AS passed
      FROM knolstory_class.classrooms c ORDER BY c.created_at DESC LIMIT 200`)).rows;
    return {teacherCodeUpdatedAt:code?num(code.updated_at):null,accounts:{member:count('member'),teacher:count('teacher'),student:count('student')},
     classrooms:rooms.map(row=>({name:text(row.name),studentCount:num(row.students),assignmentCount:num(row.assignments),openAssignmentCount:num(row.open_assignments),missionCount:num(row.missions),passedMissionCount:num(row.passed),createdAt:num(row.created_at)}))};
   });
  },
  async teacherCodeUpdatedAt():Promise<number|null>{
   return read(async client=>{const row=(await client.query('SELECT updated_at FROM knolstory_class.teacher_codes WHERE id=1')).rows[0];return row?num(row.updated_at):null;});
  },
  teacherCode:readTeacherCode,

  /** One shared code: every member who knows it can become a teacher until the admin pauses or changes it. */
  async setTeacherCode(code:string):Promise<number>{
   const hash=await hashSecret(code),updatedAt=now();
   await transaction(client=>client.query(`INSERT INTO knolstory_class.teacher_codes(id,code_hash,code_cipher,updated_at) VALUES(1,$1,$2,$3)
    ON CONFLICT(id) DO UPDATE SET code_hash=EXCLUDED.code_hash,code_cipher=EXCLUDED.code_cipher,updated_at=EXCLUDED.updated_at`,[hash,encryptText(key,code,'teacher-code'),updatedAt]));
   return updatedAt;
  },
  async setTeacherCodePaused(paused:boolean):Promise<TeacherCodeView>{
   const result=await transaction(client=>client.query('UPDATE knolstory_class.teacher_codes SET paused=$1 WHERE id=1',[paused]));
   if(result.rowCount!==1)throw new ClassroomError(404,'TEACHER_CODE_NOT_SET');
   return readTeacherCode();
  },
  /** Overwrites the account's latest sign-in; nothing accumulates. */
  async recordLogin(accountId:string,method:LoginMethod):Promise<void>{
   await transaction(client=>client.query('UPDATE knolstory_auth.accounts SET last_login_at=$2,last_login_method=$3 WHERE id=$1',[accountId,now(),method]));
  },
  async adminAccess():Promise<AdminAccessRow[]>{
   return read(async client=>{
    const rows=(await client.query(`SELECT a.id,a.role,a.last_login_at,a.last_login_method,
      (SELECT i.provider FROM knolstory_auth.identities i WHERE i.account_id=a.id LIMIT 1) AS provider,
      coalesce(tc.name,sc.name) AS class_name,s.number AS student_number,(tc.id IS NOT NULL) AS owns_class
     FROM knolstory_auth.accounts a
     LEFT JOIN knolstory_class.classrooms tc ON tc.teacher_account_id=a.id
     LEFT JOIN knolstory_class.students s ON s.account_id=a.id
     LEFT JOIN knolstory_class.classrooms sc ON sc.id=s.classroom_id
     WHERE a.status='active'
     ORDER BY a.last_login_at DESC NULLS LAST,class_name NULLS LAST,student_number NULLS FIRST LIMIT 500`)).rows;
    const optional=<T,>(value:unknown,map:(value:unknown)=>T):T|null=>value===null||value===undefined?null:map(value);
    return rows.map(row=>{
     const id=text(row.id),admin=adminIds.has(id.toLowerCase());
     const role:AdminAccessRow['role']=admin?'admin':row.role==='student'?'student':row.role==='teacher'||row.owns_class===true?'teacher':'member';
     return {id,role,provider:optional(row.provider,text),className:optional(row.class_name,text),studentNumber:optional(row.student_number,num),
      lastLoginAt:optional(row.last_login_at,num),lastLoginMethod:optional(row.last_login_method,value=>text(value) as LoginMethod)};
    });
   });
  },

  async createClassroom(teacherId:string,name:string):Promise<ClassroomView>{
   return transaction(async client=>{
    // Serialise concurrent creation by the same teacher on the account row.
    await client.query('SELECT id FROM knolstory_auth.accounts WHERE id=$1 FOR UPDATE',[teacherId]);
    const existing=await client.query('SELECT 1 FROM knolstory_class.classrooms WHERE teacher_account_id=$1',[teacherId]);
    if(existing.rows[0])throw new ClassroomError(409,'CLASSROOM_EXISTS');
    for(let attempt=0;attempt<12;attempt++){
     const id=randomUUID();
     const inserted=await client.query('INSERT INTO knolstory_class.classrooms(id,teacher_account_id,name,class_code,default_permissions,created_at) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT DO NOTHING RETURNING id,name,class_code,default_permissions,created_at',
      [id,teacherId,name,generateClassCode(),JSON.stringify(ALLOW_ALL_PERMISSIONS),now()]);
     if(inserted.rows[0])return classroomView(client,inserted.rows[0]);
    }
    throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
   });
  },
  async getClassroom(teacherId:string):Promise<ClassroomView>{
   return read(async client=>classroomView(client,await teacherRoom(client,teacherId)));
  },
  async patchClassroom(teacherId:string,patch:Readonly<{name?:string;regenerateCode?:true;defaultPermissions?:EditingPermissions}>):Promise<ClassroomView>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true);
    if(patch.name!==undefined)await client.query('UPDATE knolstory_class.classrooms SET name=$2 WHERE id=$1',[room.id,patch.name]);
    if(patch.defaultPermissions!==undefined)await client.query('UPDATE knolstory_class.classrooms SET default_permissions=$2::jsonb WHERE id=$1',[room.id,JSON.stringify(patch.defaultPermissions)]);
    if(patch.regenerateCode)await freshClassCode(client,text(room.id));
    return classroomView(client,await teacherRoom(client,teacherId));
   });
  },
  async addStudents(teacherId:string,count:number):Promise<ClassroomView>{
   // Hashing happens before the transaction so row locks stay short.
   const fresh=await Promise.all(Array.from({length:count},async()=>{
    const id=randomUUID(),plain=generateStudentPassword();
    return {id,hash:await hashSecret(plain),cipher:encryptText(key,plain,id)};
   }));
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true);
    const used=new Set((await client.query('SELECT number FROM knolstory_class.students WHERE classroom_id=$1',[room.id])).rows.map(row=>num(row.number)));
    const free=Array.from({length:MAX_STUDENTS},(_,index)=>index+1).filter(number=>!used.has(number));
    if(free.length<count)throw new ClassroomError(409,'STUDENT_LIMIT');
    for(const [index,entry] of fresh.entries()){
     await client.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','student')",[entry.id]);
     await client.query("INSERT INTO knolstory_class.students(account_id,classroom_id,number,name,password_hash,password_cipher) VALUES($1,$2,$3,'',$4,$5)",[entry.id,room.id,free[index],entry.hash,entry.cipher]);
    }
    return classroomView(client,room);
   });
  },
  async patchStudent(teacherId:string,number:number,patch:Readonly<{name?:string;password?:string;permissions?:EditingPermissions|null}>):Promise<StudentView>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true),row=await studentRow(client,room.id,number),accountId=text(row.account_id);
    if(patch.name!==undefined)await client.query('UPDATE knolstory_class.students SET name=$2 WHERE account_id=$1',[accountId,patch.name]);
    if(patch.password!==undefined)await client.query('UPDATE knolstory_class.students SET password_hash=$2,password_cipher=$3 WHERE account_id=$1',[accountId,await hashSecret(patch.password),encryptText(key,patch.password,accountId)]);
    if(patch.permissions!==undefined)await client.query('UPDATE knolstory_class.students SET permissions=$2::jsonb WHERE account_id=$1',[accountId,patch.permissions===null?null:JSON.stringify(patch.permissions)]);
    const updated=await client.query(`SELECT ${STUDENT_COLUMNS} FROM knolstory_class.students WHERE account_id=$1`,[accountId]);
    return studentView(updated.rows[0]!,(await studentBytes(client,text(room.id))).get(accountId)??0);
   });
  },
  async setPermissions(teacherId:string,numbers:readonly number[],permissions:EditingPermissions|null):Promise<ClassroomView>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true);
    const updated=await client.query('UPDATE knolstory_class.students SET permissions=$3::jsonb WHERE classroom_id=$1 AND number=ANY($2::int[]) RETURNING number',[room.id,numbers,permissions===null?null:JSON.stringify(permissions)]);
    if(updated.rows.length!==numbers.length)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    return classroomView(client,room);
   });
  },
  async deleteStudent(teacherId:string,number:number):Promise<ClassroomView>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true),row=await studentRow(client,room.id,number),accountId=text(row.account_id);
    await client.query('DELETE FROM knolstory_class.students WHERE account_id=$1',[accountId]);
    await client.query('UPDATE knolstory_auth.sessions SET revoked=true WHERE account_id=$1',[accountId]);
    await client.query("UPDATE knolstory_auth.accounts SET status='deleted' WHERE id=$1",[accountId]);
    return classroomView(client,room);
   });
  },
  async issueQr(teacherId:string,number:number):Promise<{url:string}>{
   const issued=generateQrToken();
   await transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true),row=await studentRow(client,room.id,number);
    await client.query('UPDATE knolstory_class.students SET qr_token_hash=$2,qr_token_cipher=$3 WHERE account_id=$1',[row.account_id,issued.hash,encryptText(key,issued.token,`qr:${text(row.account_id)}`)]);
   });
   return {url:`${options.origin}/?q=${issued.token}`};
  },
  /** Reprinting keeps recoverable tokens stable. Legacy hash-only cards require an explicit reissue. */
  async prepareQrPrint(teacherId:string,numbers:number[],replaceExisting=false):Promise<QrPrintView>{
   if(!Array.isArray(numbers)||numbers.length<1||numbers.length>MAX_STUDENTS||new Set(numbers).size!==numbers.length||numbers.some(value=>!Number.isInteger(value)||value<1||value>MAX_STUDENTS)||typeof replaceExisting!=='boolean')throw new ClassroomError(400,'INVALID_REQUEST');
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true);
    const result=await client.query('SELECT account_id,number,name,qr_token_hash,qr_token_cipher FROM knolstory_class.students WHERE classroom_id=$1 AND number=ANY($2::int[]) ORDER BY number FOR UPDATE',[room.id,numbers]);
    if(result.rows.length!==numbers.length)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    if(!replaceExisting&&result.rows.some(row=>row.qr_token_hash!==null&&row.qr_token_cipher===null))throw new ClassroomError(409,'QR_REISSUE_REQUIRED');
    const prepared=result.rows.map(row=>{
     const accountId=text(row.account_id);
     if(row.qr_token_hash===null&&row.qr_token_cipher!==null)throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
     if(row.qr_token_cipher!==null){
      let token:string;
      try{token=decryptText(key,text(row.qr_token_cipher),`qr:${accountId}`);}catch{throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');}
      if(!validQrToken(token)||hashQrToken(token)!==row.qr_token_hash)throw new ClassroomError(503,'CLASSROOM_UNAVAILABLE');
      return {row,accountId,token,issued:null};
     }
     const issued=generateQrToken();return {row,accountId,token:issued.token,issued};
    });
    for(const card of prepared){if(card.issued)await client.query('UPDATE knolstory_class.students SET qr_token_hash=$2,qr_token_cipher=$3 WHERE account_id=$1',[card.accountId,card.issued.hash,encryptText(key,card.token,`qr:${card.accountId}`)]);}
    return {className:text(room.name),classCode:text(room.class_code),cards:prepared.map(card=>({number:num(card.row.number),name:text(card.row.name),url:`${options.origin}/?q=${card.token}`}))};
   });
  },
  /** Returns the student account id, or null for any mismatch (unknown class, number, password or inactive account). */
  async verifyStudentLogin(classCode:string,number:number,secret:string):Promise<string|null>{
   const row=await read(async client=>(await client.query("SELECT s.account_id,s.password_hash FROM knolstory_class.students s JOIN knolstory_class.classrooms c ON c.id=s.classroom_id JOIN knolstory_auth.accounts a ON a.id=s.account_id WHERE c.class_code=$1 AND s.number=$2 AND a.status='active'",[classCode,number])).rows[0]);
   const ok=await verifySecret(secret,row?text(row.password_hash):await decoyHash());
   return row&&ok?text(row.account_id):null;
  },
  async verifyQrToken(token:string):Promise<string|null>{
   const row=await read(async client=>(await client.query("SELECT s.account_id FROM knolstory_class.students s JOIN knolstory_auth.accounts a ON a.id=s.account_id WHERE s.qr_token_hash=$1 AND a.status='active'",[hashQrToken(token)])).rows[0]);
   return row?text(row.account_id):null;
  },
  async listAssignments(accountId:string,role:Role):Promise<AssignmentView[]>{
   return read(async client=>{
    if(role==='student'){
     const context=await studentContext(client,accountId);
     const result=await client.query(`SELECT a.id,a.title,a.description,a.story_key,a.format,a.open,a.created_at,a.share_url,a.due_at,a.edition,a.start_point,a.start_label,a.template_title,a.checks,a.target_amount,${STAGE_COLUMNS},(SELECT ps.review_status='passed' FROM knolstory_class.submissions ps WHERE ps.assignment_id=a.after_assignment_id AND ps.student_account_id=$2) AS after_passed,s.submitted_at,s.review_status,s.feedback,dr.saved_at AS draft_saved_at,dr.comment AS draft_comment,dr.commented_at AS draft_commented_at FROM knolstory_class.assignments a
      LEFT JOIN knolstory_class.submissions s ON s.assignment_id=a.id AND s.student_account_id=$2
      LEFT JOIN knolstory_class.submission_drafts dr ON dr.assignment_id=a.id AND dr.student_account_id=$2 WHERE a.classroom_id=$1 AND ${forStudentSql('a','$2')} ORDER BY a.created_at DESC,a.id`,[context.classroom_id,accountId]);
     return result.rows.map(row=>({...assignment(row,true),reviewStatus:row.review_status==='passed'||row.review_status==='revise'?row.review_status:null,feedback:typeof row.feedback==='string'?row.feedback:'',draftSavedAt:row.draft_saved_at===null||row.draft_saved_at===undefined?null:num(row.draft_saved_at),draftComment:typeof row.draft_comment==='string'?row.draft_comment:'',draftCommentedAt:row.draft_commented_at===null||row.draft_commented_at===undefined?null:num(row.draft_commented_at)}));
    }
    const room=await teacherRoom(client,accountId);
    const result=await client.query(`SELECT a.id,a.title,a.description,a.story_key,a.format,a.open,a.created_at,a.share_url,a.due_at,a.edition,a.start_point,a.start_label,a.template_title,a.checks,a.target_amount,${STAGE_COLUMNS},
      (SELECT count(*)::int FROM knolstory_class.submissions s WHERE s.assignment_id=a.id) AS submitted_count,
      (SELECT count(*)::int FROM knolstory_class.submissions s WHERE s.assignment_id=a.id AND s.review_status='passed') AS passed_count,
      (SELECT count(*)::int FROM knolstory_class.submission_drafts d WHERE d.assignment_id=a.id) AS draft_count,
      ${recipientNumbersSql('a')}
     FROM knolstory_class.assignments a WHERE a.classroom_id=$1 ORDER BY a.created_at DESC,a.id`,[room.id]);
    return result.rows.map(row=>({...assignment(row,false),submittedCount:num(row.submitted_count),passedCount:num(row.passed_count),draftCount:num(row.draft_count)}));
   });
  },
  async createAssignment(teacherId:string,input:Readonly<{title:string;description:string;storyKey:string|null;format?:AssignmentFormat;shareUrl?:string|null;dueAt?:number|null;edition?:'original'|'knolstory'|null;startPoint?:string|null;startLabel?:string|null;recipients?:readonly number[]|null;checks?:readonly string[];targetAmount?:number|null;editScope?:EditScope|null;afterAssignmentId?:string|null}>):Promise<AssignmentView>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true),recipients=await recipientIds(client,room.id,input.recipients??null);
    // Each work task holds one work per student, so their number is bounded; old ones are deleted to make room.
    const tasks=num((await client.query('SELECT count(*) AS n FROM knolstory_class.assignments WHERE classroom_id=$1 AND created_at>=$2',[room.id,schoolYearStart(now())])).rows[0]?.n);
    if(tasks>=STORAGE_LIMITS.workTasks)throw new ClassroomError(409,'ASSIGNMENT_LIMIT');
    const result=await client.query(`INSERT INTO knolstory_class.assignments AS a(id,classroom_id,title,description,story_key,format,open,created_at,share_url,due_at,edition,start_point,start_label,recipient_ids) VALUES($1,$2,$3,$4,$5,$7,true,$6,$8,$9,$10,$11,$12,$13::uuid[]) RETURNING a.id,a.title,a.description,a.story_key,a.format,a.open,a.created_at,a.share_url,a.due_at,a.edition,a.start_point,a.start_label,a.template_title,a.checks,a.target_amount,${STAGE_COLUMNS},${recipientNumbersSql('a')},a.recipient_ids`,
     [randomUUID(),room.id,input.title,input.description,input.storyKey,now(),assignmentFormat(input.format===undefined?'knolstory':input.format),input.shareUrl??null,input.dueAt??null,input.storyKey?input.edition??null:null,input.storyKey&&input.startPoint?input.startPoint:null,input.storyKey&&input.startPoint?input.startLabel??null:null,recipients]);
    const made=result.rows[0]!;
    if(input.checks?.length||input.targetAmount){await client.query('UPDATE knolstory_class.assignments SET checks=$2::jsonb,target_amount=$3 WHERE id=$1',[made.id,JSON.stringify(input.checks??[]),input.targetAmount??null]);made.checks=input.checks??[];made.target_amount=input.targetAmount??null;}
    if(input.afterAssignmentId){
     // Only a ShortStory task of this classroom and school year can open a KnolStory task.
     const earlier=(await client.query('SELECT id,title,format,created_at,recipient_ids FROM knolstory_class.assignments WHERE id=$1 AND classroom_id=$2',[input.afterAssignmentId,room.id])).rows[0];
     if(!earlier)throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
     if(earlier.format!=='shortstory'||made.format!=='knolstory'||num(earlier.created_at)<schoolYearStart(now()))throw new ClassroomError(422,'STAGE_NOT_ALLOWED');
     if(!stageRecipientsFit(earlier.recipient_ids,made.recipient_ids))throw new ClassroomError(422,'STAGE_RECIPIENTS');
     await client.query('UPDATE knolstory_class.assignments SET after_assignment_id=$2 WHERE id=$1',[made.id,earlier.id]);made.after_assignment_id=earlier.id;made.after_title=earlier.title;
    }
    if(input.editScope){await client.query('UPDATE knolstory_class.assignments SET edit_scope=$2::jsonb WHERE id=$1',[made.id,JSON.stringify(input.editScope)]);made.edit_scope=input.editScope;}
    return assignment(made,false);
   });
  },
  /** Deletes a work task and every submission in it (frees their space). */
  async deleteAssignment(teacherId:string,id:string):Promise<{deleted:true;submissions:number}>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true);await teacherAssignment(client,room.id,id,true);
    const removed=await client.query('DELETE FROM knolstory_class.submissions WHERE assignment_id=$1',[id]);
    await client.query('DELETE FROM knolstory_class.assignments WHERE id=$1 AND classroom_id=$2',[id,room.id]);
    return {deleted:true as const,submissions:removed.rowCount??0};
   });
  },
  async patchAssignment(teacherId:string,id:string,patch:Readonly<{title?:string;description?:string;open?:boolean;shareUrl?:string|null;dueAt?:number|null;recipients?:readonly number[]|null;checks?:readonly string[];targetAmount?:number|null;editScope?:EditScope|null}>):Promise<AssignmentView>{
   return transaction(async client=>{
    // Changing who gets a task is checked against its stages under the classroom lock, like creating one, so two tabs cannot both pass.
    const room=await teacherRoom(client,teacherId,patch.recipients!==undefined),current=await teacherAssignment(client,room.id,id,true);
    if(patch.editScope!==undefined)await client.query('UPDATE knolstory_class.assignments SET edit_scope=$2::jsonb WHERE id=$1',[id,patch.editScope===null?null:JSON.stringify(patch.editScope)]);
    if(patch.checks!==undefined)await client.query('UPDATE knolstory_class.assignments SET checks=$2::jsonb WHERE id=$1',[id,JSON.stringify(patch.checks)]);
    if(patch.targetAmount!==undefined)await client.query('UPDATE knolstory_class.assignments SET target_amount=$2 WHERE id=$1',[id,patch.targetAmount]);
    const recipients=patch.recipients===undefined?current.recipient_ids??null:await recipientIds(client,room.id,patch.recipients);
    if(patch.recipients!==undefined)await assertStageRecipients(client,id,recipients);
    const result=await client.query(`UPDATE knolstory_class.assignments AS a SET title=$2,description=$3,open=$4,share_url=$5,due_at=$6,recipient_ids=$7::uuid[] WHERE a.id=$1 RETURNING a.id,a.title,a.description,a.story_key,a.format,a.open,a.created_at,a.share_url,a.due_at,a.edition,a.start_point,a.start_label,a.template_title,a.checks,a.target_amount,${STAGE_COLUMNS},${recipientNumbersSql('a')}`,
     [id,patch.title??current.title,patch.description??current.description,patch.open??current.open,patch.shareUrl===undefined?current.share_url??null:patch.shareUrl,patch.dueAt===undefined?current.due_at??null:patch.dueAt,recipients]);
    return assignment(result.rows[0]!,false);
   });
  },
  async listSubmissions(teacherId:string,id:string):Promise<SubmissionRow[]>{
   return read(async client=>{
    const room=await teacherRoom(client,teacherId);await teacherAssignment(client,room.id,id);
    const result=await client.query('SELECT st.number,st.name,sub.submitted_at,sub.review_status,sub.feedback,sub.reviewed_at FROM knolstory_class.submissions sub JOIN knolstory_class.students st ON st.account_id=sub.student_account_id WHERE sub.assignment_id=$1 AND st.classroom_id=$2 ORDER BY st.number',[id,room.id]);
    return result.rows.map(submissionRow);
   });
  },
  /** Pass, ask for a rewrite (feedback required), or clear. `expectedSubmittedAt` is the version the teacher read. */
  async reviewSubmission(teacherId:string,id:string,number:number,value:unknown):Promise<SubmissionRow>{
   if(!Number.isInteger(number)||number<1||number>30)throw new ClassroomError(400,'INVALID_REQUEST');
   const input=missionReview(value);
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId);await teacherAssignment(client,room.id,id,true);
    const student=(await client.query('SELECT account_id,number,name FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2',[room.id,number])).rows[0];
    if(!student)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    const current=(await client.query('SELECT submitted_at FROM knolstory_class.submissions WHERE assignment_id=$1 AND student_account_id=$2 FOR UPDATE',[id,student.account_id])).rows[0];
    if(!current)throw new ClassroomError(404,'SUBMISSION_NOT_FOUND');
    if(num(current.submitted_at)!==input.expectedSubmittedAt)throw new ClassroomError(409,'SUBMISSION_CHANGED');
    const result=await client.query('UPDATE knolstory_class.submissions SET review_status=$3,feedback=$4,reviewed_at=$5 WHERE assignment_id=$1 AND student_account_id=$2 RETURNING submitted_at,review_status,feedback,reviewed_at',
     [id,student.account_id,input.reviewStatus,input.reviewStatus===null?'':input.feedback,input.reviewStatus===null?null:now()]);
    return submissionRow({...result.rows[0],number:student.number,name:student.name});
   });
  },
  async readSubmissionFor(teacherId:string,id:string,number:number):Promise<{document:unknown;submittedAt:number}>{
   return read(async client=>{
    const room=await teacherRoom(client,teacherId);await teacherAssignment(client,room.id,id);
    const student=await client.query('SELECT account_id FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2',[room.id,number]);
    if(!student.rows[0])throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    const result=await client.query('SELECT document,submitted_at FROM knolstory_class.submissions WHERE assignment_id=$1 AND student_account_id=$2',[id,student.rows[0].account_id]);
    if(!result.rows[0])throw new ClassroomError(404,'SUBMISSION_NOT_FOUND');
    return {document:result.rows[0].document,submittedAt:num(result.rows[0].submitted_at)};
   });
  },
  /** Attaches, replaces (document) or removes (null) the work students start this task from. */
  async setTemplate(teacherId:string,id:string,document:unknown):Promise<{template:{title:string}|null}>{
   let snapshot:Awaited<ReturnType<typeof checkedSnapshot>>|null=null;
   if(document!==null){
    try{snapshot=await checkedSnapshot(document);}
    catch(error){if(error instanceof DocumentServiceError)throw new ClassroomError(error.status===422?422:400,'INVALID_DOCUMENT');throw error;}
   }
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId,true),current=await teacherAssignment(client,room.id,id,true);
    if(!snapshot){await client.query('UPDATE knolstory_class.assignments SET template=NULL,template_title=NULL,template_byte_length=0 WHERE id=$1',[id]);return {template:null};}
    if(snapshot.content.format!==assignmentFormat(current.format))throw new ClassroomError(422,'ASSIGNMENT_FORMAT_MISMATCH');
    const bytes=uploadBytes(snapshot),previous=num((await client.query('SELECT template_byte_length FROM knolstory_class.assignments WHERE id=$1',[id])).rows[0]?.template_byte_length);
    const room_=await assertCanStoreTemplate(client,text(room.id),bytes-previous,bytes);
    if(room_==='work-too-large')throw new ClassroomError(413,'WORK_TOO_LARGE');
    if(room_==='classroom-full')throw new ClassroomError(409,'CLASSROOM_STORAGE_FULL');
    const title=snapshotTitle(snapshot).slice(0,400);
    await client.query('UPDATE knolstory_class.assignments SET template=$2::jsonb,template_title=$3,template_byte_length=$4 WHERE id=$1',[id,JSON.stringify(snapshot),title,bytes]);
    return {template:{title}};
   });
  },
  /** The template, for the teacher or for a student the task is open to. */
  async readTemplate(accountId:string,role:Role,id:string):Promise<{document:unknown}>{
   return read(async client=>{
    let row;
    if(role==='student'){
     const context=await studentContext(client,accountId);
     row=(await client.query(`SELECT a.template,a.open FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2 AND ${forStudentSql('a','$3')}`,[id,context.classroom_id,accountId])).rows[0];
     if(row&&row.open!==true)throw new ClassroomError(409,'ASSIGNMENT_CLOSED');
    }else{
     const room=await teacherRoom(client,accountId);
     row=(await client.query('SELECT a.template FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2',[id,room.id])).rows[0];
    }
    if(!row)throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
    if(!row.template)throw new ClassroomError(404,'TEMPLATE_NOT_FOUND');
    return {document:row.template};
   });
  },
  /** A mid-way copy the student chooses to show the teacher. Uses the submission space; no review. */
  async saveDraft(accountId:string,id:string,document:unknown,written?:{amount:number;chars:number}):Promise<{savedAt:number}>{
   let snapshot;
   try{snapshot=await checkedSnapshot(document);}
   catch(error){if(error instanceof DocumentServiceError)throw new ClassroomError(error.status===422?422:400,'INVALID_DOCUMENT');throw error;}
   return transaction(async client=>{
    const context=await studentContext(client,accountId);
    const target=await client.query(`SELECT a.open,a.format,a.created_at,a.after_assignment_id FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2 AND ${forStudentSql('a','$3')} FOR SHARE`,[id,context.classroom_id,accountId]);
    if(!target.rows[0])throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
    if(num(target.rows[0].created_at)<schoolYearStart(now()))throw new ClassroomError(409,'SEASON_ARCHIVED');
    if(target.rows[0].open!==true)throw new ClassroomError(409,'ASSIGNMENT_CLOSED');
    await assertStageOpen(client,target.rows[0].after_assignment_id,accountId);
    if(snapshot.content.format!==assignmentFormat(target.rows[0].format))throw new ClassroomError(422,'ASSIGNMENT_FORMAT_MISMATCH');
    try{await assertStudentTitle(client,accountId,snapshot);}catch{throw new ClassroomError(422,'STUDENT_NUMBER_TITLE');}
    const bytes=uploadBytes(snapshot),previous=await client.query('SELECT byte_length FROM knolstory_class.submission_drafts WHERE assignment_id=$1 AND student_account_id=$2',[id,accountId]);
    const room=await assertCanSubmit(client,text(context.classroom_id),accountId,bytes-Number(previous.rows[0]?.byte_length??0),bytes);
    if(room==='work-too-large')throw new ClassroomError(413,'WORK_TOO_LARGE');
    if(room==='student-full')throw new ClassroomError(409,'SUBMISSION_STORAGE_FULL');
    if(room==='classroom-full')throw new ClassroomError(409,'CLASSROOM_STORAGE_FULL');
    const savedAt=now(),{amount,chars}=ownAmount(workAmount(snapshot),written);
    await client.query(`INSERT INTO knolstory_class.submission_drafts(assignment_id,student_account_id,document,byte_length,amount,chars,saved_at) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)
     ON CONFLICT(assignment_id,student_account_id) DO UPDATE SET document=EXCLUDED.document,byte_length=EXCLUDED.byte_length,amount=EXCLUDED.amount,chars=EXCLUDED.chars,saved_at=EXCLUDED.saved_at`,[id,accountId,JSON.stringify(snapshot),bytes,amount,chars,savedAt]);
    return {savedAt};
   });
  },
  async readOwnDraft(accountId:string,id:string):Promise<{document:unknown;savedAt:number;comment:string;commentedAt:number|null}>{
   return read(async client=>{
    const context=await studentContext(client,accountId);
    const found=await client.query(`SELECT 1 FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2 AND ${forStudentSql('a','$3')}`,[id,context.classroom_id,accountId]);
    if(!found.rows[0])throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
    const row=(await client.query('SELECT document,saved_at,comment,commented_at FROM knolstory_class.submission_drafts WHERE assignment_id=$1 AND student_account_id=$2',[id,accountId])).rows[0];
    if(!row)throw new ClassroomError(404,'DRAFT_NOT_FOUND');
    return {document:row.document,savedAt:num(row.saved_at),comment:text(row.comment),commentedAt:row.commented_at===null?null:num(row.commented_at)};
   });
  },
  /** Every student the task is for, with their mid-way draft and final hand-in at a glance. */
  async assignmentProgress(teacherId:string,id:string):Promise<ProgressRow[]>{
   return read(async client=>{
    const room=await teacherRoom(client,teacherId),task=await teacherAssignment(client,room.id,id);
    const result=await client.query(`SELECT st.number,st.name,
      dr.saved_at AS draft_saved_at,dr.amount AS draft_amount,dr.chars AS draft_chars,dr.comment AS draft_comment,
      sub.submitted_at,sub.amount AS sub_amount,sub.chars AS sub_chars,sub.review_status
     FROM knolstory_class.students st
     LEFT JOIN knolstory_class.submission_drafts dr ON dr.assignment_id=$2 AND dr.student_account_id=st.account_id
     LEFT JOIN knolstory_class.submissions sub ON sub.assignment_id=$2 AND sub.student_account_id=st.account_id
     WHERE st.classroom_id=$1 AND ($3::uuid[] IS NULL OR st.account_id=ANY($3::uuid[])) ORDER BY st.number`,[room.id,id,task.recipient_ids??null]);
    return result.rows.map(row=>({number:num(row.number),name:text(row.name),
     draft:row.draft_saved_at===null?null:{savedAt:num(row.draft_saved_at),amount:num(row.draft_amount),chars:num(row.draft_chars),comment:text(row.draft_comment)},
     submission:row.submitted_at===null?null:{submittedAt:num(row.submitted_at),amount:num(row.sub_amount),chars:num(row.sub_chars),reviewStatus:row.review_status==='passed'||row.review_status==='revise'?row.review_status:null}}));
   });
  },
  async readDraftFor(teacherId:string,id:string,number:number):Promise<{document:unknown;savedAt:number}>{
   return read(async client=>{
    const room=await teacherRoom(client,teacherId);await teacherAssignment(client,room.id,id);
    const student=(await client.query('SELECT account_id FROM knolstory_class.students WHERE classroom_id=$1 AND number=$2',[room.id,number])).rows[0];
    if(!student)throw new ClassroomError(404,'STUDENT_NOT_FOUND');
    const row=(await client.query('SELECT document,saved_at FROM knolstory_class.submission_drafts WHERE assignment_id=$1 AND student_account_id=$2',[id,student.account_id])).rows[0];
    if(!row)throw new ClassroomError(404,'DRAFT_NOT_FOUND');
    return {document:row.document,savedAt:num(row.saved_at)};
   });
  },
  /** A short teacher note on a mid-way draft; empty clears it. */
  async commentDraft(teacherId:string,id:string,number:number,comment:string):Promise<{comment:string;commentedAt:number|null}>{
   return transaction(async client=>{
    const room=await teacherRoom(client,teacherId);await teacherAssignment(client,room.id,id,true);
    const student=await studentRow(client,room.id,number),at=comment?now():null;
    const result=await client.query('UPDATE knolstory_class.submission_drafts SET comment=$3,commented_at=$4 WHERE assignment_id=$1 AND student_account_id=$2 RETURNING comment',[id,student.account_id,comment,at]);
    if(!result.rows[0])throw new ClassroomError(404,'DRAFT_NOT_FOUND');
    return {comment,commentedAt:at};
   });
  },
  async readOwnSubmission(accountId:string,id:string):Promise<{document:unknown;submittedAt:number}>{
   return read(async client=>{
    const context=await studentContext(client,accountId);
    const found=await client.query(`SELECT 1 FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2 AND ${forStudentSql('a','$3')}`,[id,context.classroom_id,accountId]);
    if(!found.rows[0])throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
    const result=await client.query('SELECT document,submitted_at FROM knolstory_class.submissions WHERE assignment_id=$1 AND student_account_id=$2',[id,accountId]);
    if(!result.rows[0])throw new ClassroomError(404,'SUBMISSION_NOT_FOUND');
    return {document:result.rows[0].document,submittedAt:num(result.rows[0].submitted_at)};
   });
  },
  async submit(accountId:string,id:string,document:unknown,written?:{amount:number;chars:number}):Promise<{submittedAt:number}>{
   let snapshot;
   try{snapshot=await checkedSnapshot(document);}
   catch(error){
    if(error instanceof DocumentServiceError)throw new ClassroomError(error.status===422?422:400,'INVALID_DOCUMENT');
    throw error;
   }
   return transaction(async client=>{
    const context=await studentContext(client,accountId);
    const target=await client.query(`SELECT a.open,a.format,a.created_at,a.after_assignment_id FROM knolstory_class.assignments a WHERE a.id=$1 AND a.classroom_id=$2 AND ${forStudentSql('a','$3')} FOR SHARE`,[id,context.classroom_id,accountId]);
    if(!target.rows[0])throw new ClassroomError(404,'ASSIGNMENT_NOT_FOUND');
    if(num(target.rows[0].created_at)<schoolYearStart(now()))throw new ClassroomError(409,'SEASON_ARCHIVED');
    if(target.rows[0].open!==true)throw new ClassroomError(409,'ASSIGNMENT_CLOSED');
    await assertStageOpen(client,target.rows[0].after_assignment_id,accountId);
    if(snapshot.content.format!==assignmentFormat(target.rows[0].format))throw new ClassroomError(422,'ASSIGNMENT_FORMAT_MISMATCH');
    try{await assertStudentTitle(client,accountId,snapshot);}catch{throw new ClassroomError(422,'STUDENT_NUMBER_TITLE');}
    // Homework is refused only for one oversized work or a pool already far past its limit.
    const bytes=uploadBytes(snapshot),previous=await client.query('SELECT byte_length,review_status FROM knolstory_class.submissions WHERE assignment_id=$1 AND student_account_id=$2',[id,accountId]);
    // A passed work is what the next stage is built from; replacing it would silently undo the teacher's pass.
    if(previous.rows[0]?.review_status==='passed')throw new ClassroomError(409,'SUBMISSION_PASSED');
    const room=await assertCanSubmit(client,text(context.classroom_id),accountId,bytes-Number(previous.rows[0]?.byte_length??0),bytes);
    if(room==='work-too-large')throw new ClassroomError(413,'WORK_TOO_LARGE');
    if(room==='student-full')throw new ClassroomError(409,'SUBMISSION_STORAGE_FULL');
    if(room==='classroom-full')throw new ClassroomError(409,'CLASSROOM_STORAGE_FULL');
    const submittedAt=now();
    const {amount,chars}=ownAmount(workAmount(snapshot),written);
    // The pass is checked again in the write itself (no extra row lock, so the capacity lock stays the only one taken first).
    const saved=await client.query(`INSERT INTO knolstory_class.submissions AS s(assignment_id,student_account_id,document,submitted_at,byte_length,amount,chars) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7)
     ON CONFLICT(assignment_id,student_account_id) DO UPDATE SET document=EXCLUDED.document,submitted_at=EXCLUDED.submitted_at,byte_length=EXCLUDED.byte_length,amount=EXCLUDED.amount,chars=EXCLUDED.chars,review_status=NULL
     WHERE s.review_status IS DISTINCT FROM 'passed'`,[id,accountId,JSON.stringify(snapshot),submittedAt,bytes,amount,chars]);
    if(!saved.rowCount)throw new ClassroomError(409,'SUBMISSION_PASSED');
    return {submittedAt};
   });
  },
 };
}
/** Every student of a KnolStory stage must also get the ShortStory task it follows, or that student stays locked out for good. */
function stageRecipientsFit(earlier:unknown,later:unknown):boolean{
 if(!Array.isArray(earlier))return true;if(!Array.isArray(later))return false;
 const allowed=new Set(earlier);return later.every(id=>allowed.has(id));
}
async function assertStageRecipients(client:SqlClient,id:string,recipients:unknown):Promise<void>{
 const before=(await client.query('SELECT e.recipient_ids FROM knolstory_class.assignments a JOIN knolstory_class.assignments e ON e.id=a.after_assignment_id WHERE a.id=$1',[id])).rows[0];
 if(before&&!stageRecipientsFit(before.recipient_ids,recipients))throw new ClassroomError(422,'STAGE_RECIPIENTS');
 const after=await client.query('SELECT recipient_ids FROM knolstory_class.assignments WHERE after_assignment_id=$1',[id]);
 if(after.rows.some(row=>!stageRecipientsFit(recipients,row.recipient_ids)))throw new ClassroomError(422,'STAGE_RECIPIENTS');
}

export type ClassroomService=ReturnType<typeof createClassroomService>;
