import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {unzipSync,strFromU8} from 'fflate';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {createAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import {newShortStory} from '../../packages/compatibility/src/shortstory';
import {runStorageMigrations} from '../migrations/runner';
import {createClassroomService} from './service';
import {classroomZip} from './season-export';

const pool=new Pool();
const march=Date.parse('2027-03-01T00:00:00+09:00');
let now=march-1;
const service=createClassroomService(pool,{secret:randomBytes(32),adminAccountIds:[],origin:'https://test.example',clock:()=>now});
beforeAll(async()=>{await runStorageMigrations(pool);});
afterAll(async()=>{await pool.end();});

async function readZip(teacher:string,year:number){
 const chunks:Uint8Array[]=[];
 for await(const chunk of classroomZip(service.exportSeason(teacher,year)))chunks.push(chunk);
 return unzipSync(Buffer.concat(chunks));
}

it('downloads only the selected year and teacher, with editable work files, answers and reviews',async()=>{
 const teacher=randomUUID(),other=randomUUID();
 await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES ($1,'active','teacher'),($2,'active','teacher')",[teacher,other]);
 const room=await service.createClassroom(teacher,'우리 반');
 await service.createClassroom(other,'다른 반');
 const roster=await service.addStudents(teacher,1);
 const pupil=await service.verifyStudentLogin(room.classCode,1,roster.students[0]!.password);
 const task=await service.createAssignment(teacher,{title:'이어 쓰기',description:'',storyKey:null,format:'shortstory',recipients:[1]});
 const work=await createAuthoringArchive({format:'shortstory',project:{...newShortStory(),title:'01_내 그림책'}});
 const document=await prepareJsonbSnapshot(work);
 await service.setTemplate(teacher,task.id,document);
 await service.saveDraft(pupil!,task.id,document);
 await service.commentDraft(teacher,task.id,1,'조금 더 써 봐요');
 await service.submit(pupil!,task.id,document);
 await service.reviewSubmission(teacher,task.id,1,{reviewStatus:'passed',feedback:'잘했어요',expectedSubmittedAt:now});
 const mission=await service.createMission(teacher,{title:'읽은 느낌',description:'',criteria:'',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'누구를 만났나요?'}]});
 await service.submitMission(pupil!,mission.id,{answers:{q1:'토끼'},note:'인상 깊었어요'});
 await service.reviewMission(teacher,mission.id,1,{reviewStatus:'passed',feedback:'잘 읽었어요',expectedSubmittedAt:now});
 now=march;
 await service.createAssignment(teacher,{title:'새 학년 과제',description:'',storyKey:null,format:'shortstory'});
 const files=await readZip(teacher,2026);
 const contents=Object.entries(files).map(([key,bytes])=>[key,strFromU8(bytes)] as const);
 const works=contents.filter(([key])=>key.endsWith('.shortstory'));
 expect(works).toHaveLength(3);
 for(const [,file] of works)expect(await decodeAuthoringArchive(file)).toEqual(work);
 const metadata=contents.filter(([key])=>key.endsWith('.json')).map(([,data])=>data).join('\n');
 for(const word of ['이어 쓰기','조금 더 써 봐요','잘했어요','토끼','잘 읽었어요'])expect(metadata).toContain(word);
 for(const word of ['새 학년 과제',room.classCode,'password',pupil!,teacher])expect(metadata).not.toContain(word);
 const otherFiles=await readZip(other,2026);
 expect(Object.keys(otherFiles)).toEqual(['학급.json']);
 await expect(readZip(pupil!,2026)).rejects.toMatchObject({status:404});
 now=Date.parse('2027-04-01T00:00:00+09:00');
 await expect(readZip(teacher,2026)).rejects.toMatchObject({status:404});
});
