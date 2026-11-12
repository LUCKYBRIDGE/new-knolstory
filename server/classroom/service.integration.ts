import {readFileSync} from 'node:fs';
import {createStoryDocument,type StoryProject} from '../../packages/story-domain/src/index';
import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';
import {ALLOW_ALL_PERMISSIONS} from './permissions';

const pool=new Pool({max:12});
const key=randomBytes(32),adminId=randomUUID();
let now=Date.now();
const service=createClassroomService(pool,{secret:key,adminAccountIds:[adminId],origin:'https://story.example',clock:()=>now});
async function account(role:'member'|'teacher'='member',id=randomUUID()){
 await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active',$2)",[id,role]);return id;
}
async function failure(action:Promise<unknown>){
 try{await action;}catch(error){if(error instanceof ClassroomError)return `${error.status} ${error.code}`;throw error;}
 throw Error('Expected a classroom error.');
}
async function snapshot(){return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));}

describe('real PostgreSQL classroom service',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('derives roles from the database and the admin list',async()=>{
  const member=await account(),teacher=await account('teacher'),admin=await account('member',adminId);
  expect(await service.roleOf(member)).toBe('member');expect(await service.roleOf(teacher)).toBe('teacher');expect(await service.roleOf(admin)).toBe('admin');
  expect(await service.roleOf(randomUUID())).toBeNull();expect(await service.roleOf('not-a-uuid')).toBeNull();
  await pool.query("UPDATE knolstory_auth.accounts SET status='inactive' WHERE id=$1",[member]);expect(await service.roleOf(member)).toBeNull();
  await expect(pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','owner')",[randomUUID()])).rejects.toThrow();
 });

 it('upgrades members only with the current teacher code and stores just a hash',async()=>{
  const member=await account();
  expect(await failure(service.teacherUpgrade(member,'anything'))).toBe('403 INVALID_TEACHER_CODE');
  const first=await service.setTeacherCode('first-code'),stored=(await pool.query('SELECT code_hash FROM knolstory_class.teacher_codes')).rows;
  expect(stored).toHaveLength(1);expect(stored[0].code_hash).not.toContain('first-code');expect(await service.teacherCodeUpdatedAt()).toBe(first);
  expect(await failure(service.teacherUpgrade(member,'wrong'))).toBe('403 INVALID_TEACHER_CODE');
  expect(await service.teacherUpgrade(member,'first-code')).toBe('teacher');expect(await service.roleOf(member)).toBe('teacher');
  now+=1000;await service.setTeacherCode('second-code');
  expect((await pool.query('SELECT count(*)::int AS n FROM knolstory_class.teacher_codes')).rows[0].n).toBe(1);
  const other=await account();
  expect(await failure(service.teacherUpgrade(other,'first-code'))).toBe('403 INVALID_TEACHER_CODE');
  expect(await service.teacherUpgrade(other,'second-code')).toBe('teacher');
  expect(await service.teacherUpgrade(other,'second-code')).toBe('teacher');
  const student=await account();await pool.query("UPDATE knolstory_auth.accounts SET role='student' WHERE id=$1",[student]);
  expect(await failure(service.teacherUpgrade(student,'second-code'))).toBe('403 ROLE_NOT_ALLOWED');
 });

 it('opens one classroom per teacher even under concurrency',async()=>{
  const teacher=await account('teacher');
  const results=await Promise.allSettled([1,2,3,4].map(()=>service.createClassroom(teacher,'3학년 1반')));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  for(const r of results.filter(r=>r.status==='rejected'))expect(((r as PromiseRejectedResult).reason as ClassroomError).code).toBe('CLASSROOM_EXISTS');
  const room=await service.getClassroom(teacher);
  expect(room).toMatchObject({name:'3학년 1반',studentCount:0,students:[],defaultPermissions:ALLOW_ALL_PERMISSIONS});expect(room.classCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  expect(await failure(service.getClassroom(await account('teacher')))).toBe('404 CLASSROOM_NOT_FOUND');
 });

 it('creates students in empty numbers, keeps passwords encrypted and enforces the 30 student limit',async()=>{
  const teacher=await account('teacher');await service.createClassroom(teacher,'반');
  let room=await service.addStudents(teacher,3);
  expect(room.students.map(s=>s.number)).toEqual([1,2,3]);
  for(const student of room.students){expect(student.password).toMatch(/^\d{4}$/);expect(student).toMatchObject({name:'',permissions:null,hasQr:false});}
  const rows=(await pool.query('SELECT password_hash,password_cipher FROM knolstory_class.students WHERE classroom_id=$1',[room.id])).rows;
  for(const [index,row] of rows.entries()){expect(row.password_hash).toMatch(/^scrypt\$/);expect(row.password_cipher).toMatch(/^v1\./);expect(row.password_hash+row.password_cipher).not.toContain(room.students[index]!.password+'.');}
  await service.deleteStudent(teacher,2);
  room=await service.addStudents(teacher,2);
  expect(room.students.map(s=>s.number)).toEqual([1,2,3,4]);
  expect(await failure(service.addStudents(teacher,27))).toBe('409 STUDENT_LIMIT');
  expect((await service.getClassroom(teacher)).studentCount).toBe(4);
  room=await service.addStudents(teacher,26);expect(room.students).toHaveLength(30);
  expect(await failure(service.addStudents(teacher,1))).toBe('409 STUDENT_LIMIT');
  expect(await failure(service.deleteStudent(teacher,31 as number))).toBe('404 STUDENT_NOT_FOUND');
 });

 it('logs students in by class code, number and password, and by an re-issuable QR token',async()=>{
  const teacher=await account('teacher'),room0=await service.createClassroom(teacher,'로그인 반'),room=await service.addStudents(teacher,2);
  const [first,second]=room.students as [typeof room.students[0],typeof room.students[0]];
  const id=await service.verifyStudentLogin(room.classCode,1,first.password);
  expect(id).toMatch(/^[a-f0-9-]{36}$/);expect(await service.roleOf(id!)).toBe('student');
  expect(await service.verifyStudentLogin(room.classCode,1,second.password===first.password?'x':second.password)).toBeNull();
  expect(await service.verifyStudentLogin(room.classCode,3,first.password)).toBeNull();
  expect(await service.verifyStudentLogin('ZZZZZZ',1,first.password)).toBeNull();
  const changed=await service.patchStudent(teacher,1,{name:'민수',password:'abcd1234'});
  expect(changed).toMatchObject({number:1,name:'민수',password:'abcd1234'});
  expect(await service.verifyStudentLogin(room.classCode,1,first.password)).toBeNull();
  expect(await service.verifyStudentLogin(room.classCode,1,'abcd1234')).toBe(id);
  const one=await service.issueQr(teacher,1),token=new URL(one.url).searchParams.get('q')!;
  expect(one.url).toBe(`https://story.example/?q=${token}`);expect(token).toMatch(/^[A-Za-z0-9_-]{27}$/);expect(Buffer.from(token,'base64url')).toHaveLength(20);
  expect(await service.verifyQrToken(token)).toBe(id);
  expect((await pool.query('SELECT qr_token_hash FROM knolstory_class.students WHERE account_id=$1',[id])).rows[0].qr_token_hash).not.toContain(token);
  expect((await service.getClassroom(teacher)).students[0]!.hasQr).toBe(true);
  const again=await service.issueQr(teacher,1);expect(await service.verifyQrToken(token)).toBeNull();
  expect(await service.verifyQrToken(new URL(again.url).searchParams.get('q')!)).toBe(id);
  expect(await failure(service.issueQr(teacher,9))).toBe('404 STUDENT_NOT_FOUND');
  // A new class code invalidates the old one for logins.
  const regenerated=await service.patchClassroom(teacher,{regenerateCode:true,name:'새 이름'});
  expect(regenerated.classCode).not.toBe(room0.classCode);expect(regenerated.name).toBe('새 이름');
  expect(await service.verifyStudentLogin(room.classCode,1,'abcd1234')).toBeNull();
  expect(await service.verifyStudentLogin(regenerated.classCode,1,'abcd1234')).toBe(id);
 });

 it('applies per-student and classroom permissions with the documented priority',async()=>{
  const teacher=await account('teacher');await service.createClassroom(teacher,'권한 반');
  const room=await service.addStudents(teacher,3),id=(await service.verifyStudentLogin(room.classCode,1,room.students[0]!.password))!;
  expect((await service.me(id,'student')).student).toMatchObject({number:1,className:'권한 반',permissions:ALLOW_ALL_PERMISSIONS});
  const textAndImages={...ALLOW_ALL_PERMISSIONS,characters:false,audio:false,direction:false,choices:false};
  await service.patchClassroom(teacher,{defaultPermissions:textAndImages});
  expect((await service.me(id,'student')).student!.permissions).toEqual(textAndImages);
  const textOnly={...textAndImages,images:false,newWorks:false};
  const view=await service.setPermissions(teacher,[1,3],textOnly);
  expect(view.students.map(s=>s.permissions)).toEqual([textOnly,null,textOnly]);
  expect((await service.me(id,'student')).student!.permissions).toEqual(textOnly);
  expect(await failure(service.setPermissions(teacher,[1,9],ALLOW_ALL_PERMISSIONS))).toBe('404 STUDENT_NOT_FOUND');
  expect((await service.getClassroom(teacher)).students[0]!.permissions).toEqual(textOnly);
  const cleared=await service.patchStudent(teacher,1,{permissions:null});expect(cleared.permissions).toBeNull();
  expect((await service.me(id,'student')).student!.permissions).toEqual(textAndImages);
  const forced=await service.setPermissions(teacher,[2],{...ALLOW_ALL_PERMISSIONS,forcedStoryKey:'story-key'});expect(forced.students[1]!.permissions!.forcedStoryKey).toBe('story-key');
  expect((await service.me(teacher,'teacher')).classroom).toMatchObject({name:'권한 반',studentCount:3,classCode:room.classCode});
 });

 it('removes a student: account closed, sessions revoked, submissions gone, number reusable',async()=>{
  const teacher=await account('teacher');await service.createClassroom(teacher,'삭제 반');
  const room=await service.addStudents(teacher,1),id=(await service.verifyStudentLogin(room.classCode,1,room.students[0]!.password))!;
  await pool.query("INSERT INTO knolstory_auth.sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)",[randomBytes(32).toString('hex'),id,now+60_000]);
  const after=await service.deleteStudent(teacher,1);
  expect(after.students).toEqual([]);expect(await service.roleOf(id)).toBeNull();
  expect((await pool.query('SELECT revoked FROM knolstory_auth.sessions WHERE account_id=$1',[id])).rows).toEqual([{revoked:true}]);
  expect(await service.verifyStudentLogin(room.classCode,1,room.students[0]!.password)).toBeNull();
  expect((await service.addStudents(teacher,1)).students.map(s=>s.number)).toEqual([1]);
 });

 it('defaults assignments from older writers to KnolStory and enforces supported kinds in storage',async()=>{
  const teacher=await account('teacher'),room=await service.createClassroom(teacher,'기존 과제 반'),id=randomUUID();
  await pool.query('INSERT INTO knolstory_class.assignments(id,classroom_id,title,description,story_key,open,created_at) VALUES($1,$2,$3,$4,NULL,true,$5)',[id,room.id,'기존 과제','',now]);
  expect(await service.listAssignments(teacher,'teacher')).toEqual([expect.objectContaining({id,format:'knolstory'})]);
  await expect(pool.query("UPDATE knolstory_class.assignments SET format='other' WHERE id=$1",[id])).rejects.toThrow();
 });

 it('manages assignments, submissions and open or closed states with classroom isolation',async()=>{
  const teacher=await account('teacher'),outsider=await account('teacher');
  const room=await service.createClassroom(teacher,'과제 반');await service.createClassroom(outsider,'다른 반');
  await service.addStudents(teacher,2);await service.addStudents(outsider,1);
  const login=async(code:string,number:number,password:string)=>(await service.verifyStudentLogin(code,number,password))!;
  const view=await service.getClassroom(teacher),one=await login(room.classCode,1,view.students[0]!.password),two=await login(room.classCode,2,view.students[1]!.password);
  await service.patchStudent(teacher,1,{name:'하나'});
  const outsiderView=await service.getClassroom(outsider),stranger=await login(outsiderView.classCode,1,outsiderView.students[0]!.password);
  const created=await service.createAssignment(teacher,{title:'첫 이야기',description:'설명',storyKey:'story-a',format:'shortstory'});
  expect(created).toMatchObject({title:'첫 이야기',description:'설명',storyKey:'story-a',format:'shortstory',open:true});
  now+=1000;const second=await service.createAssignment(teacher,{title:'둘째',description:'',storyKey:null});
  expect(second.format).toBe('knolstory');
  expect((await service.listAssignments(teacher,'teacher')).map(a=>a.id)).toEqual([second.id,created.id]);
  expect(await service.listAssignments(stranger,'student')).toEqual([]);
  expect(await failure(service.listAssignments(teacher,'student'))).toBe('403 ROLE_NOT_ALLOWED');
  expect((await service.listAssignments(one,'student')).find(a=>a.id===created.id)).toMatchObject({submittedAt:null});

  expect(await failure(service.readOwnSubmission(one,created.id))).toBe('404 SUBMISSION_NOT_FOUND');
  expect(await failure(service.submit(one,created.id,{payloadVersion:1,content:{}}))).toBe('400 INVALID_DOCUMENT');
  const document=await snapshot();
  expect(await failure(service.submit(one,second.id,document))).toBe('422 ASSIGNMENT_FORMAT_MISMATCH');
  const project=JSON.parse(readFileSync(new URL('../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8')) as StoryProject;
  const knolstory=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:new Date(now).toISOString(),appVersion:'classroom-test'})}));
  expect(await failure(service.submit(one,created.id,knolstory))).toBe('422 ASSIGNMENT_FORMAT_MISMATCH');
  await service.submit(one,second.id,knolstory);
  expect((await service.readOwnSubmission(one,second.id)).document).toMatchObject({content:{format:'knolstory'}});
  now+=1000;const first=await service.submit(one,created.id,document);expect(first.submittedAt).toBe(now);
  expect(await failure(service.submit(one,created.id,knolstory))).toBe('422 ASSIGNMENT_FORMAT_MISMATCH');
  expect((await service.readOwnSubmission(one,created.id)).document).toMatchObject({content:{format:'shortstory'}});
  now+=1000;const resubmitted=await service.submit(one,created.id,document);expect(resubmitted.submittedAt).toBe(now);
  expect((await pool.query('SELECT count(*)::int AS n FROM knolstory_class.submissions WHERE assignment_id=$1',[created.id])).rows[0].n).toBe(1);
  expect(await service.readOwnSubmission(one,created.id)).toEqual({document:JSON.parse(JSON.stringify(document)),submittedAt:now});
  expect((await service.listAssignments(one,'student')).find(a=>a.id===created.id)!.submittedAt).toBe(now);
  expect((await service.listAssignments(two,'student')).find(a=>a.id===created.id)!.submittedAt).toBeNull();
  expect(await failure(service.submit(stranger,created.id,document))).toBe('404 ASSIGNMENT_NOT_FOUND');
  expect(await failure(service.readOwnSubmission(stranger,created.id))).toBe('404 ASSIGNMENT_NOT_FOUND');

  expect(await service.listSubmissions(teacher,created.id)).toEqual([{number:1,name:'하나',submittedAt:now}]);
  expect(await service.readSubmissionFor(teacher,created.id,1)).toMatchObject({submittedAt:now});
  expect(await failure(service.readSubmissionFor(teacher,created.id,2))).toBe('404 SUBMISSION_NOT_FOUND');
  expect(await failure(service.readSubmissionFor(teacher,created.id,20))).toBe('404 STUDENT_NOT_FOUND');
  expect(await failure(service.listSubmissions(outsider,created.id))).toBe('404 ASSIGNMENT_NOT_FOUND');
  expect(await failure(service.patchAssignment(outsider,created.id,{open:false}))).toBe('404 ASSIGNMENT_NOT_FOUND');

  const closed=await service.patchAssignment(teacher,created.id,{open:false,title:'수정'});
  expect(closed).toMatchObject({open:false,title:'수정',description:'설명',storyKey:'story-a'});
  expect(await failure(service.submit(two,created.id,document))).toBe('409 ASSIGNMENT_CLOSED');
  expect((await service.readOwnSubmission(one,created.id)).submittedAt).toBe(now);
  expect((await service.patchAssignment(teacher,created.id,{open:true})).open).toBe(true);
  await service.submit(two,created.id,document);
  expect((await service.listSubmissions(teacher,created.id)).map(s=>s.number)).toEqual([1,2]);
  expect(await failure(service.readOwnSubmission(one,randomUUID()))).toBe('404 ASSIGNMENT_NOT_FOUND');
 });
});
