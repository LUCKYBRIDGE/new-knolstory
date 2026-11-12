import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Pool,type PoolClient} from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';

const pool=new Pool({max:2});
const migration=await readFile(new URL('../migrations/009-assignment-format.sql',import.meta.url),'utf8');

async function previousSchema(run:(client:PoolClient,seed:(formats:string[])=>Promise<string>)=>Promise<void>){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('ALTER TABLE knolstory_class.assignments DROP COLUMN format');
  const teacher=randomUUID(),room=randomUUID();
  await client.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
  await client.query("INSERT INTO knolstory_class.classrooms(id,teacher_account_id,name,class_code,default_permissions,created_at) VALUES($1,$2,'이전 학급','ABC234','{}',0)",[room,teacher]);
  let number=0;
  const seed=async(formats:string[])=>{
   const assignment=randomUUID();
   await client.query("INSERT INTO knolstory_class.assignments(id,classroom_id,title,created_at) VALUES($1,$2,'이전 과제',0)",[assignment,room]);
   for(const format of formats){
    const student=randomUUID();
    await client.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','student')",[student]);
    await client.query("INSERT INTO knolstory_class.students(account_id,classroom_id,number,password_hash,password_cipher) VALUES($1,$2,$3,'fixture','fixture')",[student,room,++number]);
    await client.query('INSERT INTO knolstory_class.submissions(assignment_id,student_account_id,document,submitted_at) VALUES($1,$2,$3::jsonb,0)',[assignment,student,JSON.stringify({payloadVersion:1,content:{format,untouched:'원고'}})]);
   }
   return assignment;
  };
  await run(client,seed);
 }finally{await client.query('ROLLBACK');client.release();}
}

describe('assignment format migration from the untyped schema',()=>{
 beforeAll(async()=>{await runStorageMigrations(pool);});
 afterAll(async()=>{await pool.end();});
 it('infers unanimous prior submissions and preserves every original document',async()=>{
  await previousSchema(async(client,seed)=>{
   const empty=await seed([]),knolstory=await seed(['knolstory']),shortstory=await seed(['shortstory','shortstory']);
   const before=(await client.query('SELECT * FROM knolstory_class.submissions ORDER BY assignment_id,student_account_id')).rows;
   await client.query(migration);
   const rows=(await client.query('SELECT id,format FROM knolstory_class.assignments WHERE id=ANY($1::uuid[])',[[empty,knolstory,shortstory]])).rows;
   expect(rows).toEqual(expect.arrayContaining([{id:empty,format:'knolstory'},{id:knolstory,format:'knolstory'},{id:shortstory,format:'shortstory'}]));
   expect((await client.query('SELECT * FROM knolstory_class.submissions ORDER BY assignment_id,student_account_id')).rows).toEqual(before);
  });
 });
 it('stops mixed prior submission kinds with an actionable error',async()=>{
  await previousSchema(async(client,seed)=>{
   const id=await seed(['knolstory','shortstory']);
   const before=(await client.query('SELECT * FROM knolstory_class.submissions WHERE assignment_id=$1 ORDER BY student_account_id',[id])).rows;
   await client.query('SAVEPOINT before_format_migration');
   await expect(client.query(migration)).rejects.toMatchObject({message:expect.stringContaining(id),hint:expect.stringContaining('preserve all submissions')});
   await client.query('ROLLBACK TO SAVEPOINT before_format_migration');
   expect((await client.query('SELECT * FROM knolstory_class.submissions WHERE assignment_id=$1 ORDER BY student_account_id',[id])).rows).toEqual(before);
   expect((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='knolstory_class' AND table_name='assignments' AND column_name='format'")).rows).toEqual([]);
  });
 });
 it('stops unknown prior document kinds for explicit review',async()=>{
  await previousSchema(async(client,seed)=>{
   const id=await seed(['unknown']);
   const before=(await client.query('SELECT * FROM knolstory_class.submissions WHERE assignment_id=$1 ORDER BY student_account_id',[id])).rows;
   await client.query('SAVEPOINT before_format_migration');
   await expect(client.query(migration)).rejects.toMatchObject({message:expect.stringContaining(id),hint:expect.stringContaining('preserve all submissions')});
   await client.query('ROLLBACK TO SAVEPOINT before_format_migration');
   expect((await client.query('SELECT * FROM knolstory_class.submissions WHERE assignment_id=$1 ORDER BY student_account_id',[id])).rows).toEqual(before);
   expect((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='knolstory_class' AND table_name='assignments' AND column_name='format'")).rows).toEqual([]);
  });
 });
});
