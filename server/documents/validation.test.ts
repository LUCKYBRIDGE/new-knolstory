import {describe,it,expect} from 'vitest';
import {identifier,idempotency,listInput,positive,timestamp,requestHash,requestObject,clockTime} from './validation';
const recordId='12345678-1234-4123-8123-123456789012';
describe('document command validation',()=>{
 it.each([null,1,[],{},'a','A'.repeat(36)])('rejects invalid identifiers %j',value=>expect(()=>identifier(value)).toThrow());
 it.each([null,1,'','a b','x'.repeat(129),'가','a!'])('rejects invalid idempotency keys %j',value=>expect(()=>idempotency(value)).toThrow());
 it('accepts bounded opaque keys and exact identifiers',()=>{expect(idempotency('a_b-1')).toBe('a_b-1');expect(identifier(recordId)).toBe(recordId);});
 it.each([null,[],{limit:0},{limit:51},{limit:1.2},{owner:recordId},{cursor:''},{cursor:'***'},{cursor:'bm90anNvbg'},{cursor:Buffer.from(JSON.stringify({updatedAt:-1,recordId})).toString('base64url')},{cursor:Buffer.from(JSON.stringify({updatedAt:1,recordId:'bad'})).toString('base64url')},{cursor:Buffer.from(JSON.stringify({updatedAt:1,recordId,owner:recordId})).toString('base64url')}])('rejects invalid pagination %j',value=>expect(()=>listInput(value)).toThrow());
 it('uses a deterministic canonical cursor',()=>{const cursor={updatedAt:1,recordId};expect(listInput({limit:1,cursor:Buffer.from(JSON.stringify(cursor)).toString('base64url')})).toEqual({limit:1,cursor});expect(listInput({})).toEqual({limit:20,cursor:null});});
 it.each([null,-1,NaN,Infinity,'x',9007199254740992])('rejects corrupt stored timestamps %j',value=>expect(()=>timestamp(value)).toThrow());
 it.each([0,-1,null,'x'])('rejects corrupt revisions %j',value=>expect(()=>positive(value)).toThrow());
 it('accepts integer pg values without coercing arbitrary primitives',()=>{expect(positive('2')).toBe(2);expect(timestamp('0')).toBe(0);expect(clockTime(()=>2)).toBe(2);});
 it('hashes full requests canonically while preserving array order and metadata',()=>{expect(requestHash({a:1,b:2})).toBe(requestHash({b:2,a:1}));expect(requestHash({a:[1,2]})).not.toBe(requestHash({a:[2,1]}));expect(requestHash({savedAt:'a'})).not.toBe(requestHash({savedAt:'b'}));});
 it('rejects extra/missing command fields and detaches captures',()=>{for(const value of [null,[],{}, {a:1,b:2}])expect(()=>requestObject(value,['a'])).toThrow();const original={a:{title:'원고'}};const captured=requestObject(original,['a']);original.a.title='변경';expect(captured.a).toEqual({title:'원고'});});
});
