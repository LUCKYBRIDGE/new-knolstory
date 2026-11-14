import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';

const pool=new Pool({max:8});
const now=Date.now();
const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
async function failure(action:Promise<unknown>){
 try{await action;}catch(error){if(error instanceof ClassroomError)return `${error.status} ${error.code}`;throw error;}
 throw Error('Expected a classroom error.');
}
async function classroom(count:number){
 const teacher=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
 const room=await service.createClassroom(teacher,'대상반'),made=await service.addStudents(teacher,count);
 const students:string[]=[];
 for(const student of made.students)students[student.number]=(await service.verifyStudentLogin(room.classCode,student.number,student.password))!;
 return {teacher,students};
}
const reading={title:'흥부와 놀부 읽기',description:'',criteria:'',kind:'reading',storyKey:'heungbu',readingFormat:'knolstory',questions:[]};
async function snapshot(){return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()}));}

describe('real PostgreSQL task recipients',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('shows a writing task only to the chosen students',async()=>{
  const c=await classroom(3);
  const all=await service.createAssignment(c.teacher,{title:'모두',description:'',storyKey:null});
  const some=await service.createAssignment(c.teacher,{title:'일부',description:'',storyKey:null,format:'shortstory',recipients:[3,1]});
  expect(all.recipients).toBeNull();
  expect(some.recipients).toEqual([1,3]);
  expect((await service.listAssignments(c.teacher,'teacher')).find(a=>a.id===some.id)?.recipients).toEqual([1,3]);
  const titles=async(n:number)=>(await service.listAssignments(c.students[n]!,'student')).map(a=>a.title).sort();
  expect(await titles(1)).toEqual(['모두','일부']);
  expect(await titles(2)).toEqual(['모두']);
  expect((await service.listAssignments(c.students[1]!,'student'))[0]).not.toHaveProperty('recipients');
  // A student outside the list cannot hand in or read it.
  const document=await snapshot();
  expect(await failure(service.submit(c.students[2]!,some.id,document))).toBe('404 ASSIGNMENT_NOT_FOUND');
  expect((await service.submit(c.students[1]!,some.id,document)).submittedAt).toBe(now);
  expect((await service.readOwnSubmission(c.students[1]!,some.id)).submittedAt).toBe(now);
  expect(await failure(service.readOwnSubmission(c.students[2]!,some.id))).toBe('404 ASSIGNMENT_NOT_FOUND');
  // Unknown numbers are refused; changing the list takes effect at once.
  expect(await failure(service.createAssignment(c.teacher,{title:'없음',description:'',storyKey:null,recipients:[9]}))).toBe('404 STUDENT_NOT_FOUND');
  expect((await service.patchAssignment(c.teacher,some.id,{recipients:[2]})).recipients).toEqual([2]);
  expect(await titles(1)).toEqual(['모두']);
  expect(await titles(2)).toEqual(['모두','일부']);
  expect((await service.patchAssignment(c.teacher,some.id,{recipients:null})).recipients).toBeNull();
  expect(await titles(3)).toEqual(['모두','일부']);
  // Other edits keep the list.
  await service.patchAssignment(c.teacher,some.id,{recipients:[1]});
  expect((await service.patchAssignment(c.teacher,some.id,{open:false})).recipients).toEqual([1]);
  // A removed student just drops out of the list.
  await service.deleteStudent(c.teacher,1);
  expect((await service.listAssignments(c.teacher,'teacher')).find(a=>a.id===some.id)?.recipients).toEqual([]);
 });

 it('shows a mission only to the chosen students and lists only their progress',async()=>{
  const c=await classroom(3);
  const mission=await service.createMission(c.teacher,{...reading,recipients:[2]});
  expect(mission.recipients).toEqual([2]);
  expect(await service.listMissions(c.students[1]!,'student')).toEqual([]);
  expect((await service.listMissions(c.students[2]!,'student')).map(m=>m.id)).toEqual([mission.id]);
  expect(await failure(service.submitMission(c.students[1]!,mission.id,{answers:{},note:''}))).toBe('404 MISSION_NOT_FOUND');
  await service.submitMission(c.students[2]!,mission.id,{answers:{},note:'다 읽었어요'});
  expect((await service.listMissionProgress(c.teacher,mission.id)).map(p=>p.number)).toEqual([2]);
  expect(await failure(service.createMission(c.teacher,{...reading,recipients:[]}))).toBe('400 INVALID_REQUEST');
  expect((await service.setMissionOpen(c.teacher,mission.id,{recipients:null})).recipients).toBeNull();
  expect((await service.listMissionProgress(c.teacher,mission.id)).map(p=>p.number)).toEqual([1,2,3]);
  expect((await service.setMissionOpen(c.teacher,mission.id,{open:false})).recipients).toBeNull();
 });
});
