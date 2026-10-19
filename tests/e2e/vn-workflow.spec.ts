import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {existingPrivateWorkspace} from './existing-private-audio';
import {createStoryDocument,type StoryProject} from '../../packages/story-domain/src';
import {createHash} from 'node:crypto';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
const demo='docs/architecture/evidence/responsive-audio/branching-demo.knolstory';
async function management(page:Page){const s=page.locator('[data-work-menu]>summary');if(!await s.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await s.click();}
async function details(page:Page,text:string){const n=page.getByText(text,{exact:true});if(!await n.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await n.click();}
async function load(page:Page,path=demo){page.setDefaultTimeout(15000);const source=parseAuthoringFile(readFileSync(path,'utf8'));const prior=await existingPrivateWorkspace(page,source.project,source.audioResources);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await expect(page.getByRole('heading',{name:source.project.title,exact:true})).toBeVisible();return {source,prior};}
async function rendered(page:Page){const s=page.getByTestId('story-runtime-status');await expect(s).toContainText('연결됨',{timeout:120000});await expect.poll(async()=>Number(await s.getAttribute('data-rendered-revision'))>=0&&(await s.getAttribute('data-scene-revision'))===(await s.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);}
async function tool(page:Page,name:string){const d=page.locator('[data-additional-tools]');if(name!=='배경·인물 편집'&&!await d.evaluate(n=>(n as HTMLDetailsElement).open))await d.locator(':scope>summary').click();await page.getByRole('button',{name,exact:true}).click();}
async function views(page:Page,value:string){await details(page,'보기 설정');await page.getByLabel('미리보기 화면 비율',{exact:true}).selectOption(value);await rendered(page);}
async function line(page:Page,id:string){await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback?.lineId)).toBe(id);await rendered(page);}
async function read(page:Page){await details(page,'보기 설정');await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await line(page,'opening');}
async function restart(page:Page){await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();await line(page,'opening');}
async function edit(page:Page){await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();}
async function next(page:Page){const state=()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback));const before=await state();const b=page.getByRole('button',{name:'다음으로',exact:true});await expect(b).toBeEnabled();await b.focus();await b.press('Enter');await expect.poll(state).not.toBe(before);await rendered(page);}
async function choose(page:Page,index:number,target:string){await rendered(page);const frame=page.getByTestId('story-runtime-frame');await frame.scrollIntoViewIfNeeded();const b=(await frame.boundingBox())!,status=page.getByTestId('story-runtime-status'),r=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};expect(r).not.toBeNull();const w=Number(await status.getAttribute('data-scene-width')),h=Number(await status.getAttribute('data-scene-height')),scale=Math.min(b.width/w,b.height/h);await page.mouse.click(b.x+(b.width-w*scale)/2+(r.x+r.width/2)*scale,b.y+(b.height-h*scale)/2+(r.y+Math.min(20,Math.floor(r.height/8))+25+index*50)*scale);await line(page,target);}
async function saveSlot(page:Page,id:number){await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:`${id}번 저장`,exact:true}).click();await expect(page.getByRole('dialog',{name:'저장',exact:true})).toContainText(`${id}번에 저장했습니다.`);await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();}
async function loadSlot(page:Page,id:number){await page.getByRole('button',{name:'불러오기',exact:true}).click();await page.getByRole('button',{name:`${id}번 불러오기`,exact:true}).click();await page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();}
async function exported(page:Page,label:string){await management(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await pending;const path=join(dirname((await download.path())!),download.suggestedFilename());await download.saveAs(path);return path;}
test('prior private export stays intact while registered current Excel and mocked public sheet copies roundtrip complete content',async({page},info)=>{
 test.skip(info.project.name!=='host');const hash=createHash('sha256').update(readFileSync(demo)).digest('hex');const {source,prior}=await load(page);
 const original=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(original.project).toEqual(prior.project);expect(original.audioResources).toEqual(source.audioResources);
 await management(page);await details(page,'Excel · Google 시트');const privateWorkbook=await exported(page,'Excel 내보내기');await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(privateWorkbook);
 await expect(page.getByTestId('workspace-error')).toContainText('외부 음원이 첨부된 작품');await expect(page.getByRole('dialog',{name:'작품 가져오기 확인',exact:true})).toHaveCount(0);const rejected=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(rejected.project).toEqual(original.project);expect(rejected.audioResources).toEqual(original.audioResources);
 const ids:Record<string,string>=Object.fromEntries(source.audioResources.map((r:{id:string;kind:string})=>[r.id,r.kind==='music'?'audio:music:forest':'audio:sound:chime']));const project:StoryProject=JSON.parse(JSON.stringify(original.project),(key,value)=>key==='assetId'&&typeof value==='string'&&ids[value]?ids[value]:value);
 const current=createStoryDocument({project,savedAt:'2026-10-14T00:00:00.000Z',appVersion:'registered-current-copy'});await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'registered-current.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...current,audioResources:[]}))});await confirmAuthoringImport(page);
 const registered=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expectIndependentImportedProject(registered.project,current.project);expect(registered.audioResources).toEqual([]);expect(registered.schemaVersion).toBe(8);
 await management(page);await details(page,'Excel · Google 시트');const xlsx=await exported(page,'Excel 내보내기');await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(xlsx);await confirmAuthoringImport(page);const after=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expectIndependentImportedProject(after.project,registered.project);expect(after.audioResources).toEqual([]);
 await management(page);await details(page,'Excel · Google 시트');await details(page,'간단 표 v1 · 공개 시트');const tsv=readFileSync(await exported(page,'Google 시트용 TSV 내보내기'),'utf8');
 await page.route('https://docs.google.com/spreadsheets/d/next-test/export?format=tsv&gid=0',route=>route.fulfill({status:200,contentType:'text/tab-separated-values',body:tsv,headers:{'access-control-allow-origin':'*'}}));await management(page);await details(page,'Excel · Google 시트');await details(page,'간단 표 v1 · 공개 시트');await page.getByLabel('공개 Google 시트 주소').fill('https://docs.google.com/spreadsheets/d/next-test/edit#gid=0');await page.getByRole('button',{name:'Google 시트 가져오기',exact:true}).click();await confirmAuthoringImport(page);
 const google=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expectIndependentImportedProject(google.project,after.project);expect(google.audioResources).toEqual([]);await page.reload();expect(parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8')).project).toEqual(google.project);expect(createHash('sha256').update(readFileSync(demo)).digest('hex')).toBe(hash);
});
test('native portrait single speaker, slots and actual-path backlog restore both routes',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);await page.setViewportSize({width:390,height:844});await load(page);const baseline=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));await views(page,'portrait');await tool(page,'배경·인물 편집');await rendered(page);
 await expect(page.getByRole('button',{name:/위치 편집$/})).toHaveCount(1);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('portrait-speaker.png')});
 await page.setViewportSize({width:1280,height:900});await views(page,'desktop');await rendered(page);await expect(page.getByRole('button',{name:/위치 편집$/})).toHaveCount(2);
 await read(page);
 const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(n=>n.setAttribute('data-vn-instance','persistent'));const bounds=(await frame.boundingBox())!;await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await rendered(page);
 await saveSlot(page,1);
 for(let i=0;i<3;i++){await next(page);}
 await choose(page,0,'end-light');
 await page.getByRole('button',{name:'지난기록',exact:true}).click();const log=page.getByRole('dialog',{name:'지난기록'});await expect(log).toContainText('밝은 숲으로');await expect(log).not.toContainText('밤의 길에서 새로운 이야기를');await log.getByRole('button',{name:'이 지점부터 다시 읽기'}).nth(3).click();await page.getByRole('dialog',{name:'이 지점부터 다시 읽을까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();await line(page,'pov');await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
 await choose(page,1,'end-night');await loadSlot(page,1);await line(page,'opening');await expect(frame).toHaveAttribute('data-vn-instance','persistent');
 await page.reload();await rendered(page);await page.getByRole('button',{name:'불러오기',exact:true}).click();await expect(page.getByRole('button',{name:'1번 불러오기',exact:true})).toContainText('숲의 갈림길');await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await edit(page);const after=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(after.project).toEqual(baseline.project);expect(after.audioResources).toEqual(baseline.audioResources);
});

