import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {createAuthStateService} from '../auth/auth-state';
import {createPostgresAuthStatePort} from '../auth/postgres-auth-state';
import {runStorageMigrations} from '../migrations/runner';
import {createClassroomService} from '../classroom/service';
import {ClassroomError} from '../classroom/errors';
import {createDocumentService,DocumentServiceError,type DocumentContext} from './service';
import {assertCanStore,STORAGE_LIMITS,type StorageRole} from './quota';

const pool=new Pool({max:12}),now=Date.now(),MB=1024*1024;
const documents=createDocumentService(pool,{clock:()=>now});
const classroom=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
const auth=createAuthStateService({origin:'https://knolstory.example',flowTtlMs:60000,sessionTtlMs:60000,csrfSecret:'s'.repeat(32)},createPostgresAuthStatePort(pool),()=>now);
async function account(role:'member'|'teacher'){const id=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active',$2)",[id,role]);return id;}
async function context(accountId:string,role:StorageRole):Promise<DocumentContext>{return {accountId,role,token:(await auth.issueSession(accountId)).token};}
const snapshot=async()=>prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));
const create=async(user:DocumentContext)=>documents.create(user,{payloadVersion:1,snapshot:await snapshot(),idempotencyKey:randomUUID()});
async function code(action:Promise<unknown>){try{await action;}catch(error){if(error instanceof DocumentServiceError||error instanceof ClassroomError)return error.code;throw error;}return 'ok';}
async function inflate(accountId:string,bytes:number){await pool.query('UPDATE knolstory_storage.private_documents SET byte_length=$2 WHERE record_id=(SELECT record_id FROM knolstory_storage.private_documents WHERE owner_account_id=$1 LIMIT 1)',[accountId,bytes]);}
async function classWithStudent(){
 const teacher=await account('teacher'),room=await classroom.createClassroom(teacher,'용량반'),made=await classroom.addStudents(teacher,2);
 const students=await Promise.all(made.students.map(student=>classroom.verifyStudentLogin(room.classCode,student.number,student.password)));
 return {teacher,students:students as string[]};
}

