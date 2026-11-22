import {test,expect,type Page} from '@playwright/test';

// Cards (shelf covers, image picker, page lists) use the small build-generated preview;
// reading keeps the original image but only for the open page and its neighbours.
const PREVIEW=/^\/assets\/previews\/v\d+\/[a-f0-9]{16}\.webp$/;
const ORIGINAL=/^\/assets\/(legacy-18da4fc|characters|backgrounds|illustrations)\//;

function imageRequests(page:Page){
 const paths:string[]=[];
 page.on('request',request=>{const url=new URL(request.url());if(url.pathname.startsWith('/assets/'))paths.push(url.pathname+url.search);});
 return paths;
}
async function loadedSizes(images:ReturnType<Page['locator']>){
 await expect.poll(()=>images.evaluateAll(nodes=>nodes.length>0&&nodes.every(node=>(node as HTMLImageElement).complete&&(node as HTMLImageElement).naturalWidth>0))).toBe(true);
 return images.evaluateAll(nodes=>nodes.map(node=>({src:new URL((node as HTMLImageElement).currentSrc).pathname,width:(node as HTMLImageElement).naturalWidth,height:(node as HTMLImageElement).naturalHeight})));
}

test('shelf covers and the image picker show previews, never originals',async({page})=>{
 await page.setViewportSize({width:1280,height:860});
 const requests=imageRequests(page);
 await page.goto('/?view=library');
 const covers=await loadedSizes(page.locator('[data-shelf-cover] img'));
 for(const cover of covers){expect(cover.src).toMatch(PREVIEW);expect(cover.width).toBeLessThanOrEqual(512);expect(cover.height).toBeLessThanOrEqual(384);}
 expect(requests.filter(path=>ORIGINAL.test(path))).toEqual([]);

 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 requests.length=0;
 await page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/}).first().click();
 const dialog=page.getByRole('dialog',{name:/^이미지 선택 · 1컷 배경$/});await expect(dialog).toBeVisible();
 const cards=await loadedSizes(dialog.locator('[data-asset-id] img'));
 expect(cards.length).toBeGreaterThan(4);
 for(const card of cards){expect(card.src).toMatch(PREVIEW);expect(card.width).toBeLessThanOrEqual(512);expect(card.height).toBeLessThanOrEqual(384);}
 expect(requests.filter(path=>ORIGINAL.test(path))).toEqual([]);
});

test('opening a picture book loads the open page and its neighbour, not every page',async({page})=>{
 await page.setViewportSize({width:1280,height:860});
 const requests=imageRequests(page);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/shortstory?work=rabbit');
 const open=page.getByRole('button',{name:'책 펼치기',exact:true});
 await expect(open.or(page.getByRole('region',{name:'숏스토리 읽기',exact:true}))).toBeVisible();
 if(await open.isVisible())await open.click();
 const reading=page.getByRole('region',{name:'숏스토리 읽기',exact:true});
 await expect(reading).toBeVisible();
 const art=reading.getByRole('img',{name:'1쪽 삽화',exact:true}).locator('img');
 await expect.poll(()=>art.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 expect(new URL(await art.evaluate(image=>(image as HTMLImageElement).currentSrc)).search).toMatch(/^\?v=[a-f0-9]{16}$/);
 await page.waitForTimeout(1500);
 const originals=[...new Set(requests.filter(path=>ORIGINAL.test(path)))];
 // Page 1 and the warmed page 2; the eight-page A4 section stays deferred.
 expect(originals.length).toBeLessThanOrEqual(3);
 const print=page.locator('[data-shortstory-print] article img');
 expect(await print.evaluateAll(nodes=>nodes.every(node=>(node as HTMLImageElement).loading==='lazy'))).toBe(true);
});
