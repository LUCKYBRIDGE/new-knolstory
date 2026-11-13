import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';

const pool=new Pool({max:8});
let now=Date.now();
const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
async function teacherAccount(){const id=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[id]);return id;}
async function failure(action:Promise<unknown>){
 try{await action;}catch(error){if(error instanceof ClassroomError)return `${error.status} ${error.code}`;throw error;}
 throw Error('Expected a classroom error.');
}
/** A class with `count` students; returns the teacher and the student account ids by number. */
async function classroom(count:number){
 const teacher=await teacherAccount(),room=await service.createClassroom(teacher,'미션반'),made=await service.addStudents(teacher,count);
 const students:string[]=[];
 for(const student of made.students)students[student.number]=(await service.verifyStudentLogin(room.classCode,student.number,student.password))!;
 return {teacher,students};
}
const worksheet={title:'별주부전 독후 활동지',description:'읽고 생각을 적어요.',criteria:'까닭을 함께 써요.',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'기억에 남는 장면은?'},{id:'q2',prompt:'토끼의 선택을 어떻게 생각하나요?'}]};
const reading={title:'흥부와 놀부 읽기',description:'',criteria:'',kind:'reading',storyKey:'heungbu',readingFormat:'knolstory',questions:[]};

describe('real PostgreSQL classroom missions',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});

 it('creates missions for one class and keeps other classes and roles out',async()=>{
  const a=await classroom(2),b=await classroom(1);
  const created=await service.createMission(a.teacher,worksheet);
  expect(created).toMatchObject({...worksheet,open:true,createdAt:now});expect(created).not.toHaveProperty('progress');
  expect(await failure(service.createMission(a.teacher,{...worksheet,questions:[]}))).toBe('400 INVALID_REQUEST');
  expect(await failure(service.createMission(a.students[1]!,worksheet))).toBe('404 CLASSROOM_NOT_FOUND');
  expect((await service.listMissions(a.teacher,'teacher')).map(m=>m.id)).toEqual([created.id]);
  expect(await service.listMissions(b.teacher,'teacher')).toEqual([]);
  expect(await service.listMissions(b.students[1]!,'student')).toEqual([]);
  expect(await failure(service.listMissions(a.teacher,'member'))).toBe('403 ROLE_NOT_ALLOWED');
  expect(await failure(service.listMissions(a.teacher,'student'))).toBe('403 ROLE_NOT_ALLOWED');
  // Another class cannot read, close, answer or review it.
  expect(await failure(service.setMissionOpen(b.teacher,created.id,{open:false}))).toBe('404 MISSION_NOT_FOUND');
  expect(await failure(service.listMissionProgress(b.teacher,created.id))).toBe('404 MISSION_NOT_FOUND');
  expect(await failure(service.submitMission(b.students[1]!,created.id,{answers:{q1:'x',q2:'y'},note:''}))).toBe('404 MISSION_NOT_FOUND');
  expect(await failure(service.reviewMission(b.teacher,created.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:null}))).toBe('404 MISSION_NOT_FOUND');
  expect(await failure(service.submitMission(a.teacher,created.id,{answers:{q1:'x',q2:'y'},note:''}))).toBe('403 ROLE_NOT_ALLOWED');
 });

 it('walks submit → revise → resubmit → pass, guarding the answer the teacher read',async()=>{
  const {teacher,students}=await classroom(2),one=students[1]!,two=students[2]!;
  const mission=await service.createMission(teacher,worksheet);
  expect(await failure(service.submitMission(one,mission.id,{answers:{q1:'장면'},note:''}))).toBe('400 INVALID_REQUEST');
  const first=await service.submitMission(one,mission.id,{answers:{q1:'용궁 장면',q2:'꾀가 좋아요'},note:'재미있었어요'});
  expect(first.submittedAt).toBe(now);
  expect((await service.listMissions(one,'student'))[0]!.progress).toMatchObject({answers:{q1:'용궁 장면',q2:'꾀가 좋아요'},note:'재미있었어요',submittedAt:now,reviewStatus:null,feedback:''});
  // The other student sees the mission but none of the first student's writing.
  expect((await service.listMissions(two,'student'))[0]!.progress).toMatchObject({answers:{},note:'',submittedAt:null,reviewStatus:null});
  expect((await service.listMissionProgress(teacher,mission.id)).map(row=>[row.number,row.submittedAt])).toEqual([[1,now],[2,null]]);

  expect(await failure(service.reviewMission(teacher,mission.id,1,{reviewStatus:'revise',feedback:' ',expectedSubmittedAt:now}))).toBe('400 INVALID_REQUEST');
  const revise=await service.reviewMission(teacher,mission.id,1,{reviewStatus:'revise',feedback:'까닭을 더 써 주세요.',expectedSubmittedAt:now});
  expect(revise).toMatchObject({number:1,reviewStatus:'revise',feedback:'까닭을 더 써 주세요.',reviewedAt:now,submittedAt:now});

  // Resubmitting within the same millisecond still gets a later version, returns to waiting and keeps the feedback.
  const second=await service.submitMission(one,mission.id,{answers:{q1:'용궁 장면',q2:'살려고 꾀를 냈어요'},note:''});
  expect(second.submittedAt).toBe(now+1);
  expect((await service.listMissions(one,'student'))[0]!.progress).toMatchObject({reviewStatus:null,feedback:'까닭을 더 써 주세요.',submittedAt:now+1});
  // A decision made on the earlier answer is refused until the teacher has the new one.
  expect(await failure(service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:now}))).toBe('409 MISSION_SUBMISSION_CHANGED');
  expect((await service.listMissions(one,'student'))[0]!.progress!.reviewStatus).toBeNull();
  now+=5000;
  const passed=await service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'잘 썼어요!',expectedSubmittedAt:second.submittedAt});
  expect(passed).toMatchObject({reviewStatus:'passed',feedback:'잘 썼어요!',reviewedAt:now});
  expect((await service.listMissions(one,'student'))[0]!.progress).toMatchObject({reviewStatus:'passed',feedback:'잘 썼어요!'});
  expect((await service.listMissions(two,'student'))[0]!.progress!.reviewStatus).toBeNull();
 });

 it('lets the teacher pass paper or classroom work directly, clear a decision, and close a mission',async()=>{
  const {teacher,students}=await classroom(1),one=students[1]!;
  const mission=await service.createMission(teacher,reading);
  // No online answer: the version the teacher saw is "nothing submitted".
  expect(await failure(service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:5}))).toBe('409 MISSION_SUBMISSION_CHANGED');
  const direct=await service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'교실에서 확인했어요.',expectedSubmittedAt:null});
  expect(direct).toMatchObject({reviewStatus:'passed',submittedAt:null,answers:{}});
  expect((await service.listMissions(one,'student'))[0]!.progress).toMatchObject({reviewStatus:'passed',submittedAt:null,feedback:'교실에서 확인했어요.'});
  const cleared=await service.reviewMission(teacher,mission.id,1,{reviewStatus:null,feedback:'',expectedSubmittedAt:null});
  expect(cleared).toMatchObject({reviewStatus:null,feedback:''});
  expect(await failure(service.reviewMission(teacher,mission.id,2,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:null}))).toBe('404 STUDENT_NOT_FOUND');

  // A reading mission has no questions: a note alone asks for the check.
  const read=await service.submitMission(one,mission.id,{answers:{},note:'끝까지 읽었어요.'});
  expect(await failure(service.submitMission(one,mission.id,{answers:{q1:'x'},note:''}))).toBe('400 INVALID_REQUEST');
  expect((await service.setMissionOpen(teacher,mission.id,{open:false})).open).toBe(false);
  expect((await service.setMissionOpen(teacher,mission.id,{dueAt:1_800_000_000_000})).dueAt).toBe(1_800_000_000_000);
  expect((await service.setMissionOpen(teacher,mission.id,{dueAt:null})).dueAt).toBeNull();
  expect(await failure(service.setMissionOpen(teacher,mission.id,{}))).toBe('400 INVALID_REQUEST');
  expect(await failure(service.submitMission(one,mission.id,{answers:{},note:''}))).toBe('409 MISSION_CLOSED');
  // Closed missions stay readable and reviewable.
  expect((await service.listMissions(one,'student'))[0]).toMatchObject({open:false,progress:{note:'끝까지 읽었어요.',submittedAt:read.submittedAt}});
  expect((await service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:read.submittedAt})).reviewStatus).toBe('passed');
  expect((await service.setMissionOpen(teacher,mission.id,{open:true})).open).toBe(true);
 });

 it('counts accounts, classes, assignments and passed missions for the admin overview',async()=>{
  const {teacher,students}=await classroom(2),mission=await service.createMission(teacher,reading);
  await service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:null});
  await service.createAssignment(teacher,{format:'knolstory',title:'이야기 쓰기',description:'',storyKey:null});
  const overview=await service.adminOverview();
  expect(overview.accounts.student).toBeGreaterThanOrEqual(2);expect(overview.accounts.teacher).toBeGreaterThanOrEqual(1);
  const room=overview.classrooms.find(row=>row.name==='미션반'&&row.studentCount===2&&row.missionCount===1&&row.passedMissionCount===1&&row.assignmentCount===1);
  expect(room).toMatchObject({studentCount:2,assignmentCount:1,openAssignmentCount:1});
  expect(JSON.stringify(overview)).not.toContain(students[1]!);
 });

 it('removes mission records with the student and never touches authored documents',async()=>{
  const {teacher,students}=await classroom(1),mission=await service.createMission(teacher,reading);
  await service.submitMission(students[1]!,mission.id,{answers:{},note:''});
  await service.deleteStudent(teacher,1);
  expect((await pool.query('SELECT count(*)::int AS n FROM knolstory_class.mission_progress WHERE mission_id=$1',[mission.id])).rows[0].n).toBe(0);
  expect(await service.listMissionProgress(teacher,mission.id)).toEqual([]);
 });
});
