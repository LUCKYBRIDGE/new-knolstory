import {describe,it,expect,vi} from 'vitest';
import {classMe,classroomRead,classroomCreate,studentsPermissions,studentLogin,submissionMine,effectivePermissions,presetLabel,PERMISSION_PRESETS,ALL_EDITING_ALLOWED,ClassroomError,studentUpdate,submissionPut} from './classroom-api';
const res=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status});
const ok=(data:unknown)=>res(200,{success:true,data});
describe('classroom permissions helpers',()=>{
 it('resolves student > class default > all allowed',()=>{
  const text=PERMISSION_PRESETS[0]!.permissions,images=PERMISSION_PRESETS[1]!.permissions;
  expect(effectivePermissions(images,text)).toBe(images);expect(effectivePermissions(null,text)).toBe(text);expect(effectivePermissions(undefined,null)).toBe(ALL_EDITING_ALLOWED);
 });
 it('names presets and labels custom mixes',()=>{
  expect(PERMISSION_PRESETS.map(item=>item.label)).toEqual(['글만','글·이미지','전체']);
  expect(presetLabel(PERMISSION_PRESETS[0]!.permissions)).toBe('글만');expect(presetLabel({...ALL_EDITING_ALLOWED,audio:false})).toBe('직접 고름');
 });
});
describe('classroom client',()=>{
 it('reads me and treats 401 as signed out',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(ok({role:'teacher',account:{id:'a'}})).mockResolvedValueOnce(res(401,{success:false,error:{code:'SESSION_REQUIRED'}}));
  expect((await classMe(fetcher))?.role).toBe('teacher');expect(await classMe(fetcher)).toBeNull();expect(fetcher.mock.calls[0][0]).toBe('/api/v1/class/me');
 });
 it('rejects malformed me',async()=>{await expect(classMe(vi.fn().mockResolvedValue(ok({role:'king',account:{id:'a'}})))).rejects.toThrow();});
 it('sends csrf and JSON on writes',async()=>{
  const classroom={id:'c',name:'3반',classCode:'ABC234',studentCount:0,defaultPermissions:ALL_EDITING_ALLOWED,students:[]};
  const fetcher=vi.fn().mockImplementation(async()=>ok(classroom));
  await classroomCreate('3반','csrf',fetcher);expect(fetcher.mock.calls[0][1]).toMatchObject({method:'POST',headers:{'x-csrf-token':'csrf','content-type':'application/json'},body:'{"name":"3반"}',redirect:'error'});
  await studentsPermissions([1,2],null,'csrf',fetcher);expect(fetcher.mock.calls[1][0]).toBe('/api/v1/class/classroom/students/permissions');expect(fetcher.mock.calls[1][1].body).toBe('{"numbers":[1,2],"permissions":null}');
 });
 it('refuses writes without csrf',async()=>{await expect(classroomCreate('x','',vi.fn())).rejects.toMatchObject({code:'SESSION_REQUIRED'});});
 it('returns null when no class exists yet and surfaces codes otherwise',async()=>{
  expect(await classroomRead(vi.fn().mockResolvedValue(res(404,{success:false,error:{code:'CLASSROOM_NOT_FOUND'}})))).toBeNull();
  await expect(classroomRead(vi.fn().mockResolvedValue(res(403,{success:false,error:{code:'ROLE_NOT_ALLOWED'}})))).rejects.toBeInstanceOf(ClassroomError);
  await expect(studentLogin({classCode:'A',number:1,password:'1'},vi.fn().mockResolvedValue(res(401,{success:false,error:{code:'INVALID_LOGIN'}})))).rejects.toMatchObject({code:'INVALID_LOGIN',message:expect.stringContaining('다시 확인')});
 });
 it('treats 404 submission as not submitted and validates put response',async()=>{
  expect(await submissionMine('x',vi.fn().mockResolvedValue(res(404,{success:false,error:{code:'ASSIGNMENT_NOT_FOUND'}})))).toBeNull();
  expect(await submissionPut('x',{} as never,'csrf',vi.fn().mockResolvedValue(ok({submittedAt:5})))).toBe(5);
  await expect(submissionPut('x',{} as never,'csrf',vi.fn().mockResolvedValue(ok({})))).rejects.toThrow();
 });
 it('maps network failure to a service error',async()=>{await expect(studentUpdate(1,{name:'a'},'c',vi.fn().mockRejectedValue(Error('x')))).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});});
});
