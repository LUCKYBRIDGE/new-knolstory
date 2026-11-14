import type {IncomingMessage,ServerResponse} from 'node:http';
import {AuthStateError,authCookieNames,serializeAuthCookie,validateAuthOrigin,type createAuthStateService} from '../auth/auth-state';
import {ClassroomError,type ClassroomService,type Role} from '../classroom/service';
import {PermissionsError,normalizePermissions} from '../classroom/permissions';
import {dueAt} from '../classroom/mission-contract';
import {normalizeClassCode,validQrToken} from '../classroom/secrets';
import {createRateClientResolver} from './rate-client';

type AuthState=ReturnType<typeof createAuthStateService>;
type Limit=Readonly<{windowMs:number;maxRequests:number;maxEntries:number}>;
export type ClassroomRouterOptions=Readonly<{
 origin:string;
 authState:AuthState;
 classroom:ClassroomService;
 clientProofKey?:string;
 /** Per-client ceiling for every classroom request. A whole class can share one school address. */
 rateLimit?:Partial<Limit>;
 /** Failed student/QR login ceilings. `perStudent` is keyed by class code and number, `perClient` by client. */
 loginRateLimit?:Readonly<{windowMs?:number;perStudent?:number;perClient?:number;maxEntries?:number}>;
 clock?:()=>number;
 /** Largest body, used only by submission upload. */
 bodyLimitBytes?:number;
 bodyTimeoutMs?:number;
}>;
class HttpError extends Error{constructor(readonly status:number,readonly code:string){super(code);}}
const BASE='/api/v1/class';
const SMALL_BODY=16*1024,LOGIN_BODY=2*1024;
/** Mission text is plain prose: 8 answers and a note of 2,000 Korean characters are about 54 KiB of UTF-8, a new mission about 22 KiB. */
const MISSION_BODY=64*1024;
const UUID='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

function header(req:IncomingMessage,name:string):string{
 const count=req.rawHeaders.filter((value,index)=>index%2===0&&value.toLowerCase()===name).length,value=req.headers[name];
 if(count>1||Array.isArray(value))throw new HttpError(400,'INVALID_REQUEST');
 return value??'';
}
function sessionToken(req:IncomingMessage,name:string):string{
 const matches=header(req,'cookie').split(';').map(item=>item.trim()).filter(item=>item.startsWith(name+'='));
 if(matches.length>1)throw new HttpError(400,'INVALID_REQUEST');
 return matches[0]?.slice(name.length+1)??'';
}
function respond(res:ServerResponse,status:number,value:unknown){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));
}
/** Fixed-window counter with a bounded table. `blocked` is read-only; `hit` records one event. */
function counter(windowMs:number,max:number,maxEntries:number,clock:()=>number){
 const buckets=new Map<string,{count:number;expiresAt:number}>();
 const live=(key:string)=>{const value=buckets.get(key);return value&&value.expiresAt>clock()?value:undefined;};
 return {
  blocked:(key:string)=>(live(key)?.count??0)>=max,
  hit(key:string){
   const existing=live(key);
   if(existing){existing.count+=1;return;}
   const now=clock();
   for(const [name,value] of buckets)if(value.expiresAt<=now)buckets.delete(name);
   // A full table fails closed for new keys instead of growing without bound.
   if(buckets.size>=maxEntries){buckets.set(key,{count:max,expiresAt:now+windowMs});return;}
   buckets.set(key,{count:1,expiresAt:now+windowMs});
  },
  reset:(key:string)=>{buckets.delete(key);},
 };
}
function framing(req:IncomingMessage,limit:number,hasBody:boolean){
 const length=header(req,'content-length'),transfer=header(req,'transfer-encoding');
 if(length&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))))throw new HttpError(400,'INVALID_REQUEST');
 if(length&&Number(length)>limit)throw new HttpError(413,'REQUEST_TOO_LARGE');
 if(!hasBody&&(transfer||Number(length)>0))throw new HttpError(400,'INVALID_REQUEST');
 if(transfer&&(transfer.toLowerCase()!=='chunked'||length))throw new HttpError(400,'INVALID_REQUEST');
}
function readBody(req:IncomingMessage,limit:number,timeout:number):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  let bytes=0,finished=false;const chunks:Buffer[]=[];
  const cleanup=()=>{clearTimeout(timer);req.off('data',data);req.off('end',end);req.off('aborted',aborted);req.off('error',aborted);};
  const fail=(error:HttpError)=>{if(finished)return;finished=true;cleanup();req.pause();reject(error);};
  const data=(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>limit)fail(new HttpError(413,'REQUEST_TOO_LARGE'));else chunks.push(chunk);};
  const aborted=()=>fail(new HttpError(400,'INVALID_REQUEST'));
  const end=()=>{if(finished)return;finished=true;cleanup();try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new HttpError(400,'INVALID_REQUEST'));}};
  const timer=setTimeout(()=>fail(new HttpError(408,'REQUEST_TIMEOUT')),timeout);
  req.on('data',data);req.once('end',end);req.once('aborted',aborted);req.once('error',aborted);
  if(req.aborted||req.destroyed)aborted();
 });
}
const bad=()=>new HttpError(400,'INVALID_REQUEST');
function object(value:unknown,allowed:readonly string[],required:readonly string[]=[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw bad();
 const input=value as Record<string,unknown>;
 if(Object.keys(input).some(key=>!allowed.includes(key))||required.some(key=>!Object.hasOwn(input,key)))throw bad();
 return input;
}
function string(value:unknown,min:number,max:number,trim=true):string{
 if(typeof value!=='string')throw bad();
 const result=trim?value.trim():value;
 if(result.length<min||result.length>max||/[\u0000-\u001f\u007f]/.test(result))throw bad();
 return result;
}
function number(value:unknown):number{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1||value>30)throw bad();
 return value;
}
const studentNumber=(value:string)=>{const result=Number(value);if(!/^[1-9]\d?$/.test(value)||result>30)throw bad();return result;};

