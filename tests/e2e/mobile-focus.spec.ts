import {test,expect,type Page} from '@playwright/test';
import {all,mockClassroom,type Assignment} from './classroom-mock';
import {auditScreen} from './mobile-focus-audit';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
/**
 * Phone and tablet focus pass (2026-11-23): the main action is in the first view, less-used tools are folded,
 * standing explanations are gone, and every control is a 44px target without sideways scrolling.
 */
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});});
const phone={width:320,height:700},tall={width:390,height:844},landscape={width:844,height:390},shortLandscape={width:667,height:375},tablet={width:768,height:1024};
const students=[{number:1,name:'하늘',password:'1234',permissions:null,hasQr:true},{number:2,name:'바다',password:'5678',permissions:null,hasQr:false}];
const tasks:Assignment[]=[
 {id:'a1',format:'knolstory',title:'토끼와 자라가 다시 만난 날',description:'등장인물의 마음을 상상하며 대사를 이어 써 보세요.',storyKey:'rabbit',open:true,createdAt:1,submittedCount:1,editScope:{text:true,images:false,characters:false,audio:true,direction:false,choices:false}},
 {id:'a2',format:'shortstory',title:'나만의 그림책',description:'익숙한 장면과 새로운 사건을 섞어 보세요.',storyKey:null,open:true,createdAt:2,submittedCount:0,editScope:{text:true,images:true,characters:false,audio:false,direction:false,choices:false}},
];
async function teacher(page:Page){
 const state=await mockClassroom(page,'teacher');
 state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:students.map(s=>({...s}))};
 // The shared storage pool, as the live class returns it (2026-11-23 real-data replay).
 (state.classroom as Record<string,unknown>).storage={bytes:229_000,limit:300*1024*1024,studentLimit:20*1024*1024};
 state.assignments=tasks.map(a=>({...a}));
 return state;
}
const noSideScroll=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);

for(const size of [phone,tall,landscape,shortLandscape,tablet])test(`teacher tasks lead with the next action ${size.width}x${size.height}`,async({page})=>{
 await teacher(page);await page.setViewportSize(size);await page.goto('/teacher');
 const card=page.locator('li[data-format="knolstory"]').first();
 await expect(card.getByRole('button',{name:'토끼와 자라가 다시 만난 날 진행 보기',exact:true})).toBeVisible();
 const audit=await auditScreen(page,page.locator('main'),page.getByText('새 과제 내기',{exact:true}));
 expect(audit.primaryVisible,'새 과제 내기 in the first view').toBe(true);
 expect(audit.smallTargets).toEqual([]);expect(audit.horizontalScroll).toBe(false);
 // Who gets it, the edit scope, the starting work, the hand-in link and deleting wait under one fold.
 const more=card.locator('[data-task-more]');
 for(const name of ['받는 학생 바꾸기','편집 범위 바꾸기','시작 작품 정하기','제출 링크 넣기','과제 지우기'])await expect(card.getByRole('button',{name:`토끼와 자라가 다시 만난 날 ${name}`,exact:true})).toBeHidden();
 await more.getByText('과제 설정 더보기',{exact:true}).click();
 for(const name of ['받는 학생 바꾸기','편집 범위 바꾸기','시작 작품 정하기','제출 링크 넣기','과제 지우기'])await expect(card.getByRole('button',{name:`토끼와 자라가 다시 만난 날 ${name}`,exact:true})).toBeVisible();
 expect((await auditScreen(page,card)).smallTargets).toEqual([]);
 // No standing explanations that repeat the composer above.
 for(const text of ['함께 쓰고, 함께 읽는','쓰고, 그리고, 내는','읽고, 생각하고, 확인받는','무엇을 낼까요?'])await expect(page.getByText(text,{exact:true})).toHaveCount(0);
 for(const text of ['새 작품 쓰기 과제는 위의 ‘새 과제 내기’에서 놀스토리나 숏스토리를 골라 만들어요.','새 읽기·활동 과제는 위의 ‘새 과제 내기’에서 골라요.'])await expect(page.getByText(text,{exact:true})).toHaveCount(0);
});

