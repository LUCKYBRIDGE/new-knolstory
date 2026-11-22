import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {coveredControls} from './hit-targets';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {importShelfFile,shelfCoverButton,builtinShelfCard} from './library-entry';
import {openBuiltinAtLastCut,readerReady,startSound,readToEnding} from './ending-position';

/**
 * The end of a story reads like the end of a film: the closing credits begin the moment the last cut is left,
 * over the blurred last scene, without any credit showing out of place first. Holding a press fast-forwards them,
 * a short press skips to the last card, and the last card leads back into the book or to the shelf.
 */
type Scene={sceneId:string;revision:number;ended?:boolean;audio?:{music?:{action:string;fadeOutMs?:number};ambience?:{action:string;fadeOutMs?:number}}};
type Observed=Window&{__endingScenes?:Scene[]};

async function observeScenes(page:Page){
 await page.addInitScript(()=>{
  if(window===window.top)return;
  (window as Observed).__endingScenes=[];
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.protocol===1&&event.data.type==='loadScene'&&event.source===window.parent)(window as Observed).__endingScenes!.push(event.data.payload);});
 });
}
const scenes=(page:Page)=>page.getByTestId('story-runtime-frame').evaluate(node=>((node as HTMLIFrameElement).contentWindow as Observed).__endingScenes??[]);

async function rollTime(page:Page){return page.locator('[data-credits-roll]').evaluate(node=>Number(node.getAnimations()[0]?.currentTime??-1));}

test('ending credits start the moment the story ends and follow the press',async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:1280,height:800});await suppressFullscreenOffer(page);await observeScenes(page);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await openBuiltinAtLastCut(page,'rabbit','original');await readerReady(page);await startSound(page);await readerReady(page);
 await expect(page.locator('[data-reader-quick-bar]')).toBeVisible();
 await readToEnding(page);
 // First frame of the ending: the title card stands in the middle, every credit below it is still off the stage.
 const entry=await page.evaluate(()=>{
  const section=document.querySelector('[data-story-credits]')!.getBoundingClientRect(),opening=document.querySelector('[data-credits-opening]')!.getBoundingClientRect();
  const blocks=[...document.querySelectorAll('[data-credits-section],[data-credits-closing]')].map(node=>node.getBoundingClientRect().top-section.top);
  return {height:section.height,openingMiddle:(opening.top+opening.bottom)/2-section.top,firstBlock:Math.min(...blocks),animations:document.querySelector('[data-credits-roll]')!.getAnimations().length};
 });
 expect(entry.animations).toBe(1);
 expect(Math.abs(entry.openingMiddle-entry.height/2)).toBeLessThan(40);
 expect(entry.firstBlock,'no credit shows over the last scene before the roll').toBeGreaterThan(entry.height*.86);
 // The reading bar and chapter label leave the screen to the credits; the skip button takes the keyboard.
 await expect(page.locator('[data-reader-quick-bar]')).toHaveCount(0);await expect(page.locator('[data-reader-context]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'건너뛰기',exact:true})).toBeFocused();
 await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');

 // Holding the pointer fast-forwards while held; letting go returns to normal speed and does not skip.
 await page.waitForTimeout(400);
 const credits=page.locator('[data-story-credits]');
 let before=await rollTime(page);
 await page.mouse.move(640,400);await page.mouse.down();await expect(credits).toHaveAttribute('data-fast');
 await page.waitForTimeout(1000);await page.mouse.up();
 await expect(credits).not.toHaveAttribute('data-fast');
 expect(await rollTime(page)-before,'held press plays the roll several times faster').toBeGreaterThan(3500);
 await expect(page.locator('[data-credits-last]')).toHaveCount(0);
 before=await rollTime(page);await page.waitForTimeout(1000);
 expect(await rollTime(page)-before,'released press returns to normal speed').toBeLessThan(1600);
 // The same with a held Space.
 await page.keyboard.down(' ');await expect(credits).toHaveAttribute('data-fast');await page.keyboard.up(' ');
 await expect(credits).not.toHaveAttribute('data-fast');await expect(page.locator('[data-credits-last]')).toHaveCount(0);
 // A short press skips to the last card, which offers what to do next.
 await page.keyboard.press('Enter');
 const last=page.locator('[data-credits-last]');await expect(last).toBeVisible();
 await expect(last.getByRole('heading',{name:'별주부전'})).toBeVisible();
 await expect(page.getByRole('button',{name:'처음부터 다시 읽기',exact:true})).toBeFocused();
 // The music comes to an end under the last card.
 await expect.poll(async()=>(await scenes(page)).at(-1)?.audio?.music).toEqual({action:'stop',fadeOutMs:4000});
 expect((await scenes(page)).at(-1)!.ended).toBe(true);
 await page.screenshot({path:test.info().outputPath('ending-last-card.png')});

 // Reading again starts from the first cut with nothing of the ending left on screen.
 await page.getByRole('button',{name:'처음부터 다시 읽기',exact:true}).click();
 await expect(credits).toHaveCount(0);await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');
 await readerReady(page);await expect(page.locator('[data-reader-quick-bar]')).toBeVisible();
 expect((await scenes(page)).at(-1)!.ended).toBeFalsy();
 expect(errors).toEqual([]);
});

