import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createStoryDocument} from '../../packages/story-domain/src/index';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';

const pool=new Pool({max:8});let now=1_800_000_000_000;
const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
async function code(action:Promise<unknown>){try{await action;}catch(error){if(error instanceof ClassroomError)return error.code;throw error;}return 'ok';}
const book=async()=>prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:{...newShortStory(),title:'01_내 그림책'}}));
async function story(){
 const project=createBlankStoryProject({id:randomUUID(),chapterId:randomUUID(),lineId:randomUUID(),title:'01_내 놀스토리'});
 return prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2027-01-15T00:00:00.000Z',appVersion:'test'}),audioResources:[]}));
}
async function classroom(){
 const teacher=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
 const room=await service.createClassroom(teacher,'단계반'),made=await service.addStudents(teacher,1);
 const student=(await service.verifyStudentLogin(room.classCode,made.students[0]!.number,made.students[0]!.password))!;
 return {teacher,student};
}
describe('ShortStory → KnolStory stage tasks and task edit scope',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('opens the KnolStory task only after the teacher passes the picture book',async()=>{
  const {teacher,student}=await classroom();
  const first=await service.createAssignment(teacher,{title:'그림책 만들기',description:'',storyKey:null,format:'shortstory'});
  const second=await service.createAssignment(teacher,{title:'놀스토리로 이어 쓰기',description:'',storyKey:null,format:'knolstory',afterAssignmentId:first.id});
  expect(second.after).toEqual({id:first.id,title:'그림책 만들기'});
  const mine=()=>service.listAssignments(student,'student').then(list=>list.find(item=>item.id===second.id)!);
  expect((await mine()).after).toEqual({id:first.id,title:'그림책 만들기',passed:false});
  expect(await code(service.submit(student,second.id,await story()))).toBe('STAGE_LOCKED');
  expect(await code(service.saveDraft(student,second.id,await story()))).toBe('STAGE_LOCKED');
  now+=1000;const {submittedAt}=await service.submit(student,first.id,await book());
  expect((await mine()).after?.passed).toBe(false);
  await service.reviewSubmission(teacher,first.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:submittedAt});
  expect((await mine()).after?.passed).toBe(true);
  now+=1000;expect(await code(service.submit(student,second.id,await story()))).toBe('ok');
  // Deleting the earlier task frees the later one instead of locking it forever.
  await service.deleteAssignment(teacher,first.id);
  expect((await mine()).after).toBeNull();
 });

 it('follows only a ShortStory task of the same classroom',async()=>{
  const {teacher}=await classroom(),other=await classroom();
  const story=await service.createAssignment(teacher,{title:'놀스토리',description:'',storyKey:null,format:'knolstory'});
  const book=await service.createAssignment(teacher,{title:'그림책',description:'',storyKey:null,format:'shortstory'});
  const foreign=await service.createAssignment(other.teacher,{title:'다른 반 그림책',description:'',storyKey:null,format:'shortstory'});
  expect(await code(service.createAssignment(teacher,{title:'x',description:'',storyKey:null,format:'knolstory',afterAssignmentId:story.id}))).toBe('STAGE_NOT_ALLOWED');
  expect(await code(service.createAssignment(teacher,{title:'x',description:'',storyKey:null,format:'shortstory',afterAssignmentId:book.id}))).toBe('STAGE_NOT_ALLOWED');
  expect(await code(service.createAssignment(teacher,{title:'x',description:'',storyKey:null,format:'knolstory',afterAssignmentId:foreign.id}))).toBe('ASSIGNMENT_NOT_FOUND');
 });

 it('stores, returns and changes the task edit scope',async()=>{
  const {teacher,student}=await classroom();
  const scope={images:true,characters:false,audio:false,direction:false,choices:false};
  const task=await service.createAssignment(teacher,{title:'글과 그림',description:'',storyKey:null,format:'knolstory',editScope:scope});
  expect(task.editScope).toEqual(scope);
  expect((await service.listAssignments(student,'student'))[0]!.editScope).toEqual(scope);
  expect((await service.patchAssignment(teacher,task.id,{editScope:null})).editScope).toBeNull();
  expect((await service.listAssignments(teacher,'teacher'))[0]!.editScope).toBeNull();
 });
 it('keeps a passed picture book and its stage students consistent',async()=>{
  const {teacher,student}=await classroom();await service.addStudents(teacher,1);
  const first=await service.createAssignment(teacher,{title:'그림책',description:'',storyKey:null,format:'shortstory',recipients:[1]});
  // A stage that reaches students who never get the picture book task would stay locked for them.
  expect(await code(service.createAssignment(teacher,{title:'이어 쓰기',description:'',storyKey:null,format:'knolstory',afterAssignmentId:first.id}))).toBe('STAGE_RECIPIENTS');
  const second=await service.createAssignment(teacher,{title:'이어 쓰기',description:'',storyKey:null,format:'knolstory',afterAssignmentId:first.id,recipients:[1]});
  expect(await code(service.patchAssignment(teacher,second.id,{recipients:null}))).toBe('STAGE_RECIPIENTS');
  expect(await code(service.patchAssignment(teacher,first.id,{recipients:[2]}))).toBe('STAGE_RECIPIENTS');
  now+=1000;const {submittedAt}=await service.submit(student,first.id,await book());
  await service.reviewSubmission(teacher,first.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:submittedAt});
  // Replacing the passed book would undo the pass and lock the stage again.
  now+=1000;expect(await code(service.submit(student,first.id,await book()))).toBe('SUBMISSION_PASSED');
  expect(await code(service.submit(student,second.id,await story()))).toBe('ok');
 });
});

