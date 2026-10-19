import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {enterLibrary,startShelfCreation,importShelfFile,openBuiltinEdition} from './library-entry';
const workspace='knolstory-next-workspace-v1';
test('direct editor exposes corrupt-storage download and preserves raw bytes before restarting',async({page},testInfo)=>{
 const raw='  {"손상된 원고":"원본 그대로 보존\\n", incomplete: [\r\n';
 await page.addInitScript(({key,value})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,value);},{key:workspace,value:raw});
 await page.setViewportSize({width:390,height:844});await page.goto('/?view=editor');
 const recovery=page.getByRole('region',{name:'기기 보관함 복구',exact:true});await expect(recovery).toBeVisible();
 await expect(page.getByTestId('workspace-error')).toHaveCount(0);await expect(page.getByText('임시 보관을 읽지 못해 원본을 유지하고 자동 보관을 중지했어요. 현재 편집한 작품은 작품 파일로 저장해 주세요.',{exact:true})).toHaveCount(1);await expect(page.getByTestId('save-status')).toHaveText('임시 보관 중지');
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(raw);
 await page.screenshot({path:testInfo.outputPath('corrupt-recovery-390.png')});
 const pending=page.waitForEvent('download');await recovery.getByRole('button',{name:'복구용 원본 보관',exact:true}).click({timeout:10000});const downloaded=await pending;
 expect(await readFile((await downloaded.path())!,'utf8')).toBe(raw);
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(raw);
 await recovery.getByRole('button',{name:'손상 원본 보존하고 새 보관함 시작',exact:true}).click();
 await expect(recovery).toHaveCount(0);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('knolstory-workspace-recovery-')).map(key=>localStorage.getItem(key)))).toEqual([raw]);
 const restarted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),workspace);expect(restarted.document.project.lines.length).toBeGreaterThan(0);
 await page.reload();await expect(recovery).toHaveCount(0);expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.id,workspace)).toBe(restarted.document.project.id);
});
async function create(page:Page,title:string){
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목',{exact:true}).fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await purpose(page,'info');
}
async function menu(page:Page){const work=page.locator('[data-work-menu]');if(await work.count()&&!await work.evaluate(node=>(node as HTMLDetailsElement).open))await work.locator(':scope>summary').click();}
async function purpose(page:Page,section:'info'|'planning'){if(!await page.getByRole('region',{name:'작품 설정',exact:true}).isVisible()){await menu(page);await page.getByRole('button',{name:section==='info'?'작품 정보·표지':'이야기 기획',exact:true}).click();}else await page.getByLabel('작품 설정 항목',{exact:true}).selectOption(section);}
async function records(page:Page){await menu(page);const summary=page.getByText('이전 원고',{exact:true});if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await summary.click();}
test('previous manuscript opens as independent copy; both revisions survive reload and file export',async({page,browser})=>{
 await create(page,'복구하기 전 원고');await purpose(page,'planning');await page.getByLabel('핵심 아이디어',{exact:true}).fill('원래 아이디어를 보호해요');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.planning.premise,workspace)).toBe('원래 아이디어를 보호해요');const recorded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);await records(page);await page.getByRole('button',{name:'현재 원고 보관',exact:true}).click();
 await purpose(page,'info');await page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true}).fill('고쳐 쓴 현재 원고');await purpose(page,'planning');await page.getByLabel('핵심 아이디어',{exact:true}).fill('새로운 아이디어');
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 await records(page);await page.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true}).click();
 await expect(page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue('복구하기 전 원고 · 내 사본');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.id,workspace)).not.toBe(recorded.id);const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);expect(restored.id).not.toBe(recorded.id);expect(restored.lines).toEqual(recorded.lines);expect(restored.chapters).toEqual(recorded.chapters);await purpose(page,'planning');await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('원래 아이디어를 보호해요');
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await page.reload();await purpose(page,'planning');
 await expect(page.getByLabel('핵심 아이디어',{exact:true})).toHaveValue('원래 아이디어를 보호해요');
 const titles=await page.evaluate(key=>Object.values(JSON.parse(localStorage.getItem(key)!).works).map((d:any)=>d.project.title),workspace);
 expect(titles).toEqual(expect.arrayContaining(['고쳐 쓴 현재 원고','복구하기 전 원고 · 내 사본']));const newerIdea=await page.evaluate(key=>(Object.values(JSON.parse(localStorage.getItem(key)!).works) as {project:{title:string;planning:{premise:string}}}[]).find(document=>document.project.title==='고쳐 쓴 현재 원고')?.project.planning.premise,workspace);expect(newerIdea).toBe('새로운 아이디어');
 await menu(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toContain('내 사본');
 const bytes=await readFile((await download.path())!);const context=await browser.newContext();const moved=await context.newPage();await moved.goto('/');await enterLibrary(moved);await importShelfFile(moved,{name:download.suggestedFilename(),mimeType:'application/json',buffer:bytes});await purpose(moved,'planning');await expect(moved.getByRole('region',{name:'작품 설정'}).getByLabel('핵심 아이디어',{exact:true})).toHaveValue('원래 아이디어를 보호해요');await context.close();
});
test('second tab draft cannot overwrite first tab, even when using manual save',async({page,context})=>{
 await create(page,'첫 탭의 원고');await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();const second=await context.newPage();await second.goto('/?view=editor');
 await expect(second.getByRole('alert').filter({hasText:'다른 탭에서 보관함'})).toBeVisible();const before=await page.evaluate(key=>localStorage.getItem(key),workspace);
 await second.getByText('현재 컷 상세·메모·정리',{exact:true}).click();const text=second.getByLabel('대사 / 해설',{exact:true});await text.fill('둘째 탭의 미저장 초안');await menu(second);await second.getByRole('button',{name:'임시 보관',exact:true}).click();
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(before);
 await second.keyboard.press('Escape');
 const pending=second.waitForEvent('download');await second.getByRole('button',{name:'현재 초안 파일 내보내기',exact:true}).click();const file=await pending,archive=JSON.parse(await readFile((await file.path())!,'utf8'));expect(archive.document.project.title).toBe('첫 탭의 원고');expect(archive.document.project.lines[0].text).toBe('둘째 탭의 미저장 초안');
 await page.close();await second.getByRole('button',{name:'저장된 보관함 다시 열기',exact:true}).click();await second.getByRole('dialog',{name:'저장된 보관함 다시 열기',exact:true}).getByRole('button',{name:'현재 초안을 닫고 다시 열기',exact:true}).click();await expect(second.getByTestId('save-status')).toHaveText('임시 보관됨');await expect(text).toHaveValue('');await expect(second.getByRole('heading',{name:'첫 탭의 원고',exact:true})).toBeVisible();
 const reopened=second.locator('textarea[data-cut-id]');await reopened.fill('다시 연 원고');await expect(second.getByTestId('save-status')).toHaveText('임시 보관됨');await second.reload();await expect(reopened).toHaveValue('다시 연 원고');
});
test('corrupt storage stays byte-identical until explicit recovery, with checkpoint copy retained',async({page})=>{
 await create(page,'정상 원고');await records(page);await page.getByRole('button',{name:'현재 원고 보관',exact:true}).click();
 await page.evaluate(key=>localStorage.setItem(key,'broken-workspace-raw'),workspace);await page.reload();
 await expect(page.getByRole('region',{name:'기기 보관함 복구'})).toBeVisible();
 await records(page);await page.getByLabel('모든 작품의 이전 원고 보기').check();await page.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true}).click();
 await expect(page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue('정상 원고 · 내 사본');
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe('broken-workspace-raw');
 await page.getByRole('button',{name:'손상 원본 보존하고 새 보관함 시작',exact:true}).click();
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('knolstory-workspace-recovery-')).map(k=>localStorage.getItem(k)))).toContain('broken-workspace-raw');
 await page.reload();await expect(page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue('정상 원고 · 내 사본');
});

