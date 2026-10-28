import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import type {StoryProject} from '../../packages/story-domain/src/index';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();return node;}
async function chapter(page:Page){await menu(page);const details=page.locator('[data-chapter-settings]');if(!await details.evaluate(n=>(n as HTMLDetailsElement).open))await details.locator(':scope>summary').click();return details;}
async function optins(page:Page){const node=await menu(page),details=node.getByText('편집 설정',{exact:true}).locator('..');if(!await details.evaluate(n=>(n as HTMLDetailsElement).open))await details.locator(':scope>summary').click();return node;}
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function exportFile(page:Page){await saved(page);await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const raw=await readFile((await (await pending).path())!,'utf8');return {raw,project:parseAuthoringFile(raw).project as StoryProject};}
async function importFile(page:Page,raw:string){await menu(page);await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'chapter.knolstory',mimeType:'application/json',buffer:Buffer.from(raw)});await confirmAuthoringImport(page);await saved(page);}

test('chapter settings restore reachable defaults without opening advanced tools or changing cut overrides',async({page,browser},info)=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 await importFile(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:source}));
 const before=(await exportFile(page)).project;let controls=await chapter(page);
 await expect(controls.getByRole('combobox',{name:'장 배경음 동작',exact:true})).toHaveCount(0);await expect(controls.getByRole('button',{name:/기본 왼쪽 인물 이미지 찾기/})).toHaveCount(0);
 const title=controls.locator('input').first();await title.fill('장 설정에서 이어 쓰는 제목');await title.dispatchEvent('compositionstart');await expect(title).toBeEnabled();await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true})).toBeDisabled();await title.dispatchEvent('compositionend');
 await controls.locator('textarea').fill('다른 컷의 원고와 배치는 유지하는 장 개요.');
 const background=controls.getByRole('button',{name:/기본 배경 이미지 찾기/}),old=await background.getAttribute('data-asset-value');await background.click();
 const picker=page.getByRole('dialog'),candidate=picker.locator(`[data-asset-id]:not([data-asset-id="${old}"]):visible`).first(),assetId=(await candidate.getAttribute('data-asset-id'))!;await candidate.click();await picker.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
 let settings=await optins(page);await settings.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await settings.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();
 controls=await chapter(page);await controls.locator('summary').filter({hasText:/기본 인물$/}).click();await expect(controls.getByRole('button',{name:/기본 왼쪽 인물 이미지 찾기/})).toBeVisible();
 await controls.locator('summary').filter({hasText:/기본 음향$/}).click();await controls.getByRole('combobox',{name:'장 배경음 동작',exact:true}).selectOption('play');
 const last=before.lines.filter(l=>l.chapterId===before.chapters[0].id).at(-1)!.id;await controls.getByRole('combobox',{name:'장 배경음 종료 컷',exact:true}).selectOption(last);
 const authored=(await exportFile(page)).project;expect(authored.lines).toEqual(before.lines);expect(authored.chapters.slice(1)).toEqual(before.chapters.slice(1));expect(authored.chapters[0]).toMatchObject({title:'장 설정에서 이어 쓰는 제목',summary:'다른 컷의 원고와 배치는 유지하는 장 개요.',backgroundId:assetId,audio:{music:{action:'play',endLineId:last}}});
 settings=await optins(page);await settings.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).uncheck();await settings.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).uncheck();expect((await exportFile(page)).project).toEqual(authored);
 const file=await exportFile(page);await page.reload();await saved(page);controls=await chapter(page);await expect(controls.locator('input').first()).toHaveValue(authored.chapters[0].title);await expect(controls.getByRole('combobox',{name:'장 배경음 동작',exact:true})).toHaveCount(0);
 for(const viewport of [{width:1280,height:800},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);const panel=page.locator('[data-system-menu=editor]');expect(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);expect(await panel.evaluate(node=>node.getBoundingClientRect().right<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`chapter-settings-${viewport.width}.png`),fullPage:true});}

 const context=await browser.newContext();try{const reopened=await context.newPage();await reopened.route('**/api/**',route=>route.abort());await reopened.goto('/?view=editor');await saved(reopened);await importFile(reopened,file.raw);const restored=(await exportFile(reopened)).project;expect(restored).toEqual({...authored,id:restored.id});}finally{await context.close();}
});

