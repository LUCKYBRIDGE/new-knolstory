import {test,expect,type Page} from '@playwright/test';
import {coveredControls,type CoveredControl} from './hit-targets';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {enterLibrary,builtinShelfCard,openBuiltinEdition,startShelfCreation,openBookMore} from './library-entry';
import {lastCutPlayback,moveReadingTo,startSound,readToEnding} from './ending-position';

/**
 * Buttons, bars and panels must not sit on top of one another: every visible control on the main screens
 * has to receive its own press at its centre and just inside each edge, on phone, tablet and desktop widths.
 */
const sizes=[{name:'desktop',width:1440,height:900,touch:false},{name:'tablet',width:1024,height:768,touch:true},{name:'phone',width:390,height:844,touch:true}] as const;

async function settle(page:Page){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 // Opening and page-turn effects end before anyone can aim at a control.
 await page.waitForTimeout(700);
}
async function probe(page:Page,found:Record<string,CoveredControl[]>,where:string,scope?:string){
 await settle(page);const problems=await coveredControls(page,scope);if(problems.length)found[where]=problems;
}
async function readerReady(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:90000});
 await expect.poll(()=>status.evaluate(node=>node.getAttribute('data-scene-revision')===node.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);
}

for(const size of sizes)test(`main screens keep every control reachable · ${size.name}`,async({browser},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:size.width,height:size.height},hasTouch:size.touch,reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(15000);await suppressFullscreenOffer(page);
 const found:Record<string,CoveredControl[]>={};
 try{
  await page.goto('/');await expect(page.getByRole('main',{name:'책 소개',exact:true})).toBeVisible();await probe(page,found,'introduction');
  // The title page now greets readers from the home screen (and assignments); the shelf opens stories directly.
  await page.getByRole('button',{name:/이야기 읽기/}).click();const start=page.getByRole('main',{name:'책 표지와 소개'});await expect(start).toBeVisible();await probe(page,found,'book start');
  await start.getByRole('button',{name:'서재로',exact:true}).click();
  await enterLibrary(page);await probe(page,found,'library');
  await builtinShelfCard(page,'seonnyeo').getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();const focus=page.getByRole('dialog');await expect(focus).toBeVisible();await probe(page,found,'book focus');
  await openBookMore(focus);await probe(page,found,'book focus more');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);

  await openBuiltinEdition(page,'seonnyeo','knolstory','start');
  await readerReady(page);await probe(page,found,'reader');
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await probe(page,found,'reader menu');
  await page.keyboard.press('Escape');
  // Keyboard readers open the text view over the stage; it must not share space with the reading bar.
  await page.locator('details summary').filter({hasText:'대사·해설 텍스트 보기'}).focus();await probe(page,found,'reader text view');
  // Touch readers keep the reading bar folded away until the stage is tapped.
  const save=page.getByRole('button',{name:'저장',exact:true});if(await save.isVisible()){await save.click();await probe(page,found,'reader saves');await page.keyboard.press('Escape');}
  // The end of the story: the credits (still, as motion is reduced here) and the next steps after them.
  await moveReadingTo(page,lastCutPlayback('seonnyeo','knolstory'));await readerReady(page);await startSound(page);await readerReady(page);
  await readToEnding(page);await probe(page,found,'ending credits');
  await page.getByRole('button',{name:'다른 결말 찾아보기',exact:true}).click();await expect(page.locator('[data-story-credits]')).toHaveCount(0);await readerReady(page);
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
  await page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true}).getByRole('button',{name:'보관하고 서재로',exact:true}).click();
  await expect(page.getByRole('main',{name:'놀스토리 서재'})).toBeVisible();

  await startShelfCreation(page);await probe(page,found,'library create','[aria-labelledby="library-create-title"]');
  await page.getByLabel('새 작품 제목',{exact:true}).fill('누르기 검사');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
  await expect(page.locator('[data-current-cut] textarea')).toBeVisible();await probe(page,found,'editor');
  await page.locator('[data-work-menu]>summary').click();await probe(page,found,'editor work menu','[data-work-menu]');
  // A few written cuts fill the cut list and the bars around the current cut.
  for(const text of ['첫 컷 글','둘째 컷 글','셋째 컷 글']){
   if(text!=='첫 컷 글'){if(!await page.locator('[data-work-menu]').evaluate(node=>(node as HTMLDetailsElement).open))await page.locator('[data-work-menu]>summary').click();await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();}
   await page.locator('[data-current-cut] textarea').fill(text);
  }
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await probe(page,found,'editor with cuts');

  await page.goto('/shortstory');await expect(page.getByRole('main').first()).toBeVisible();await probe(page,found,'picture books');
  await page.goto('/shortstory/?work=rabbit&mode=read');await expect(page.getByRole('button',{name:'내 사본으로 쓰기',exact:true})).toBeVisible();await probe(page,found,'picture book reading');
  await page.getByRole('button',{name:'내 사본으로 쓰기',exact:true}).click();await expect(page.getByLabel('이야기 제목',{exact:true})).toBeVisible();await probe(page,found,'picture book editor');
 }finally{await context.close();}
 await info.attach('covered-controls',{body:JSON.stringify(found,null,2),contentType:'application/json'});
 if(process.env.KNOL_REACH_REPORT)console.log('REACH',size.name,JSON.stringify(found));
 expect(found,'controls covered by another button, bar or panel').toEqual({});
});