test('failed deletion preserves the previous deleted book and the current draft together',async({page})=>{
 await create(page,'이전 삭제 원고');await page.getByRole('button',{name:'서재로',exact:true}).click();
 async function remove(title:string){const book=page.getByRole('article',{name:`내 작품 · ${title}`,exact:true});await book.getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await focus.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();await focus.getByRole('button',{name:'내 작품 삭제',exact:true}).click();await page.getByRole('dialog',{name:'내 작품 삭제 확인'}).getByRole('button',{name:'삭제 확인',exact:true}).click();}
 await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');await remove('이전 삭제 원고');
 await create(page,'삭제 실패 원고');await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(key=>localStorage.getItem(key),workspace);
 await page.evaluate(key=>{const original=Storage.prototype.setItem;(window as any).__rejectWorkspace=true;Storage.prototype.setItem=function(k,v){if(k===key&&(window as any).__rejectWorkspace)throw Error('test quota');return original.call(this,k,v);};},workspace);
 await remove('삭제 실패 원고');
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(before);
 await page.getByRole('dialog',{name:'내 작품 삭제 확인'}).getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByRole('dialog',{name:'내 작품 삭제 확인'})).toHaveCount(0);if(await page.getByRole('dialog').count())await page.getByRole('dialog').getByRole('button',{name:'닫기 · 서재로 돌아가기',exact:true}).click();
 await page.evaluate(()=>{(window as any).__rejectWorkspace=false;});await page.getByText('삭제한 작품 복구',{exact:true}).click();await page.getByRole('button',{name:'이전 삭제 원고 복구',exact:true}).click();
 await expect(page.getByRole('article',{name:'내 작품 · 이전 삭제 원고',exact:true})).toBeVisible();await expect(page.getByRole('article',{name:'내 작품 · 삭제 실패 원고',exact:true})).toBeVisible();
});

