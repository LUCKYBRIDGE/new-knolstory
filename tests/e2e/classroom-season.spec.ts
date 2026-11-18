import {test,expect,type Page} from '@playwright/test';

const account='11111111-1111-4111-8111-111111111111';
const permissions={text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null};
const createdAt=Date.parse('2026-11-01T00:00:00+09:00');
const task={id:'a1',title:'지난 이야기',description:'인물의 마음을 써요.',format:'knolstory',storyKey:null,open:false,archived:true,createdAt,checks:['마음의 변화가 보여요'],targetAmount:3,template:{title:'이야기 양식'},recipients:[2],dueAt:Date.parse('2027-02-20T00:00:00+09:00')};
const mission={id:'m1',title:'지난 읽기',description:'읽은 뒤 생각을 남겨요.',criteria:'',kind:'worksheet',storyKey:null,readingFormat:'original',questions:[{id:'q1',prompt:'무슨 생각을 했나요?'}],open:false,archived:true,createdAt,progress:{answers:{q1:'선생님께 낸 답'},note:'제출한 말',submittedAt:createdAt,reviewStatus:'passed',feedback:'마음이 잘 드러나요.',reviewedAt:createdAt}};

async function classroom(page:Page,role:'teacher'|'student'){
 await page.clock.setFixedTime(new Date('2027-03-18T12:00:00+09:00'));
 await page.addInitScript(({account})=>{
  sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');
  localStorage.setItem(`knolstory-mission-draft:${account}:m1`,JSON.stringify({version:1,answers:{q1:'아직 내지 않은 수정'},note:'미제출 메모',baseSubmittedAt:0}));
 },{account});
 const room={id:'c1',name:'우리 반',classCode:'ABC234',studentCount:1,createdAt,defaultPermissions:permissions,students:[{number:2,name:'하늘',password:'4821',permissions:null,hasQr:true}]};
 const calls:string[]=[];
 await page.route('**/api/v1/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1/','');
  calls.push(`${route.request().method()} ${path}`);
  let data:unknown;
  if(path==='auth/config')data={signupProvider:'kakao',providers:{kakao:true,google:false}};
  else if(path==='me')data={accountId:account,csrf:'csrf-1'};
  else if(path==='class/me')data={role,account:{id:account},...(role==='teacher'?{classroom:room}:{student:{number:2,name:'하늘',classId:'c1',className:'우리 반',classCreatedAt:createdAt,permissions}})};
  else if(path==='class/classroom')data=room;
  else if(path==='class/classroom/assignments')data=role==='teacher'?Array.from({length:20},(_,index)=>({...task,id:`a${index+1}`,title:index?'다른 지난 이야기 '+index:task.title})):[task];
  else if(path==='class/classroom/missions')data=role==='student'?[mission]:[];
  else if(path==='documents')data={documents:[]};
  else return route.fulfill({status:404,json:{success:false,error:{code:'NOT_FOUND'}}});
  await route.fulfill({json:{success:true,data}});
 });
 return calls;
}

for(const width of [390,1280]){
 test(`teacher can read archived task guidance without editing it at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const calls=await classroom(page,'teacher');
  await page.goto('/teacher');
  await page.getByText('지난 학년 · 20개',{exact:true}).click();
  const item=page.locator('li').filter({has:page.getByRole('heading',{name:'지난 이야기',exact:true})}).last();
  await expect(item.getByText('마음의 변화가 보여요',{exact:true})).toBeVisible();
  await expect(item.getByText('3컷 이상',{exact:true})).toBeVisible();
  await expect(item.getByText('이야기 양식',{exact:true})).toBeVisible();
  await expect(item.getByText('받는 학생 · 2번',{exact:true})).toBeVisible();
  await expect(item.getByRole('button',{name:'지난 이야기 다시 열기'})).toHaveCount(0);
  await expect(item.getByRole('button',{name:'지난 이야기 과제 지우기'})).toHaveCount(0);
  await expect(page.getByText('작품 과제 0/20개',{exact:true})).toBeVisible();
  expect(calls.every(call=>call.startsWith('GET '))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test(`student sees submitted mission answers rather than a device draft at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const calls=await classroom(page,'student');
  await page.goto('/student');
  await page.getByText('지난 학년 · 2개',{exact:true}).click();
  await page.getByText('내가 낸 내용 보기',{exact:true}).click();
  await expect(page.getByRole('textbox',{name:'무슨 생각을 했나요?'})).toHaveValue('선생님께 낸 답');
  await expect(page.getByRole('textbox',{name:'선생님께 남길 말'})).toHaveValue('제출한 말');
  await expect(page.getByRole('textbox',{name:'무슨 생각을 했나요?'})).toBeDisabled();
  expect(await page.evaluate(account=>JSON.parse(localStorage.getItem(`knolstory-mission-draft:${account}:m1`)!).answers.q1,account)).toBe('아직 내지 않은 수정');
  expect(calls.every(call=>call.startsWith('GET '))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
