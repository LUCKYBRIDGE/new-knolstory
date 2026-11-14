import {test,expect,type Page} from '@playwright/test';
import axe from 'axe-core';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {readFile} from 'node:fs/promises';
import {startShelfCreation} from './library-entry';
// Fullscreen prompting has its own coverage.
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});});

const all={text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null};
const textOnly={...all,images:false,characters:false,audio:false,direction:false,choices:false};
type Student={number:number;name:string;password:string;permissions:typeof all|null;hasQr:boolean};
type Mission={id:string;title:string;description:string;criteria:string;kind:'reading'|'worksheet'|'custom';storyKey:string|null;readingFormat:'original'|'knolstory'|'shortstory';questions:{id:string;prompt:string}[];open:boolean;createdAt:number};
type MissionRow={answers:Record<string,string>;note:string;submittedAt:number|null;reviewStatus:'passed'|'revise'|null;feedback:string;reviewedAt:number|null};
const blankRow=():MissionRow=>({answers:{},note:'',submittedAt:null,reviewStatus:null,feedback:'',reviewedAt:null});
type Assignment={edition?:'original'|'knolstory'|null;startPoint?:string|null;startLabel?:string|null;format?:'knolstory'|'shortstory';id:string;title:string;description:string;storyKey:string|null;open:boolean;createdAt:number;submittedAt?:number|null};
const ok=(data:unknown)=>({json:{success:true,data}});
const fail=(status:number,code:string)=>({status,json:{success:false,error:{code}}});

/** In-memory stand-in for /api/v1/class. `role` and `signedIn` are mutable so one test can walk through a login. */
async function mockClassroom(page:Page,role:'teacher'|'student'){
 const state={accountId:'11111111-1111-4111-8111-111111111111',permissions:textOnly,signedIn:role==='teacher',classroom:null as null|{id:string;name:string;classCode:string;defaultPermissions:typeof all;students:Student[]},assignments:[] as Assignment[],submissions:{} as Record<string,unknown>,review:null as null|{reviewStatus:'passed'|'revise'|null;feedback:string},missions:[] as Mission[],missionRows:{} as Record<string,Record<number,MissionRow>>,missionRoster:[{number:2,name:'하늘'}],missionClock:1_770_000_000_000,calls:[] as string[],bodies:[] as unknown[],qrReady:{} as Record<number,string>,legacyQr:[] as number[]};
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
   if(method==='POST'){const item:Assignment={format:body.format??'knolstory',id:`a${state.assignments.length+1}`,title:body.title,description:body.description??'',storyKey:body.storyKey??null,edition:body.edition??null,startPoint:body.startPoint??null,startLabel:body.startLabel??null,open:true,createdAt:Date.now()} as Assignment;state.assignments.push(item);return route.fulfill(ok(item));}
   return route.fulfill(ok(state.assignments));
  }
  const review=path.match(/^class\/classroom\/assignments\/(\w+)\/submissions\/2\/review$/);
  if(review&&role==='teacher'){if(body.expectedSubmittedAt!==1_760_000_000_000)return route.fulfill(fail(409,'SUBMISSION_CHANGED'));state.review={reviewStatus:body.reviewStatus,feedback:body.feedback};return route.fulfill(ok({number:2,name:'하늘',submittedAt:1_760_000_000_000,reviewStatus:body.reviewStatus,feedback:body.feedback,reviewedAt:1}));}
  const teacherSubmission=path.match(/^class\/classroom\/assignments\/(\w+)\/submissions\/2$/);
  if(teacherSubmission&&role==='teacher'&&state.submissions[teacherSubmission[1]])return route.fulfill(ok({document:state.submissions[teacherSubmission[1]],submittedAt:1_760_000_000_000}));
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
   if(!id&&method==='POST'){const item:Mission={...body,id:`m${state.missions.length+1}`,open:true,createdAt:Date.now()};state.missions.unshift(item);return route.fulfill({status:201,json:{success:true,data:item}});}
   if(!mission)return route.fulfill(fail(404,'MISSION_NOT_FOUND'));
   if(!sub&&method==='PATCH'){mission.open=body.open;return route.fulfill(ok(mission));}
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