for(const size of [phone,landscape])test(`teacher roster gives the name room and shows save only after a change ${size.width}x${size.height}`,async({page})=>{
 await teacher(page);await page.setViewportSize(size);await page.goto('/teacher?tab=students');
 const name=page.getByLabel('1번 이름',{exact:true}),save=page.getByRole('button',{name:'1번 이름 저장',exact:true});
 await expect(name).toBeVisible();await expect(save).toBeHidden();
 expect(await name.evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThanOrEqual(80);
 // On landscape phones the create form folds like on portrait phones.
 await expect(page.getByLabel('만들 학생 수',{exact:true})).toBeHidden();
 // The roster comes before the shared storage, whose explanation stays folded.
 const roster=await page.getByRole('region',{name:'학생 목록',exact:true}).boundingBox(),storage=await page.getByRole('region',{name:'학급 저장 공간',exact:true}).boundingBox();
 expect(roster!.y).toBeLessThan(storage!.y);
 await expect(page.getByText(/함께 쓰는 공간이에요/)).toBeHidden();
 await name.fill('하늘별');await expect(save).toBeVisible();
 expect(await save.evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 expect(await noSideScroll(page)).toBe(true);
});

for(const size of [phone,tall,landscape,shortLandscape,tablet])test(`student sees the first task's write action at once ${size.width}x${size.height}`,async({page})=>{
 const state=await mockClassroom(page,'student');state.signedIn=true;state.permissions=all;state.assignments=tasks.map(a=>({...a}));
 await page.setViewportSize(size);await page.goto('/student');
 await expect(page.getByRole('heading',{name:/3반 2번 하늘/})).toBeVisible();
 // Tasks load after the student's name; measure once the first card is there.
 await expect(page.getByRole('link',{name:'과제 쓰기',exact:true}).first()).toBeVisible();
 const audit=await auditScreen(page,page.locator('main'),page.getByRole('link',{name:'과제 쓰기',exact:true}));
 expect(audit.primaryVisible,'과제 쓰기 in the first view').toBe(true);
 expect(audit.smallTargets).toEqual([]);expect(audit.horizontalScroll).toBe(false);
 await expect(page.getByText('쓰기 화면에서 작품을 만든 뒤 이곳에서 제출해요.',{exact:true})).toHaveCount(0);
 await expect(page.getByText('나의 이야기 자리',{exact:true})).toHaveCount(0);
 // Each card's write action comes before its reference lines (edit scope, base work).
 const card=page.locator('[data-todo="assignment"]').first();
 const write=await card.getByRole('link',{name:'과제 쓰기',exact:true}).boundingBox(),scope=await card.locator('[data-task-scope]').boundingBox();
 expect(write!.y).toBeLessThan(scope!.y);
});

for(const size of [phone,landscape])test(`account menu puts the class destination first ${size.width}x${size.height}`,async({page})=>{
 const state=await mockClassroom(page,'teacher');state.classroom={id:'c1',name:'우리 반',classCode:'ABC234',defaultPermissions:all,students:[]};
 await page.setViewportSize(size);await page.goto('/?view=library');
 const menu=page.locator('[data-account-menu]');await menu.locator('summary').click();
 const panel=menu.locator('section');
 await expect(panel.getByRole('button',{name:'교사 대시보드',exact:true})).toBeVisible();
 expect(await panel.getByRole('button').first().textContent()).toBe('교사 대시보드');
 await expect(panel.getByText(/온라인 보관 여부를 확인하고|구름 표시가 있는 책은/)).toHaveCount(0);
 const audit=await auditScreen(page,panel,panel.getByRole('button',{name:'로그아웃',exact:true}));
 expect(audit.primaryVisible,'로그아웃 reachable without scrolling the menu').toBe(true);
 expect(audit.smallTargets).toEqual([]);expect(audit.horizontalScroll).toBe(false);
});

const runtime=`<!doctype html><script>
const send=value=>parent.postMessage({protocol:1,...value},location.origin);
addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type!=='loadScene'||!scene)return;send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:scene.width,height:scene.height},textboxRect:{x:0,y:scene.height*.7,width:scene.width,height:scene.height*.3}});});send({type:'ready',runtimeVersion:'test',contractVersion:1});
</script>`;
async function openEditor(page:Page){
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/index.html*',route=>route.fulfill({contentType:'text/html',body:runtime}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const project=createBlankStoryProject({id:'focus',chapterId:'ch',lineId:'a',title:'읽고 쓰는 이야기'});
 const details=page.locator('[data-work-menu]');await details.locator(':scope>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'menu.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
 return page.locator('[data-system-menu=editor]');
}
for(const size of [tall,landscape])test(`reader menu keeps one header line and every item reachable ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);const panel=await openEditor(page);
 await panel.getByRole('button',{name:'편집 설정 닫기',exact:true}).click();
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 const menu=page.locator('[data-reader-top-menu]');await expect(menu.getByRole('button',{name:'계속 읽기',exact:true})).toBeVisible();
 const header=menu.locator('h2+p');
 if(size.height<500)await expect(header).toBeHidden();
 else{await expect(header).toHaveCount(1);await expect(header).toContainText('읽고 쓰는 이야기');}
 const last=menu.locator('button').last();await last.scrollIntoViewIfNeeded();
 const box=(await last.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
 expect((await auditScreen(page,menu)).smallTargets).toEqual([]);
});
test('work settings say only what each page needs',async({page})=>{
 await page.setViewportSize(tall);const panel=await openEditor(page);
 await panel.getByRole('button',{name:'작품 정보·표지',exact:true}).click();
 const settings=page.getByRole('region',{name:'작품 설정',exact:true});await expect(settings.getByLabel('작품 제목',{exact:true})).toBeVisible();
 await expect(settings.getByText(/입력 내용은 브라우저에 임시 보관돼요/)).toHaveCount(0);
 await expect(settings.getByText('기획과 메모는 읽기 화면에 나오지 않아요.',{exact:true})).toHaveCount(0);
 await settings.getByLabel('작품 설정 항목',{exact:true}).selectOption('planning');
 await expect(settings.getByText('기획과 메모는 읽기 화면에 나오지 않아요.',{exact:true})).toBeVisible();
});
