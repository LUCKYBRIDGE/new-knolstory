import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const demo='docs/architecture/evidence/responsive-audio/branching-demo.knolstory';
async function management(page:Page){const s=page.getByText('작품 관리',{exact:true});if(!await s.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await s.click();}
async function load(page:Page){await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(demo);await expect(page.getByRole('heading',{name:'숲에서 고르는 두 길',exact:true})).toBeVisible();}
async function rendered(page:Page){const s=page.getByTestId('story-runtime-status');await expect(s).toContainText('연결됨',{timeout:90000});await expect.poll(()=>s.evaluate(n=>n.getAttribute('data-scene-revision')===n.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);}
async function exported(page:Page,label:string){await management(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();return (await(await pending).path())!;}
test('Next Excel and public Google sheet roundtrip preserves actual attached audio and extended fields',async({page},info)=>{
 test.skip(info.project.name!=='host');await load(page);
 const original=JSON.parse(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));
 await management(page);await page.getByText('Excel · Google 시트',{exact:true}).click();
 const xlsx=await exported(page,'Excel 내보내기');await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(xlsx);await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
 const after=JSON.parse(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(after.project).toEqual(original.project);expect(after.audioResources).toEqual(original.audioResources);
 await management(page);const detail=page.getByText('Excel · Google 시트',{exact:true});if(!await detail.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await detail.click();
 const tsv=readFileSync(await exported(page,'Google 시트용 TSV 내보내기'),'utf8');
 await page.route('https://docs.google.com/spreadsheets/d/next-test/export?format=tsv&gid=0',route=>route.fulfill({status:200,contentType:'text/tab-separated-values',body:tsv,headers:{'access-control-allow-origin':'*'}}));
 await management(page);await page.getByLabel('공개 Google 시트 주소').fill('https://docs.google.com/spreadsheets/d/next-test/edit#gid=0');await page.getByRole('button',{name:'Google 시트 가져오기',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
 const google=JSON.parse(readFileSync(await exported(page,'작품 파일 내보내기'),'utf8'));expect(google.project).toEqual(original.project);expect(google.audioResources).toEqual(original.audioResources);
});
test('native portrait single speaker, slots and actual-path backlog restore both routes',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);await page.setViewportSize({width:390,height:844});await load(page);await rendered(page);
 await expect(page.getByRole('button',{name:/위치 편집$/})).toHaveCount(1);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('portrait-speaker.png')});
 await page.setViewportSize({width:1280,height:900});await page.getByLabel('화면 구도').selectOption('desktop');await rendered(page);await expect(page.getByRole('button',{name:/위치 편집$/})).toHaveCount(2);
 await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered(page);
 const frame=page.getByTestId('story-runtime-frame'),bounds=(await frame.boundingBox())!;await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await rendered(page);
 await page.getByRole('button',{name:'읽기 저장',exact:true}).click();const dialog=page.getByRole('dialog',{name:'읽기 저장과 불러오기'});await dialog.getByRole('region',{name:'1번 읽기 저장'}).getByRole('button',{name:'여기에 저장'}).click();await page.getByRole('button',{name:'읽기 메뉴 닫기'}).click();
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'다음으로',exact:true}).click();await rendered(page);}
 const box=(await frame.boundingBox())!;await page.mouse.click(box.x+box.width*.5,box.y+box.height*155/720);await rendered(page);await expect(page.locator('[data-line-id="end-light"]')).toHaveAttribute('aria-current','true');
 await page.getByRole('button',{name:'지난 기록',exact:true}).click();const log=page.getByRole('dialog',{name:'지난 기록'});await expect(log).toContainText('밝은 숲으로');await expect(log).not.toContainText('밤의 길에서 새로운 이야기를');await log.getByRole('button',{name:'이 지점부터 읽기'}).nth(3).click();await rendered(page);await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
 const b=(await frame.boundingBox())!;await page.mouse.click(b.x+b.width*.5,b.y+b.height*210/720);await rendered(page);await expect(page.locator('[data-line-id="end-night"]')).toHaveAttribute('aria-current','true');
 await page.getByRole('button',{name:'읽기 불러오기',exact:true}).click();await page.getByRole('region',{name:'1번 읽기 저장'}).getByRole('button',{name:'불러오기',exact:true}).click();await rendered(page);await expect(page.locator('[data-line-id="opening"]')).toHaveAttribute('aria-current','true');
 await page.reload();await rendered(page);await page.getByRole('button',{name:'읽기 불러오기',exact:true}).click();await expect(page.getByRole('region',{name:'1번 읽기 저장'})).toContainText('숲의 갈림길');
});

test('changed-work slots show saved excerpt and require explicit compatible restore',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');await load(page);await rendered(page);await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered(page);
 await page.getByRole('button',{name:'읽기 저장',exact:true}).click();await page.getByRole('region',{name:'2번 읽기 저장'}).getByRole('button',{name:'여기에 저장'}).click();await page.getByRole('button',{name:'읽기 메뉴 닫기'}).click();
 await page.getByRole('button',{name:'편집으로',exact:true}).click();await page.getByLabel('대사 / 해설',{exact:true}).fill('저장 뒤 바뀐 새 대사');
 await page.getByRole('button',{name:'현재 컷부터 읽기',exact:true}).click();await rendered(page);
 await page.getByRole('button',{name:'읽기 불러오기',exact:true}).click();const slot=page.getByRole('region',{name:'2번 읽기 저장'});
 await expect(slot).toContainText('아이와 어른은 숲의 두 길 앞에 섰다.');await expect(slot).not.toContainText('저장 뒤 바뀐 새 대사');await slot.getByRole('button',{name:'불러오기',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'읽기 저장과 불러오기'})).toContainText('저장 이후 작품이 변경');await page.getByRole('button',{name:'변경된 작품에서 이어읽기',exact:true}).click();await rendered(page);
 await expect(page.getByText('저장 뒤 바뀐 새 대사',{exact:true})).toBeVisible();
});

test('numbered real-asset branch chapters play A and B then join without crossing routes',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await management(page);
 await page.getByLabel('작품 파일 가져오기').setInputFiles('docs/architecture/evidence/vn-workflow/branch-chapters-demo.knolstory');await expect(page.getByRole('heading',{name:'두 길과 다시 만나는 숲',exact:true})).toBeVisible();await rendered(page);
 const labels=await page.getByRole('complementary',{name:'장과 컷 목록'}).textContent();for(const label of ['1장','2장','3장A','3장B','4장'])expect(labels).toContain(label);
 await page.getByLabel('화면 구도').selectOption('desktop');const frame=page.getByTestId('story-runtime-frame');
 for(const route of ['light','night']){await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered(page);if(route==='light'){const b=(await frame.boundingBox())!;await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);}
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'다음으로',exact:true}).click();await rendered(page);}
 const b=(await frame.boundingBox())!;await page.mouse.click(b.x+b.width*.5,b.y+b.height*(route==='light'?155:210)/720);await rendered(page);await expect(page.locator(`[data-line-id="end-${route}"]`)).toHaveAttribute('aria-current','true');
 await page.getByRole('button',{name:'다음으로',exact:true}).click();await rendered(page);await expect(page.locator('[data-line-id="rejoin"]')).toHaveAttribute('aria-current','true');await page.getByRole('button',{name:'다음으로',exact:true}).click();await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');}
});
