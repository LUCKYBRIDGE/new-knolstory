import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport} from './authoring-file';
import {openShortStoryDetails} from './shortstory-navigation';

const shadowId='shortstory.background.creative-rabbit-wandering-shadow-v1';
const mysteryIds=[
 'rabbit-wandering-shadow','rabbit-cloud-fish',
 'heungbu-floating-chest','heungbu-midnight-footprints',
 'seonnyeo-winter-reflection','seonnyeo-floating-steps',
 'onggojib-walking-shoes','onggojib-noon-night-door',
].map(slug=>`shortstory.background.creative-${slug}-v1`);

for(const width of [390,1440])test(`ShortStory mysterious scenes are searchable and survive a whole-book file roundtrip ${width}`,async({page,browser})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/shortstory?mode=library');
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();
 const writing=page.getByRole('region',{name:'숏스토리 쓰기',exact:true});
 await writing.getByRole('button',{name:'삽화 고르기',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'삽화 고르기',exact:true});
 await picker.getByRole('button',{name:'자유 창작',exact:true}).click();
 await picker.getByRole('checkbox',{name:'새로운 사건만 보기'}).check();
 for(const id of mysteryIds)await expect(picker.locator(`[data-asset-id="${id}"]`)).toHaveCount(1);
 const search=picker.getByRole('searchbox',{name:'삽화 검색'});
 for(const query of ['수상','기이','신기']){
  await search.fill(query);
  await expect(picker.locator('[data-asset-id]').first()).toBeVisible();
 }
 await search.fill('그림자');
 const selected=picker.locator(`[data-asset-id="${shadowId}"]`);
 await expect(selected).toBeVisible();
 const imageSource=await selected.locator('img').getAttribute('src');
 await selected.click();
 const text='나는 두 손을 내리고 있었는데, 그림자가 먼저 손을 흔들었다.';
 await writing.getByLabel('이 쪽의 이야기',{exact:true}).fill(text);
 await page.reload();
 await expect(writing.getByLabel('이 쪽의 이야기',{exact:true})).toHaveValue(text);
 const art=writing.getByRole('img',{name:'1쪽 삽화',exact:true}).locator('img');
 await expect(art).toHaveAttribute('src',imageSource!);
 await expect.poll(()=>art.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await openShortStoryDetails(page,'파일 교환·보관');
 const downloading=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=await (await downloading).path();
 expect(path).toBeTruthy();
 const bytes=await readFile(path!);
 const archive=JSON.parse(bytes.toString());
 expect(archive.project.pages[0]).toMatchObject({backgroundId:shadowId,text});
 const context=await browser.newContext({viewport:{width,height:900}});
 try{
  const imported=await context.newPage();
  await imported.goto(new URL('/shortstory?mode=library',page.url()).href);
  await imported.getByLabel('숏스토리 파일 가져오기',{exact:true}).setInputFiles({name:'mystery.shortstory',mimeType:'application/json',buffer:bytes});
  await confirmAuthoringImport(imported);
  await imported.getByRole('button',{name:'읽기',exact:true}).click();
  const reading=imported.getByRole('region',{name:'숏스토리 읽기',exact:true});
  await expect(reading).toContainText(text);
  await expect(reading.getByRole('img',{name:'1쪽 삽화',exact:true}).locator('img')).toHaveAttribute('src',imageSource!);
 }finally{
  await context.close();
 }
});
