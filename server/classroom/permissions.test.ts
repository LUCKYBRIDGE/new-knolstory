import {describe,expect,it} from 'vitest';
import {ALLOW_ALL_PERMISSIONS,effectivePermissions,normalizePermissions,PermissionsError} from './permissions';
describe('editing permissions',()=>{
 it('allows everything by default and keeps text true',()=>{
  expect(normalizePermissions({})).toEqual(ALLOW_ALL_PERMISSIONS);
  expect(normalizePermissions({text:false,images:false})).toEqual({...ALLOW_ALL_PERMISSIONS,images:false});
 });
 it('returns every key in a fixed shape and does not share the default object',()=>{
  const result=normalizePermissions({images:true,characters:false,audio:false,direction:false,choices:false,newWorks:false,forcedStoryKey:'story-a'});
  expect(result).toEqual({text:true,images:true,characters:false,audio:false,direction:false,choices:false,newWorks:false,forcedStoryKey:'story-a'});
  expect(normalizePermissions({})).not.toBe(ALLOW_ALL_PERMISSIONS);
 });
 it.each([null,[],'x',1,{extra:true},{images:'yes'},{audio:1},{text:'true'},{forcedStoryKey:''},{forcedStoryKey:1},{forcedStoryKey:'a'.repeat(129)},{forcedStoryKey:'a\nb'}])('rejects %j',value=>{
  expect(()=>normalizePermissions(value)).toThrow(PermissionsError);
 });
 it('applies student override, then classroom default, then allow all',()=>{
  const student={...ALLOW_ALL_PERMISSIONS,audio:false},classroom={...ALLOW_ALL_PERMISSIONS,images:false};
  expect(effectivePermissions(student,classroom)).toEqual(student);
  expect(effectivePermissions(null,classroom)).toEqual(classroom);
  expect(effectivePermissions(undefined,undefined)).toEqual(ALLOW_ALL_PERMISSIONS);
  expect(effectivePermissions({broken:true},classroom)).toEqual(classroom);
  expect(effectivePermissions({broken:true},{broken:true})).toEqual(ALLOW_ALL_PERMISSIONS);
 });
});