type Access='public'|'any'|'upgrade'|'teacher'|'student'|'admin'|'assignments';
type Body='none'|'json'|'mission'|'upload';
type Call=Readonly<{accountId:string;role:Role;params:readonly string[];body:unknown;req:IncomingMessage;res:ServerResponse}>;
type Route=Readonly<{method:string;pattern:RegExp;access:Access;body:Body;run:(call:Call)=>Promise<unknown>|unknown;status?:number}>;
const ROLES:Record<Exclude<Access,'public'>,readonly Role[]>={
 any:['member','teacher','student','admin'],upgrade:['member','admin'],teacher:['teacher','admin'],student:['student'],admin:['admin'],assignments:['teacher','admin','student'],
};

/** Classroom HTTP boundary. Session and CSRF rules match the document router; domain rules live in the service. */
export function createClassroomRouter(options:ClassroomRouterOptions){
 const origin=validateAuthOrigin(options.origin),names=authCookieNames(origin),clock=options.clock??Date.now;
 const {authState,classroom}=options;
 const bodyLimit=options.bodyLimitBytes??26*1024*1024,bodyTimeout=options.bodyTimeoutMs??10000;
 const general={windowMs:60_000,maxRequests:600,maxEntries:10_000,...options.rateLimit};
 for(const value of Object.values(general))if(!Number.isSafeInteger(value)||value<=0)throw Error('INVALID_CONFIG');
 const login={windowMs:600_000,perStudent:10,perClient:100,maxEntries:10_000,...options.loginRateLimit};
 const client=createRateClientResolver({origin,key:options.clientProofKey,clock:options.clock});
 const requests=counter(general.windowMs,general.maxRequests,general.maxEntries,clock);
 const studentFailures=counter(login.windowMs,login.perStudent,login.maxEntries,clock);
 const clientFailures=counter(login.windowMs,login.perClient,login.maxEntries,clock);
 const upgradeFailures=counter(login.windowMs,login.perStudent,login.maxEntries,clock);
 const age=(expiresAt:number)=>Math.max(0,Math.ceil((expiresAt-clock())/1000));

 async function startStudentSession(req:IncomingMessage,res:ServerResponse,accountId:string,method:'password'|'qr'){
  let issued;
  try{issued=await authState.issueSession(accountId);}
  catch(error){if(error instanceof AuthStateError)throw new HttpError(401,'INVALID_LOGIN');throw error;}
  // A previous browser session is replaced, never merged.
  const previous=sessionToken(req,names.session);
  if(previous)await authState.revokeSession(previous);
  res.setHeader('Set-Cookie',serializeAuthCookie(origin,'session',issued.token,age(issued.expiresAt)));
  // The access record is best-effort: a failed write never blocks a student from signing in.
  await classroom.recordLogin(accountId,method).catch(()=>undefined);
  return {role:'student' as const,csrf:issued.csrf};
 }
 /** A teacher's hand-in link: https only, no embedded credentials; null or '' clears it. */
 function shareUrl(value:unknown):string|null{
  if(value===null||value==='')return null;
  const raw=string(value,9,2048);let url:URL;
  try{url=new URL(raw);}catch{throw bad();}
  if(url.protocol!=='https:'||url.username||url.password)throw bad();
  return url.href;
 }
 function requireOrigin(req:IncomingMessage){if(header(req,'origin')!==origin)throw new HttpError(403,'INVALID_CSRF');}

 const routes:Route[]=[
  {method:'GET',pattern:/^\/me$/,access:'any',body:'none',async run({accountId,role}){
   const me=await classroom.me(accountId,role);
   return me;
  }},
  {method:'POST',pattern:/^\/teacher-upgrade$/,access:'upgrade',body:'json',async run({accountId,body}){
   const code=string(object(body,['code'],['code']).code,1,128,false),key='upgrade:'+accountId;
   if(upgradeFailures.blocked(key))throw new HttpError(429,'RATE_LIMITED');
   try{return {role:await classroom.teacherUpgrade(accountId,code)};}
   catch(error){if(error instanceof ClassroomError&&error.code==='INVALID_TEACHER_CODE')upgradeFailures.hit(key);throw error;}
  }},
  {method:'GET',pattern:/^\/admin\/overview$/,access:'admin',body:'none',run:()=>classroom.adminOverview()},
  {method:'GET',pattern:/^\/admin\/teacher-code$/,access:'admin',body:'none',run:()=>classroom.teacherCode()},
  {method:'PATCH',pattern:/^\/admin\/teacher-code$/,access:'admin',body:'json',run({body}){
   const paused=object(body,['paused'],['paused']).paused;
   if(typeof paused!=='boolean')throw bad();
   return classroom.setTeacherCodePaused(paused);
  }},
  {method:'GET',pattern:/^\/admin\/access$/,access:'admin',body:'none',async run(){return {accounts:await classroom.adminAccess()};}},
  {method:'PUT',pattern:/^\/admin\/teacher-code$/,access:'admin',body:'json',async run({body}){
   const code=string(object(body,['code'],['code']).code,6,32,false);
   await classroom.setTeacherCode(code);
   return classroom.teacherCode();
  }},
  {method:'POST',pattern:/^\/classroom$/,access:'teacher',body:'json',status:201,run:({accountId,body})=>
   classroom.createClassroom(accountId,string(object(body,['name'],['name']).name,1,60))},
  {method:'GET',pattern:/^\/classroom$/,access:'teacher',body:'none',run:({accountId})=>classroom.getClassroom(accountId)},
  {method:'PATCH',pattern:/^\/classroom$/,access:'teacher',body:'json',run({accountId,body}){
   const input=object(body,['name','regenerateCode','defaultPermissions']);
   if(!Object.keys(input).length)throw bad();
   if(input.regenerateCode!==undefined&&input.regenerateCode!==true)throw bad();
   return classroom.patchClassroom(accountId,{
    ...(input.name!==undefined?{name:string(input.name,1,60)}:{}),
    ...(input.regenerateCode===true?{regenerateCode:true as const}:{}),
    ...(input.defaultPermissions!==undefined?{defaultPermissions:normalizePermissions(input.defaultPermissions)}:{}),
   });
  }},
  {method:'POST',pattern:/^\/classroom\/students$/,access:'teacher',body:'json',run:({accountId,body})=>
   classroom.addStudents(accountId,number(object(body,['count'],['count']).count))},
  {method:'POST',pattern:/^\/classroom\/students\/permissions$/,access:'teacher',body:'json',run({accountId,body}){
   const input=object(body,['numbers','permissions'],['numbers','permissions']);
   if(!Array.isArray(input.numbers)||input.numbers.length<1||input.numbers.length>30)throw bad();
   const numbers=input.numbers.map(number);
   if(new Set(numbers).size!==numbers.length)throw bad();
   return classroom.setPermissions(accountId,numbers,input.permissions===null?null:normalizePermissions(input.permissions));
  }},
  {method:'PATCH',pattern:/^\/classroom\/students\/(\d+)$/,access:'teacher',body:'json',run({accountId,params,body}){
   const input=object(body,['name','password','permissions']);
   if(!Object.keys(input).length)throw bad();
   return classroom.patchStudent(accountId,studentNumber(params[0]!),{
    ...(input.name!==undefined?{name:string(input.name,0,40)}:{}),
    ...(input.password!==undefined?{password:string(input.password,4,32,false)}:{}),
    ...(input.permissions!==undefined?{permissions:input.permissions===null?null:normalizePermissions(input.permissions)}:{}),
   });
  }},
  {method:'DELETE',pattern:/^\/classroom\/students\/(\d+)$/,access:'teacher',body:'none',run:({accountId,params})=>classroom.deleteStudent(accountId,studentNumber(params[0]!))},
  {method:'POST',pattern:/^\/classroom\/qr-print$/,access:'teacher',body:'json',run({accountId,body}){
   const input=object(body,['numbers','replaceExisting'],['numbers']);
   if(!Array.isArray(input.numbers)||input.numbers.length<1||input.numbers.length>30||input.replaceExisting!==undefined&&input.replaceExisting!==true)throw bad();
   const numbers=input.numbers.map(number);
   if(numbers.some(value=>value<1||value>30)||new Set(numbers).size!==numbers.length)throw bad();
   return classroom.prepareQrPrint(accountId,numbers,input.replaceExisting===true);
  }},
  {method:'POST',pattern:/^\/classroom\/students\/(\d+)\/qr$/,access:'teacher',body:'none',run:({accountId,params})=>classroom.issueQr(accountId,studentNumber(params[0]!))},
  {method:'POST',pattern:/^\/student-login$/,access:'public',body:'json',async run({req,res,body}){
   requireOrigin(req);
   const input=object(body,['classCode','number','password'],['classCode','number','password']);
   const who=client(req);
   if(who===null)throw new HttpError(403,'INVALID_CLIENT_PROOF');
   const code=normalizeClassCode(input.classCode),number_=number(input.number),password=string(input.password,1,64,false);
   const studentKey=`student:${code??'invalid'}:${number_}`,clientKey='client:'+who;
   if(studentFailures.blocked(studentKey)||clientFailures.blocked(clientKey))throw new HttpError(429,'RATE_LIMITED');
   const accountId=code===null?null:await classroom.verifyStudentLogin(code,number_,password);
   if(accountId===null){studentFailures.hit(studentKey);clientFailures.hit(clientKey);throw new HttpError(401,'INVALID_LOGIN');}
   studentFailures.reset(studentKey);
   return startStudentSession(req,res,accountId,'password');
  }},
  {method:'POST',pattern:/^\/qr-login$/,access:'public',body:'json',async run({req,res,body}){
   requireOrigin(req);
   const token=object(body,['token'],['token']).token;
   const who=client(req);
   if(who===null)throw new HttpError(403,'INVALID_CLIENT_PROOF');
   const clientKey='qr:'+who;
   if(clientFailures.blocked(clientKey))throw new HttpError(429,'RATE_LIMITED');
   const accountId=validQrToken(token)?await classroom.verifyQrToken(token):null;
   if(accountId===null){clientFailures.hit(clientKey);throw new HttpError(401,'INVALID_LOGIN');}
   return startStudentSession(req,res,accountId,'qr');
  }},
  {method:'GET',pattern:/^\/classroom\/assignments$/,access:'assignments',body:'none',run:({accountId,role})=>classroom.listAssignments(accountId,role)},
  {method:'POST',pattern:/^\/classroom\/assignments$/,access:'teacher',body:'json',status:201,run({accountId,body}){
   const input=object(body,['title','description','storyKey','format','shareUrl','dueAt','edition','startPoint','startLabel'],['title']);
   if(input.startPoint!==undefined&&input.startPoint!==null&&(typeof input.startPoint!=='string'||!/^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$/.test(input.startPoint)))throw bad();
   if(input.edition!==undefined&&input.edition!==null&&input.edition!=='original'&&input.edition!=='knolstory')throw bad();
   if(input.format!==undefined&&input.format!=='knolstory'&&input.format!=='shortstory')throw bad();
   return classroom.createAssignment(accountId,{
    format:input.format??'knolstory',
    title:string(input.title,1,100),
    description:input.description===undefined?'':string(input.description,0,2000,false),
    storyKey:input.storyKey===undefined||input.storyKey===null?null:string(input.storyKey,1,128),
    shareUrl:input.shareUrl===undefined?null:shareUrl(input.shareUrl),
    dueAt:input.dueAt===undefined?null:dueAt(input.dueAt),
    edition:(input.edition??null) as 'original'|'knolstory'|null,
    startPoint:(input.startPoint??null) as string|null,
    startLabel:input.startLabel===undefined||input.startLabel===null?null:string(input.startLabel,1,120),
   });
  }},
  {method:'PATCH',pattern:new RegExp(`^/classroom/assignments/(${UUID})$`),access:'teacher',body:'json',run({accountId,params,body}){
   const input=object(body,['title','description','open','shareUrl','dueAt']);
   if(!Object.keys(input).length||(input.open!==undefined&&typeof input.open!=='boolean'))throw bad();
   return classroom.patchAssignment(accountId,params[0]!,{
    ...(input.title!==undefined?{title:string(input.title,1,100)}:{}),
    ...(input.description!==undefined?{description:string(input.description,0,2000,false)}:{}),
    ...(input.open!==undefined?{open:input.open as boolean}:{}),
    ...(input.shareUrl!==undefined?{shareUrl:shareUrl(input.shareUrl)}:{}),
    ...(input.dueAt!==undefined?{dueAt:dueAt(input.dueAt)}:{}),
   });
  }},
  {method:'GET',pattern:new RegExp(`^/classroom/assignments/(${UUID})/submissions$`),access:'teacher',body:'none',run:({accountId,params})=>classroom.listSubmissions(accountId,params[0]!)},
  {method:'PUT',pattern:new RegExp(`^/classroom/assignments/(${UUID})/submissions/(\\d+)/review$`),access:'teacher',body:'json',run:({accountId,params,body})=>classroom.reviewSubmission(accountId,params[0]!,studentNumber(params[1]!),body)},
  {method:'GET',pattern:new RegExp(`^/classroom/assignments/(${UUID})/submissions/(\\d+)$`),access:'teacher',body:'none',run:({accountId,params})=>classroom.readSubmissionFor(accountId,params[0]!,studentNumber(params[1]!))},
  {method:'PUT',pattern:new RegExp(`^/classroom/assignments/(${UUID})/submission$`),access:'student',body:'upload',run:({accountId,params,body})=>
   classroom.submit(accountId,params[0]!,object(body,['document'],['document']).document)},
  {method:'GET',pattern:new RegExp(`^/classroom/assignments/(${UUID})/submission$`),access:'student',body:'none',run:({accountId,params})=>classroom.readOwnSubmission(accountId,params[0]!)},
  // Missions: the service validates every field (server/classroom/mission-contract.ts) and scopes each call to the caller's class.
  {method:'GET',pattern:/^\/classroom\/missions$/,access:'assignments',body:'none',run:({accountId,role})=>classroom.listMissions(accountId,role)},
  {method:'POST',pattern:/^\/classroom\/missions$/,access:'teacher',body:'mission',status:201,run:({accountId,body})=>classroom.createMission(accountId,body)},
  {method:'PATCH',pattern:new RegExp(`^/classroom/missions/(${UUID})$`),access:'teacher',body:'json',run:({accountId,params,body})=>classroom.setMissionOpen(accountId,params[0]!,body)},
  {method:'PUT',pattern:new RegExp(`^/classroom/missions/(${UUID})/submission$`),access:'student',body:'mission',run:({accountId,params,body})=>classroom.submitMission(accountId,params[0]!,body)},
  {method:'GET',pattern:new RegExp(`^/classroom/missions/(${UUID})/progress$`),access:'teacher',body:'none',run:({accountId,params})=>classroom.listMissionProgress(accountId,params[0]!)},
  {method:'PUT',pattern:new RegExp(`^/classroom/missions/(${UUID})/progress/(\\d+)$`),access:'teacher',body:'json',run:({accountId,params,body})=>classroom.reviewMission(accountId,params[0]!,studentNumber(params[1]!),body)},
 ];

 function match(req:IncomingMessage){
  const raw=req.url??'';
  if(raw.length>8192||!raw.startsWith('/')||raw.startsWith('//')||raw.includes('%')||/[\u0000-\u001f\u007f]/.test(raw))throw bad();
  const url=new URL(raw,origin);
  if(url.search||!url.pathname.startsWith(BASE+'/'))throw new HttpError(url.search?400:404,url.search?'INVALID_REQUEST':'NOT_FOUND');
  const path=url.pathname.slice(BASE.length);
  const found=routes.map(route=>({route,result:route.pattern.exec(path)})).filter(item=>item.result);
  if(!found.length)throw new HttpError(404,'NOT_FOUND');
  const chosen=found.find(item=>item.route.method===req.method);
  if(!chosen)throw Object.assign(new HttpError(405,'METHOD_NOT_ALLOWED'),{allow:[...new Set(found.map(item=>item.route.method))].join(', ')});
  return {route:chosen.route,params:chosen.result!.slice(1)};
 }

 return async(req:IncomingMessage,res:ServerResponse):Promise<void>=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try{
   const who=client(req);
   if(who===null)throw new HttpError(403,'INVALID_CLIENT_PROOF');
   if(requests.blocked(who))throw new HttpError(429,'RATE_LIMITED');
   requests.hit(who);
   let matched;
   try{matched=match(req);}
   catch(error){const allow=(error as {allow?:string}).allow;if(allow)res.setHeader('Allow',allow);throw error;}
   const {route,params}=matched;
   let accountId='',role:Role='member';
   if(route.access!=='public'){
    const token=sessionToken(req,names.session),authenticated=await authState.authenticate(token);
    if(!authenticated)throw new HttpError(401,'SESSION_REQUIRED');
    if(req.method!=='GET'){
     try{await authState.verifyCsrf(token,header(req,'x-csrf-token'),header(req,'origin'));}
     catch{throw new HttpError(403,'INVALID_CSRF');}
    }
    accountId=authenticated.accountId;
    const found=await classroom.roleOf(accountId);
    if(found===null)throw new HttpError(401,'SESSION_REQUIRED');
    role=found;
    if(!ROLES[route.access].includes(role))throw new HttpError(403,'ROLE_NOT_ALLOWED');
   }
   const limit=route.body==='upload'?bodyLimit:route.body==='mission'?MISSION_BODY:route.access==='public'?LOGIN_BODY:SMALL_BODY;
   framing(req,limit,route.body!=='none');
   let body:unknown;
   if(route.body!=='none'){
    if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(header(req,'content-type')))throw new HttpError(415,'UNSUPPORTED_MEDIA_TYPE');
    body=await readBody(req,limit,bodyTimeout);
    if(req.aborted||req.socket.destroyed)throw bad();
   }
   const data=await route.run({accountId,role,params,body,req,res});
   respond(res,route.status??200,{success:true,data});
  }catch(error){
   res.setHeader('Connection','close');
   if(error instanceof HttpError||error instanceof ClassroomError)respond(res,error.status,{success:false,error:{code:error.code}});
   else if(error instanceof PermissionsError)respond(res,400,{success:false,error:{code:'INVALID_REQUEST'}});
   else respond(res,503,{success:false,error:{code:'CLASSROOM_UNAVAILABLE'}});
  }
 };
}