describe('real PostgreSQL online storage limits',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('allows five works to a member, records sizes, and refuses a sixth or a full allowance',async()=>{
  const user=await context(await account('member'),'member');
  for(let i=0;i<5;i++)await create(user);
  expect(await code(create(user))).toBe('WORK_LIMIT_REACHED');
  const sizes=(await pool.query('SELECT byte_length FROM knolstory_storage.private_documents WHERE owner_account_id=$1',[user.accountId])).rows.map(row=>Number(row.byte_length));
  expect(sizes.every(size=>size>100&&size<STORAGE_LIMITS.workBytes)).toBe(true);
  const other=await context(await account('member'),'member');await create(other);await inflate(other.accountId,30*MB-10);
  expect(await code(create(other))).toBe('ACCOUNT_STORAGE_FULL');
  const usage=(await classroom.me(other.accountId,'member')).storage!;
  expect(usage).toMatchObject({works:1,worksLimit:5,bytes:30*MB-10,bytesLimit:30*MB,workBytesLimit:16*MB});
 });
 it('counts works in the online trash until they are purged',async()=>{
  const user=await context(await account('member'),'member');
  const made=[];for(let i=0;i<5;i++)made.push(await create(user));
  await pool.query('UPDATE knolstory_storage.private_documents SET deleted_at=$2 WHERE record_id=$1',[made[0]!.recordId,now]);
  expect(await code(create(user))).toBe('WORK_LIMIT_REACHED');
  // Leave no trash behind: the purge test counts every expired row in the shared database.
  await pool.query('UPDATE knolstory_storage.private_documents SET deleted_at=NULL WHERE record_id=$1',[made[0]!.recordId]);
 });
 it('lets students keep five works and shares one pool with the teacher',async()=>{
  const {teacher,students}=await classWithStudent(),student=await context(students[0]!,'student');
  for(let i=0;i<5;i++)await create(student);
  expect(await code(create(student))).toBe('WORK_LIMIT_REACHED');
  const teacherUser=await context(teacher,'teacher');await create(teacherUser);await inflate(teacher,STORAGE_LIMITS.classroomBytes-1000);
  const second=await context(students[1]!,'student');
  expect(await code(create(second))).toBe('CLASSROOM_STORAGE_FULL');
  const me=await classroom.me(students[1]!,'student');
  expect(me.storage!.classroom).toEqual({bytes:expect.any(Number),limit:300*MB});
  expect(me.storage!.classroom!.bytes).toBeGreaterThan(300*MB-1000);
  expect(me.storage!.bytesLimit).toBe(10*MB);
  const view=await classroom.getClassroom(teacher);
  expect(view.storage).toMatchObject({limit:300*MB,studentLimit:10*MB});
  expect(view.students.find(s=>s.number===1)!.storageBytes).toBeGreaterThan(0);
  expect(view.students.find(s=>s.number===2)!.storageBytes).toBe(0);
 });
 it('still accepts homework past a full pool, up to the overflow ceiling',async()=>{
  const {teacher,students}=await classWithStudent();
  const task=await classroom.createAssignment(teacher,{title:'숏스토리 과제',description:'',storyKey:null,format:'shortstory'});
  await create(await context(teacher,'teacher'));await inflate(teacher,300*MB);
  expect(await code(classroom.submit(students[0]!,task.id,await snapshot()))).toBe('ok');
  await inflate(teacher,400*MB);
  expect(await code(classroom.submit(students[1]!,task.id,await snapshot()))).toBe('CLASSROOM_STORAGE_FULL');
  // Re-submitting the same size adds nothing, so it is still accepted.
  expect(await code(classroom.submit(students[0]!,task.id,await snapshot()))).toBe('ok');
  const size=(await pool.query('SELECT byte_length FROM knolstory_class.submissions WHERE assignment_id=$1',[task.id])).rows[0];
  expect(Number(size.byte_length)).toBeGreaterThan(100);
 });
 it('accepts homework past a student\'s 10MB but never past the 20MB ceiling',async()=>{
  const {teacher,students}=await classWithStudent();
  const task=await classroom.createAssignment(teacher,{title:'숏스토리 과제',description:'',storyKey:null,format:'shortstory'});
  const student=await context(students[0]!,'student');await create(student);
  await inflate(students[0]!,12*MB);
  expect(await code(classroom.submit(students[0]!,task.id,await snapshot()))).toBe('ok');
  expect(await code(create(student))).toBe('ACCOUNT_STORAGE_FULL');
  await inflate(students[0]!,20*MB);
  const other=await classroom.createAssignment(teacher,{title:'둘째 과제',description:'',storyKey:null,format:'shortstory'});
  expect(await code(classroom.submit(students[0]!,other.id,await snapshot()))).toBe('STUDENT_STORAGE_FULL');
 });
 it('allows twenty work tasks per class and frees a slot and its space when one is deleted',async()=>{
  const {teacher,students}=await classWithStudent();
  const made=[];for(let i=0;i<20;i++)made.push(await classroom.createAssignment(teacher,{title:`과제 ${i+1}`,description:'',storyKey:null,format:'shortstory'}));
  expect(await code(classroom.createAssignment(teacher,{title:'21번째',description:'',storyKey:null,format:'shortstory'}))).toBe('ASSIGNMENT_LIMIT');
  expect(await code(classroom.submit(students[0]!,made[0]!.id,await snapshot()))).toBe('ok');
  const before=(await classroom.getClassroom(teacher)).storage.bytes;expect(before).toBeGreaterThan(0);
  expect(await classroom.deleteAssignment(teacher,made[0]!.id)).toEqual({deleted:true,submissions:1});
  expect((await classroom.getClassroom(teacher)).storage.bytes).toBe(0);
  expect(await code(classroom.createAssignment(teacher,{title:'새 과제',description:'',storyKey:null,format:'shortstory'}))).toBe('ok');
  const other=await classWithStudent();
  expect(await code(classroom.deleteAssignment(other.teacher,made[1]!.id))).toBe('ASSIGNMENT_NOT_FOUND');
 });
 it('serializes writes in one pool so two saves at the limit cannot both pass',async()=>{
  const user=await context(await account('member'),'member');
  for(let i=0;i<4;i++)await create(user);
  const results=await Promise.all([code(create(user)),code(create(user)),code(create(user))]);
  expect(results.filter(result=>result==='ok')).toHaveLength(1);
  expect(results.filter(result=>result==='WORK_LIMIT_REACHED')).toHaveLength(2);
 });
 it('refuses one work over 16MB for every role and leaves administrators otherwise unlimited',async()=>{
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   for(const role of ['member','teacher','student','admin'] as const)
    expect(await code(assertCanStore(client,randomUUID(),role,{newWork:true,bytes:16*MB+1,deltaBytes:16*MB+1}))).toBe('WORK_TOO_LARGE');
   expect(await code(assertCanStore(client,randomUUID(),'admin',{newWork:true,bytes:16*MB,deltaBytes:900*MB}))).toBe('ok');
  }finally{await client.query('ROLLBACK');client.release();}
 });
});
