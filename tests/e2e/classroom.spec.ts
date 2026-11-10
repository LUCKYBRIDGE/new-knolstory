import {test,expect,type Page} from '@playwright/test';
import {startShelfCreation} from './library-entry';
// Fullscreen prompting has its own coverage.
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});});

const all={text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null};
const textOnly={...all,images:false,characters:false,audio:false,direction:false,choices:false};
type Student={number:number;name:string;password:string;permissions:typeof all|null;hasQr:boolean};
type Assignment={id:string;title:string;description:string;storyKey:string|null;open:boolean;createdAt:number;submittedAt?:number|null};
const ok=(data:unknown)=>({json:{success:true,data}});
const fail=(status:number,code:string)=>({status,json:{success:false,error:{code}}});

/** In-memory stand-in for /api/v1/class. `role` and `signedIn` are mutable so one test can walk through a login. */
async function mockClassroom(page:Page,role:'teacher'|'student'){
 const state={signedIn:role==='teacher',classroom:null as null|{id:string;name:string;classCode:string;defaultPermissions:typeof all;students:Student[]},assignments:[] as Assignment[],submissions:{} as Record<string,unknown>,calls:[] as string[],bodies:[] as unknown[]};
 if(role==='student')state.classroom={id:'c1',name:'3반',classCode:'ABC234',defaultPermissions:textOnly,students:[]};
 if(role==='student')state.assignments=[{id:'a1',title:'내 이야기 쓰기',description:'세 컷을 써 보세요.',storyKey:null,open:true,createdAt:1,submittedAt:null}];
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api/v1/',''),method=request.method();
  state.calls.push(`${method} ${path}`);const body=request.postData()?JSON.parse(request.postData()!):undefined;if(body!==undefined)state.bodies.push(body);
  const summary=()=>({id:'c1',name:state.classroom!.name,classCode:state.classroom!.classCode,studentCount:state.classroom!.students.length});
  if(path==='auth/config')return route.fulfill(ok({signupProvider:'kakao',providers:{kakao:true,google:false}}));
  if(path==='me')return route.fulfill(state.signedIn?ok({accountId:'11111111-1111-4111-8111-111111111111',csrf:'csrf-1'}):fail(401,'SESSION_REQUIRED'));
  if(path==='class/me'){
   if(!state.signedIn)return route.fulfill(fail(401,'SESSION_REQUIRED'));
   return route.fulfill(ok(role==='teacher'?{role:'teacher',account:{id:'a'},...(state.classroom?{classroom:summary()}:{})}:{role:'student',account:{id:'s'},student:{number:2,name:'하늘',classId:'c1',className:'3반',permissions:textOnly}}));
  }
  if(path==='class/student-login'){if(body.password!=='4821')return route.fulfill(fail(401,'INVALID_LOGIN'));state.signedIn=true;return route.fulfill(ok({role:'student'}));}
  if(request.method()!=='GET'&&request.headers()['x-csrf-token']!=='csrf-1')return route.fulfill(fail(403,'SESSION_REQUIRED'));
  if(path==='class/classroom'){
   if(method==='POST'){state.classroom={id:'c1',name:body.name,classCode:'ABC234',defaultPermissions:all,students:[]};return route.fulfill(ok(state.classroom));}
   if(!state.classroom)return route.fulfill(fail(404,'CLASSROOM_NOT_FOUND'));
   return route.fulfill(ok(state.classroom));
  }
  if(path==='class/classroom/students'&&method==='POST'){
   const list=state.classroom!.students;for(let i=0;i<body.count;i++){const number=list.length+1;list.push({number,name:'',password:String(1000+number*111),permissions:null,hasQr:false});}
   return route.fulfill(ok(state.classroom));
  }
  if(path==='class/classroom/students/permissions'){for(const student of state.classroom!.students)if(body.numbers.includes(student.number))student.permissions=body.permissions;return route.fulfill(ok(state.classroom));}
  const student=path.match(/^class\/classroom\/students\/(\d+)$/);
  if(student&&method==='PATCH'){const target=state.classroom!.students.find(item=>item.number===Number(student[1]))!;Object.assign(target,body);return route.fulfill(ok(target));}
  if(path==='class/classroom/assignments'){
   if(method==='POST'){const item:Assignment={id:`a${state.assignments.length+1}`,title:body.title,description:body.description??'',storyKey:body.storyKey??null,open:true,createdAt:Date.now()};state.assignments.push(item);return route.fulfill(ok(item));}
   return route.fulfill(ok(state.assignments));
  }
  const assignment=path.match(/^class\/classroom\/assignments\/(\w+)(?:\/(submissions|submission))?$/);
  if(assignment){
   const item=state.assignments.find(entry=>entry.id===assignment[1])!;
   if(!assignment[2]&&method==='PATCH'){Object.assign(item,body);return route.fulfill(ok(item));}
   if(assignment[2]==='submissions')return route.fulfill(ok([{number:2,name:'하늘',submittedAt:Date.now()}]));
   if(assignment[2]==='submission'&&method==='PUT'){state.submissions[item.id]=body.document;item.submittedAt=1_760_000_000_000;return route.fulfill(ok({submittedAt:item.submittedAt}));}
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
 await expect(page.getByLabel('학급 코드',{exact:true})).toHaveText('ABC234');
 await page.getByLabel('만들 학생 수').fill('3');await page.getByRole('button',{name:'학생 만들기',exact:true}).click();
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
 await page.getByLabel('과제 제목').fill('내 이야기 쓰기');await page.getByRole('button',{name:'과제 만들기'}).click();
 await expect(page.getByRole('heading',{name:/내 이야기 쓰기/})).toContainText('열림');
 await page.getByRole('button',{name:'내 이야기 쓰기 닫기'}).click();await expect(page.getByRole('heading',{name:/내 이야기 쓰기/})).toContainText('닫힘');
 await page.getByRole('button',{name:'내 이야기 쓰기 제출 보기'}).click();await expect(page.getByRole('button',{name:'2번 제출 작품 열기'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('student logs in with the class code and submits a work from this device',async({page})=>{
 const state=await mockClassroom(page,'student');
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await startShelfCreation(page);await page.getByLabel('새 작품 제목',{exact:true}).fill('하늘의 이야기');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await page.getByLabel('1컷 글',{exact:true}).fill('첫 컷이에요.');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.goto('/student');
 await page.getByLabel('학급 코드').fill('abc234');await page.getByLabel('번호',{exact:true}).fill('2');await page.getByLabel('비밀번호',{exact:true}).fill('0000');
 await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.locator('main [role=alert]')).toContainText('다시 확인');
 await page.getByLabel('비밀번호',{exact:true}).fill('4821');await page.getByRole('button',{name:'로그인',exact:true}).click();
 await expect(page.getByRole('heading',{name:/3반 2번 하늘/})).toBeVisible();
 expect(state.bodies).toContainEqual({classCode:'ABC234',number:2,password:'4821'});
 await expect(page.getByText('소리는 바꿀 수 없어요.')).toBeVisible();
 await expect(page.getByText('아직 안 냈어요')).toBeVisible();
 await page.getByLabel('제출할 작품').selectOption({label:'하늘의 이야기'});
 await page.getByRole('button',{name:'제출',exact:true}).click();
 await expect(page.getByText('제출했어요.')).toBeVisible();await expect(page.getByText(/^제출함 ·/)).toBeVisible();
 await expect(page.getByRole('button',{name:'다시 제출'})).toBeVisible();
 const submitted=state.submissions.a1 as {content:{format:string;document:{project:{title:string}}}};
 expect(submitted.content.format).toBe('knolstory');expect(submitted.content.document.project.title).toContain('하늘의 이야기');
});

test('opening the app with a QR token logs the student in and removes the token',async({page})=>{
 const state=await mockClassroom(page,'student');
 await page.route('**/api/v1/class/qr-login',route=>{state.bodies.push(JSON.parse(route.request().postData()!));state.signedIn=true;return route.fulfill(ok({role:'student'}));});
 await page.goto('/?class-login=tok123');
 await expect(page).toHaveURL(/\/student$/);await expect(page.getByRole('heading',{name:/3반 2번 하늘/})).toBeVisible();
 expect(state.bodies).toContainEqual({token:'tok123'});
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
