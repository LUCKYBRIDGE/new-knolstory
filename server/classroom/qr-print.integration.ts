import {randomBytes,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {runStorageMigrations} from '../migrations/runner';
import {ClassroomError,createClassroomService} from './service';
import {decryptText,encryptText,hashQrToken} from './secrets';
const pool=new Pool({max:6}),key=randomBytes(32);
const service=createClassroomService(pool,{secret:key,adminAccountIds:[],origin:'https://story.example'});
const token=(url:string)=>new URL(url).searchParams.get('q')!;
async function room(count=3){
 const teacher=randomUUID();await pool.query("INSERT INTO knolstory_auth.accounts(id,status,role) VALUES($1,'active','teacher')",[teacher]);
 await service.createClassroom(teacher,'함께 쓰는 반');const classroom=await service.addStudents(teacher,count);
 const rows=async()=>(await pool.query('SELECT account_id,number,qr_token_hash,qr_token_cipher,password_cipher FROM knolstory_class.students WHERE classroom_id=$1 ORDER BY number',[classroom.id])).rows;
 return {teacher,classroom,rows};
}
async function failure(action:Promise<unknown>){try{await action;}catch(error){if(error instanceof ClassroomError)return `${error.status} ${error.code}`;throw error;}throw Error('Expected failure.');}
describe('reusable QR print preparation in PostgreSQL',()=>{
 beforeAll(()=>runStorageMigrations(pool));afterAll(()=>pool.end());
 it('keeps issued QR tokens stable and returns sorted cards without plaintext storage',async()=>{
  const fixture=await room(),before=await fixture.rows(),issued=await service.issueQr(fixture.teacher,1);
  const first=await service.prepareQrPrint(fixture.teacher,[3,1,2]);
  expect(first).toMatchObject({className:'함께 쓰는 반',classCode:fixture.classroom.classCode});
  expect(first.cards.map(card=>card.number)).toEqual([1,2,3]);expect(first.cards[0].url).toBe(issued.url);
  expect(await service.prepareQrPrint(fixture.teacher,[1,2,3],true)).toEqual(first);
  const concurrent=await Promise.all([1,2,3].map(()=>service.prepareQrPrint(fixture.teacher,[1,2,3])));
  expect(concurrent.every(value=>JSON.stringify(value)===JSON.stringify(first))).toBe(true);
  const stored=await fixture.rows();
  for(const [index,row] of stored.entries()){
   const raw=token(first.cards[index].url);expect(raw).toHaveLength(27);expect(new URL(first.cards[index].url).searchParams.has('class-login')).toBe(false);expect(row.qr_token_hash).toBe(hashQrToken(raw));expect(row.qr_token_cipher).not.toContain(raw);
   expect(decryptText(key,row.qr_token_cipher,`qr:${row.account_id}`)).toBe(raw);
   expect(()=>decryptText(key,row.qr_token_cipher,row.account_id)).toThrow();
   expect(row.password_cipher).toBe(before[index].password_cipher);expect(await service.verifyQrToken(raw)).toBe(row.account_id);
  }
  const overview=JSON.stringify(await service.getClassroom(fixture.teacher));
  for(const card of first.cards)expect(overview).not.toContain(token(card.url));
  expect(overview).not.toContain(stored[0].qr_token_cipher);
 });
 it('does not change any row until legacy hash-only reissue is explicitly allowed',async()=>{
  const fixture=await room(),rows=await fixture.rows(),legacyToken=randomBytes(32).toString('base64url'),legacy={token:legacyToken,hash:hashQrToken(legacyToken)};
  await pool.query('UPDATE knolstory_class.students SET qr_token_hash=$2 WHERE account_id=$1',[rows[0].account_id,legacy.hash]);
  const current=await service.issueQr(fixture.teacher,3),before=await fixture.rows();
  expect(await failure(service.prepareQrPrint(fixture.teacher,[2,1,3]))).toBe('409 QR_REISSUE_REQUIRED');
  expect(await fixture.rows()).toEqual(before);expect(await service.verifyQrToken(legacy.token)).toBe(rows[0].account_id);
  const printed=await service.prepareQrPrint(fixture.teacher,[3,2,1],true);
  expect(printed.cards[2].url).toBe(current.url);expect(await service.verifyQrToken(legacy.token)).toBeNull();
  expect(await service.verifyQrToken(token(printed.cards[0].url))).toBe(rows[0].account_id);
  expect(await service.prepareQrPrint(fixture.teacher,[1,2,3],true)).toEqual(printed);
 });
 it('scopes all numbers to the owning class and rolls back missing or invalid selections',async()=>{
  const own=await room(2),other=await room(1);
  const a=await service.prepareQrPrint(own.teacher,[1]),b=await service.prepareQrPrint(other.teacher,[1]);expect(a.cards[0].url).not.toBe(b.cards[0].url);
  const before=await own.rows();expect(await failure(service.prepareQrPrint(own.teacher,[2,3]))).toBe('404 STUDENT_NOT_FOUND');expect(await own.rows()).toEqual(before);
  expect(await failure(service.prepareQrPrint(randomUUID(),[1]))).toBe('404 CLASSROOM_NOT_FOUND');
  for(const values of [[],[1,1],[0],[31],['1'],Array.from({length:31},(_,i)=>i+1)])expect(await failure(service.prepareQrPrint(own.teacher,values as number[]))).toBe('400 INVALID_REQUEST');
 });
 it('refuses corrupted or swapped ciphertext without rotating or partially issuing cards',async()=>{
  const fixture=await room(),prepared=await service.prepareQrPrint(fixture.teacher,[1,2]),rows=await fixture.rows();
  await pool.query('UPDATE knolstory_class.students SET qr_token_cipher=$2 WHERE account_id=$1',[rows[1].account_id,rows[0].qr_token_cipher]);
  const before=await fixture.rows();
  expect(await failure(service.prepareQrPrint(fixture.teacher,[3,2,1],true))).toBe('503 CLASSROOM_UNAVAILABLE');expect(await fixture.rows()).toEqual(before);
  expect(await service.verifyQrToken(token(prepared.cards[0].url))).toBe(rows[0].account_id);
 });
 it('refuses a mismatched hash or orphan cipher without changing tokens',async()=>{
  const fixture=await room(1);await service.prepareQrPrint(fixture.teacher,[1]);const rows=await fixture.rows();
  await pool.query('UPDATE knolstory_class.students SET qr_token_hash=$2 WHERE account_id=$1',[rows[0].account_id,'0'.repeat(64)]);
  const before=await fixture.rows();expect(await failure(service.prepareQrPrint(fixture.teacher,[1],true))).toBe('503 CLASSROOM_UNAVAILABLE');expect(await fixture.rows()).toEqual(before);
  await pool.query('UPDATE knolstory_class.students SET qr_token_hash=NULL WHERE account_id=$1',[rows[0].account_id]);
  expect(await failure(service.prepareQrPrint(fixture.teacher,[1],true))).toBe('503 CLASSROOM_UNAVAILABLE');
 });
 it('reprints stored legacy 256-bit tokens with the compact q URL and logs in both sizes',async()=>{
  const fixture=await room(2),rows=await fixture.rows(),legacy=randomBytes(32).toString('base64url');
  await pool.query('UPDATE knolstory_class.students SET qr_token_hash=$2,qr_token_cipher=$3 WHERE account_id=$1',[rows[0].account_id,hashQrToken(legacy),encryptText(key,legacy,`qr:${rows[0].account_id}`)]);
  const result=await service.prepareQrPrint(fixture.teacher,[1,2]);
  expect(result.cards[0].url).toBe(`https://story.example/?q=${legacy}`);
  expect(token(result.cards[0].url)).toHaveLength(43);expect(token(result.cards[1].url)).toHaveLength(27);
  for(const [index,card] of result.cards.entries())expect(await service.verifyQrToken(token(card.url))).toBe(rows[index].account_id);
  expect(await service.prepareQrPrint(fixture.teacher,[2,1])).toEqual(result);
 });
 it('individual reissue invalidates the printed card and later preparation retains the new card',async()=>{
  const fixture=await room(1),first=await service.prepareQrPrint(fixture.teacher,[1]);
  const replacement=await service.issueQr(fixture.teacher,1);expect(replacement.url).not.toBe(first.cards[0].url);
  expect(await service.verifyQrToken(token(first.cards[0].url))).toBeNull();expect(await service.verifyQrToken(token(replacement.url))).toBe((await fixture.rows())[0].account_id);
  expect((await service.prepareQrPrint(fixture.teacher,[1])).cards[0].url).toBe(replacement.url);
 });
});