test('a finished book offers to start again instead of resuming into its credits',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:1280,height:800});await suppressFullscreenOffer(page);
 await openBuiltinAtLastCut(page,'rabbit','original');await readerReady(page);await startSound(page);await readerReady(page);
 await readToEnding(page);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'놀스토리 서재'})).toBeVisible();
 await builtinShelfCard(page,'rabbit').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toHaveAttribute('data-work-id','rabbit');
 await expect(dialog.getByRole('button',{name:'원작 이어읽기',exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'원작 읽기',exact:true}).click();
 const start=page.getByRole('main',{name:'책 표지와 소개',exact:true});
 await expect(start.getByRole('button',{name:'이어읽기',exact:true})).toBeDisabled();
});

test('a story written by its reader ends with its own credits',async({page})=>{
 test.setTimeout(240000);await page.setViewportSize({width:1024,height:768});await suppressFullscreenOffer(page);
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 const source=JSON.parse(readFileSync('tests/fixtures/stories/rabbit.json','utf8'));
 const chapter=source.chapters[0],cuts=source.lines.filter((line:{chapterId:string})=>line.chapterId===chapter.id).slice(0,3).map((line:Record<string,unknown>,index:number)=>{const {flow:_flow,ending:_ending,...rest}=line;return {...rest,order:index+1,...(index===2?{ending:{name:'바다로 돌아간 결말',description:'자라는 빈손으로 용궁에 돌아갔어요.',endsStory:true}}:{})};});
 const project={...source,id:'reader-written-ending',title:'달빛 바다의 약속',chapters:[{...chapter,order:1}],lines:cuts,cover:{...source.cover,author:'3학년 2반 하늘',authorNote:'끝까지 읽어 줘서 고마워요.'}};
 await importShelfFile(page,{name:'ending.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-11-22T00:00:00.000Z',appVersion:'ending-test',project}))});
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await shelfCoverButton(page,'달빛 바다의 약속').click();await page.getByRole('dialog').getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await page.getByRole('main',{name:'책 표지와 소개',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await readerReady(page);await startSound(page);await readerReady(page);
 await readToEnding(page);
 const credits=page.locator('[data-story-credits]');
 await expect(credits.locator('[data-credits-opening]')).toContainText('결말 · 바다로 돌아간 결말');
 await expect(credits.locator('[data-credits-opening]')).toContainText('3학년 2반 하늘');
 await expect(credits.locator('[data-credits-opening]')).toContainText('자라는 빈손으로 용궁에 돌아갔어요.');
 await expect(credits.getByText('끝까지 읽어 줘서 고마워요.',{exact:true})).toBeAttached();
 await expect(credits.locator('dl dt')).toContainText(['등장인물','그림']);
 await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
 await expect(page.locator('[data-credits-last]')).toContainText('달빛 바다의 약속');
 await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'놀스토리 서재'})).toBeVisible();
});

const sizes=[{name:'desktop',width:1440,height:900,touch:false},{name:'tablet',width:1024,height:768,touch:true},{name:'phone',width:390,height:844,touch:true},{name:'phone landscape',width:844,height:390,touch:true}] as const;
for(const size of sizes)test(`ending credits and last card fit and stay reachable · ${size.name}`,async({browser},info)=>{
 test.setTimeout(240000);
 for(const reducedMotion of ['no-preference','reduce'] as const){
  const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:size.width,height:size.height},hasTouch:size.touch,reducedMotion});
  const page=await context.newPage();await suppressFullscreenOffer(page);
  try{
   await openBuiltinAtLastCut(page,'heungbu','knolstory');await readerReady(page);await startSound(page);await readerReady(page);
   await readToEnding(page);
   if(reducedMotion==='reduce'){
    // Still credits: no motion, the whole list to scroll and the next steps already there.
    await expect(page.locator('[data-story-credits]')).toHaveAttribute('data-still');
    expect(await page.locator('[data-credits-roll]').evaluate(node=>node.getAnimations().length)).toBe(0);
    await page.getByRole('button',{name:'다른 결말 찾아보기',exact:true}).scrollIntoViewIfNeeded();
   }else{
    await page.waitForTimeout(1800);
    expect(await coveredControls(page),'controls during the roll').toEqual([]);
    await page.screenshot({path:info.outputPath(`roll-${size.name}.png`)});
    await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
    await page.waitForTimeout(1000);
   }
   for(const name of ['다른 결말 찾아보기','서재로 돌아가기']){
    const box=(await page.getByRole('button',{name,exact:true}).boundingBox())!;
    expect(box.y,`${name} on screen`).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height);
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width);
   }
   expect(await coveredControls(page),`controls on the last card (${reducedMotion})`).toEqual([]);
   await page.screenshot({path:info.outputPath(`last-${size.name}-${reducedMotion}.png`)});
  }finally{await context.close();}
 }
});
