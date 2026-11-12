import {createServer,type Server} from 'node:http';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createClassroomRouter,type ClassroomRouterOptions} from './classroom-routes';
import {createClassroomHttpService} from './classroom-service';
import {createAuthStateService,type AuthStatePort,type StoredSession} from '../auth/auth-state';
import {ClassroomError,type ClassroomService,type Role} from '../classroom/service';
import {ALLOW_ALL_PERMISSIONS} from '../classroom/permissions';

const origin='http://localhost:3000',sessionCookie='knolstory-next-session';
const teacherId='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222',memberId='33333333-3333-4333-8333-333333333333',adminId='44444444-4444-4444-8444-444444444444';
const assignmentId='55555555-5555-4555-8555-555555555555';
const missionId='66666666-6666-4666-8666-666666666666';
const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>new Promise<void>(r=>{s.closeAllConnections();s.close(()=>r());})));});

async function harness(overrides:Partial<ClassroomRouterOptions>={}){
 let now=1_000_000;
 const sessions=new Map<string,StoredSession>(),accounts=new Map<string,Role>([[teacherId,'teacher'],[studentId,'student'],[memberId,'member'],[adminId,'admin']]);
 const port:AuthStatePort={
  async createFlow(){throw Error('unused');},async consumeFlow(){return null;},
  async issueSession(s){sessions.set(s.tokenHash,s);return true;},
  async findSession(hash,at){const s=sessions.get(hash);return s&&!s.revoked&&s.expiresAt>at?s:null;},
  async revokeSession(hash){const s=sessions.get(hash);if(s)sessions.set(hash,{...s,revoked:true});},
 };
 const authState=createAuthStateService({origin,flowTtlMs:10000,sessionTtlMs:60000,csrfSecret:'s'.repeat(32)},port,()=>now);
 const service={
  roleOf:vi.fn(async(id:string)=>accounts.get(id)??null),
  me:vi.fn(async(id:string,role:Role)=>({role,account:{id}})),
  teacherUpgrade:vi.fn(async()=>'teacher' as const),
  teacherCodeUpdatedAt:vi.fn(async()=>123),
  setTeacherCode:vi.fn(async()=>456),
  createClassroom:vi.fn(async()=>({id:'c'})),getClassroom:vi.fn(async()=>({id:'c'})),patchClassroom:vi.fn(async()=>({id:'c'})),
  addStudents:vi.fn(async()=>({id:'c'})),patchStudent:vi.fn(async()=>({number:3})),setPermissions:vi.fn(async()=>({id:'c'})),deleteStudent:vi.fn(async()=>({id:'c'})),
  prepareQrPrint:vi.fn(async()=>({className:'3반',classCode:'ABC234',cards:[]})),
  issueQr:vi.fn(async()=>({url:'http://localhost:3000/?q=t'})),
  verifyStudentLogin:vi.fn(async(_code:string,_number:number,password:string)=>password==='1234'?studentId:null),
  verifyQrToken:vi.fn(async(token:string)=>token==='q'.repeat(27)||token==='q'.repeat(43)?studentId:null),
  listAssignments:vi.fn(async()=>[]),createAssignment:vi.fn(async()=>({id:assignmentId})),patchAssignment:vi.fn(async()=>({id:assignmentId})),
  listSubmissions:vi.fn(async()=>[]),readSubmissionFor:vi.fn(async()=>({document:{},submittedAt:1})),readOwnSubmission:vi.fn(async()=>({document:{},submittedAt:1})),
  submit:vi.fn(async()=>({submittedAt:9})),
  listMissions:vi.fn(async()=>[]),createMission:vi.fn(async()=>({id:missionId})),setMissionOpen:vi.fn(async()=>({id:missionId,open:false})),
  submitMission:vi.fn(async()=>({submittedAt:11})),listMissionProgress:vi.fn(async()=>[]),reviewMission:vi.fn(async()=>({number:3,reviewStatus:'passed'})),
 };
 const router=createClassroomRouter({origin,authState,classroom:service as unknown as ClassroomService,clock:()=>now,...overrides});
 const server=createServer((req,res)=>{void router(req,res);});servers.push(server);
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const address=server.address();if(!address||typeof address==='string')throw Error('address');
 const base=`http://127.0.0.1:${address.port}`;
 async function login(account:string){const issued=await authState.issueSession(account);return {cookie:`${sessionCookie}=${issued.token}`,csrf:issued.csrf,token:issued.token};}
 const as=(who:{cookie:string;csrf:string})=>async(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>fetch(base+'/api/v1/class'+path,{method,headers:{cookie:who.cookie,origin,'x-csrf-token':who.csrf,...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const guest=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>fetch(base+'/api/v1/class'+path,{method,headers:{origin,...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {service,login,as,guest,sessions,advance(ms:number){now+=ms;},base};
}
const json=async(r:Response)=>r.json() as Promise<{success:boolean;data?:unknown;error?:{code:string}}>;
const code=async(r:Response)=>(await json(r)).error?.code;

describe('classroom routes: gating',()=>{
 it('answers 503 CLASSROOM_NOT_CONFIGURED for every route when the secret is absent',async()=>{
  const handler=createClassroomHttpService({origin,flowTtlMs:1,sessionTtlMs:1,csrfSecret:'s'.repeat(32)},{adminAccountIds:[]},{connect:async()=>{throw Error('no db');}});
  const server=createServer((req,res)=>{void handler(req,res);});servers.push(server);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const port=(server.address() as {port:number}).port;
  for(const [method,path] of [['GET','/me'],['POST','/student-login'],['PUT','/classroom/assignments/x/submission']]){
   const response=await fetch(`http://127.0.0.1:${port}/api/v1/class${path}`,{method});
   expect(response.status).toBe(503);expect(await json(response)).toEqual({success:false,error:{code:'CLASSROOM_NOT_CONFIGURED'}});
  }
 });
 it('requires a session, then CSRF and exact Origin on writes, before touching the service',async()=>{
  const h=await harness(),teacher=await h.login(teacherId);
  expect((await h.guest('/me')).status).toBe(401);
  expect((await h.guest('/classroom/assignments')).status).toBe(401);
  const call=h.as(teacher);
  expect(await code(await call('/classroom','POST',{name:'a'},{'x-csrf-token':'bad'}))).toBe('INVALID_CSRF');
  expect(await code(await call('/classroom','POST',{name:'a'},{origin:'https://evil.test'}))).toBe('INVALID_CSRF');
  expect(await code(await call('/classroom/students/1/qr','POST',undefined,{'x-csrf-token':''}))).toBe('INVALID_CSRF');
  expect(h.service.createClassroom).not.toHaveBeenCalled();
  expect((await call('/me')).status).toBe(200);
 });
 it('rejects a duplicate session cookie and a revoked or unknown account',async()=>{
  const h=await harness(),teacher=await h.login(teacherId);
  expect((await h.as({cookie:`${teacher.cookie}; ${teacher.cookie}`,csrf:teacher.csrf})('/me')).status).toBe(400);
  const stranger=await h.login('99999999-9999-4999-8999-999999999999');
  expect(await code(await h.as(stranger)('/me'))).toBe('SESSION_REQUIRED');
 });
 it.each([
  ['member','/classroom','GET'],['student','/classroom','GET'],['member','/classroom/assignments','GET'],['teacher','/classroom/assignments/'+assignmentId+'/submission','GET'],
  ['teacher','/admin/teacher-code','GET'],['student','/teacher-upgrade','POST'],['teacher','/classroom/assignments/'+assignmentId+'/submission','PUT'],
 ])('forbids role %s on %s %s',async(role,path,method)=>{
  const h=await harness(),who=await h.login({member:memberId,student:studentId,teacher:teacherId}[role as 'member']),body=method==='GET'?undefined:{code:'123456',document:{}};
  const response=await h.as(who)(path,method,body);
  expect(response.status).toBe(403);expect(await code(response)).toBe('ROLE_NOT_ALLOWED');
 });
 it('lets administrators use teacher and admin routes and reports the admin role',async()=>{
  const h=await harness(),admin=h.as(await h.login(adminId));
  expect((await admin('/classroom')).status).toBe(200);
  expect(await json(await admin('/admin/teacher-code'))).toEqual({success:true,data:{updatedAt:123}});
  expect(await json(await admin('/admin/teacher-code','PUT',{code:'new-code-1'}))).toEqual({success:true,data:{updatedAt:456}});
  expect(h.service.setTeacherCode).toHaveBeenCalledWith('new-code-1');
  await admin('/me');expect(h.service.me).toHaveBeenCalledWith(adminId,'admin');
 });
 it('rejects unknown paths, methods, queries and encoded paths',async()=>{
  const h=await harness(),call=h.as(await h.login(teacherId));
  expect((await call('/nope')).status).toBe(404);
  const base=await fetch(h.base+'/api/v1/class');expect(base.status).toBe(404);
  const wrong=await call('/me','DELETE');expect(wrong.status).toBe(405);expect(wrong.headers.get('allow')).toBe('GET');
  expect((await call('/classroom','PUT',{})).headers.get('allow')).toBe('POST, GET, PATCH');
  expect((await call('/me?x=1')).status).toBe(400);
  expect((await call('/classroom/students/%31')).status).toBe(400);
  expect((await call('/classroom/students/31','DELETE')).status).toBe(400);
  expect((await call('/classroom/students/0','DELETE')).status).toBe(400);
  expect((await call('/classroom/assignments/not-a-uuid','PATCH',{open:true})).status).toBe(404);
  expect((await h.guest('/me')).headers.get('cache-control')).toBe('no-store');
 });
 it('rate limits every classroom request per client',async()=>{
  const h=await harness({rateLimit:{maxRequests:3,windowMs:20_000}}),call=h.as(await h.login(teacherId));
  for(let i=0;i<3;i++)expect((await call('/me')).status).toBe(200);
  expect(await code(await call('/me'))).toBe('RATE_LIMITED');
  h.advance(21_000);expect((await call('/me')).status).toBe(200);
 });
});

describe('classroom routes: teacher endpoints',()=>{
 it('calls the service with validated input for each endpoint',async()=>{
  const h=await harness(),t=h.as(await h.login(teacherId)),perms={...ALLOW_ALL_PERMISSIONS,audio:false};
  const created=await t('/classroom','POST',{name:' 3학년 1반 '});expect(created.status).toBe(201);expect(h.service.createClassroom).toHaveBeenCalledWith(teacherId,'3학년 1반');
  await t('/classroom');expect(h.service.getClassroom).toHaveBeenCalledWith(teacherId);
  await t('/classroom','PATCH',{name:'새 이름',regenerateCode:true,defaultPermissions:{audio:false}});
  expect(h.service.patchClassroom).toHaveBeenCalledWith(teacherId,{name:'새 이름',regenerateCode:true,defaultPermissions:perms});
  await t('/classroom/students','POST',{count:5});expect(h.service.addStudents).toHaveBeenCalledWith(teacherId,5);
  await t('/classroom/students/3','PATCH',{name:'민수',password:'9876',permissions:null});
  expect(h.service.patchStudent).toHaveBeenCalledWith(teacherId,3,{name:'민수',password:'9876',permissions:null});
  await t('/classroom/students/permissions','POST',{numbers:[1,2],permissions:{images:false}});
  expect(h.service.setPermissions).toHaveBeenCalledWith(teacherId,[1,2],{...ALLOW_ALL_PERMISSIONS,images:false});
  await t('/classroom/students/permissions','POST',{numbers:[4],permissions:null});expect(h.service.setPermissions).toHaveBeenLastCalledWith(teacherId,[4],null);
  await t('/classroom/students/7','DELETE');expect(h.service.deleteStudent).toHaveBeenCalledWith(teacherId,7);
  expect(await json(await t('/classroom/students/30/qr','POST'))).toEqual({success:true,data:{url:'http://localhost:3000/?q=t'}});
  expect(h.service.issueQr).toHaveBeenCalledWith(teacherId,30);
 });
 it.each([
  ['/classroom','POST',{}],['/classroom','POST',{name:''}],['/classroom','POST',{name:'x'.repeat(61)}],['/classroom','POST',{name:'a',extra:1}],
  ['/classroom','PATCH',{}],['/classroom','PATCH',{regenerateCode:false}],['/classroom','PATCH',{defaultPermissions:{images:'no'}}],
  ['/classroom/students','POST',{count:0}],['/classroom/students','POST',{count:31}],['/classroom/students','POST',{count:1.5}],['/classroom/students','POST',{count:'3'}],
  ['/classroom/students/3','PATCH',{}],['/classroom/students/3','PATCH',{password:'123'}],['/classroom/students/3','PATCH',{name:'x'.repeat(41)}],['/classroom/students/3','PATCH',{permissions:{bad:1}}],
  ['/classroom/students/permissions','POST',{numbers:[],permissions:null}],['/classroom/students/permissions','POST',{numbers:[1,1],permissions:null}],['/classroom/students/permissions','POST',{numbers:[31],permissions:null}],['/classroom/students/permissions','POST',{numbers:[1]}],
  ['/classroom/assignments','POST',{}],['/classroom/assignments','POST',{title:' '}],['/classroom/assignments','POST',{title:'t',storyKey:''}],
  ['/classroom/assignments/'+assignmentId,'PATCH',{}],['/classroom/assignments/'+assignmentId,'PATCH',{open:'yes'}],
 ] as const)('rejects invalid body %s %j',async(path,method,body)=>{
  const h=await harness(),response=await h.as(await h.login(teacherId))(path,method,body);
  expect(response.status).toBe(400);expect(await code(response)).toBe('INVALID_REQUEST');
  for(const fn of [h.service.createClassroom,h.service.patchClassroom,h.service.addStudents,h.service.patchStudent,h.service.setPermissions,h.service.createAssignment,h.service.patchAssignment])expect(fn).not.toHaveBeenCalled();
 });
 it('validates framing: content type, malformed json, oversized and unexpected bodies',async()=>{
  const h=await harness(),who=await h.login(teacherId),call=h.as(who);
  const plain=await fetch(h.base+'/api/v1/class/classroom',{method:'POST',headers:{cookie:who.cookie,origin,'x-csrf-token':who.csrf,'content-type':'text/plain'},body:'{}'});
  expect(plain.status).toBe(415);
  const broken=await fetch(h.base+'/api/v1/class/classroom',{method:'POST',headers:{cookie:who.cookie,origin,'x-csrf-token':who.csrf,'content-type':'application/json'},body:'{'});
  expect(broken.status).toBe(400);
  expect((await call('/classroom','POST',{name:'a'.repeat(20_000)})).status).toBe(413);
  const withBody=await fetch(h.base+'/api/v1/class/classroom/students/1/qr',{method:'POST',headers:{cookie:who.cookie,origin,'x-csrf-token':who.csrf,'content-type':'application/json'},body:'{}'});
  expect(withBody.status).toBe(400);
 });
 it('passes through domain errors with their status and code',async()=>{
  const h=await harness(),t=h.as(await h.login(teacherId));
  h.service.createClassroom.mockRejectedValueOnce(new ClassroomError(409,'CLASSROOM_EXISTS'));
  const exists=await t('/classroom','POST',{name:'a'});expect(exists.status).toBe(409);expect(await code(exists)).toBe('CLASSROOM_EXISTS');
  h.service.addStudents.mockRejectedValueOnce(new ClassroomError(409,'STUDENT_LIMIT'));expect(await code(await t('/classroom/students','POST',{count:2}))).toBe('STUDENT_LIMIT');
  h.service.getClassroom.mockRejectedValueOnce(new ClassroomError(404,'CLASSROOM_NOT_FOUND'));expect((await t('/classroom')).status).toBe(404);
  h.service.getClassroom.mockRejectedValueOnce(Error('database password leaked'));
  const unknown=await t('/classroom');expect(unknown.status).toBe(503);expect(JSON.stringify(await json(unknown))).not.toContain('password');
 });
 it('creates, patches and reads assignments and submissions',async()=>{
  const h=await harness(),t=h.as(await h.login(teacherId));
  expect((await t('/classroom/assignments','POST',{title:' 이야기 ',description:'설명',storyKey:'story-a'})).status).toBe(201);
  expect(h.service.createAssignment).toHaveBeenCalledWith(teacherId,{title:'이야기',description:'설명',storyKey:'story-a',format:'knolstory'});
  await t('/classroom/assignments','POST',{title:'t'});expect(h.service.createAssignment).toHaveBeenLastCalledWith(teacherId,{title:'t',description:'',storyKey:null,format:'knolstory'});
  expect((await t('/classroom/assignments','POST',{title:'그림 이야기',format:'shortstory'})).status).toBe(201);
  expect(h.service.createAssignment).toHaveBeenLastCalledWith(teacherId,{title:'그림 이야기',description:'',storyKey:null,format:'shortstory'});
  for(const format of ['other',null,1])expect((await t('/classroom/assignments','POST',{title:'잘못된 종류',format})).status).toBe(400);
  await t('/classroom/assignments/'+assignmentId,'PATCH',{open:false,title:'x'});expect(h.service.patchAssignment).toHaveBeenCalledWith(teacherId,assignmentId,{title:'x',open:false});
  await t('/classroom/assignments');expect(h.service.listAssignments).toHaveBeenCalledWith(teacherId,'teacher');
  await t(`/classroom/assignments/${assignmentId}/submissions`);expect(h.service.listSubmissions).toHaveBeenCalledWith(teacherId,assignmentId);
  await t(`/classroom/assignments/${assignmentId}/submissions/12`);expect(h.service.readSubmissionFor).toHaveBeenCalledWith(teacherId,assignmentId,12);
 });
});

describe('classroom routes: upgrade and student endpoints',()=>{
 it('upgrades a member with the teacher code and throttles wrong codes per account',async()=>{
  const h=await harness({loginRateLimit:{perStudent:2}}),m=h.as(await h.login(memberId));
  expect(await json(await m('/teacher-upgrade','POST',{code:'good-code'}))).toEqual({success:true,data:{role:'teacher'}});
  h.service.teacherUpgrade.mockRejectedValue(new ClassroomError(403,'INVALID_TEACHER_CODE'));
  for(let i=0;i<2;i++){const r=await m('/teacher-upgrade','POST',{code:'wrong'});expect(r.status).toBe(403);expect(await code(r)).toBe('INVALID_TEACHER_CODE');}
  expect((await m('/teacher-upgrade','POST',{code:'wrong'})).status).toBe(429);
  expect(h.service.teacherUpgrade).toHaveBeenCalledTimes(3);
  expect((await m('/teacher-upgrade','POST',{})).status).toBe(400);
 });
 it('lets a student submit, read and list while ignoring teacher-only endpoints',async()=>{
  const h=await harness(),s=h.as(await h.login(studentId)),document={payloadVersion:1};
  expect(await json(await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document}))).toEqual({success:true,data:{submittedAt:9}});
  expect(h.service.submit).toHaveBeenCalledWith(studentId,assignmentId,document);
  await s(`/classroom/assignments/${assignmentId}/submission`);expect(h.service.readOwnSubmission).toHaveBeenCalledWith(studentId,assignmentId);
  await s('/classroom/assignments');expect(h.service.listAssignments).toHaveBeenCalledWith(studentId,'student');
  await s('/me');expect(h.service.me).toHaveBeenCalledWith(studentId,'student');
  expect((await s('/classroom/assignments','POST',{title:'x'})).status).toBe(403);
  expect((await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{})).status).toBe(400);
  expect((await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document,extra:1})).status).toBe(400);
  h.service.submit.mockRejectedValueOnce(new ClassroomError(409,'ASSIGNMENT_CLOSED'));
  const closed=await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document});expect(closed.status).toBe(409);expect(await code(closed)).toBe('ASSIGNMENT_CLOSED');
  h.service.submit.mockRejectedValueOnce(new ClassroomError(400,'INVALID_DOCUMENT'));expect(await code(await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document}))).toBe('INVALID_DOCUMENT');
 });
 it('accepts submission bodies far above the small-body limit',async()=>{
  const h=await harness(),s=h.as(await h.login(studentId));
  expect((await s(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document:{blob:'x'.repeat(200_000)}})).status).toBe(200);
  const small=await harness({bodyLimitBytes:1000}),t=small.as(await small.login(studentId));
  expect((await t(`/classroom/assignments/${assignmentId}/submission`,'PUT',{document:{blob:'x'.repeat(2000)}})).status).toBe(413);
 });
});

