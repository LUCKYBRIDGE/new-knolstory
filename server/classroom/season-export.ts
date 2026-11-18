import {Zip,ZipPassThrough} from 'fflate';
import {restoreJsonbSnapshot} from '../../packages/compatibility/src/authoring-archive';
import type {SqlClient,SqlPool} from '../storage/postgres-save-port';
import {ClassroomError} from './errors';
import {recipientNumbersSql} from './recipients';
import {koreaMidnight,retentionCutoff,schoolYear} from './season-calendar';

type Entry={name:string;data:string};
const json=(name:string,value:unknown):Entry=>({name,data:JSON.stringify(value,null,2)});
const scope='t.classroom_id=$1 AND t.created_at >= $2 AND t.created_at < $3';
const numberedTask=(title:unknown,id:unknown)=>String(title).replace(/[^\p{L}\p{N} _-]/gu,'_').slice(0,32).trim()+'-'+String(id);

async function* rows(client:SqlClient,select:string,params:unknown[]){
 await client.query('DECLARE material NO SCROLL CURSOR FOR '+select,params);
 for(;;){
  const result=await client.query('FETCH FORWARD 1 FROM material');
  if(!result.rows.length)break;
  yield result.rows[0]!;
 }
 await client.query('CLOSE material');
}

async function work(name:string,snapshot:unknown):Promise<Entry>{
 const content=await restoreJsonbSnapshot(snapshot);
 return {name:name+'.'+content.format,data:JSON.stringify(content)};
}

async function* material(client:SqlClient,params:unknown[]):AsyncGenerator<Entry>{
 const assignments=`SELECT t.id,t.title,t.description,t.format,t.story_key,t.edition,t.start_point,t.start_label,
  t.share_url,t.open,t.created_at,t.due_at,t.checks,t.target_amount,t.template_title,t.template,${recipientNumbersSql('t')}
  FROM knolstory_class.assignments t WHERE ${scope} ORDER BY t.created_at,t.id`;
 for await(const {template,...task} of rows(client,assignments,params)){
  const folder='작품 과제/'+numberedTask(task.title,task.id);
  yield json(folder+'/과제.json',task);
  if(template)yield await work(folder+'/양식',template);
 }
 for(const kind of ['submission_drafts','submissions'] as const){
  const draft=kind==='submission_drafts',label=draft?'중간본':'제출본';
  const fields=draft?'p.saved_at,p.comment,p.commented_at':'p.submitted_at,p.review_status,p.feedback,p.reviewed_at';
  const submissions=`SELECT t.id,t.title,s.number,s.name,p.amount,p.chars,${fields},p.document
   FROM knolstory_class.assignments t JOIN knolstory_class.${kind} p ON p.assignment_id=t.id
   JOIN knolstory_class.students s ON s.account_id=p.student_account_id AND s.classroom_id=t.classroom_id
   WHERE ${scope} ORDER BY t.id,s.number`;
  for await(const {id,title,document,...progress} of rows(client,submissions,params)){
   const folder='작품 과제/'+numberedTask(title,id)+'/'+String(progress.number).padStart(2,'0')+'번/';
   yield json(folder+label+' 기록.json',progress);
   yield await work(folder+label,document);
  }
 }
 const missions=`SELECT t.id,t.title,t.description,t.criteria,t.kind,t.story_key,t.reading_format,t.questions,t.open,
  t.created_at,t.due_at,${recipientNumbersSql('t')} FROM knolstory_class.missions t WHERE ${scope} ORDER BY t.created_at,t.id`;
 for await(const mission of rows(client,missions,params))yield json('미션/'+numberedTask(mission.title,mission.id)+'/미션.json',mission);
 const answers=`SELECT t.id,t.title,s.number,s.name,p.answers,p.note,p.submitted_at,p.review_status,p.feedback,p.reviewed_at
  FROM knolstory_class.missions t JOIN knolstory_class.mission_progress p ON p.mission_id=t.id
  JOIN knolstory_class.students s ON s.account_id=p.student_account_id AND s.classroom_id=t.classroom_id
  WHERE ${scope} ORDER BY t.id,s.number`;
 for await(const {id,title,...answer} of rows(client,answers,params)){
  yield json('미션/'+numberedTask(title,id)+'/'+String(answer.number).padStart(2,'0')+'번 답과 피드백.json',answer);
 }
}

export async function* seasonEntries(pool:SqlPool,teacher:string,year:number,at:number):AsyncGenerator<Entry>{
 const start=koreaMidnight(year,3,1);
 if(!Number.isInteger(year)||year>schoolYear(at)||start<retentionCutoff(at))throw new ClassroomError(404,'NOT_FOUND');
 const client=await pool.connect();
 let destroy=false;
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL idle_in_transaction_session_timeout = '90s'");
  const room=(await client.query('SELECT id,name FROM knolstory_class.classrooms WHERE teacher_account_id=$1',[teacher])).rows[0];
  if(!room)throw new ClassroomError(404,'CLASSROOM_NOT_FOUND');
  yield json('학급.json',{학급:room.name,학년도:year,받은시각:new Date(at).toISOString(),
   이용방법:'작품 과제 폴더의 양식, 중간본, 제출본은 놀스토리의 파일 열기로 열 수 있어요. 기록과 미션 답은 텍스트 편집기로 열어 보세요.'});
  yield* material(client,[room.id,start,koreaMidnight(year+1,3,1)]);
 }finally{
  try{await client.query('ROLLBACK');}catch{destroy=true;}finally{client.release(destroy);}
 }
}

export async function* classroomZip(entries:AsyncIterable<Entry>):AsyncGenerator<Uint8Array>{
 let output:Uint8Array[]=[];
 const zip=new Zip((error,data)=>{if(error)throw error;output.push(data);});
 try{
  for await(const entry of entries){
   const file=new ZipPassThrough(entry.name);
   zip.add(file);
   file.push(Buffer.from(entry.data),true);
   yield* output;
   output=[];
  }
  zip.end();
  yield* output;
 }finally{zip.terminate();}
}
