import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {createAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {koreaMidnight} from './season-calendar';
import {purgePastClasswork} from './season-retention';
import {createClassroomService} from './service';

const pool=new Pool({max:4});
beforeAll(()=>runStorageMigrations(pool));
afterAll(()=>pool.end());

it('archives last year’s tasks, preserves new work and accounts, and removes only expired classroom material',async()=>{
 let now=koreaMidnight(1972,2,29);
 const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://story.example',clock:()=>now});
 const teacher=randomUUID();
 await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
 const room=await service.createClassroom(teacher,'학년도 확인');
 const student=(await service.addStudents(teacher,1)).students[0]!;
 const account=(await service.verifyStudentLogin(room.classCode,student.number,student.password))!;
 const task={title:'동화',description:'',storyKey:null,format:'shortstory' as const};
 const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:{...newShortStory(),title:'01_내 이야기'}}));
 const old=await service.createAssignment(teacher,task);
 await service.saveDraft(account,old.id,snapshot);
 await service.submit(account,old.id,snapshot);
 await service.commentDraft(teacher,old.id,1,'지난 한마디');
 const mission=await service.createMission(teacher,{title:'읽기',description:'',criteria:'',kind:'reading',storyKey:'rabbit',readingFormat:'original',questions:[]});
 await service.submitMission(account,mission.id,{answers:{},note:'읽었어요'});
 now=koreaMidnight(1972,3,1);
 const fresh=await service.createAssignment(teacher,task);
 expect(await service.listAssignments(account,'student')).toEqual(expect.arrayContaining([
  expect.objectContaining({id:old.id,open:false,archived:true}),expect.objectContaining({id:fresh.id,open:true})]));
 expect((await service.listMissionProgress(teacher,mission.id))[0]?.note).toBe('읽었어요');
 for(const change of [()=>service.deleteAssignment(teacher,old.id),()=>service.patchAssignment(teacher,old.id,{open:true}),
  ()=>service.commentDraft(teacher,old.id,1,'한마디'),()=>service.setTemplate(teacher,old.id,snapshot),
  ()=>service.saveDraft(account,old.id,snapshot),()=>service.submit(account,old.id,snapshot),
  ()=>service.reviewSubmission(teacher,old.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:old.createdAt}),
  ()=>service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'',expectedSubmittedAt:mission.createdAt}),()=>service.submitMission(account,mission.id,{answers:{},note:'수정'}),
  ()=>service.setMissionOpen(teacher,mission.id,{open:true})]){
  await expect(change()).rejects.toMatchObject({code:'SEASON_ARCHIVED'});
 }
 expect((await service.readOwnSubmission(account,old.id)).document).toEqual(snapshot);
 expect((await service.readOwnDraft(account,old.id)).comment).toBe('지난 한마디');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await purgePastClasswork(client,koreaMidnight(1972,4,1)-1);
  expect((await client.query('SELECT id FROM knolstory_class.assignments WHERE id=$1',[old.id])).rowCount).toBe(1);
  await purgePastClasswork(client,koreaMidnight(1972,4,1));
  await purgePastClasswork(client,koreaMidnight(1972,4,1));
  expect((await client.query('SELECT id FROM knolstory_class.assignments WHERE id=ANY($1::uuid[])',[[old.id,fresh.id]])).rows).toEqual([{id:fresh.id}]);
  for(const table of ['submissions','submission_drafts'])expect((await client.query(`SELECT 1 FROM knolstory_class.${table} WHERE assignment_id=$1`,[old.id])).rowCount).toBe(0);
  expect((await client.query('SELECT 1 FROM knolstory_class.mission_progress WHERE mission_id=$1',[mission.id])).rowCount).toBe(0);
  expect((await client.query('SELECT 1 FROM knolstory_class.students WHERE account_id=$1 AND classroom_id=$2',[account,room.id])).rowCount).toBe(1);
 }finally{await client.query('ROLLBACK');client.release();}
});