test('teacher builds a class, edits students, bulk-applies 글만 and runs an assignment',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 await page.goto('/teacher');
 await expect(page.getByRole('heading',{name:'학급 만들기'})).toBeVisible();
 await page.getByLabel('학급 이름').fill('3반');await page.getByRole('button',{name:'학급 만들기',exact:true}).click();
 await page.getByRole('link',{name:'학급 설정',exact:true}).click();
 await expect(page.getByLabel('학급 코드',{exact:true})).toHaveText('ABC234');
 await page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('link',{name:'학생',exact:true}).click();
 await page.getByLabel('만들 학생 수').fill('3');await page.getByRole('button',{name:'학생 만들기',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'학생 로그인 QR',exact:true}).getByRole('img')).toHaveCount(3);await page.getByRole('button',{name:'학생 목록으로',exact:true}).click();
 await expect(page.locator('tr[data-student]')).toHaveCount(3);
 // Password is hidden until 보기 is pressed; 바꾸기 saves a new one.
 await expect(page.getByLabel('1번 비밀번호',{exact:true})).toHaveText('••••');
 await page.getByRole('button',{name:'1번 비밀번호 보기'}).click();await expect(page.getByLabel('1번 비밀번호',{exact:true})).toHaveText('1111');
 await page.getByRole('button',{name:'1번 비밀번호 바꾸기'}).click();
 const dialog=page.getByRole('dialog',{name:'1번 비밀번호 바꾸기'});await dialog.getByLabel('새 비밀번호').fill('9876');await dialog.getByRole('button',{name:'바꾸기'}).click();
 await expect(page.getByLabel('1번 비밀번호',{exact:true})).toHaveText('9876');
 // Rename.
 await page.getByLabel('2번 이름',{exact:true}).fill('하늘');await page.getByRole('button',{name:'2번 이름 저장'}).click();
 expect(state.classroom!.students[1]!.name).toBe('하늘');
 // QR renders as SVG.
 await page.getByRole('button',{name:'1번 QR 보기'}).click();
 await page.route('**/api/v1/class/classroom/students/1/qr',route=>route.fulfill(ok({url:'http://127.0.0.1/?class-login=tok'})));
 await page.getByRole('dialog',{name:'1번 QR 접속'}).getByRole('button',{name:'QR 만들기'}).click();
 await expect(page.getByRole('img',{name:'1번 학생 QR'})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'닫기'}).click();
 // Bulk apply.
 await page.getByLabel('1번 선택').check();await page.getByLabel('3번 선택').check();
 await page.getByRole('button',{name:'글만으로 적용'}).click();
 expect(state.classroom!.students.map(item=>item.permissions?.images)).toEqual([false,undefined,false]);
 await expect(page.locator('tr[data-student="1"]')).toContainText('글만');await expect(page.locator('tr[data-student="2"]')).toContainText('기본값');
 // Assignment: create, see it open, close it, open a submission as a file.
 await page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('link',{name:'과제',exact:true}).click();
 await page.getByLabel('과제 제목').fill('내 이야기 쓰기');await page.getByRole('button',{name:'과제 만들기'}).click();
 await expect(page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'내 이야기 쓰기',exact:true})})).toContainText('열림');
 await page.getByRole('button',{name:'내 이야기 쓰기 닫기'}).click();await expect(page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'내 이야기 쓰기',exact:true})})).toContainText('닫힘');
 await page.getByRole('button',{name:'내 이야기 쓰기 제출 보기'}).click();await expect(page.getByRole('link',{name:'2번 제출 작품 열기'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('student submits and teacher opens a device copy after the assignment closes',async({page,browser})=>{
 const state=await mockClassroom(page,'student');
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('하늘의 이야기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await page.getByLabel('1컷 글',{exact:true}).fill('첫 컷이에요.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.goto('/student');
 await page.getByLabel('학급 코드').fill('abc234');await page.getByLabel('번호',{exact:true}).fill('2');await page.getByLabel('비밀번호',{exact:true}).fill('0000');
 await page.getByRole('button',{name:'들어가기',exact:true}).click();await expect(page.locator('main [role=alert]')).toContainText('다시 확인');
 await page.getByLabel('비밀번호',{exact:true}).fill('4821');await page.getByRole('button',{name:'들어가기',exact:true}).click();
 await expect(page.getByRole('heading',{name:/3반 2번 하늘/})).toBeVisible();
 expect(state.bodies).toContainEqual({classCode:'ABC234',number:2,password:'4821'});
 await page.locator('summary').filter({hasText:'내가 고칠 수 있는 것'}).click();
 await expect(page.getByText('소리는 바꿀 수 없어요.')).toBeVisible();
 await expect(page.getByText('아직 안 냈어요')).toBeVisible();
 await page.getByLabel('제출할 작품').selectOption({label:'하늘의 이야기'});
 await page.getByRole('button',{name:'제출',exact:true}).click();
 await expect(page.getByText('제출했어요.')).toBeVisible();await expect(page.getByText(/^제출함 ·/)).toBeVisible();
 await expect(page.getByRole('button',{name:'다시 제출'})).toBeVisible();
 const submitted=state.submissions.a1 as {content:{format:string;document:{project:{title:string}}}};
 expect(submitted.content.format).toBe('knolstory');expect(submitted.content.document.project.title).toContain('하늘의 이야기');
 state.assignments[0].open=false;
 await page.reload();
 await expect(page.getByRole('heading',{name:/^끝났어요/})).toBeVisible();
 await expect(page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'내 이야기 쓰기',exact:true})})).toContainText('닫힘');
 await expect(page.getByRole('button',{name:'다시 제출'})).toHaveCount(0);
 const downloading=page.waitForEvent('download');
 await page.getByRole('button',{name:'내 제출본 파일 받기'}).click();
 const downloaded=await downloading;
 expect(downloaded.suggestedFilename()).toMatch(/\.knolstory$/);
 const archive=parseAuthoringFile(await readFile((await downloaded.path())!,'utf8'));
 expect(archive.project.title).toContain('하늘의 이야기');

 const teacherContext=await browser.newContext();
 try{
  const teacher=await teacherContext.newPage();
  const teacherState=await mockClassroom(teacher,'teacher');
  teacherState.classroom=state.classroom;
  teacherState.assignments=state.assignments;
  teacherState.submissions.a1=submitted;
  await teacher.goto('/teacher');
  await teacher.getByRole('button',{name:'내 이야기 쓰기 제출 보기'}).click();
  await teacher.getByRole('link',{name:'2번 제출 작품 열기'}).click();
  await confirmAuthoringImport(teacher);
  await expect(teacher.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
  const copied=await teacher.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  expect(copied.id).not.toBe((submitted.content.document.project as {id?:string}).id);
  expect(copied.lines[0].text).toBe('첫 컷이에요.');
 }finally{await teacherContext.close();}

});

for(const [parameter,token] of [['class-login','tok123'],['q','A'.repeat(27)]] as const)test(`opening the app with a ${parameter} QR logs in and removes its token`,async({page})=>{
 const state=await mockClassroom(page,'student');
 await page.route('**/api/v1/class/qr-login',route=>{state.bodies.push(JSON.parse(route.request().postData()!));state.signedIn=true;return route.fulfill(ok({role:'student'}));});
 await page.goto(`/?${parameter}=${token}`);
 await expect(page).toHaveURL(/\/student$/);await expect(page.getByRole('heading',{name:/3반 2번 하늘/})).toBeVisible();
 expect(state.bodies).toContainEqual({token});
});

for(const [role,entry] of [['teacher','교사 대시보드'],['student','내 학급·과제'],['admin','관리자'],['member','교사 등록']] as const)test(`account menu shows the ${role} entry`,async({page})=>{
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1/','');
  if(path==='auth/config')return route.fulfill(ok({signupProvider:'kakao',providers:{kakao:true,google:false}}));
  if(path==='me')return route.fulfill(ok({accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf-1'}));
  if(path==='class/me')return route.fulfill(ok({role,account:{id:'a'}}));
  return route.fulfill(ok({documents:[],nextCursor:null}));
 });
 await page.goto('/?view=library');const menu=page.locator('[data-account-menu]');await menu.locator('summary').click();
 await expect(menu.getByRole('button',{name:entry,exact:true})).toBeVisible();
 if(role==='member'){await menu.getByRole('button',{name:entry,exact:true}).click();await expect(page.getByRole('dialog',{name:'교사 등록'})).toBeVisible();}
});

test('a specified assignment starts one draft even when new works are disabled',async({page})=>{
 const state=await mockClassroom(page,'student');
 state.signedIn=true;
 state.permissions={...textOnly,newWorks:false,forcedStoryKey:'rabbit'};
 state.assignments[0].storyKey='rabbit';
 await page.goto('/student');
 await page.getByRole('link',{name:'과제 쓰기',exact:true}).click();
 // The task copy opens after the stored workspace: typing before that lands in a field that is about to be replaced.
 await expect(page).not.toHaveURL(/classTask/);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const text=page.getByRole('textbox',{name:'1컷 글',exact:true});
 await expect(text).toHaveValue(/용궁/);
 await text.fill('과제에서 이어 쓰는 첫 문장.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.id);
 await page.goto('/student');
 await page.getByRole('link',{name:'이어서 쓰기',exact:true}).click();
 await expect(text).toHaveValue('과제에서 이어 쓰는 첫 문장.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.id)).toBe(id);
 await page.goto('/student');
 await page.getByLabel('제출할 작품').selectOption({label:'[내작품] 별주부전'});
 await page.getByRole('button',{name:'제출',exact:true}).click();
 await expect(page.getByText('제출했어요.')).toBeVisible();
});

test('student creation limits apply to the picture book library',async({page})=>{
 const state=await mockClassroom(page,'student');state.signedIn=true;
 state.permissions={...textOnly,newWorks:false};
 await page.goto('/student');
 await expect(page.getByRole('heading',{name:/3반 2번/})).toBeVisible();
 await page.goto('/shortstory?mode=library');
 await expect(page.getByRole('button',{name:'새 그림책',exact:true})).toBeDisabled();
});

test('a student submits a picture book while image changes are restricted',async({page},info)=>{
 const state=await mockClassroom(page,'student');
 state.assignments[0].format='shortstory';
 await page.setViewportSize({width:390,height:844});
 await page.goto('/shortstory?mode=library');
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();
 await page.getByLabel('이야기 제목',{exact:true}).fill('우리 반 그림책');
 await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('함께 쓴 그림책 이야기.');
 state.signedIn=true;
 await page.goto('/student');
 await page.getByLabel('제출할 작품').selectOption({label:'우리 반 그림책 · 숏스토리'});
 await page.getByRole('button',{name:'제출',exact:true}).click();
 await expect(page.getByText('제출했어요.')).toBeVisible();
 const snapshot=state.submissions.a1 as {content:{format:string;project:{pages:{text:string}[]}}};
 expect(snapshot.content.format).toBe('shortstory');
 expect(snapshot.content.project.pages[0].text).toBe('함께 쓴 그림책 이야기.');
 await page.screenshot({path:info.outputPath('student-assignment-phone.png'),fullPage:true});
 await page.goto('/shortstory');
 await expect(page.getByRole('button',{name:'삽화 고르기',exact:true})).toBeDisabled();
 await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('글은 계속 고칠 수 있어요.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('switching teacher accounts hides the previous class while the new class loads',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'old',name:'이전 교사 학급',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'이전 학생',password:'1234',permissions:null,hasQr:false}]};
 await page.goto('/teacher?tab=students');
 await expect(page.getByLabel('1번 이름',{exact:true})).toHaveValue('이전 학생');
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 let requested=false;
 await page.route('**/api/v1/class/me',async route=>{
  requested=true;
  await pending;
  return route.fulfill(ok({role:'teacher',account:{id:'new'},classroom:{id:'new',name:'새 교사 학급',classCode:'XYZ234',studentCount:0}}));
 });
 state.accountId='22222222-2222-4222-8222-222222222222';
 state.classroom={id:'new',name:'새 교사 학급',classCode:'XYZ234',defaultPermissions:all,students:[]};
 await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));
 await expect.poll(()=>requested).toBe(true);
 await expect(page.getByLabel('1번 이름',{exact:true})).toHaveCount(0);
 release();
 await expect(page.getByRole('heading',{name:'새 교사 학급',exact:true})).toBeVisible();
 await expect(page.getByLabel('1번 이름',{exact:true})).toHaveCount(0);
});

test('teacher manages students on a phone without horizontal scrolling',async({page},info)=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[
  {number:1,name:'하늘',password:'1234',permissions:null,hasQr:false},
  {number:2,name:'바다',password:'5678',permissions:null,hasQr:false},
 ]};
 await page.setViewportSize({width:390,height:844});
 await page.goto('/teacher?tab=students');
 await expect(page.getByLabel('1번 이름',{exact:true})).toHaveValue('하늘');
 const table=page.locator('table');
 expect(await table.evaluate(node=>node.getBoundingClientRect().width)).toBeLessThanOrEqual(366);
 const password=page.getByRole('button',{name:'1번 비밀번호 보기',exact:true});
 await password.click();
 await expect(page.getByLabel('1번 비밀번호',{exact:true})).toHaveText('1234');
 await page.getByLabel('1번 선택',{exact:true}).check();
 await page.getByRole('button',{name:'글만으로 적용',exact:true}).click();
 await expect(page.locator('tr[data-student="1"]')).toContainText('글만');
 await page.screenshot({path:info.outputPath('teacher-phone.png'),fullPage:true});
});

test('a task on the original edition starts from the chapter the teacher chose',async({page,browser})=>{
 const teacher=await mockClassroom(page,'teacher');
 teacher.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.goto('/teacher');
 await page.getByLabel('과제 제목',{exact:true}).fill('토끼의 꾀 다시 쓰기');
 await page.getByLabel('바탕 작품 (선택)',{exact:true}).selectOption('rabbit');
 await page.getByLabel('바탕 판본',{exact:true}).selectOption('original');
 const start=page.getByLabel('시작 지점',{exact:true});
 await expect(start.locator('option')).toHaveCount(5);
 await start.selectOption({index:3});
 await page.getByRole('button',{name:'과제 만들기',exact:true}).click();
 await expect(page.getByText(/^시작 · 4장/)).toBeVisible();
 expect(teacher.assignments[0]).toMatchObject({edition:'original',startPoint:expect.stringMatching(/^chapter:/),startLabel:expect.stringMatching(/^4장 · /)});
 const context=await browser.newContext();
 try{
  const studentPage=await context.newPage();
  const student=await mockClassroom(studentPage,'student');student.signedIn=true;student.permissions=all;
  student.assignments=teacher.assignments;
  await studentPage.goto('/student');
  await expect(studentPage.getByRole('link',{name:'작품 전체 읽기'})).toBeVisible();
  await studentPage.getByRole('link',{name:'과제 쓰기',exact:true}).click();
  await expect(studentPage).not.toHaveURL(/classTask/);
  await expect(studentPage.getByTestId('save-status')).toHaveText('임시 보관됨');
  const project=await studentPage.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  expect(project.chapters.length).toBe(4);
  expect(project.lines.filter((line:{text:string})=>line.text==='').length).toBe(1);
 }finally{await context.close();}
});

test('teacher chooses the assignment type and students start a picture book task',async({page,browser},info)=>{
 const teacher=await mockClassroom(page,'teacher');
 teacher.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.goto('/teacher');
 await page.getByLabel('과제 유형',{exact:true}).selectOption('shortstory');
 await page.getByLabel('과제 제목',{exact:true}).fill('그림으로 새 이야기');
 await page.getByLabel('바탕 작품 (선택)',{exact:true}).selectOption('rabbit');
 await page.getByRole('button',{name:'과제 만들기',exact:true}).click();
 await expect(page.getByRole('button',{name:'숏스토리 · 1',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(teacher.assignments[0].format).toBe('shortstory');
 const context=await browser.newContext({viewport:{width:390,height:844}});
 try{
  const studentPage=await context.newPage();
  const student=await mockClassroom(studentPage,'student');student.signedIn=true;
  student.assignments=teacher.assignments;
  student.permissions={...textOnly,newWorks:false,forcedStoryKey:'rabbit'};
  await studentPage.goto('/student');
  await expect(studentPage.getByText('작품 쓰기 · 숏스토리').first()).toBeVisible();
  await studentPage.getByRole('link',{name:'과제 쓰기',exact:true}).click();
  const text=studentPage.getByLabel('이 쪽의 이야기',{exact:true});
  await expect(text).toBeVisible();
  await text.fill('토끼의 새로운 그림책.');
  await studentPage.goto('/student');
  await studentPage.getByRole('link',{name:'이어서 쓰기',exact:true}).click();
  await expect(text).toHaveValue('토끼의 새로운 그림책.');
  await expect(studentPage.getByRole('button',{name:'삽화 고르기',exact:true})).toBeDisabled();
  await studentPage.goto('/student');
  await studentPage.getByRole('button',{name:'제출',exact:true}).click();
  await expect(studentPage.getByText('제출했어요.')).toBeVisible();
  teacher.submissions=student.submissions;
  await page.getByRole('button',{name:'그림으로 새 이야기 제출 보기',exact:true}).click();
  const open=page.getByRole('link',{name:'2번 제출 작품 열기',exact:true});
  await expect(open).toHaveAttribute('href',/shortstory/);
  await open.click();
  await confirmAuthoringImport(page);
  await expect(page.getByLabel('이 쪽의 이야기',{exact:true})).toHaveValue('토끼의 새로운 그림책.');
  await page.screenshot({path:info.outputPath('teacher-shortstory-submission.png'),fullPage:true});
 }finally{await context.close();}
});

test('teacher retries an assignment list failure without an endless loading message',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 let failNext=true;
 await page.route('**/api/v1/class/classroom/assignments',route=>{
  if(failNext){failNext=false;return route.fulfill(fail(503,'SERVICE_UNAVAILABLE'));}
  return route.fulfill(ok([]));
 });
 await page.goto('/teacher');
 const retry=page.getByRole('button',{name:'과제 다시 불러오기',exact:true});
 await expect(retry).toBeVisible();
 await expect(page.getByText('과제를 불러오고 있어요.')).toHaveCount(0);
 await retry.click();
 await expect(page.getByText('이 유형의 과제가 없어요.')).toBeVisible();
});

test('an existing picture book task stays resumable after new work creation is disabled',async({page})=>{
 const state=await mockClassroom(page,'student');state.signedIn=true;
 state.permissions={...all};state.assignments[0].format='shortstory';
 await page.goto('/student');
 await page.getByRole('link',{name:'과제 쓰기',exact:true}).click();
 await page.getByLabel('이 쪽의 이야기',{exact:true}).fill('계속 쓸 수 있는 작성본.');
 state.permissions={...textOnly,newWorks:false};
 await page.goto('/student');
 await page.getByRole('link',{name:'이어서 쓰기',exact:true}).click();
 await expect(page.getByLabel('이 쪽의 이야기',{exact:true})).toHaveValue('계속 쓸 수 있는 작성본.');
});

test('cancelling a delayed picture book submission open releases file tools',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 let release!:()=>void,requested=false;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/v1/class/classroom/assignments/a1/submissions/2',async route=>{
  requested=true;await pending;
  await route.fulfill(fail(404,'ASSIGNMENT_NOT_FOUND')).catch(()=>{});
 });
 await page.goto('/shortstory?classAssignment=a1&classStudent=2');
 await expect.poll(()=>requested).toBe(true);
 await page.getByText('파일 교환·보관',{exact:true}).click();
 await expect(page.getByRole('button',{name:'Excel로 보관',exact:true})).toBeDisabled();
 state.signedIn=false;
 await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));
 await expect(page.getByRole('button',{name:'Excel로 보관',exact:true})).toBeEnabled();
 release();
 await expect(page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true})).toHaveCount(0);
});

