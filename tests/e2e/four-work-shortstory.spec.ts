import { test,expect } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
const packs=JSON.parse(await readFile('packages/compatibility/src/shortstory-originals-data.json','utf8')) as {worldId:string;title:string;description:string;packId:string;cover:{backgroundId:string;characterId:string;authorNote:string};scenes:{sourceSceneId:string;title:string;referenceText:string;art:{assetId:string}}[]}[];
function getShortStoryOriginal(key:string){const pack=packs.find(pack=>pack.worldId===key)!;return {id:`shortstory-original-${key}`,title:pack.title,description:pack.description,authorDisplayName:'전래 이야기 · 놀퀴즈',source:{kind:'preset',presetId:pack.packId},cover:{backgroundId:pack.cover.backgroundId,characterId:pack.cover.characterId,authorNote:pack.cover.authorNote},pages:pack.scenes.map((scene,i)=>({id:scene.sourceSceneId,order:i+1,title:scene.title,text:scene.referenceText,backgroundId:scene.art.assetId,leftAssetId:'',rightAssetId:''})),updatedAt:'2026-10-06T00:00:00.000Z'};}
const encodeShortStory=(project:ReturnType<typeof getShortStoryOriginal>)=>JSON.stringify({manifest:{format:'shortstory',version:1,kind:'project'},project});
const evidence='docs/architecture/evidence/four-work-library/shortstory';
const works=['rabbit','onggojib','seonnyeo','heungbu'] as const;
for(const work of works)test(`actual ${work} picture book read, isolated position and complete A4 print`,async({page})=>{
 const original=getShortStoryOriginal(work);await page.goto(`/shortstory/?work=${work}&mode=read`);
 await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(original.title);
 await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveAttribute('readonly','');
 const reading=page.getByRole('region',{name:'숏스토리 읽기'});
 for(const [i,chapter] of original.pages.entries()){
  await expect(reading).toContainText(chapter.text);const art=reading.getByRole('img',{name:`${i+1}쪽 삽화`,exact:true}).locator('img');await expect(art).toHaveCount(1);
  await expect.poll(()=>art.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  if(i<original.pages.length-1)await page.getByRole('button',{name:'다음 쪽',exact:true}).click();
 }
 await page.reload();await expect(reading).toContainText(original.pages.at(-1)!.text);
 await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/${work}-reader.png`,fullPage:true});
 await page.getByText('표지·소개·공개 Google 시트',{exact:true}).click();await expect(page.getByRole('region',{name:'그림책 파일과 이름'}).getByText(original.title,{exact:true})).toBeVisible();
 await page.emulateMedia({media:'print'});await expect(page.locator('[data-shortstory-print] article')).toHaveCount(original.pages.length+2);
 const pdf=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,path:`${evidence}/${work}-a4.pdf`});
 const pageCount=[...pdf.toString('latin1').matchAll(/\/Type \/Page\b/g)].length;
 expect(pageCount).toBe(original.pages.length+2);const bounds=pdf.toString('latin1').match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/)!;expect(Math.abs(Number(bounds[1])-595.28)).toBeLessThan(1);expect(Math.abs(Number(bounds[2])-841.89)).toBeLessThan(1);
 await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${evidence}/${work}-phone.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('iframe')).toHaveCount(0);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!));expect(state.books).toHaveLength(0);expect(state.positions[original.id]).toBe(original.pages.length-1);
});
test('original copy, three-face cover, multiple books, page operations, reload and independent file import',async({page,browser})=>{
 await page.goto('/shortstory/?work=rabbit&mode=read');await page.getByRole('button',{name:'내 사본으로 쓰기',exact:true}).click();
 await page.getByLabel('이야기 제목',{exact:true}).fill('토끼의 새 그림책');await page.getByLabel('이 쪽의 이야기').fill('내가 직접 고쳐 쓴 첫 쪽');
 await page.getByRole('button',{name:'현재 쪽 복제',exact:true}).click();await page.getByLabel('이 쪽 제목').fill('복제한 쪽');await page.getByRole('button',{name:'쪽 앞으로 이동',exact:true}).click();
 await page.getByRole('button',{name:'현재 쪽 삭제',exact:true}).click();await page.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByLabel('이 쪽 제목')).toHaveValue('복제한 쪽');
 await page.getByRole('button',{name:'현재 쪽 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();await page.getByRole('button',{name:'쪽 삭제 되돌리기',exact:true}).click();await expect(page.getByLabel('이 쪽 제목')).toHaveValue('복제한 쪽');
 await page.getByText('표지·소개·공개 Google 시트',{exact:true}).click();await page.getByRole('button',{name:'표지 꾸미기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await dialog.getByLabel('작품 제목',{exact:true}).fill('사본의 표지 초안');await dialog.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue('토끼의 새 그림책');
 await page.getByRole('button',{name:'표지 꾸미기',exact:true}).click();await dialog.getByRole('button',{name:'책등',exact:true}).click();await dialog.getByRole('button',{name:'뒤표지',exact:true}).click();await dialog.getByRole('button',{name:'앞표지',exact:true}).click();await dialog.getByLabel('작품 제목',{exact:true}).fill('표지를 꾸민 토끼 그림책');await dialog.getByRole('button',{name:'표지 적용',exact:true}).click();
 await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue('표지를 꾸민 토끼 그림책');
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'.shortstory로 보관',exact:true}).click();const download=await downloadEvent,bytes=await readFile((await download.path())!);const exported=JSON.parse(bytes.toString()).project;expect(exported.cover.design).toBeTruthy();
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();await page.getByLabel('이야기 제목',{exact:true}).fill('두 번째 그림책');await page.getByLabel('이 쪽의 이야기').fill('다른 책의 글');
 await page.getByRole('button',{name:'선녀와 나무꾼 · 원본 읽기',exact:true}).click();await page.getByRole('button',{name:'다음 쪽',exact:true}).click();await page.getByRole('button',{name:'다음 쪽',exact:true}).click();
 await page.getByRole('button',{name:'표지를 꾸민 토끼 그림책',exact:true}).click();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('내가 직접 고쳐 쓴 첫 쪽');await page.reload();await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue('표지를 꾸민 토끼 그림책');
 await page.getByRole('button',{name:'이 그림책 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();await page.getByRole('button',{name:'별주부전 · 원본 읽기',exact:true}).click();await page.getByRole('button',{name:'표지를 꾸민 토끼 그림책 복구',exact:true}).click();await page.reload();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('내가 직접 고쳐 쓴 첫 쪽');
 await page.getByRole('button',{name:'선녀와 나무꾼 · 원본 읽기',exact:true}).click();await expect(page.getByRole('region',{name:'숏스토리 읽기'})).toContainText(getShortStoryOriginal('seonnyeo').pages[2].text);
 await page.getByRole('button',{name:'별주부전 · 원본 읽기',exact:true}).click();await expect(page.getByRole('region',{name:'숏스토리 읽기'})).toContainText(getShortStoryOriginal('rabbit').pages[0].text);
 const other=await browser.newContext(),imported=await other.newPage();await imported.goto('http://127.0.0.1:3000/shortstory/');await imported.getByLabel('숏스토리 파일 가져오기').setInputFiles({name:'rabbit.shortstory',mimeType:'application/json',buffer:bytes});await expect(imported.getByLabel('이야기 제목',{exact:true})).toHaveValue(exported.title);
 await imported.getByRole('button',{name:'읽기',exact:true}).click();await expect(imported.getByRole('region',{name:'숏스토리 읽기'})).toContainText('내가 직접 고쳐 쓴 첫 쪽');await imported.reload();await expect(imported.getByLabel('이야기 제목',{exact:true})).toHaveValue(exported.title);
 const restored=await imported.evaluate(()=>{const library=JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!);return library.books.find((book:{id:string})=>book.id===library.activeId);});expect(restored).toEqual(exported);await other.close();
 await mkdir(evidence,{recursive:true});await page.screenshot({path:`${evidence}/multi-book-original-preserved.png`,fullPage:true});
});
test('old single workspace backs up, immediate new/import preserve it, unsupported v2 rejects and storage failure blocks switching',async({page})=>{
 const old=getShortStoryOriginal('onggojib');old.id='previous-personal-book';old.title='이전 그림책';old.pages[0].text='이전 작업의 글';const raw=encodeShortStory(old);
 await page.addInitScript(raw=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('knolstory-shortstory-workspace-v1',raw);sessionStorage.setItem('seeded','yes');}},raw);await page.goto('/shortstory/');await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(old.title);
 await page.getByLabel('이 쪽의 이야기').fill('전환 직전 쓴 글');await page.getByRole('button',{name:'새 그림책',exact:true}).click();await page.getByRole('button',{name:'이전 그림책',exact:true}).click();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('전환 직전 쓴 글');
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-shortstory-workspace-v1-backup'))).toBe(raw);expect(await page.evaluate(()=>localStorage.getItem('knolstory-shortstory-workspace-v1'))).toBe(raw);
 await page.getByLabel('숏스토리 파일 가져오기').setInputFiles({name:'future.shortstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({manifest:{format:'shortstory',version:2,kind:'project'},project:old}))});await expect(page.locator('main [role=alert]')).toContainText('지원하지 않는');await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('전환 직전 쓴 글');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='knolstory-shortstory-library-v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,key,value);};});
 await page.getByLabel('이 쪽의 이야기').fill('저장 실패 중인 글');await expect(page.locator('main [role=alert]')).toContainText('저장하지 못했어요');await page.getByRole('button',{name:'새 그림책',exact:true}).click();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('저장 실패 중인 글');
 await mkdir(evidence,{recursive:true});await writeFile(`${evidence}/migration-contract.json`,JSON.stringify({legacyKeyPreserved:true,backupExact:true,immediateSwitchPreserved:true,unsupportedV2Rejected:true,quotaSwitchBlocked:true},null,2));
});

test('delayed Google picture book import retains books created and edited while waiting',async({page})=>{
 await page.goto('/shortstory/?work=rabbit&mode=read');
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'시트용 TSV 보관',exact:true}).click();const tsv=await readFile((await(await downloading).path())!,'utf8');
 let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>{release=resolve;});let arrived:()=>void=()=>{};const requested=new Promise<void>(resolve=>{arrived=resolve;});
 await page.route('https://docs.google.com/spreadsheets/d/delayed-book/export?format=tsv&gid=0',async route=>{arrived();await pending;await route.fulfill({status:200,contentType:'text/tab-separated-values',body:tsv,headers:{'access-control-allow-origin':'*'}});});
 await page.getByText('표지·소개·공개 Google 시트',{exact:true}).click();await page.getByLabel('공개 Google 시트 주소').fill('https://docs.google.com/spreadsheets/d/delayed-book/edit#gid=0');await page.getByRole('button',{name:'시트 가져오기',exact:true}).click();await requested;
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();await page.getByLabel('이야기 제목',{exact:true}).fill('응답을 기다리며 만든 책');await page.getByLabel('이 쪽의 이야기').fill('가져오는 동안 쓴 글을 보존해요.');
 release();await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue(getShortStoryOriginal('rabbit').title);
 await expect(page.getByRole('button',{name:'응답을 기다리며 만든 책',exact:true})).toBeVisible();await page.getByRole('button',{name:'응답을 기다리며 만든 책',exact:true}).click();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('가져오는 동안 쓴 글을 보존해요.');await page.reload();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('가져오는 동안 쓴 글을 보존해요.');
 const books=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!).books);expect(books).toHaveLength(2);
});

test('failed picture book deletion preserves its editable draft for save retry and reload',async({page})=>{
 await page.goto('/shortstory/');await page.getByLabel('이야기 제목',{exact:true}).fill('삭제 실패에서도 지킬 책');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Object.defineProperty(window,'restoreShortStoryTestStorage',{value:()=>{Storage.prototype.setItem=original;}});Storage.prototype.setItem=function(key,value){if(key==='knolstory-shortstory-library-v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,key,value);};});
 await page.getByRole('button',{name:'이 그림책 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();await expect(page.locator('main [role=alert]')).toContainText('저장하지 못했어요');await page.getByRole('button',{name:'취소',exact:true}).click();
 await page.getByLabel('이 쪽의 이야기').fill('삭제가 실패한 뒤에도 이 글은 보관되어야 해요.');
 await page.evaluate(()=>{(window as unknown as {restoreShortStoryTestStorage:()=>void}).restoreShortStoryTestStorage();});await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();await page.reload();await expect(page.getByLabel('이야기 제목',{exact:true})).toHaveValue('삭제 실패에서도 지킬 책');await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue('삭제가 실패한 뒤에도 이 글은 보관되어야 해요.');
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!));expect(state.books).toHaveLength(1);expect(state.deleted).toHaveLength(0);
});

for(const work of works)test(`${work} personal picture book copy preserves its original and travels to a fresh browser`,async({page,browser})=>{
 const original=getShortStoryOriginal(work);await page.goto(`/shortstory/?work=${work}&mode=read`);await page.getByRole('button',{name:'내 사본으로 쓰기',exact:true}).click();const title=`${original.title} · 나의 그림책`;
 await page.getByLabel('이야기 제목',{exact:true}).fill(title);const text=`${original.pages[0].text}\n나의 새로운 첫 장면입니다.`;await page.getByLabel('이 쪽의 이야기').fill(text);await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();await page.reload();await expect(page.getByLabel('이 쪽의 이야기')).toHaveValue(text);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'.shortstory로 보관',exact:true}).click();const saved=await downloading,bytes=await readFile((await saved.path())!),project=JSON.parse(bytes.toString()).project;expect(project.id).not.toBe(original.id);expect(project.pages.map((p:{text:string},i:number)=>i===0?original.pages[0].text:p.text)).toEqual(original.pages.map(p=>p.text));
 await page.getByRole('button',{name:`${original.title} · 원본 읽기`,exact:true}).click();await expect(page.getByRole('region',{name:'숏스토리 읽기'})).toContainText(original.pages[0].text);await expect(page.getByRole('region',{name:'숏스토리 읽기'})).not.toContainText('나의 새로운 첫 장면');
 const context=await browser.newContext(),restored=await context.newPage();await restored.goto('http://127.0.0.1:3000/shortstory/');await restored.getByLabel('숏스토리 파일 가져오기').setInputFiles({name:`${work}.shortstory`,mimeType:'application/json',buffer:bytes});await expect(restored.getByLabel('이야기 제목',{exact:true})).toHaveValue(title);await restored.getByRole('button',{name:'읽기',exact:true}).click();await expect(restored.getByRole('region',{name:'숏스토리 읽기'})).toContainText(text);await restored.reload();
 const loaded=await restored.evaluate(()=>{const library=JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!);return library.books.find((book:{id:string})=>book.id===library.activeId);});expect(loaded).toEqual(project);await context.close();await mkdir(evidence,{recursive:true});await writeFile(`${evidence}/${work}-copy.shortstory`,bytes);await writeFile(`${evidence}/${work}-copy-roundtrip.json`,JSON.stringify({sourceId:original.id,copyId:project.id,fullProjectMatchesAfterFreshContextAndReload:true,sourceReadingUnmodified:true,pages:project.pages.length},null,2));
});