test('changed-work slots show saved excerpt and require explicit compatible restore',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');await load(page);const baseline=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));await rendered(page);await read(page);
 await saveSlot(page,2);
 await edit(page);await page.getByLabel('대사 / 해설',{exact:true}).fill('저장 뒤 바뀐 새 대사');
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered(page);
 await page.getByRole('button',{name:'불러오기',exact:true}).click();const slot=page.getByRole('button',{name:'2번 불러오기',exact:true});
 await expect(slot).toContainText('아이와 어른은 숲의 두 길 앞에 섰다.');await expect(slot).not.toContainText('저장 뒤 바뀐 새 대사');await slot.click();await page.getByRole('dialog',{name:'이 기록을 불러올까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'이 기록을 불러올까요?'})).toContainText('저장 이후 작품이 변경');await page.getByRole('button',{name:'변경된 작품에서 이어읽기',exact:true}).click();await rendered(page);
 const semantic=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})});await expect(semantic.getByText('저장 뒤 바뀐 새 대사',{exact:true})).toHaveCount(1);await edit(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('저장 뒤 바뀐 새 대사');const after=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(after.project).toEqual({...baseline.project,updatedAt:after.project.updatedAt,lines:baseline.project.lines.map((cut:{id:string})=>cut.id==='opening'?{...cut,text:'저장 뒤 바뀐 새 대사'}:cut)});expect(after.audioResources).toEqual(baseline.audioResources);
});

test('numbered real-asset branch chapters play A and B then join without crossing routes',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);await load(page,'docs/architecture/evidence/vn-workflow/branch-chapters-demo.knolstory');const baseline=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));await tool(page,'컷 목록');await rendered(page);
 const labels=await page.getByRole('complementary',{name:'장과 컷 목록'}).textContent();for(const label of ['1장','2장','3장A','3장B','4장'])expect(labels).toContain(label);
 await views(page,'desktop');await read(page);const frame=page.getByTestId('story-runtime-frame');
 for(const route of ['light','night']){if(route==='night')await restart(page);if(route==='light'){const b=(await frame.boundingBox())!;await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);}
 for(let i=0;i<3;i++){await next(page);}
 await choose(page,route==='light'?0:1,'end-'+route);
 await next(page);await line(page,'rejoin');await next(page);await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');const path:string[]=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.path);expect(path).toContain('end-'+route);expect(path).not.toContain('end-'+(route==='light'?'night':'light'));expect(path.at(-1)).toBe('rejoin');}
 await edit(page);const after=parseAuthoringFile(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(after.project).toEqual(baseline.project);expect(after.audioResources).toEqual(baseline.audioResources);
});
