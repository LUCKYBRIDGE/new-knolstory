import {openShortStoryDetails} from './shortstory-navigation';
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const key='knolstory-shortstory-library-v1';
/** A browser that cannot keep the library (no Web Locks). Two ordinary tabs hand the writer over by
 * themselves instead (multi-tab-handover.spec.ts). */
const withoutLocks=(page:Page)=>page.addInitScript(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
const storageWarning=(page:Page)=>page.getByRole('alert').filter({hasText:'자동으로 임시 보관하지 못했어요'});
const firstText=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).books[0].pages[0].text,key);
test('a picture-book tab that cannot keep the library keeps its draft, exports it and reopens the stored book only after confirmation',async({page,context})=>{
 await page.goto('/shortstory');
 await page.getByLabel('이야기 제목',{exact:true}).fill('첫 탭의 그림책');
 await page.getByLabel('이 쪽의 이야기').fill('먼저 저장한 글');
 await expect.poll(()=>firstText(page)).toBe('먼저 저장한 글');
 const other=await context.newPage();await withoutLocks(other);await other.goto('/shortstory');
 await expect(storageWarning(other)).toBeVisible();
 await other.getByLabel('이 쪽의 이야기').fill('두 번째 탭의 초안');
 await expect(other.getByLabel('이 쪽의 이야기')).toHaveValue('두 번째 탭의 초안');
 expect(await firstText(page)).toBe('먼저 저장한 글');
 const downloadPromise=other.waitForEvent('download');await openShortStoryDetails(other, '파일 교환·보관');await other.getByRole('button',{name:'작품 파일 내보내기'}).click();
 const download=await downloadPromise;expect(await readFile((await download.path())!,'utf8')).toContain('두 번째 탭의 초안');
 await openShortStoryDetails(other, '파일 교환·보관');await other.getByRole('button',{name:'임시 보관',exact:true}).click();
 expect(await firstText(other)).toBe('먼저 저장한 글');
 await other.getByRole('button',{name:'저장된 보관함 다시 열기',exact:true}).click();
 const confirmation=other.getByRole('dialog',{name:'저장된 보관함 다시 열기',exact:true});await expect(confirmation).toBeVisible();await confirmation.getByRole('button',{name:'취소',exact:true}).click();await expect(other.getByLabel('이 쪽의 이야기')).toHaveValue('두 번째 탭의 초안');await other.getByRole('button',{name:'저장된 보관함 다시 열기',exact:true}).click();await confirmation.getByRole('button',{name:'보관함 다시 열기',exact:true}).click();
 await expect(other.getByLabel('이 쪽의 이야기')).toHaveValue('먼저 저장한 글');
 // Reading in that tab is never interrupted by the storage warning.
 await other.getByRole('button',{name:'읽기',exact:true}).click();await expect(storageWarning(other)).toHaveCount(0);
 // The tab that keeps the library is not affected and goes on saving.
 await page.bringToFront();await page.getByLabel('이 쪽의 이야기').fill('첫 탭이 이어 쓴 글');
 await expect.poll(()=>firstText(page)).toBe('첫 탭이 이어 쓴 글');
});
test('a second tab reading an original takes the writer over silently and never changes the saved library',async({page,context})=>{
 await page.goto('/shortstory?work=rabbit&mode=read');
 const original=await page.getByLabel('이야기 제목',{exact:true}).inputValue();
 await page.getByRole('button',{name:'내 사본으로 쓰기',exact:true}).click();
 await page.getByLabel('이 쪽의 이야기').fill('원본을 지키는 내 사본');
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),key)).toContain('원본을 지키는 내 사본');
 const saved=await page.evaluate(key=>localStorage.getItem(key),key);
 const other=await context.newPage();await other.goto('/shortstory?work=rabbit&mode=read');
 await expect(other.locator('html')).toHaveAttribute('data-local-writer','owned');
 await expect(other.getByLabel('이야기 제목',{exact:true})).toHaveValue(original);
 await expect(other.getByText(/다른 탭|자동으로 보관하지 못했어요/)).toHaveCount(0);
 await expect(other.getByRole('button',{name:'보관함 새로 시작'})).toHaveCount(0);
 expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
 await other.reload();await expect(other.getByLabel('이야기 제목',{exact:true})).toHaveValue(original);expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
});
test('a reading tab that cannot keep the library never migrates, recovers or warns over the saved library',async({page,context})=>{
 await page.goto('/shortstory?work=rabbit&mode=read');
 const original=await page.getByLabel('이야기 제목',{exact:true}).inputValue();
 await page.getByRole('button',{name:'내 사본으로 쓰기',exact:true}).click();
 await page.getByLabel('이 쪽의 이야기').fill('원본을 지키는 내 사본');
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),key)).toContain('원본을 지키는 내 사본');
 const saved=await page.evaluate(key=>localStorage.getItem(key),key);
 const other=await context.newPage();await withoutLocks(other);await other.goto('/shortstory?work=rabbit&mode=read');
 await expect(other.getByLabel('이야기 제목',{exact:true})).toHaveValue(original);
 await expect(other.locator('html')).toHaveAttribute('data-local-writer','unavailable');
 await expect(storageWarning(other)).toHaveCount(0);
 // Turning pages only moves the reading position: no warning and the reading goes on.
 const pages=other.getByRole('navigation',{name:'숏스토리 쪽 이동',exact:true});await pages.getByRole('button',{name:'다음 쪽',exact:true}).click();
 await expect(pages).toContainText('2 /');await expect(other.getByText(/보관하지 못했어요|다른 탭/)).toHaveCount(0);
 await expect(other.getByRole('button',{name:'보관함 새로 시작'})).toHaveCount(0);
 expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
 await other.reload();await expect(other.getByLabel('이야기 제목',{exact:true})).toHaveValue(original);expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
});