test('chapter display identity edits never reorder chapters or change story connections',async({page,browser},info)=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 await importFile(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:{...source,chapters:source.chapters.map((chapter,index)=>index===0?{...chapter,title:'3장 · 이전 제목',chapterNumber:undefined,order:1}:chapter)}}));
 const before=(await exportFile(page)).project;const controls=await chapter(page);
 const detail=controls.locator('details').filter({has:page.locator('summary',{hasText:'장 번호·갈래 표시'})});
 await expect(detail).not.toHaveAttribute('open','');await detail.locator(':scope>summary').click();
 const number=detail.getByRole('spinbutton',{name:'장 번호',exact:true}),branch=detail.getByRole('textbox',{name:'장 갈래 표시',exact:true});
 await expect(number).toHaveValue('3');await branch.fill('A');await branch.blur();
 await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true}).locator('option').first()).toContainText('3장A');
 const after=(await exportFile(page)).project;
 expect(after.chapters[0]).toEqual({...before.chapters[0],chapterNumber:3,branchLabel:'A'});
 expect(after.lines).toEqual(before.lines);expect(after.chapters.slice(1)).toEqual(before.chapters.slice(1));
 await chapter(page);if(!await detail.evaluate(node=>(node as HTMLDetailsElement).open))await detail.locator(':scope>summary').click();
 await number.fill('');await number.blur();expect((await exportFile(page)).project).toEqual(after);
 await chapter(page);if(!await detail.evaluate(node=>(node as HTMLDetailsElement).open))await detail.locator(':scope>summary').click();
 await branch.dispatchEvent('compositionstart');await expect(branch).toBeEnabled();await expect(number).toBeDisabled();await branch.dispatchEvent('compositionend');
 const file=await exportFile(page);await page.reload();await saved(page);await chapter(page);
 await page.locator('[data-chapter-settings]').getByText('장 번호·갈래 표시',{exact:true}).click();
 await expect(page.getByRole('spinbutton',{name:'장 번호',exact:true})).toHaveValue('3');await expect(page.getByRole('textbox',{name:'장 갈래 표시',exact:true})).toHaveValue('A');
 await page.setViewportSize({width:390,height:844});expect(await page.locator('[data-system-menu=editor]').evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('chapter-identity-phone.png')});
 const context=await browser.newContext();try{const opened=await context.newPage();await opened.route('**/api/**',route=>route.abort());await opened.goto('/?view=editor');await saved(opened);await importFile(opened,file.raw);const restored=(await exportFile(opened)).project;expect(restored).toEqual({...after,id:restored.id});}finally{await context.close();}
});

test('chapter resource list edits preserve defaults and all used cut images',async({page,browser},info)=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 await importFile(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:source}));
 const before=(await exportFile(page)).project;
 async function resources(){const controls=await chapter(page),details=controls.locator('details').filter({has:page.locator('summary',{hasText:/^장 자료 목록$/})});if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();return details;}
 let list=await resources();await expect(list.getByRole('button',{name:/^장 자료에 인물 추가 이미지 찾기 ·/,exact:false})).toHaveCount(0);
 await list.getByRole('button',{name:/^장 자료에 배경 추가 이미지 찾기 ·/,exact:false}).click();
 const dialog=page.getByRole('dialog'),candidate=dialog.locator('[data-asset-id]:visible').first(),id=(await candidate.getAttribute('data-asset-id'))!;
 await candidate.click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
 const added=(await exportFile(page)).project;
 expect(added.chapters[0].backgroundAssetIds).toContain(id);expect(added.lines).toEqual(before.lines);
 expect(added.chapters[0].backgroundId).toBe(before.chapters[0].backgroundId);expect(added.chapters[0].characterAssetIds).toEqual(before.chapters[0].characterAssetIds);
 list=await resources();
 // Removing a shortcut must not clear authored cut images or chapter defaults.
 const button=list.locator(`[data-chapter-resource-id="${id}"]`).getByRole('button');await button.click();
 const after=(await exportFile(page)).project;expect(after.lines).toEqual(before.lines);
 expect(after.chapters[0]).toEqual({...added.chapters[0],backgroundAssetIds:added.chapters[0].backgroundAssetIds.filter(value=>value!==id)});
 const settings=await optins(page);await settings.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();list=await resources();await expect(list.getByRole('button',{name:/^장 자료에 인물 추가 이미지 찾기 ·/,exact:false})).toBeVisible();
 await controlsComposition(page,true);await expect(list.getByRole('button',{name:/^장 자료에 인물 추가 이미지 찾기 ·/,exact:false})).toBeDisabled();await controlsComposition(page,false);
 await page.setViewportSize({width:390,height:844});
 const layout=await page.locator('[data-system-menu=editor]').evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth,left:node.scrollLeft,rect:node.getBoundingClientRect().toJSON(),overflow:[...node.querySelectorAll('*')].filter(item=>item.scrollWidth>item.clientWidth+1).map(item=>({tag:item.tagName,class:item.className,client:item.clientWidth,scroll:item.scrollWidth})).slice(0,12),wide:[...node.querySelectorAll('*')].filter(item=>item.getBoundingClientRect().right>node.getBoundingClientRect().right+1).map(item=>({tag:item.tagName,class:item.className,text:item.textContent?.slice(0,60),width:item.getBoundingClientRect().width})).slice(0,12)}));
 expect(layout.scroll,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width+1);await page.screenshot({path:info.outputPath('resource-list-phone.png')});
 const file=await exportFile(page),context=await browser.newContext();try{const opened=await context.newPage();await opened.route('**/api/**',route=>route.abort());await opened.goto('/?view=editor');await saved(opened);await importFile(opened,file.raw);const restored=(await exportFile(opened)).project;expect(restored).toEqual({...after,id:restored.id});}finally{await context.close();}
});
async function controlsComposition(page:Page,active:boolean){await page.locator('[data-chapter-settings]').locator('input').first().dispatchEvent(active?'compositionstart':'compositionend');}

