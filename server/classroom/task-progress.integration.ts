import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory,newShortStoryPage} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';

const pool=new Pool({max:8});let now=1_800_000_000_000;
const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
async function code(action:Promise<unknown>){try{await action;}catch(error){if(error instanceof ClassroomError)return error.code;throw error;}return 'ok';}
/** A picture book with `pages` written pages, titled with the student's number. */
async function book(number:number,pages:number,text='토끼가 달려요'){
 const project={...newShortStory(),title:`${String(number).padStart(2,'0')}_내 그림책`};
 project.pages=Array.from({length:Math.max(1,pages+1)},(_,i)=>({...newShortStoryPage(),order:i+1,text:i<pages?text:''}));
 return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project}));
}
async function classroom(count:number){
 const teacher=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
 const room=await service.createClassroom(teacher,'진행반'),made=await service.addStudents(teacher,count);
 const students=await Promise.all(made.students.map(s=>service.verifyStudentLogin(room.classCode,s.number,s.password)));
 return {teacher,students:students as string[]};
}
describe('writing tasks with guidance, mid-way drafts and teacher progress',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('keeps the checklist and amount and shows them to students',async()=>{
  const {teacher,students}=await classroom(1);
  const task=await service.createAssignment(teacher,{title:'이어 쓰기',description:'3장 뒤를 이어 써요.',storyKey:null,format:'shortstory',checks:['인물의 마음이 드러나요','장면이 3개 이상이에요'],targetAmount:3});
  expect(task).toMatchObject({checks:['인물의 마음이 드러나요','장면이 3개 이상이에요'],targetAmount:3});
  expect((await service.listAssignments(students[0]!,'student'))[0]).toMatchObject({checks:['인물의 마음이 드러나요','장면이 3개 이상이에요'],targetAmount:3,draftSavedAt:null,draftComment:''});
  expect(await service.patchAssignment(teacher,task.id,{checks:[],targetAmount:null})).toMatchObject({checks:[],targetAmount:null});
 });
 it('lets a student save a draft, the teacher read it with progress and leave a note, and keeps the final hand-in apart',async()=>{
  const {teacher,students}=await classroom(2);
  const task=await service.createAssignment(teacher,{title:'그림책',description:'세 쪽을 써요.',storyKey:null,format:'shortstory',targetAmount:3});
  let progress=await service.assignmentProgress(teacher,task.id);
  expect(progress.map(row=>[row.number,row.draft,row.submission])).toEqual([[1,null,null],[2,null,null]]);
  now+=1000;expect(await service.saveDraft(students[0]!,task.id,await book(1,2))).toEqual({savedAt:now});
  progress=await service.assignmentProgress(teacher,task.id);
  expect(progress[0]!.draft).toMatchObject({savedAt:now,amount:2,chars:14,comment:''});
  expect((await service.readDraftFor(teacher,task.id,1)).savedAt).toBe(now);
  expect(await code(service.readDraftFor(teacher,task.id,2))).toBe('DRAFT_NOT_FOUND');
  now+=1000;expect(await service.commentDraft(teacher,task.id,1,'장면 묘사를 더 해 보자')).toEqual({comment:'장면 묘사를 더 해 보자',commentedAt:now});
  const mine=(await service.listAssignments(students[0]!,'student'))[0]!;
  expect(mine).toMatchObject({draftComment:'장면 묘사를 더 해 보자',draftCommentedAt:now,submittedAt:null});
  expect((await service.readOwnDraft(students[0]!,task.id)).comment).toBe('장면 묘사를 더 해 보자');
  // A second save replaces the draft; the note stays until the teacher changes it.
  now+=1000;await service.saveDraft(students[0]!,task.id,await book(1,3));
  expect((await service.assignmentProgress(teacher,task.id))[0]!.draft).toMatchObject({amount:3,comment:'장면 묘사를 더 해 보자'});
  now+=1000;await service.submit(students[0]!,task.id,await book(1,3));
  progress=await service.assignmentProgress(teacher,task.id);
  expect(progress[0]!.submission).toMatchObject({submittedAt:now,amount:3,reviewStatus:null});
  expect((await service.listAssignments(teacher,'teacher'))[0]).toMatchObject({submittedCount:1,draftCount:1});
  // Wrong number in the title, closed task, other class.
  expect(await code(service.saveDraft(students[1]!,task.id,await book(1,1)))).toBe('STUDENT_NUMBER_TITLE');
  const other=await classroom(1);
  expect(await code(service.saveDraft(other.students[0]!,task.id,await book(1,1)))).toBe('ASSIGNMENT_NOT_FOUND');
  expect(await code(service.assignmentProgress(other.teacher,task.id))).toBe('ASSIGNMENT_NOT_FOUND');
  await service.patchAssignment(teacher,task.id,{open:false});
  expect(await code(service.saveDraft(students[1]!,task.id,await book(2,1)))).toBe('ASSIGNMENT_CLOSED');
  // Drafts count toward the student's submission space and go when the task is deleted.
  expect((await service.me(students[0]!,'student')).storage!.submissions!.bytes).toBeGreaterThan(0);
  await service.deleteAssignment(teacher,task.id);
  expect((await pool.query('SELECT count(*)::int AS n FROM knolstory_class.submission_drafts WHERE assignment_id=$1',[task.id])).rows[0].n).toBe(0);
 });
 it('lists only the chosen students when a task is for some of the class',async()=>{
  const {teacher}=await classroom(3);
  const task=await service.createAssignment(teacher,{title:'일부',description:'',storyKey:null,format:'shortstory',recipients:[2,3]});
  expect((await service.assignmentProgress(teacher,task.id)).map(row=>row.number)).toEqual([2,3]);
 });
});