describe('classroom routes: student and QR login',()=>{
 const body={classCode:'abc2de',number:4,password:'1234'};
 it('issues the normal session cookie and a working CSRF token without needing a prior session',async()=>{
  const h=await harness(),response=await h.guest('/student-login','POST',body);
  expect(response.status).toBe(200);
  const result=await json(response) as {data:{role:string;csrf:string}};
  expect(result.data.role).toBe('student');expect(result.data.csrf).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(h.service.verifyStudentLogin).toHaveBeenCalledWith('ABC2DE',4,'1234');
  const cookie=response.headers.get('set-cookie')!;
  expect(cookie).toMatch(/^knolstory-next-session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=60$/);
  const me=await h.as({cookie:cookie.split(';')[0]!,csrf:result.data.csrf})('/me');
  expect(me.status).toBe(200);expect(h.service.me).toHaveBeenCalledWith(studentId,'student');
  expect(await h.as({cookie:cookie.split(';')[0]!,csrf:result.data.csrf})('/classroom/assignments','GET')).toHaveProperty('status',200);
 });
 it('revokes the browser session it replaces',async()=>{
  const h=await harness(),old=await h.login(teacherId),response=await h.guest('/student-login','POST',body,{cookie:old.cookie});
  expect(response.status).toBe(200);expect((await h.as(old)('/me')).status).toBe(401);
 });
 it('requires a same-origin POST with a JSON body and does not need CSRF',async()=>{
  const h=await harness();
  expect(await code(await h.guest('/student-login','POST',body,{origin:'https://evil.test'}))).toBe('INVALID_CSRF');
  const noOrigin=await fetch(h.base+'/api/v1/class/student-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  expect(noOrigin.status).toBe(403);
  expect((await h.guest('/student-login','POST',body,{'content-type':'text/plain'})).status).toBe(415);
  expect(h.service.verifyStudentLogin).not.toHaveBeenCalled();
 });
 it.each([{},{classCode:'ABC2DE',number:4},{...body,number:0},{...body,number:31},{...body,number:'4'},{...body,password:''},{...body,password:1234},{...body,extra:1}])('rejects malformed login body %j',async value=>{
  const h=await harness(),response=await h.guest('/student-login','POST',value);
  expect(response.status).toBe(400);expect(response.headers.get('set-cookie')).toBeNull();
 });
 it('answers every mismatch with the same INVALID_LOGIN and sets no cookie',async()=>{
  const h=await harness();
  for(const value of [{...body,password:'0000'},{...body,classCode:'ABC0DE'},{...body,classCode:'TOOLONGCODE'}]){
   const response=await h.guest('/student-login','POST',value);
   expect(response.status).toBe(401);expect(await code(response)).toBe('INVALID_LOGIN');expect(response.headers.get('set-cookie')).toBeNull();
  }
 });
 it('throttles failures per class code and number, resets on success and expires with the window',async()=>{
  const h=await harness({loginRateLimit:{perStudent:3,windowMs:60_000}}),bad={...body,password:'0000'};
  for(let i=0;i<3;i++)expect((await h.guest('/student-login','POST',bad)).status).toBe(401);
  const blocked=await h.guest('/student-login','POST',body);
  expect(blocked.status).toBe(429);expect(await code(blocked)).toBe('RATE_LIMITED');
  expect(h.service.verifyStudentLogin).toHaveBeenCalledTimes(3);
  expect((await h.guest('/student-login','POST',{...body,number:5})).status).toBe(200);
  h.advance(61_000);
  expect((await h.guest('/student-login','POST',body)).status).toBe(200);
  expect((await h.guest('/student-login','POST',bad)).status).toBe(401);expect((await h.guest('/student-login','POST',body)).status).toBe(200);
 });
 it('throttles failures per client across numbers',async()=>{
  const h=await harness({loginRateLimit:{perClient:3}});
  for(let number=1;number<=3;number++)await h.guest('/student-login','POST',{...body,number,password:'0'});
  expect((await h.guest('/student-login','POST',body)).status).toBe(429);
 });
 it('logs in with a QR token, rejects bad tokens and throttles failures',async()=>{
  const h=await harness({loginRateLimit:{perClient:2}}),token='q'.repeat(43);
  const ok=await h.guest('/qr-login','POST',{token});
  expect(ok.status).toBe(200);expect(ok.headers.get('set-cookie')).toMatch(/^knolstory-next-session=/);expect(h.service.verifyQrToken).toHaveBeenCalledWith(token);
  for(const value of ['short','r'.repeat(43)]){const r=await h.guest('/qr-login','POST',{token:value});expect(r.status).toBe(401);expect(await code(r)).toBe('INVALID_LOGIN');}
  expect(h.service.verifyQrToken).toHaveBeenCalledTimes(2);
  expect((await h.guest('/qr-login','POST',{token})).status).toBe(429);
  expect((await h.guest('/qr-login','POST',{})).status).toBe(400);
  expect(await code(await h.guest('/qr-login','POST',{token},{origin:'https://evil.test'}))).toBe('INVALID_CSRF');
 });
 it('uses the HTTPS host-prefixed secure cookie for an https origin',async()=>{
  const secure='https://story.example';
  const h=await harness({origin:secure});
  const response=await fetch(h.base+'/api/v1/class/student-login',{method:'POST',headers:{origin:secure,'content-type':'application/json'},body:JSON.stringify(body)});
  expect(response.headers.get('set-cookie')).toMatch(/^__Host-knolstory-next-session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=\d+$/);
 });
 it('answers 503 without a cookie when session storage fails',async()=>{
  const h=await harness(),original=h.sessions.set.bind(h.sessions);
  vi.spyOn(h.sessions,'set').mockImplementation(()=>{throw Error('x');});
  expect((await h.guest('/student-login','POST',body)).status).toBe(503);
  h.sessions.set=original;
 });
});

describe('QR print preparation',()=>{
 it('requires teacher access and CSRF before preparing reusable QR cards',async()=>{
  const h=await harness(),teacher=h.as(await h.login(teacherId));
  expect((await h.guest('/classroom/qr-print','POST',{numbers:[1]})).status).toBe(401);
  expect((await h.as(await h.login(studentId))('/classroom/qr-print','POST',{numbers:[1]})).status).toBe(403);
  expect(await code(await teacher('/classroom/qr-print','POST',{numbers:[1]},{'x-csrf-token':'bad'}))).toBe('INVALID_CSRF');
  expect(await json(await teacher('/classroom/qr-print','POST',{numbers:[2,1],replaceExisting:true}))).toEqual({success:true,data:{className:'3반',classCode:'ABC234',cards:[]}});
  expect(h.service.prepareQrPrint).toHaveBeenCalledWith(teacherId,[2,1],true);
 });
 it.each([{}, {numbers:[]},{numbers:[0]},{numbers:[31]},{numbers:[1,1]},{numbers:['1']},{numbers:[1],replaceExisting:false},{numbers:[1],extra:true},{numbers:Array.from({length:31},(_,i)=>i+1)}])('rejects malformed print input %j',async body=>{
  const h=await harness();expect((await h.as(await h.login(teacherId))('/classroom/qr-print','POST',body)).status).toBe(400);
  expect(h.service.prepareQrPrint).not.toHaveBeenCalled();
 });
 it('defaults to retaining existing tokens and forwards the explicit legacy-reissue gate',async()=>{
  const h=await harness(),call=h.as(await h.login(teacherId));
  await call('/classroom/qr-print','POST',{numbers:[1]});
  expect(h.service.prepareQrPrint).toHaveBeenCalledWith(teacherId,[1],false);
  h.service.prepareQrPrint.mockRejectedValueOnce(new ClassroomError(409,'QR_REISSUE_REQUIRED'));
  const response=await call('/classroom/qr-print','POST',{numbers:[1]});
  expect(response.status).toBe(409);expect(await code(response)).toBe('QR_REISSUE_REQUIRED');
 });
});

describe('compact QR login compatibility',()=>{
 it.each([27,43])('accepts stored QR tokens of length %i',async length=>{
  const h=await harness(),token='q'.repeat(length),response=await h.guest('/qr-login','POST',{token});
  expect(response.status).toBe(200);expect(h.service.verifyQrToken).toHaveBeenCalledWith(token);
 });
 it.each(['q'.repeat(26),'q'.repeat(28),'q'.repeat(26)+'+','q'.repeat(42)+'+'])('rejects malformed compact and legacy QR tokens',async token=>{
  const h=await harness(),response=await h.guest('/qr-login','POST',{token});
  expect(response.status).toBe(401);expect(await code(response)).toBe('INVALID_LOGIN');expect(h.service.verifyQrToken).not.toHaveBeenCalled();
 });
});

describe('classroom routes: missions',()=>{
 const mission={title:'별주부전 읽기',description:'',criteria:'',kind:'reading',storyKey:'rabbit',readingFormat:'original',questions:[]};
 it('lets teachers create, close and review, and students list and submit, each within their role',async()=>{
  const h=await harness(),teacher=h.as(await h.login(teacherId)),student=h.as(await h.login(studentId)),member=h.as(await h.login(memberId));
  expect((await teacher('/classroom/missions')).status).toBe(200);expect(h.service.listMissions).toHaveBeenLastCalledWith(teacherId,'teacher');
  expect((await student('/classroom/missions')).status).toBe(200);expect(h.service.listMissions).toHaveBeenLastCalledWith(studentId,'student');
  expect(await code(await member('/classroom/missions'))).toBe('ROLE_NOT_ALLOWED');
  const created=await teacher('/classroom/missions','POST',mission);expect(created.status).toBe(201);expect(h.service.createMission).toHaveBeenCalledWith(teacherId,mission);
  expect(await code(await student('/classroom/missions','POST',mission))).toBe('ROLE_NOT_ALLOWED');
  expect((await teacher(`/classroom/missions/${missionId}`,'PATCH',{open:false})).status).toBe(200);expect(h.service.setMissionOpen).toHaveBeenCalledWith(teacherId,missionId,{open:false});
  const answer={answers:{},note:'다 읽었어요'};
  expect(await json(await student(`/classroom/missions/${missionId}/submission`,'PUT',answer))).toEqual({success:true,data:{submittedAt:11}});expect(h.service.submitMission).toHaveBeenCalledWith(studentId,missionId,answer);
  expect(await code(await teacher(`/classroom/missions/${missionId}/submission`,'PUT',answer))).toBe('ROLE_NOT_ALLOWED');
  expect((await teacher(`/classroom/missions/${missionId}/progress`)).status).toBe(200);
  expect(await code(await student(`/classroom/missions/${missionId}/progress`))).toBe('ROLE_NOT_ALLOWED');
  const review={reviewStatus:'passed',feedback:'',expectedSubmittedAt:11};
  expect((await teacher(`/classroom/missions/${missionId}/progress/3`,'PUT',review)).status).toBe(200);expect(h.service.reviewMission).toHaveBeenCalledWith(teacherId,missionId,3,review);
  expect(await code(await student(`/classroom/missions/${missionId}/progress/3`,'PUT',review))).toBe('ROLE_NOT_ALLOWED');
  expect(await code(await teacher(`/classroom/missions/${missionId}/progress/31`,'PUT',review))).toBe('INVALID_REQUEST');
  expect((await teacher('/classroom/missions/not-a-uuid/progress')).status).toBe(404);
 });
 it('requires a session and CSRF for mission writes',async()=>{
  const h=await harness(),who=await h.login(studentId);
  expect(await code(await h.guest('/classroom/missions'))).toBe('SESSION_REQUIRED');
  expect(await code(await h.as({cookie:who.cookie,csrf:'wrong'})(`/classroom/missions/${missionId}/submission`,'PUT',{answers:{},note:''}))).toBe('INVALID_CSRF');
  expect(h.service.submitMission).not.toHaveBeenCalled();
 });
 it('accepts a full Korean worksheet and a full mission, and rejects bodies over 64 KiB',async()=>{
  const h=await harness(),teacher=h.as(await h.login(teacherId)),student=h.as(await h.login(studentId));
  const full={answers:Object.fromEntries(Array.from({length:8},(_,i)=>[`q${i+1}`,'가'.repeat(2000)])),note:'나'.repeat(2000)};
  expect(Buffer.byteLength(JSON.stringify(full))).toBeGreaterThan(16*1024);
  expect((await student(`/classroom/missions/${missionId}/submission`,'PUT',full)).status).toBe(200);
  const large={...mission,kind:'worksheet',description:'다'.repeat(2000),criteria:'라'.repeat(2000),questions:Array.from({length:8},(_,i)=>({id:`q${i+1}`,prompt:'마'.repeat(400)}))};
  expect(Buffer.byteLength(JSON.stringify(large))).toBeGreaterThan(16*1024);
  expect((await teacher('/classroom/missions','POST',large)).status).toBe(201);
  const over=await student(`/classroom/missions/${missionId}/submission`,'PUT',{answers:{q1:'가'.repeat(22000)},note:''});
  expect(over.status).toBe(413);expect(await code(over)).toBe('REQUEST_TOO_LARGE');
  // Reviews and open/close stay on the ordinary 16 KiB limit.
  expect((await teacher(`/classroom/missions/${missionId}/progress/3`,'PUT',{reviewStatus:'revise',feedback:'바'.repeat(6000),expectedSubmittedAt:1})).status).toBe(413);
  expect(h.service.submitMission).toHaveBeenCalledTimes(1);expect(h.service.reviewMission).not.toHaveBeenCalled();
 });
 it('passes service errors through with their codes',async()=>{
  const h=await harness(),teacher=h.as(await h.login(teacherId)),student=h.as(await h.login(studentId));
  h.service.reviewMission.mockRejectedValueOnce(new ClassroomError(409,'MISSION_SUBMISSION_CHANGED'));
  const changed=await teacher(`/classroom/missions/${missionId}/progress/3`,'PUT',{reviewStatus:'passed',feedback:'',expectedSubmittedAt:1});
  expect(changed.status).toBe(409);expect(await code(changed)).toBe('MISSION_SUBMISSION_CHANGED');
  h.service.submitMission.mockRejectedValueOnce(new ClassroomError(409,'MISSION_CLOSED'));
  expect(await code(await student(`/classroom/missions/${missionId}/submission`,'PUT',{answers:{},note:''}))).toBe('MISSION_CLOSED');
 });
});