test('page restoration reacquires ownership before saving and preserves the draft',async({page})=>{
 await create(page,'복귀할 원고');await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
 await expect.poll(()=>page.evaluate(async key=>(await navigator.locks.query()).held?.filter(lock=>lock.name===`${key}-writer`).length,workspace)).toBe(0);
 await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect.poll(()=>page.evaluate(async key=>(await navigator.locks.query()).held?.filter(lock=>lock.name===`${key}-writer`).length,workspace)).toBe(1);
 await page.getByRole('region',{name:'작품 설정'}).getByLabel('작품 제목',{exact:true}).fill('복귀 후 고친 원고');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.title,workspace)).toBe('복귀 후 고친 원고');
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
});


test('the complete long Seonnyeo copy can delete and undo a cut beyond checkpoint capacity',async({page})=>{
 test.setTimeout(180000);await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,'seonnyeo','knolstory','edit');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);
 expect(before.lines.length).toBeGreaterThan(1000);
 await page.locator('[data-writing-tools]>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();const writer=page.getByRole('region',{name:'장 전체 글 고치기',exact:true});
 await writer.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await writer.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();
 await page.getByRole('dialog',{name:'컷 삭제 확인'}).getByRole('button',{name:'삭제 실행',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'컷 삭제 확인'})).toHaveCount(0);
 await expect(page.getByRole('alert').filter({hasText:'복구 기록 용량'})).toBeVisible();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.lines.length,workspace)).toBe(before.lines.length-1);
 await page.getByRole('button',{name:'삭제 되돌리기',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);expect(restored).toEqual(before);
 await page.reload();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace)).toEqual(before);
});