test('chapter settings do not carry an invalid numeric draft or error into another chapter',async({page})=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 const second={...source.chapters[0],id:'chapter-second-settings',order:2,chapterNumber:2,title:'다음 장'};
 const fixture={...source,chapters:[{...source.chapters[0],chapterNumber:1},second],lines:source.lines.map((line,index)=>index===source.lines.length-1?{...line,chapterId:second.id,order:1}:line)};
 await importFile(page,JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:fixture}));
 let controls=await chapter(page);await controls.getByText('장 번호·갈래 표시',{exact:true}).click();
 const number=controls.getByRole('spinbutton',{name:'장 번호',exact:true});await number.fill('');await number.blur();await expect(controls.getByRole('alert')).toContainText('1 이상의 정수');
 await page.keyboard.press('Escape');await page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true}).selectOption(fixture.lines.at(-1)!.id);
 controls=await chapter(page);await expect(controls.getByRole('alert')).toHaveCount(0);await controls.getByText('장 번호·갈래 표시',{exact:true}).click();await expect(controls.getByRole('spinbutton',{name:'장 번호',exact:true})).toHaveValue('2');
 await page.keyboard.press('Escape');await page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true}).selectOption(fixture.lines[0].id);
 controls=await chapter(page);await expect(controls.getByRole('alert')).toHaveCount(0);await controls.getByText('장 번호·갈래 표시',{exact:true}).click();await expect(controls.getByRole('spinbutton',{name:'장 번호',exact:true})).toHaveValue('1');
});


test('invalid chapter number blocks file shortcut and correction saves without losing focus',async({page})=>{
 await page.addInitScript(()=>{const root=window as unknown as {chapterFile:{picks:number;writes:number;contents:string};showSaveFilePicker:()=>Promise<unknown>};root.chapterFile={picks:0,writes:0,contents:''};root.showSaveFilePicker=async()=>{root.chapterFile.picks++;return {name:'chapter-number.knolstory',getFile:async()=>({text:async()=>root.chapterFile.contents}),createWritable:async()=>({write:async(text:string)=>{root.chapterFile.writes++;root.chapterFile.contents=text;},close:async()=>{},abort:async()=>{}})};};});
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());await page.goto('/?view=editor');await saved(page);
 const controls=await chapter(page);await controls.getByText('장 번호·갈래 표시',{exact:true}).click();const number=controls.getByRole('spinbutton',{name:'장 번호',exact:true});await number.focus();await number.press('Control+s');
 const file=()=>page.evaluate(()=>(window as unknown as {chapterFile:{picks:number;writes:number;contents:string}}).chapterFile);
 await expect.poll(async()=>(await file()).writes).toBe(1);const snapshot=await file(),before=parseAuthoringFile(snapshot.contents).project as StoryProject;
 await number.fill('0');await number.press('Control+s');await expect(controls.getByRole('alert')).toContainText('1 이상의 정수');await expect.poll(async()=>(await file()).writes).toBe(1);await expect(number).toHaveAttribute('aria-invalid','true');await expect(number).toHaveValue('0');await expect(number).toBeFocused();expect(await file()).toEqual(snapshot);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 await number.fill('2');await number.press('Control+s');await expect.poll(async()=>(await file()).writes).toBe(2);await expect(number).toBeFocused();await expect(number).toHaveValue('2');await expect(number).not.toHaveAttribute('aria-invalid','true');const after=parseAuthoringFile((await file()).contents).project as StoryProject;expect(after.chapters[0].chapterNumber).toBe(2);expect(after.lines).toEqual(before.lines);expect(after.chapters.slice(1)).toEqual(before.chapters.slice(1));expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(after);
});

for(const width of [1280,390])test(`chapter title composition keeps settings open ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/**',route=>route.abort());
 await page.goto('/?view=editor');await saved(page);
 const controls=await chapter(page),workMenu=page.locator('[data-work-menu]'),title=controls.getByRole('textbox',{name:/장 제목$/});
 await title.fill('입력 중인 장 제목');await saved(page);
 const before=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 await title.dispatchEvent('compositionstart',{data:'목'});await title.press('Escape');
 await expect(workMenu).toHaveAttribute('open','');await expect(title).toBeFocused();await expect(title).toHaveValue('입력 중인 장 제목');
 await title.dispatchEvent('keydown',{key:'Escape',code:'Escape',isComposing:true,keyCode:229});await expect(workMenu).toHaveAttribute('open','');
 await title.dispatchEvent('compositionend',{data:'목'});
 await title.dispatchEvent('keydown',{key:'Escape',code:'Escape',keyCode:229});await expect(workMenu).toHaveAttribute('open','');
 await title.press('Escape');await expect(workMenu).not.toHaveAttribute('open','');await expect(workMenu.locator(':scope>summary')).toBeFocused();
 await menu(page);await expect(title).toBeVisible();await expect(title).toHaveValue('입력 중인 장 제목');
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toBe(before);
});
