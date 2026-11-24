import {expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {createStoryDocument} from '../../packages/story-domain/src';
/** Shared in-memory stand-in for the class API, used by the classroom specs. */
/**
 * A work in the current format, stored online the way the app stores it: the archive, and the same
 * content fingerprint the app computes (canonical JSON without savedAt/appVersion). No old file to upgrade.
 */
export async function currentOnlineSnapshot(project:ReturnType<typeof createBlankStoryProject>){
 const content=JSON.parse(JSON.stringify({format:'knolstory',formatVersion:2,document:createStoryDocument({project,savedAt:'2026-11-20T09:00:00.000Z',appVersion:'knolstory-next'}),audioResources:[]}));
 const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`:JSON.stringify(value);
 const {savedAt:_savedAt,appVersion:_appVersion,...document}=content.document;
 const {createHash}=await import('node:crypto');
 return {payloadVersion:1,content,contentSha256:createHash('sha256').update(canonical({...content,document})).digest('hex'),assetReferences:[] as unknown[]};
}

export const all={text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null};
export const textOnly={...all,images:false,characters:false,audio:false,direction:false,choices:false};
export type Student={number:number;name:string;password:string;permissions:typeof all|null;hasQr:boolean};
export type Mission={recipients?:number[]|null;id:string;title:string;description:string;criteria:string;kind:'reading'|'worksheet'|'custom';storyKey:string|null;readingFormat:'original'|'knolstory'|'shortstory';questions:{id:string;prompt:string}[];open:boolean;createdAt:number};
export type MissionRow={answers:Record<string,string>;note:string;submittedAt:number|null;reviewStatus:'passed'|'revise'|null;feedback:string;reviewedAt:number|null};
export const blankRow=():MissionRow=>({answers:{},note:'',submittedAt:null,reviewStatus:null,feedback:'',reviewedAt:null});
export type Assignment={editScope?:Record<string,boolean>|null;after?:{id:string;title:string;passed?:boolean}|null;targetAmount?:number;recipients?:number[]|null;submittedCount?:number;edition?:'original'|'knolstory'|null;startPoint?:string|null;startLabel?:string|null;format?:'knolstory'|'shortstory';id:string;title:string;description:string;storyKey:string|null;open:boolean;createdAt:number;submittedAt?:number|null};
export const ok=(data:unknown)=>({json:{success:true,data}});
export const fail=(status:number,code:string)=>({status,json:{success:false,error:{code}}});

/** Every task starts from 새 과제 내기 (folded on phones until opened). */
export async function compose(page:Page,name:RegExp){
 const composer=page.getByRole('region',{name:'새 과제 내기'}),button=composer.getByRole('button',{name});
 await expect(composer.getByText('새 과제 내기',{exact:true})).toBeVisible();
 if(!await button.isVisible())await composer.getByText('새 과제 내기',{exact:true}).click();
 await button.click();
}
/** In-memory stand-in for /api/v1/class. `role` and `signedIn` are mutable so one test can walk through a login. */
export async function mockClassroom(page:Page,role:'teacher'|'student'){
 const state={accountId:'11111111-1111-4111-8111-111111111111',permissions:textOnly,signedIn:role==='teacher',classroom:null as null|{id:string;name:string;classCode:string;defaultPermissions:typeof all;students:Student[]},assignments:[] as Assignment[],submissions:{} as Record<string,unknown>,drafts:{} as Record<string,{savedAt:number;amount:number;chars:number;comment:string}>,draftDocs:{} as Record<string,unknown>,review:null as null|{reviewStatus:'passed'|'revise'|null;feedback:string},missions:[] as Mission[],missionRows:{} as Record<string,Record<number,MissionRow>>,missionRoster:[{number:2,name:'하늘'}],missionClock:1_770_000_000_000,calls:[] as string[],bodies:[] as unknown[],qrReady:{} as Record<number,string>,legacyQr:[] as number[]};
 if(role==='student')state.classroom={id:'c1',name:'3반',classCode:'ABC234',defaultPermissions:textOnly,students:[]};
 if(role==='student')state.assignments=[{id:'a1',title:'내 이야기 쓰기',description:'세 컷을 써 보세요.',storyKey:null,open:true,createdAt:1,submittedAt:null}];
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1/',''),method=request.method();
  state.calls.push(`${method} ${path}`);const body=request.postData()?JSON.parse(request.postData()!):undefined;if(body!==undefined)state.bodies.push(body);
  const summary=()=>({id:'c1',name:state.classroom!.name,classCode:state.classroom!.classCode,studentCount:state.classroom!.students.length});
  if(path==='auth/config')return route.fulfill(ok({signupProvider:'kakao',providers:{kakao:true,google:false}}));
  if(path==='me')return route.fulfill(state.signedIn?ok({accountId:state.accountId,csrf:'csrf-1'}):fail(401,'SESSION_REQUIRED'));
  if(path==='class/me'){
   if(!state.signedIn)return route.fulfill(fail(401,'SESSION_REQUIRED'));
   return route.fulfill(ok(role==='teacher'?{role:'teacher',account:{id:'a'},...(state.classroom?{classroom:summary()}:{})}:{role:'student',account:{id:'s'},student:{number:2,name:'하늘',classId:'c1',className:'3반',permissions:state.permissions}}));
  }
  if(path==='class/student-login'){if(body.password!=='4821')return route.fulfill(fail(401,'INVALID_LOGIN'));state.signedIn=true;return route.fulfill(ok({role:'student'}));}
  if(request.method()!=='GET'&&request.headers()['x-csrf-token']!=='csrf-1')return route.fulfill(fail(403,'SESSION_REQUIRED'));
  if(path==='class/classroom'){
   if(method==='POST'){state.classroom={id:'c1',name:body.name,classCode:'ABC234',defaultPermissions:all,students:[]};return route.fulfill(ok(state.classroom));}
   if(!state.classroom)return route.fulfill(fail(404,'CLASSROOM_NOT_FOUND'));
   if(method==='PATCH')Object.assign(state.classroom,body);
   return route.fulfill(ok(state.classroom));
  }
  if(path==='class/classroom/qr-print'&&method==='POST'){
   const numbers=[...body.numbers].sort((a:number,b:number)=>a-b) as number[];
   if(numbers.some(number=>state.legacyQr.includes(number))&&!body.replaceExisting)return route.fulfill(fail(409,'QR_REISSUE_REQUIRED'));
   const cards=numbers.map(number=>{const student=state.classroom!.students.find(item=>item.number===number)!;state.qrReady[number]??=`https://classroom.example.invalid/?q=F${String(number).padStart(2,'0')}${'A'.repeat(24)}`;return {number,name:student.name,url:state.qrReady[number]};});
   state.legacyQr=state.legacyQr.filter(number=>!numbers.includes(number));
   return route.fulfill(ok({className:state.classroom!.name,classCode:state.classroom!.classCode,cards}));
  }
  if(path==='class/classroom/students'&&method==='POST'){
   const list=state.classroom!.students;for(let i=0;i<body.count;i++){const number=list.length+1;list.push({number,name:'',password:String(1000+number*111),permissions:null,hasQr:false});}
   return route.fulfill(ok(state.classroom));
  }
  if(path==='class/classroom/students/permissions'){for(const student of state.classroom!.students)if(body.numbers.includes(student.number))student.permissions=body.permissions;return route.fulfill(ok(state.classroom));}
  const student=path.match(/^class\/classroom\/students\/(\d+)$/);
  if(student&&method==='PATCH'){const target=state.classroom!.students.find(item=>item.number===Number(student[1]))!;Object.assign(target,body);return route.fulfill(ok(target));}
  if(path==='class/classroom/assignments'){
   if(method==='POST'){const item:Assignment={format:body.format??'knolstory',id:`a${state.assignments.length+1}`,title:body.title,description:body.description??'',storyKey:body.storyKey??null,edition:body.edition??null,startPoint:body.startPoint??null,startLabel:body.startLabel??null,recipients:body.recipients??null,submittedCount:0,open:true,createdAt:Date.now(),editScope:body.editScope??null,after:body.afterAssignmentId?{id:body.afterAssignmentId,title:state.assignments.find(entry=>entry.id===body.afterAssignmentId)?.title??''}:null} as Assignment;state.assignments.push(item);return route.fulfill(ok(item));}
   return route.fulfill(ok(state.assignments));
  }
  const review=path.match(/^class\/classroom\/assignments\/(\w+)\/submissions\/2\/review$/);
  if(review&&role==='teacher'){if(body.expectedSubmittedAt!==1_760_000_000_000)return route.fulfill(fail(409,'SUBMISSION_CHANGED'));state.review={reviewStatus:body.reviewStatus,feedback:body.feedback};return route.fulfill(ok({number:2,name:'하늘',submittedAt:1_760_000_000_000,reviewStatus:body.reviewStatus,feedback:body.feedback,reviewedAt:1}));}
  const teacherSubmission=path.match(/^class\/classroom\/assignments\/(\w+)\/submissions\/2$/);
  if(teacherSubmission&&role==='teacher'&&state.submissions[teacherSubmission[1]])return route.fulfill(ok({document:state.submissions[teacherSubmission[1]],submittedAt:1_760_000_000_000}));
  // Mid-way drafts and per-student progress (task guidance, 2026-11-18).
  const progress=path.match(/^class\/classroom\/assignments\/(\w+)\/progress$/);
  if(progress)return route.fulfill(ok([{number:1,name:'',draft:state.drafts[progress[1]!]??null,submission:null},{number:2,name:'하늘',draft:null,submission:{submittedAt:1_760_000_000_000,amount:3,chars:40,reviewStatus:state.review?.reviewStatus??null}}]));
  const teacherDraft=path.match(/^class\/classroom\/assignments\/(\w+)\/drafts\/1(\/comment)?$/);
  if(teacherDraft&&teacherDraft[2]&&method==='PUT'){const draft=state.drafts[teacherDraft[1]!]!;draft.comment=body.comment;return route.fulfill(ok({comment:body.comment,commentedAt:body.comment?1_760_000_100_000:null}));}
  if(teacherDraft)return route.fulfill(ok({document:state.draftDocs[teacherDraft[1]!],savedAt:1_760_000_050_000}));
  const studentDraft=path.match(/^class\/classroom\/assignments\/(\w+)\/draft$/);
  if(studentDraft&&method==='PUT'){const item=state.assignments.find(entry=>entry.id===studentDraft[1])!;state.draftDocs[item.id]=body.document;(item as Record<string,unknown>).draftSavedAt=1_760_000_050_000;return route.fulfill(ok({savedAt:1_760_000_050_000}));}
  const assignment=path.match(/^class\/classroom\/assignments\/(\w+)(?:\/(submissions|submission))?$/);
  if(assignment){
   const item=state.assignments.find(entry=>entry.id===assignment[1])!;
   if(!assignment[2]&&method==='PATCH'){Object.assign(item,body);return route.fulfill(ok(item));}
   if(assignment[2]==='submissions')return route.fulfill(ok([{number:2,name:'하늘',submittedAt:1_760_000_000_000,reviewStatus:state.review?.reviewStatus??null,feedback:state.review?.feedback??'',reviewedAt:null}]));
   if(assignment[2]==='submission'&&method==='GET')return route.fulfill(ok({document:state.submissions[item.id],submittedAt:item.submittedAt}));
   if(assignment[2]==='submission'&&method==='PUT'){state.submissions[item.id]=body.document;item.submittedAt=1_760_000_000_000;return route.fulfill(ok({submittedAt:item.submittedAt}));}
  }
  const missionPath=path.match(/^class\/classroom\/missions(?:\/(\w+)(?:\/(submission|progress)(?:\/(\d+))?)?)?$/);
  if(missionPath){
   const [,id,sub,num]=missionPath,mission=id?state.missions.find(item=>item.id===id):undefined,rows=id?state.missionRows[id]??={}:{};
   if(!id&&method==='GET')return route.fulfill(ok(state.missions.map(item=>role==='student'?{...item,progress:state.missionRows[item.id]?.[2]??blankRow()}:item)));
   if(!id&&method==='POST'){const item:Mission={recipients:null,...body,id:`m${state.missions.length+1}`,open:true,createdAt:Date.now()};state.missions.unshift(item);return route.fulfill({status:201,json:{success:true,data:item}});}
   if(!mission)return route.fulfill(fail(404,'MISSION_NOT_FOUND'));
   if(!sub&&method==='PATCH'){Object.assign(mission,body);return route.fulfill(ok(mission));}
   if(sub==='submission'&&method==='PUT'){
    if(!mission.open)return route.fulfill(fail(409,'MISSION_CLOSED'));
    const row=rows[2]??=blankRow();Object.assign(row,{answers:body.answers,note:body.note,submittedAt:++state.missionClock,reviewStatus:null});
    return route.fulfill(ok({submittedAt:row.submittedAt}));
   }
   if(sub==='progress'&&!num&&method==='GET')return route.fulfill(ok(state.missionRoster.map(item=>({...item,...(rows[item.number]??blankRow())}))));
   if(sub==='progress'&&num&&method==='PUT'){
    const row=rows[Number(num)]??=blankRow();
    if(body.expectedSubmittedAt!==row.submittedAt)return route.fulfill(fail(409,'MISSION_SUBMISSION_CHANGED'));
    Object.assign(row,{reviewStatus:body.reviewStatus,feedback:body.feedback,reviewedAt:body.reviewStatus?Date.now():null});
    return route.fulfill(ok({...state.missionRoster.find(item=>item.number===Number(num))!,...row}));
   }
  }
  return route.fulfill(fail(404,'INVALID_REQUEST'));
 });
 return state;
}

