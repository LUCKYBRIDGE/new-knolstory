import {randomBytes} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {CLASS_CODE_ALPHABET,decryptText,encryptText,generateClassCode,generateQrToken,generateStudentPassword,hashQrToken,hashSecret,normalizeClassCode,parseClassroomSecret,validQrToken,verifySecret} from './secrets';
const key=randomBytes(32);
describe('classroom secrets',()=>{
 it('hashes with scrypt, salts each hash and verifies only the same secret',async()=>{
  const first=await hashSecret('교사-코드-1234'),second=await hashSecret('교사-코드-1234');
  expect(first).toMatch(/^scrypt\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);expect(first).not.toBe(second);
  expect(await verifySecret('교사-코드-1234',first)).toBe(true);
  expect(await verifySecret('교사-코드-1235',first)).toBe(false);
  for(const stored of ['','scrypt','scrypt$a$b','plain$x$y','scrypt$AAAA$AAAA'])expect(await verifySecret('x',stored)).toBe(false);
 });
 it('generates six character class codes without 0, O, 1 or I',()=>{
  expect(CLASS_CODE_ALPHABET).toHaveLength(32);expect(CLASS_CODE_ALPHABET).not.toMatch(/[01OI]/);
  for(let i=0;i<300;i++)expect(generateClassCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  expect(generateClassCode(()=>0)).toBe('AAAAAA');expect(generateClassCode(max=>max-1)).toBe('999999');
 });
 it('normalises typed class codes',()=>{
  expect(normalizeClassCode(' abc2de ')).toBe('ABC2DE');
  for(const value of ['ABC0DE','ABCDE','ABCDEFG','ABCIDE',1,null,undefined])expect(normalizeClassCode(value)).toBeNull();
 });
 it('generates four digit student passwords including leading zeros',()=>{
  for(let i=0;i<200;i++)expect(generateStudentPassword()).toMatch(/^\d{4}$/);
  expect(generateStudentPassword(()=>7)).toBe('0007');expect(generateStudentPassword(()=>9999)).toBe('9999');
 });
 it('creates 32 byte QR tokens and stores only the sha256 hash',()=>{
  const first=generateQrToken(),second=generateQrToken();
  expect(validQrToken(first.token)).toBe(true);expect(Buffer.from(first.token,'base64url')).toHaveLength(32);
  expect(first.hash).toMatch(/^[a-f0-9]{64}$/);expect(first.hash).toBe(hashQrToken(first.token));
  expect(first.token).not.toBe(second.token);expect(first.hash).not.toContain(first.token);
  for(const value of ['',' ','a'.repeat(42),'a'.repeat(44),'a'.repeat(42)+'+',1,null])expect(validQrToken(value)).toBe(false);
 });
 it('round trips AES-256-GCM and binds ciphertext to its context',()=>{
  const cipher=encryptText(key,'0427','account-1');
  expect(cipher).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);expect(cipher).not.toContain('0427');
  expect(encryptText(key,'0427','account-1')).not.toBe(cipher);
  expect(decryptText(key,cipher,'account-1')).toBe('0427');
  expect(()=>decryptText(key,cipher,'account-2')).toThrow();
  expect(()=>decryptText(randomBytes(32),cipher,'account-1')).toThrow();
  const parts=cipher.split('.');parts[3]=Buffer.from('xxxx').toString('base64url');
  expect(()=>decryptText(key,parts.join('.'),'account-1')).toThrow();
  expect(()=>decryptText(key,'v2.a.b.c','account-1')).toThrow();
  expect(()=>encryptText(randomBytes(16),'x','a')).toThrow();
 });
 it('requires the classroom secret to be 32 bytes of base64',()=>{
  expect(parseClassroomSecret(key.toString('base64'))).toEqual(key);
  expect(parseClassroomSecret(' '+key.toString('base64url')+'\n')).toEqual(key);
  for(const value of ['',randomBytes(31).toString('base64'),randomBytes(33).toString('base64'),'not base64!','*'.repeat(44)])expect(()=>parseClassroomSecret(value)).toThrow('Invalid classroom secret.');
 });
});