test('resumed stale draft cannot overwrite a work changed while its writer was released',async({page,context})=>{
 await create(page,'재개 충돌을 검증하는 원고');await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();const firstText=page.getByLabel('대사 / 해설',{exact:true});await firstText.fill('첫 탭이 보관한 원고');await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.lines[0].text,workspace)).toBe('첫 탭이 보관한 원고');await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect.poll(()=>page.evaluate(async key=>(await navigator.locks.query()).held?.filter(lock=>lock.name===`${key}-writer`).length,workspace)).toBe(0);
 const second=await context.newPage();await second.goto('/?view=editor');await expect(second.getByTestId('save-status')).toHaveText('임시 보관됨');await second.getByLabel('대사 / 해설',{exact:true}).fill('잠시 다른 탭에서 고친 새 원고');await expect.poll(()=>second.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project.lines[0].text,workspace)).toBe('잠시 다른 탭에서 고친 새 원고');await second.close();await expect.poll(()=>page.evaluate(async key=>(await navigator.locks.query()).held?.filter(lock=>lock.name===`${key}-writer`).length,workspace)).toBe(0);const latest=await page.evaluate(key=>localStorage.getItem(key),workspace);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(page.getByTestId('save-status')).toContainText('임시 보관 실패');await expect(firstText).toHaveValue('첫 탭이 보관한 원고');await menu(page);await page.getByRole('button',{name:'임시 보관',exact:true}).click();expect(await page.evaluate(({key,raw})=>localStorage.getItem(key)===raw,{key:workspace,raw:latest})).toBe(true);const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const saved=JSON.parse(await readFile((await (await download).path())!,'utf8'));expect(saved.document.project.lines[0].text).toBe('첫 탭이 보관한 원고');await page.reload();await expect(firstText).toHaveValue('잠시 다른 탭에서 고친 새 원고');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
});


test('blocked draft reload requires explicit confirmation and cancellation preserves unexported text',async({page,context},testInfo)=>{
 await create(page,'보관함의 원고');await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();const second=await context.newPage();await second.goto('/?view=editor');
 await expect(second.getByRole('alert').filter({hasText:'다른 탭에서 보관함'})).toBeVisible();
 await second.getByText('현재 컷 상세·메모·정리',{exact:true}).click();const text=second.getByLabel('대사 / 해설',{exact:true}),draft='아직 파일로 내보내지 않은 둘째 탭의 초안';await text.fill(draft);
 const before=await page.evaluate(key=>localStorage.getItem(key),workspace);
 const reopen=second.getByRole('button',{name:'저장된 보관함 다시 열기',exact:true});
 await text.dispatchEvent('compositionstart');await expect(reopen).toBeDisabled();await text.dispatchEvent('compositionend');
 await reopen.click();const dialog=second.getByRole('dialog',{name:'저장된 보관함 다시 열기',exact:true});
 await expect(dialog).toBeVisible();await second.setViewportSize({width:390,height:844});await second.screenshot({path:testInfo.outputPath('reload-confirmation-390.png')});await expect(dialog).toContainText('현재 초안은 사라집니다');await expect(dialog.getByRole('button',{name:'취소',exact:true})).toBeFocused();
 await text.dispatchEvent('compositionstart');await expect(dialog.getByRole('button',{name:'현재 초안을 닫고 다시 열기',exact:true})).toBeDisabled();await text.dispatchEvent('compositionend');
 await second.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'현재 초안을 닫고 다시 열기',exact:true})).toBeFocused();
 await second.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'취소',exact:true})).toBeFocused();
 await second.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(reopen).toBeFocused();await expect(text).toHaveValue(draft);
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(before);
 await reopen.click();await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(text).toHaveValue(draft);
 const pending=second.waitForEvent('download');await second.getByRole('button',{name:'현재 초안 파일 내보내기',exact:true}).click();const file=await pending;
 const archive=JSON.parse(await readFile((await file.path())!,'utf8'));expect(archive.document.project.lines[0].text).toBe(draft);
 expect(await page.evaluate(key=>localStorage.getItem(key),workspace)).toBe(before);
 await page.close();await reopen.click();await dialog.getByRole('button',{name:'현재 초안을 닫고 다시 열기',exact:true}).click();
 await expect(second.getByTestId('save-status')).toHaveText('임시 보관됨');await expect(text).toHaveValue('');
 await expect(second.getByRole('heading',{name:'보관함의 원고',exact:true})).toBeVisible();
});
