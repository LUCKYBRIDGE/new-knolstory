import {test,expect,type Page} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import {all,mockClassroom,type Assignment} from './classroom-mock';
import {focusViewports,auditScreen} from './mobile-focus-audit';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
/** Before/after captures for the phone and tablet classroom/settings pass. Run with KNOL_FOCUS_CAPTURE=<dir>. */
const out=process.env.KNOL_FOCUS_CAPTURE;
test.skip(!out,'capture only');
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});});
const report:Record<string,unknown>={};
test.afterAll(()=>{if(out){mkdirSync(out,{recursive:true});writeFileSync(`${out}/audit-${test.info().project.name}-${Date.now()}.json`,JSON.stringify(report,null,1));}});
const students=[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:true},{number:2,name:'바다',password:'5678',permissions:null,hasQr:false},{number:3,name:'긴 이름을 가진 학생',password:'4321',permissions:null,hasQr:false}];
const assignments:Assignment[]=[
 {id:'a1',format:'knolstory',title:'토끼와 자라가 다시 만난 날',description:'등장인물의 마음을 상상하며 대사를 이어 써 보세요.',storyKey:'rabbit',open:true,createdAt:1,submittedCount:1},
 {id:'a2',format:'shortstory',title:'나만의 그림책',description:'익숙한 장면과 새로운 사건을 섞어 보세요.',storyKey:null,open:true,createdAt:2,submittedCount:0},
 {id:'a3',format:'shortstory',title:'함께 읽은 첫 그림책',description:'마감한 과제예요.',storyKey:null,open:false,createdAt:3},
];
async function shot(page:Page,name:string,size:string){await page.screenshot({path:`${out}/${name}-${size}.png`});if(size==='390x844'||size==='844x390')await page.screenshot({path:`${out}/full/${name}-${size}.png`,fullPage:true});}
for(const size of focusViewports){
 test(`teacher screens ${size.name}`,async({page})=>{
  const state=await mockClassroom(page,'teacher');
  state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:students.map(s=>({...s}))};
  state.assignments=assignments.map(a=>({...a}));
  state.missions=[{id:'m1',title:'별주부전 독후 활동지',description:'읽고 답해요.',criteria:'',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'토끼는 왜?'}],open:true,createdAt:1,recipients:null}];
  await page.setViewportSize(size);
  await page.goto('/teacher');await expect(page.getByRole('heading',{name:'우리 반',exact:true})).toBeVisible();await page.waitForTimeout(600);
  report[`teacher-tasks-${size.name}`]=await auditScreen(page,page.locator('main'),page.getByText('새 과제 내기',{exact:true}));await shot(page,'teacher-tasks',size.name);
  await page.goto('/teacher?tab=students');await expect(page.getByLabel('1번 이름',{exact:true})).toBeVisible();await page.waitForTimeout(400);
  report[`teacher-students-${size.name}`]=await auditScreen(page,page.locator('main'),page.getByLabel('1번 이름',{exact:true}));await shot(page,'teacher-students',size.name);
  await page.goto('/teacher?tab=settings');await expect(page.getByLabel('학급 이름',{exact:true})).toBeVisible();await page.waitForTimeout(400);
  report[`teacher-settings-${size.name}`]=await auditScreen(page,page.locator('main'));await shot(page,'teacher-settings',size.name);
 });
 test(`student screen ${size.name}`,async({page})=>{
  const state=await mockClassroom(page,'student');state.signedIn=true;state.permissions=all;
  state.assignments=assignments.map(a=>({...a}));
  state.missions=[{id:'m1',title:'별주부전 독후 활동지',description:'읽고 답해요.',criteria:'',kind:'worksheet',storyKey:'rabbit',readingFormat:'original',questions:[{id:'q1',prompt:'토끼는 왜?'}],open:true,createdAt:1,recipients:null}];
  await page.setViewportSize(size);
  await page.goto('/student');await expect(page.getByRole('link',{name:'과제 쓰기',exact:true}).first()).toBeVisible();await page.waitForTimeout(600);
  report[`student-tasks-${size.name}`]=await auditScreen(page,page.locator('main'),page.getByRole('link',{name:'과제 쓰기',exact:true}));await shot(page,'student-tasks',size.name);
 });
 test(`account menu ${size.name}`,async({page})=>{
  const state=await mockClassroom(page,'teacher');state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
  await page.setViewportSize(size);await page.goto('/?view=library');
  const menu=page.locator('[data-account-menu]');await menu.locator('summary').click();await expect(menu.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();await page.waitForTimeout(300);
  report[`account-menu-${size.name}`]=await auditScreen(page,menu.locator('section'),menu.getByRole('button',{name:'교사 대시보드',exact:true}));await shot(page,'account-menu',size.name);
 });
 test(`work and reader menus ${size.name}`,async({page})=>{
  const runtime=`<!doctype html><script>
const send=value=>parent.postMessage({protocol:1,...value},location.origin);
addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type!=='loadScene'||!scene)return;send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:scene.width,height:scene.height},textboxRect:{x:0,y:scene.height*.7,width:scene.width,height:scene.height*.3}});});send({type:'ready',runtimeVersion:'test',contractVersion:1});
</script>`;
  await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/index.html*',route=>route.fulfill({contentType:'text/html',body:runtime}));
  await page.setViewportSize(size);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const project=createBlankStoryProject({id:'focus',chapterId:'ch',lineId:'a',title:'읽고 쓰는 이야기'});
  const details=page.locator('[data-work-menu]');await details.locator(':scope>summary').click();
  await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'menu.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
  const panel=page.locator('[data-system-menu=editor]');await expect(panel).toBeVisible();await page.waitForTimeout(300);
  report[`work-menu-${size.name}`]=await auditScreen(page,panel,panel.getByRole('button',{name:'작품 정보·표지',exact:true}));await shot(page,'work-menu',size.name);
  await panel.getByRole('button',{name:'작품 정보·표지',exact:true}).click();await page.waitForTimeout(400);
  report[`work-settings-${size.name}`]=await auditScreen(page,page.getByRole('region',{name:'작품 설정',exact:true}));await shot(page,'work-settings',size.name);
  await page.getByRole('button',{name:/현재 컷/}).first().click();
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
  const menu=page.locator('[data-reader-top-menu]');await expect(menu).toBeVisible();await page.waitForTimeout(300);
  report[`reader-menu-${size.name}`]=await auditScreen(page,menu,menu.getByRole('button',{name:'계속 읽기',exact:true}));await shot(page,'reader-menu',size.name);
  await menu.getByRole('button',{name:'읽기 설정',exact:true}).click();const dialog=page.getByRole('dialog',{name:'읽기 설정',exact:true});await expect(dialog).toBeVisible();await page.waitForTimeout(300);
  report[`reader-settings-${size.name}`]=await auditScreen(page,dialog);await shot(page,'reader-settings',size.name);
 });
}