test('classroom design keeps long titles and management usable across screen sizes',async({page,browser},info)=>{
 const teacher=await mockClassroom(page,'teacher');
 teacher.classroom={id:'c1',name:'우리 반 상상 가득 이야기 교실',classCode:'ABC234',defaultPermissions:all,students:[
  {number:1,name:'긴 이름을 가진 학생',password:'1234',permissions:null,hasQr:false},
  {number:2,name:'이야기를 좋아하는 바다',password:'5678',permissions:null,hasQr:true},
 ]};
 teacher.assignments=[
  {id:'a1',format:'knolstory',title:'토끼와 자라가 다시 만난 날, 바다 너머의 새로운 이야기',description:'등장인물의 마음을 상상하며 대사를 이어 써 보세요.',storyKey:'rabbit',open:true,createdAt:1},
  {id:'a2',format:'shortstory',title:'삽화를 섞어 만드는 나만의 그림책',description:'익숙한 장면과 새로운 사건을 자유롭게 섞어 보세요.',storyKey:null,open:true,createdAt:2},
  {id:'a3',format:'shortstory',title:'함께 읽은 첫 그림책',description:'마감한 과제도 다시 확인할 수 있어요.',storyKey:null,open:false,createdAt:3},
 ];
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('/teacher');
  await expect(page.getByRole('heading',{name:'우리 반 상상 가득 이야기 교실',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.addScriptTag({content:axe.source});
  const scan=await page.locator('main').evaluate(node=>(window as typeof window&{axe:typeof axe}).axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},iframes:false}));
  expect(scan.violations.map(issue=>({id:issue.id,nodes:issue.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({path:info.outputPath(`teacher-${viewport.width}.png`),fullPage:true});
  await page.getByRole('button',{name:'숏스토리 · 2',exact:true}).click();
  await expect(page.getByRole('heading',{name:'삽화를 섞어 만드는 나만의 그림책',exact:true})).toBeVisible();
  await page.getByText('작품 쓰기 과제 만들기',{exact:true}).click();
  await expect(page.getByLabel('과제 유형',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('link',{name:'학급 설정',exact:true}).click();
  const code=page.getByLabel('학급 코드',{exact:true});
  await expect(code).toBeVisible();
  expect(await code.evaluate(node=>node.getBoundingClientRect().height)).toBeLessThan(60);
  await page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('link',{name:'학생',exact:true}).click();
  await expect(page.getByLabel('1번 이름',{exact:true})).toHaveValue('긴 이름을 가진 학생');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const context=await browser.newContext();
 try{
  const studentPage=await context.newPage(),student=await mockClassroom(studentPage,'student');
  student.signedIn=true;student.permissions=all;student.assignments=teacher.assignments;
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   await studentPage.setViewportSize(viewport);await studentPage.goto('/student');
   await expect(studentPage.getByRole('region',{name:'할 일'})).toBeVisible();
   await expect(studentPage.getByRole('link',{name:'과제 쓰기',exact:true})).toHaveCount(2);
   expect(await studentPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await studentPage.addScriptTag({content:axe.source});
   const scan=await studentPage.locator('main').evaluate(node=>(window as typeof window&{axe:typeof axe}).axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},iframes:false}));
   expect(scan.violations.map(issue=>issue.id)).toEqual([]);
   await studentPage.screenshot({path:info.outputPath(`student-${viewport.width}.png`),fullPage:true});
  }
  await studentPage.keyboard.press('Tab');
  await expect(studentPage.locator(':focus')).toHaveCSS('outline-style','solid');
  await studentPage.emulateMedia({reducedMotion:'reduce'});
  await expect(studentPage.getByRole('link',{name:'과제 쓰기',exact:true}).first()).toHaveCSS('transition-duration','0s');
 }finally{await context.close();}
});

test('teacher navigation separates tasks, students and settings and shares the all-works library',async({page},info)=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?view=library');
 const nav=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 await expect(nav.getByRole('link',{name:'서재',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await expect(page.getByLabel('책 분류',{exact:true}).locator('option:checked')).toHaveText('모든 작품');
 await expect(nav.getByRole('link',{name:'과제',exact:true})).toBeVisible();
 await nav.getByRole('link',{name:'과제',exact:true}).click();
 await expect(nav.getByRole('link',{name:'과제',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('region',{name:'학생 만들기',exact:true})).toHaveCount(0);
 await nav.getByRole('link',{name:'학생',exact:true}).click();
 await expect(page.getByRole('region',{name:'학생 만들기',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'읽기·활동 과제',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'학급 설정',exact:true}).click();
 await expect(page.getByLabel('학급 코드',{exact:true})).toHaveText('ABC234');
 await page.getByLabel('학급 이름',{exact:true}).fill('함께 쓰는 반');
 await page.getByRole('button',{name:'이름 바꾸기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'함께 쓰는 반',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('teacher-settings-phone.png'),fullPage:true});
 await nav.getByRole('link',{name:'서재',exact:true}).click();
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await page.getByLabel('책 분류',{exact:true}).selectOption('own');
 await nav.getByRole('link',{name:'과제',exact:true}).click();
 await nav.getByRole('link',{name:'서재',exact:true}).click();
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('own');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('student shares the library and tasks tabs without teacher management links',async({page})=>{
 const state=await mockClassroom(page,'student');state.signedIn=true;
 await page.goto('/student');
 const nav=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 await expect(nav.getByRole('link')).toHaveText(['서재','내 과제']);
 await expect(nav.getByRole('link',{name:'내 과제',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('link',{name:'학급 설정',exact:true})).toHaveCount(0);
 await nav.getByRole('link',{name:'서재',exact:true}).click();
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await nav.getByRole('link',{name:'내 과제',exact:true}).click();
 await page.getByRole('link',{name:'과제 쓰기',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toBeVisible();
 await expect(nav).toHaveCount(0);
});

test('a regular member manages a created work in the shared all-works library',async({page},info)=>{
 const state=await mockClassroom(page,'student');state.signedIn=true;
 await page.route('**/api/v1/class/me',route=>route.fulfill(ok({role:'member',account:{id:'a'}})));
 await page.goto('/?view=library');
 const nav=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 await expect(nav.getByRole('link')).toHaveText(['서재']);
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await startShelfCreation(page);
 await page.getByLabel('새 작품 제목',{exact:true}).fill('내가 만든 첫 이야기');
 await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await page.getByRole('textbox',{name:'1컷 글',exact:true}).fill('서재에서 다시 열 수 있는 내 이야기.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await expect(nav).toHaveCount(0);
 await page.goto('/?view=library');
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await expect(page.getByRole('article',{name:'내 작품 · 내가 만든 첫 이야기',exact:true})).toBeVisible();
 await expect(page.getByRole('article',{name:'기본 작품 · 별주부전',exact:true})).toBeVisible();
 await page.getByLabel('책 분류',{exact:true}).selectOption('own');
 await expect(page.locator('[data-shelf-book]')).toHaveCount(1);
 await page.screenshot({path:info.outputPath('member-own-work-library.png'),fullPage:true});
});

for(const [path,key] of [['/?view=library','knolstory-next-workspace-v1'],['/shortstory?mode=library','knolstory-shortstory-library-v1']] as const)test(`clean service navigation leaves protected storage untouched: ${path}`,async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.addInitScript(({key})=>{if(!sessionStorage.getItem('nav-recovery-seeded')){localStorage.setItem(key,'corrupted-original-preserved');sessionStorage.setItem('nav-recovery-seeded','1');}},{key});
 await page.goto(path);
 const nav=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 await expect(nav.getByRole('link',{name:'과제',exact:true})).toBeVisible();
 await nav.getByRole('link',{name:'과제',exact:true}).click();
 await expect(page).toHaveURL(/\/teacher$/);
 await expect(page.getByRole('heading',{name:'작품 쓰기 과제',exact:true})).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe('corrupted-original-preserved');
});

test('teacher prints a complete class in portrait and square A4 grids',async({page},info)=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'상상 가득 이야기 교실의 친구들',classCode:'ABC234',defaultPermissions:all,students:Array.from({length:30},(_,i)=>({number:i+1,name:(i===0||i===29)?'가나다라마바사아자차'.repeat(4):`이야기친구${i+1}`,password:'1234',permissions:null,hasQr:false}))};
 await page.goto('/teacher?tab=students');
 await page.getByRole('button',{name:'전체 학생 QR 보기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'학생 로그인 QR',exact:true});
 await expect(dialog.getByRole('img')).toHaveCount(30);
 await dialog.getByRole('button',{name:'A4 인쇄',exact:true}).click();
 await expect(dialog).toContainText('한 쪽에 12명 · 총 3쪽');
 await expect(dialog.locator('[data-qr-print-page]')).toHaveCount(3);
 await expect(dialog.getByRole('img')).toHaveCount(30);
 expect(await dialog.locator('[data-qr-print-page]').evaluateAll(pages=>pages.map(p=>p.querySelectorAll('[data-qr-student]').length))).toEqual([12,12,6]);
 await expect(dialog.getByText('1234',{exact:true})).toHaveCount(0);
 const initialCalls=state.calls.filter(call=>call==='POST class/classroom/qr-print').length;
 const portrait=await page.pdf({path:info.outputPath('student-qr-3x4.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 expect(portrait.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(3);
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('3');
 const pdf=await page.pdf({path:info.outputPath('student-qr-3x3.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(4);
 await dialog.getByLabel('가로 열 수',{exact:true}).selectOption('2');
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('2');
 const two=await page.pdf({path:info.outputPath('student-qr-2x2.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 expect(two.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(8);
 await dialog.getByLabel('가로 열 수',{exact:true}).selectOption('4');
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('4');
 expect(await dialog.locator('[data-qr-student]').evaluateAll(cards=>cards.every(card=>card.scrollHeight<=card.clientHeight+1))).toBe(true);
 await dialog.getByLabel('가로 열 수',{exact:true}).selectOption('5');
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('5');
 await expect(dialog.locator('[data-qr-print-page]')).toHaveCount(2);
 const dense=await page.pdf({path:info.outputPath('student-qr-5x5.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 expect(dense.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(2);
 await dialog.getByLabel('가로 열 수',{exact:true}).selectOption('4');
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('6');
 await expect(dialog.getByRole('button',{name:'인쇄하기',exact:true})).toBeEnabled();
 expect(await dialog.locator('[data-qr-print-page]').evaluateAll(pages=>pages.map(sheet=>sheet.querySelectorAll('[data-qr-student]').length))).toEqual([24,6]);
 const sixRows=await page.pdf({path:info.outputPath('student-qr-4x6.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 expect(sixRows.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(2);
 expect(state.calls.filter(call=>call==='POST class/classroom/qr-print')).toHaveLength(initialCalls);
 expect(await dialog.locator('[data-qr-student]').evaluateAll(cards=>cards.every(card=>card.scrollHeight<=card.clientHeight+1))).toBe(true);
 await page.addScriptTag({content:axe.source});
 const scan=await dialog.evaluate(node=>(window as typeof window&{axe:typeof axe}).axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},iframes:false}));
 expect(scan.violations.map(issue=>issue.id)).toEqual([]);
 await page.screenshot({path:info.outputPath('qr-print-preview.png'),fullPage:true});
 await dialog.getByRole('button',{name:'학생 목록으로',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'전체 학생 QR 보기',exact:true}).click();
 await expect(page.getByRole('img')).toHaveCount(30);
 expect(Object.keys(await page.evaluate(()=>({...localStorage}))).some(key=>key.includes('qr'))).toBe(false);
});

test('creating students opens their QR cards at once, with a zoomed view to show one student',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:false}]};
 await page.setViewportSize({width:390,height:844});
 await page.goto('/teacher?tab=students');
 await page.getByLabel('만들 학생 수',{exact:true}).fill('3');
 await page.getByRole('button',{name:'학생 만들기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'학생 로그인 QR',exact:true});
 await expect(dialog.getByRole('img')).toHaveCount(3);
 expect(state.bodies).toContainEqual({numbers:[2,3,4]});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await dialog.getByRole('button',{name:'2번 QR 크게 보기',exact:true}).click();
 const zoom=page.getByRole('dialog',{name:'2번 QR 크게 보기',exact:true});
 await expect(zoom).toBeVisible();
 await zoom.getByRole('button',{name:'다음 학생',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'3번 QR 크게 보기',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'3번 QR 크게 보기',exact:true})).toHaveCount(0);
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'학생 목록으로',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByLabel('만들 학생 수',{exact:true})).toHaveValue('1');
});

test('selected QR printing requires explicit consent before replacing legacy cards',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:true},{number:2,name:'바다',password:'5678',permissions:null,hasQr:false}]};
 state.legacyQr=[1];
 await page.setViewportSize({width:390,height:844});
 await page.goto('/teacher?tab=students');
 await page.getByLabel('1번 선택',{exact:true}).check();
 await page.getByRole('button',{name:'선택한 학생 QR 보기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'학생 로그인 QR',exact:true});
 await expect(dialog.getByRole('alert')).toContainText('이전 QR은 더 이상 쓸 수 없어요');
 await expect(dialog.getByRole('button',{name:'이전 QR 바꾸고 준비',exact:true})).toBeDisabled();
 await expect(dialog.locator('[data-qr-print-page]')).toHaveCount(0);
 await dialog.getByRole('checkbox').check();
 await dialog.getByRole('button',{name:'이전 QR 바꾸고 준비',exact:true}).click();
 await expect(dialog.getByRole('img')).toHaveCount(1);
 expect(state.bodies).toContainEqual({numbers:[1],replaceExisting:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('button',{name:'선택한 학생 QR 보기',exact:true})).toBeFocused();
});

test('QR preparation survives an earlier student setting request finishing',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:false}]};
 let releasePermission!:()=>void,releaseQr!:()=>void,permissionStarted=false,qrStarted=false;
 const permission=new Promise<void>(resolve=>{releasePermission=resolve;}),qr=new Promise<void>(resolve=>{releaseQr=resolve;});
 await page.route('**/api/v1/class/classroom/students/permissions',async route=>{permissionStarted=true;await permission;state.classroom!.students[0].permissions=textOnly;await route.fulfill(ok(state.classroom));});
 await page.route('**/api/v1/class/classroom/qr-print',async route=>{qrStarted=true;await qr;await route.fulfill(ok({className:'우리 반',classCode:'ABC234',cards:[{number:1,name:'하늘',url:'https://classroom.example.invalid/?class-login=fixture-1'}]})).catch(()=>{});});
 await page.goto('/teacher?tab=students');
 await page.getByLabel('1번 선택',{exact:true}).check();
 await page.getByRole('button',{name:'글만으로 적용',exact:true}).click();
 await expect.poll(()=>permissionStarted).toBe(true);
 await page.getByRole('button',{name:'전체 학생 QR 보기',exact:true}).click();
 await expect.poll(()=>qrStarted).toBe(true);
 releasePermission();
 await expect(page.locator('tr[data-student="1"]')).toContainText('글만');
 releaseQr();
 await page.getByRole('button',{name:'A4 인쇄',exact:true}).click();
 await expect(page.getByRole('button',{name:'인쇄하기',exact:true})).toBeEnabled();
 await expect(page.getByRole('img')).toHaveCount(1);
});

test('overly dense QR print blocks tiny modules and offers a larger layout',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:true}]};
 const url='https://'+'long-host.'.repeat(18)+'example.invalid/?q='+'A'.repeat(27);
 await page.route('**/api/v1/class/classroom/qr-print',route=>route.fulfill(ok({className:'우리 반',classCode:'ABC234',cards:[{number:1,name:'하늘',url}]})));
 await page.goto('/teacher?tab=students');
 await page.getByRole('button',{name:'전체 학생 QR 보기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'학생 로그인 QR',exact:true});
 await dialog.getByRole('button',{name:'A4 인쇄',exact:true}).click();
 await dialog.getByLabel('가로 열 수',{exact:true}).selectOption('5');
 await dialog.getByLabel('세로 행 수',{exact:true}).selectOption('5');
 await expect(dialog.getByRole('alert')).toContainText('촘촘해요');
 await expect(dialog.getByRole('button',{name:'인쇄하기',exact:true})).toBeDisabled();
 await page.emulateMedia({media:'print'});
 await expect(dialog.locator('[data-qr-print-page]')).toBeHidden();
 await page.emulateMedia({media:'screen'});
 await dialog.getByRole('button',{name:'2열 × 3행으로 크게',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'인쇄하기',exact:true})).toBeEnabled();
 await expect(dialog.getByRole('alert')).toHaveCount(0);
});

test('switching teacher accounts closes the prepared QR workspace',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'old',name:'이전 반',classCode:'ABC234',defaultPermissions:all,students:[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:true}]};
 await page.goto('/teacher?tab=students');
 await page.getByRole('button',{name:'전체 학생 QR 보기',exact:true}).click();
 await expect(page.getByRole('img')).toHaveCount(1);
 state.accountId='22222222-2222-4222-8222-222222222222';
 state.classroom={id:'new',name:'새 반',classCode:'XYZ234',defaultPermissions:all,students:[]};
 await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));
 await expect(page.getByRole('dialog',{name:'학생 로그인 QR',exact:true})).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'새 반',exact:true})).toBeVisible();
});

const worksheetMission:Mission={id:'m1',title:'별주부전 독후 활동지',description:'읽고 생각을 써요.',criteria:'까닭을 함께 써요.',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'기억에 남는 장면은?'},{id:'q2',prompt:'토끼의 선택을 어떻게 생각하나요?'}],open:true,createdAt:1};
test('teacher asks for a rewrite with feedback, then passes the work',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[{number:2,name:'하늘',password:'1234',permissions:null,hasQr:false}]};
 state.assignments=[{id:'a1',format:'knolstory',title:'내 이야기 쓰기',description:'',storyKey:null,open:true,createdAt:1,submittedAt:null}];
 await page.goto('/teacher');
 await page.getByRole('button',{name:'내 이야기 쓰기 제출 보기'}).click();
 const review=page.locator('[data-review]').filter({hasText:'2번 하늘'}).first();
 await expect(review.getByText('확인 전')).toBeVisible();
 await review.getByRole('button',{name:'2번 다시 쓰기 요청'}).click();
 await review.getByRole('button',{name:'다시 쓰기 요청',exact:true}).click();
 await expect(review.getByRole('alert')).toContainText('다시 쓸 점을 적어 주세요');
 await review.getByLabel('2번에게 피드백').fill('결말을 조금 더 써 주세요.');
 await review.getByRole('button',{name:'다시 쓰기 요청',exact:true}).click();
 await expect(page.locator('[data-review="revise"]').getByText('결말을 조금 더 써 주세요.')).toBeVisible();
 expect(state.review).toEqual({reviewStatus:'revise',feedback:'결말을 조금 더 써 주세요.'});
 await page.getByRole('button',{name:'2번 통과'}).click();
 await expect(page.locator('div[data-review="passed"]')).toBeVisible();
 expect(state.review?.reviewStatus).toBe('passed');
});

test('one composer opens the right form for every kind of task',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.goto('/teacher');
 const composer=page.getByRole('region',{name:'새 과제 내기'});
 await composer.getByRole('button',{name:/^작품 쓰기 · 숏스토리/}).click();
 await expect(page.getByLabel('과제 유형',{exact:true})).toHaveValue('shortstory');
 await expect(page.locator('input[name="task-title"]')).toBeFocused();
 await composer.getByRole('button',{name:/^독후 활동지/}).click();
 await expect(page.locator('form[aria-label="과제 직접 만들기"]')).toBeVisible();
 await composer.getByRole('button',{name:/^제공 과제 가져오기/}).click();
 await expect(page.getByText('어떤 작품의 과제를 가져올까요?')).toBeVisible();
});
test('teacher imports a provided mission, edits it and assigns it',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.goto('/teacher');
 const panel=page.getByRole('region',{name:'읽기·활동 과제',exact:true});
 await expect(panel.getByText('아직 낸 과제가 없어요.',{exact:false})).toBeVisible();
 await panel.getByRole('button',{name:'놀스토리 제공 과제 가져오기'}).click();
 await panel.getByRole('button',{name:'별주부전 독후 활동지 가져와서 고치기'}).click();
 const title=panel.getByLabel('과제 제목');await expect(title).toHaveValue('별주부전 독후 활동지');await title.fill('별주부전 독후 활동지 · 우리 반');
 await panel.getByRole('button',{name:'과제 내기'}).click();
 await expect(panel.getByRole('status')).toContainText('과제를 냈어요');
 await expect(panel.getByRole('heading',{name:'별주부전 독후 활동지 · 우리 반'})).toBeVisible();
 const body=state.bodies.at(-1) as Mission;
 expect(body).toMatchObject({title:'별주부전 독후 활동지 · 우리 반',kind:'worksheet',storyKey:'rabbit',readingFormat:'original'});
 expect(body.questions.map(question=>question.id)).toEqual(['q1','q2','q3']);
});
test('teacher writes a reading mission and must choose a work',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.goto('/teacher');
 const panel=page.getByRole('region',{name:'읽기·활동 과제',exact:true});
 await panel.getByRole('button',{name:'직접 만들기'}).click();
 await panel.getByRole('button',{name:/^읽기/}).click();
 await panel.getByLabel('과제 제목').fill('흥부와 놀부 읽기');
 await panel.getByRole('button',{name:'과제 내기'}).click();
 await expect(panel.getByRole('alert')).toHaveText('읽을 작품을 골라 주세요.');
 expect(state.calls).not.toContain('POST class/classroom/missions');
 await panel.getByLabel('읽을 작품',{exact:true}).selectOption('heungbu');
 await panel.getByLabel('읽을 판본',{exact:true}).selectOption('knolstory');
 await panel.getByRole('button',{name:'과제 내기'}).click();
 await expect(panel.getByRole('heading',{name:'흥부와 놀부 읽기'})).toBeVisible();
 expect(state.bodies.at(-1)).toMatchObject({title:'흥부와 놀부 읽기',kind:'reading',storyKey:'heungbu',readingFormat:'knolstory',questions:[]});
});
test('student submits a worksheet, rewrites after feedback and sees mission success',async({page})=>{
 test.setTimeout(60000);
 const state=await mockClassroom(page,'student');state.signedIn=true;state.missions=[structuredClone(worksheetMission)];
 await page.goto('/student');
 const card=page.locator('article[data-mission="m1"]');
 await expect(card).toHaveAttribute('data-status','none');
 await card.getByLabel('기억에 남는 장면은?').fill('용궁 장면이요.');
 await card.getByLabel('토끼의 선택을 어떻게 생각하나요?').fill('잘했어요.');
 await card.getByRole('button',{name:'별주부전 독후 활동지 확인 요청',exact:true}).click();
 await expect(card).toHaveAttribute('data-status','pending');await expect(card.getByText('확인 대기',{exact:true})).toBeVisible();
 expect(state.bodies.at(-1)).toEqual({answers:{q1:'용궁 장면이요.',q2:'잘했어요.'},note:''});
 Object.assign(state.missionRows.m1![2]!,{reviewStatus:'revise',feedback:'까닭을 더 써 주세요.',reviewedAt:5});
 await page.reload();
 await expect(card).toHaveAttribute('data-status','revise');await expect(card.getByText('선생님 피드백')).toBeVisible();await expect(card.getByText('까닭을 더 써 주세요.')).toBeVisible();
 await card.getByLabel('토끼의 선택을 어떻게 생각하나요?').fill('살려면 어쩔 수 없었어요.');
 await card.getByRole('button',{name:'별주부전 독후 활동지 다시 확인 요청',exact:true}).click();
 await expect(card).toHaveAttribute('data-status','pending');
 await expect(card.getByText('지난 피드백')).toBeVisible();await expect(card.getByText('까닭을 더 써 주세요.')).toBeVisible();
 expect(state.missionRows.m1![2]!.answers.q2).toBe('살려면 어쩔 수 없었어요.');
 Object.assign(state.missionRows.m1![2]!,{reviewStatus:'passed',feedback:'잘 썼어요!'});
 await page.reload();
 await expect(card).toHaveAttribute('data-status','passed');await expect(card.getByText('과제 통과')).toBeVisible();
 await expect(page.getByLabel(/^할 일 \d+개 가운데 1개 끝냄$/)).toContainText('1 /');
 await expect(page.getByRole('heading',{name:/^끝났어요/})).toBeVisible();
});
test('teacher reviews answers, handles a changed submission, and passes paper work directly',async({page})=>{
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 state.missions=[structuredClone(worksheetMission)];state.missionRoster=[{number:2,name:'하늘'},{number:3,name:'바다'}];
 state.missionRows.m1={2:{answers:{q1:'용궁 장면',q2:'잘했어요'},note:'',submittedAt:100,reviewStatus:null,feedback:'',reviewedAt:null}};
 await page.goto('/teacher');
 const panel=page.getByRole('region',{name:'읽기·활동 과제',exact:true});
 await panel.getByRole('button',{name:'별주부전 독후 활동지 학생 확인'}).click();
 await expect(panel.getByText('확인 대기 1')).toBeVisible();
 const first=panel.locator('details',{hasText:'2번 하늘'}),second=panel.locator('details',{hasText:'3번 바다'});
 await first.locator('summary').click();await expect(first.getByText('용궁 장면')).toBeVisible();
 await first.getByRole('button',{name:'2번 하늘 다시 쓰기'}).click();
 await expect(first.getByRole('alert')).toHaveText('다시 쓸 점을 학생에게 남길 말에 적어 주세요.');
 // The student answers again while the teacher still has the earlier answer on screen.
 Object.assign(state.missionRows.m1[2]!,{answers:{q1:'용궁 장면',q2:'살려고 꾀를 냈어요'},submittedAt:105});
 await first.getByRole('button',{name:'2번 하늘 통과',exact:true}).click();
 await expect(first.getByRole('alert')).toContainText('다시 냈어요');await expect(first.getByText('살려고 꾀를 냈어요')).toBeVisible();
 expect(state.missionRows.m1[2]!.reviewStatus).toBeNull();
 await first.getByRole('button',{name:'2번 하늘 통과',exact:true}).click();
 await expect(first.getByRole('status')).toContainText('통과시켰어요');expect(state.missionRows.m1[2]!.reviewStatus).toBe('passed');
 await second.locator('summary').click();await expect(second.getByText('온라인으로 낸 답변이 없어요.',{exact:false})).toBeVisible();
 await second.getByRole('button',{name:'3번 바다 통과',exact:true}).click();
 await expect(second.getByRole('status')).toContainText('통과시켰어요');
 expect(state.bodies.at(-1)).toEqual({reviewStatus:'passed',feedback:'',expectedSubmittedAt:null});
 await expect(panel.getByText('통과 2')).toBeVisible();
});
test('mission reading link opens the provided book and returns to the mission',async({page})=>{
 test.setTimeout(60000);
 const state=await mockClassroom(page,'student');state.signedIn=true;
 state.missions=[{id:'m1',title:'별주부전 끝까지 읽기',description:'',criteria:'',kind:'reading',storyKey:'rabbit',readingFormat:'original',questions:[],open:true,createdAt:1}];
 await page.goto('/student');
 await page.getByRole('link',{name:'별주부전 읽으러 가기'}).click();
 const book=page.getByRole('main',{name:'책 표지와 소개'});
 await expect(book.getByRole('heading',{name:'별주부전',level:1})).toBeVisible({timeout:30000});
 await expect(book.getByText('과제로 읽는 책이에요.',{exact:false})).toBeVisible();
 expect(new URL(page.url()).search).toBe('');
 await book.getByRole('button',{name:'과제로 돌아가기'}).click();
 await expect(page).toHaveURL(/\/student$/);
 await expect(page.locator('article[data-mission="m1"]')).toBeVisible();
});

/** Account role screens without the classroom mock: admin overview and teacher code, plus the next steps for other roles. */
async function mockRole(page:Page,initial:'guest'|'member'|'teacher'|'student'|'admin'){
 const state={role:initial,codeSetAt:null as number|null,codes:[] as string[],upgradeCode:'',paused:false,code:null as string|null};
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1/',''),body=request.postData()?JSON.parse(request.postData()!):undefined;
  if(path==='auth/config')return route.fulfill(ok({signupProvider:'kakao',providers:{kakao:true,google:false}}));
  if(path==='me')return route.fulfill(state.role==='guest'?fail(401,'SESSION_REQUIRED'):ok({accountId:'a1',csrf:'csrf-1'}));
  if(path==='class/me')return route.fulfill(state.role==='guest'?fail(401,'SESSION_REQUIRED'):ok(state.role==='student'?{role:'student',account:{id:'a1'},student:{number:1,name:'',classId:'c',className:'3반',permissions:all}}:{role:state.role,account:{id:'a1'}}));
  if(path==='class/admin/overview')return route.fulfill(ok({teacherCodeUpdatedAt:state.codeSetAt,accounts:{member:4,teacher:2,student:27},classrooms:[{name:'5학년 3반',studentCount:25,assignmentCount:3,openAssignmentCount:1,missionCount:4,passedMissionCount:18,createdAt:1_770_000_000_000},{name:'4학년 1반',studentCount:2,assignmentCount:0,openAssignmentCount:0,missionCount:0,passedMissionCount:0,createdAt:1_769_000_000_000}]}));
  const codeView=()=>({code:state.code,paused:state.paused,updatedAt:state.codeSetAt});
  if(path==='class/admin/teacher-code'&&request.method()==='GET')return route.fulfill(ok(codeView()));
  if(path==='class/admin/teacher-code'&&request.method()==='PUT'){state.codes.push(body.code);state.code=body.code;state.codeSetAt=1_770_100_000_000;return route.fulfill(ok(codeView()));}
  if(path==='class/admin/teacher-code'&&request.method()==='PATCH'){state.paused=body.paused;return route.fulfill(ok(codeView()));}
  if(path==='class/admin/access')return route.fulfill(ok({accounts:[{id:'44444444-dddd',role:'admin',provider:'kakao',className:'6학년 1반',studentNumber:null,lastLoginAt:Date.now()-60*1000,lastLoginMethod:'kakao'},{id:'11111111-aaaa',role:'student',provider:null,className:'5학년 3반',studentNumber:7,lastLoginAt:Date.now()-3*60*60*1000,lastLoginMethod:'qr'},{id:'22222222-bbbb',role:'teacher',provider:'kakao',className:'5학년 3반',studentNumber:null,lastLoginAt:Date.now()-2*24*60*60*1000,lastLoginMethod:'kakao'},{id:'33333333-cccc',role:'member',provider:'kakao',className:null,studentNumber:null,lastLoginAt:null,lastLoginMethod:null}]}));
  if(path==='class/teacher-upgrade'){if(body.code!==state.upgradeCode)return route.fulfill(fail(403,'INVALID_TEACHER_CODE'));state.role='teacher';return route.fulfill(ok({role:'teacher'}));}
  if(path==='class/classroom')return route.fulfill(fail(404,'CLASSROOM_NOT_FOUND'));
  if(path==='class/classroom/missions'||path==='class/classroom/assignments')return route.fulfill(ok([]));
  return route.fulfill(fail(404,'NOT_FOUND'));
 });
 return state;
}
test('admin sees the service overview and sets a readable teacher code',async({page})=>{
 const state=await mockRole(page,'admin');
 await page.goto('/admin');
 const stats=page.getByRole('region',{name:'서비스 현황'});
 await expect(stats.getByText('27',{exact:true})).toBeVisible();await expect(stats.getByText('낸 과제 4개')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'주 메뉴'}).getByRole('link',{name:'관리'})).toHaveAttribute('aria-current','page');
 const rooms=page.getByRole('region',{name:'학급 목록'});await expect(rooms.getByText('5학년 3반')).toBeVisible();await expect(rooms.getByText('4학년 1반')).toBeVisible();
 const card=page.getByRole('region',{name:'교사 등록 코드'});
 await expect(card.getByText('아직 코드를 정하지 않았어요.',{exact:false})).toBeVisible();
 await expect(card.getByText('한 코드로 여러 선생님이 등록할 수 있어요.')).toBeVisible();
 await card.getByRole('button',{name:'읽기 쉬운 코드 만들기'}).click();
 const value=await card.getByLabel('코드 (6~32자)').inputValue();expect(value).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){2}$/);
 await card.getByRole('button',{name:'코드 정하기'}).click();
 await expect(card.getByLabel('현재 교사 등록 코드')).toHaveText(value);expect(state.codes).toEqual([value]);
 await expect(card.getByText('사용 중',{exact:true})).toBeVisible();
 await card.getByRole('button',{name:'등록 멈추기'}).click();
 await expect(card.getByText('멈춤',{exact:true})).toBeVisible();expect(state.paused).toBe(true);
 await card.getByRole('button',{name:'다시 받기'}).click();expect(state.paused).toBe(false);
 await card.getByRole('button',{name:'코드 바꾸기'}).click();await card.getByLabel('새 코드 (6~32자)').fill('KNOL-2027-SPRING');
 await card.getByRole('button',{name:'이 코드로 바꾸기'}).click();await expect(card.getByLabel('현재 교사 등록 코드')).toHaveText('KNOL-2027-SPRING');
 await page.reload();await expect(page.getByRole('region',{name:'교사 등록 코드'}).getByLabel('현재 교사 등록 코드')).toHaveText('KNOL-2027-SPRING');
 const access=page.getByRole('region',{name:'접속 기록'});
 await expect(access.getByText('5학년 3반 7번')).toBeVisible();await expect(access.getByText('3시간 전')).toBeVisible();await expect(access.getByText('기록 없음')).toBeVisible();
 await expect(access.getByRole('button',{name:/^교사/})).toHaveText('교사 2');
 await access.getByRole('button',{name:/^교사/}).click();await expect(access.getByRole('listitem')).toHaveCount(2);
 await access.getByRole('button',{name:/^학생/}).click();await expect(access.getByRole('listitem')).toHaveCount(1);
 await expect(rooms.getByText(/정리/).first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('a member becomes a teacher from the teacher page and others get a way forward',async({page})=>{
 const state=await mockRole(page,'member');state.upgradeCode='KNOL-2026';
 await page.goto('/teacher');
 await expect(page.getByRole('heading',{name:'교사 등록을 하면 학급을 열 수 있어요'})).toBeVisible();
 await page.getByRole('button',{name:'교사 등록 코드 넣기'}).click();
 const dialog=page.getByRole('dialog',{name:'교사 등록'});
 await dialog.getByLabel('교사 등록 코드').fill('WRONG-0000');await dialog.getByRole('button',{name:'등록하기'}).click();
 await expect(dialog.getByRole('alert')).toHaveText('교사 등록 코드가 맞지 않아요.');
 await dialog.getByLabel('교사 등록 코드').fill('KNOL-2026');await dialog.getByRole('button',{name:'등록하기'}).click();
 await expect(page.getByRole('form',{name:'학급 만들기'})).toBeVisible();
 await expect(page.getByRole('form',{name:'학급 만들기'}).getByText('학생 계정 만들기')).toBeVisible();
 state.role='teacher';await page.goto('/admin');
 await expect(page.getByRole('heading',{name:'관리자만 열 수 있는 화면이에요'})).toBeVisible();
 await expect(page.getByRole('link',{name:'교사 대시보드로 가기'})).toHaveAttribute('href','/teacher');
 await page.goto('/student');await expect(page.getByRole('link',{name:'학생 탭으로 가기'})).toBeVisible();
 state.role='student';await page.goto('/teacher');await expect(page.getByRole('link',{name:'내 과제로 가기'})).toHaveAttribute('href','/student');
 state.role='guest';await page.goto('/teacher');
 await expect(page.getByRole('heading',{name:'로그인이 필요해요'})).toBeVisible();
 await expect(page.getByRole('link',{name:'카카오로 로그인'})).toHaveAttribute('href','/api/v1/auth/kakao/start');
 await expect(page.getByRole('link',{name:'학생 로그인'})).toHaveAttribute('href','/student');
});
