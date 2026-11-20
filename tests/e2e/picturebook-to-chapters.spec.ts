import {test,expect,type Page} from '@playwright/test';

/**
 * 그림책 쪽 → 놀스토리 장 (docs/architecture/picturebook-to-chapters-design.md, ‘놀스토리로 보내기’).
 * The student starts from page 4 of their own 별주부전 copy, writes the first line of chapter 4,
 * and comes back to the same cut from the picture book.
 */
type Account={me?:'guest'|'student'|'error';permissions?:Record<string,unknown>};
async function account(page:Page,{me='guest',permissions={}}:Account={}){
 const studentId='33333333-3333-4333-8333-333333333333';
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:true,google:true}}}});
  if(path.endsWith('/class/me'))return route.fulfill({json:{success:true,data:{role:'student',account:{id:studentId},student:{number:7,permissions:{text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null,...permissions}}}}});
  if(path.endsWith('/me')){
   if(me==='guest')return route.fulfill({status:401,json:{success:false}});
   if(me==='error')return route.fulfill({status:503,json:{success:false}});
   return route.fulfill({json:{success:true,data:{accountId:studentId,csrf:'csrf-token'}}});
  }
  return route.fulfill({status:404,json:{success:false}});
 });
}
const workspace=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')??'null'));
async function ownRabbitAtPage4(page:Page){
 await page.goto('/shortstory?work=rabbit&mode=edit');
 // Phones start with the page list folded.
 const list=page.locator('details:has(nav[aria-label="그림책 쪽 목록"])');
 await expect(list).toBeVisible();
 if(!await list.evaluate(node=>(node as HTMLDetailsElement).open))await list.locator('summary').click();
 await page.getByRole('button',{name:/^4쪽 · /}).click();
 await expect(page.getByRole('heading',{name:/^4쪽/})).toBeVisible();
}

const titles=(project:{chapters:{order:number;title:string}[]})=>[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.title);
async function prepare(page:Page){
 await page.getByRole('button',{name:'놀스토리로 보내기',exact:true}).click();
 await expect(page).toHaveURL(/\/picturebook\?book=/);
}
/** Only the given page numbers stay chosen. */
async function choosePages(page:Page,numbers:readonly number[]){
 await page.getByRole('button',{name:'모두 빼기',exact:true}).click();
 for(const number of numbers)await page.getByRole('checkbox',{name:`${number}쪽 보내기`,exact:true}).check();
}
async function send(page:Page,notice:string|RegExp='첫 컷'){
 await page.locator('main > footer').getByRole('button',{name:'놀스토리로 보내기',exact:true}).click();
 await expect(page).toHaveURL(/\/(\?.*)?$/);
 await expect(page.getByText(notice).first()).toBeVisible({timeout:60_000});
}
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(n=>(n as HTMLDetailsElement).open))await node.locator(':scope>summary').click();}

for(const width of [1280,390])test(`그림책 4쪽에서 보내 4장 첫 컷을 쓰고 그림책에서 다시 연다 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width<500?844:860});
 await account(page);
 await ownRabbitAtPage4(page);
 const story=page.getByLabel('이 쪽의 이야기',{exact:true});
 await story.fill(`${await story.inputValue()} 토끼는 파도 소리에 귀를 쫑긋 세웠어요.`);
 await prepare(page);
 await expect(page.getByTestId('picturebook-summary')).toHaveText('8쪽 모두가 새 놀스토리의 1~8장이 돼요.');
 // The empty first stage is shown on the actual Ren’Py stage.
 await expect(page.getByTestId('picturebook-stage-status')).toHaveAttribute('data-rendered-revision',/^(?!-1$)\d+$/,{timeout:90_000});
 await send(page);
 const reference=page.getByTestId('picturebook-chapter-reference').first();
 await expect(page.getByTestId('picturebook-notice')).toContainText('4장 첫 컷');
 const first=await workspace(page);
 const key=first.storyId as string,work=first.document.project;
 expect(key).toMatch(/^new:/);
 expect(work.chapters).toHaveLength(8);
 const chapter4=work.chapters[3];
 expect(chapter4.summary).toContain('토끼는 파도 소리에 귀를 쫑긋 세웠어요.');
 expect(work.lines.find((line:{id:string})=>line.id===first.lineId).chapterId).toBe(chapter4.id);
 expect(Object.values(first.picturebookLinks)).toHaveLength(1);
 if(width>=1000)await expect(reference).toContainText('토끼는 파도 소리에');
 // Every image picker of this chapter starts with the pictures that fit its picture-book page.
 if(width>=1000){
  await page.getByRole('button',{name:/^1컷 배경 이미지 찾기/}).click();
  const picker=page.getByRole('dialog',{name:/이미지 선택/});
  await expect(picker.getByRole('button',{name:'숏스토리 추천',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(picker.locator('[data-asset-id]').first()).toBeVisible();
  await picker.getByRole('button',{name:'취소',exact:true}).click();
 }
 // The student writes the first line of chapter 4.
 const offer=page.getByRole('button',{name:'지금은 그대로',exact:true});
 if(await offer.isVisible())await offer.click();
 const text=page.getByRole('textbox',{name:'1컷 글',exact:true});
 await text.fill('바다 한가운데서 토끼가 물었어요. “용궁은 아직 멀었나요?”');
 await expect.poll(async()=>(await workspace(page)).document.project.lines.find((line:{id:string})=>line.id===first.lineId).text,{timeout:10_000}).toContain('용궁은 아직');
 // Back to the picture book: the sent work and the sent pages are shown, and it opens where the student wrote.
 await page.goto('/shortstory');
 await prepare(page);
 await expect(page.getByRole('region',{name:'이 그림책에서 보낸 놀스토리'})).toContainText('8쪽 보냄');
 await expect(page.getByRole('list').filter({has:page.getByRole('checkbox',{name:'4쪽 보내기'})})).toContainText('4장');
 await page.getByRole('region',{name:'이 그림책에서 보낸 놀스토리'}).getByRole('button',{name:'열기',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(/용궁은 아직 멀었나요/);
 const again=await workspace(page);
 expect(again.storyId).toBe(key);expect(again.lineId).toBe(first.lineId);
 expect(Object.keys(again.works).concat(again.storyId).filter((item:string)=>item.startsWith('new:'))).toHaveLength(1);
});

test('고른 쪽만 새 놀스토리로 보내고, 다른 쪽은 쓰던 놀스토리의 장 사이에 넣는다',async({page})=>{
 await account(page);
 await ownRabbitAtPage4(page);
 const pages=(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')??'null'))) as {books:{pages:{title:string}[]}[]}|null;
 await prepare(page);
 await choosePages(page,[1,2,3]);
 await expect(page.getByTestId('picturebook-summary')).toHaveText('고른 1~3쪽이 새 놀스토리의 1~3장이 돼요.');
 await send(page);
 const made=await workspace(page);
 const key=made.storyId as string;
 const book=pages?.books[0]?.pages.map(item=>item.title)??titles(made.document.project);
 expect(titles(made.document.project)).toHaveLength(3);
 // Pages 4 and 5 go between chapter 1 and chapter 2 of that work.
 await page.goto('/shortstory');
 await prepare(page);
 await choosePages(page,[4,5]);
 await page.getByRole('radio',{name:'쓰던 놀스토리에 넣기'}).check();
 await page.getByLabel('넣을 작품',{exact:true}).selectOption(key);
 const place=page.getByLabel('넣을 자리',{exact:true});
 await place.selectOption({label:(await place.locator('option').nth(1).textContent())!});
 await expect(page.getByTestId('picturebook-summary')).toContainText('1장 뒤에 2·3장으로 들어가요. 원래 2장부터는 4장부터로 번호가 바뀌어요.');
 await send(page,'1장 뒤에 2·3장으로 넣었어요');
 // The stage of the work being written is shown again right away.
 await expect(page.locator('section[aria-label="이야기 무대"] iframe')).toBeVisible();
 const after=await workspace(page);
 expect(after.storyId).toBe(key);
 const now=titles(after.document.project);
 expect(now).toHaveLength(5);
 expect(now[0]).toBe(titles(made.document.project)[0]);
 if(book.length>=5)expect(now.slice(1,3)).toEqual([book[3],book[4]]);
 expect(now.slice(3)).toEqual(titles(made.document.project).slice(1));
 // One undo puts the work back as it was.
 await page.getByRole('status').filter({hasText:'넣었어요'}).getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect.poll(async()=>titles((await workspace(page)).document.project)).toEqual(titles(made.document.project));
});

test('장 순서 바꾸기로 읽는 순서를 바꾸고 되돌린다',async({page})=>{
 await page.setViewportSize({width:1280,height:860});
 await account(page);
 await ownRabbitAtPage4(page);
 await prepare(page);
 await choosePages(page,[1,2,3]);
 await send(page);
 const before=titles((await workspace(page)).document.project);
 await menu(page);await page.locator('[data-work-menu] summary[aria-label="보기 설정"]').click();
 await page.getByRole('button',{name:'장 순서 바꾸기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'장 순서 바꾸기'});
 await dialog.getByRole('button',{name:/^3장 · .* 위로$/}).click();
 await expect(dialog.getByRole('status')).toContainText('지금은 2장');
 await expect.poll(async()=>titles((await workspace(page)).document.project)).toEqual([before[0],before[2],before[1]]);
 await dialog.getByRole('button',{name:'처음대로',exact:true}).click();
 await expect.poll(async()=>titles((await workspace(page)).document.project)).toEqual(before);
 await dialog.getByRole('button',{name:/^1장 · .*\d+컷$/}).click();
 await dialog.getByLabel('고른 장을 옮길 자리',{exact:true}).selectOption({index:2});
 await dialog.getByRole('button',{name:'이 자리로 옮기기',exact:true}).click();
 await dialog.getByRole('button',{name:'닫기',exact:true}).click();
 await expect.poll(async()=>titles((await workspace(page)).document.project)[0]).not.toBe(before[0]);
 await expect(page.getByRole('status').filter({hasText:'장 순서를 바꿨어요'})).toBeVisible();
 await page.getByRole('status').filter({hasText:'장 순서를 바꿨어요'}).getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect.poll(async()=>titles((await workspace(page)).document.project)).toEqual(before);
});

test('같은 요청은 두 번 눌러도 한 번만 보내고, 다른 탭에서 보내면 따로 보낸다',async({page,context})=>{
 await account(page);
 await ownRabbitAtPage4(page);
 await prepare(page);
 const bookUrl=page.url();
 const second=await context.newPage();await account(second);await second.goto(bookUrl);
 await page.locator('main > footer').getByRole('button',{name:'놀스토리로 보내기',exact:true}).dblclick();
 await expect(page.getByTestId('picturebook-notice')).toContainText('첫 컷',{timeout:60_000});
 const one=await workspace(page);
 expect([one.storyId,...Object.keys(one.works)].filter((item:string)=>item.startsWith('new:'))).toHaveLength(1);
 // The other tab's own press is a separate send the student chose.
 await second.locator('main > footer').getByRole('button',{name:'놀스토리로 보내기',exact:true}).click();
 await expect(second.getByTestId('picturebook-notice')).toContainText('첫 컷',{timeout:60_000});
 const stored=await workspace(second);
 expect(new Set([stored.storyId,...Object.keys(stored.works)].filter((item:string)=>item.startsWith('new:'))).size).toBe(2);
 expect((Object.values(stored.picturebookLinks)[0] as {sends:unknown[]}).sends).toHaveLength(2);
});

test('선생님이 새 작품 만들기를 막으면 새 놀스토리로는 보내지 않고, 계정 확인에 실패하면 보내지 않는다',async({page})=>{
 await account(page,{me:'student',permissions:{newWorks:false}});
 await ownRabbitAtPage4(page);
 await prepare(page);
 await expect(page.getByTestId('picturebook-blocked')).toContainText('새 작품 만들기를 막아 두었어요');
 await expect(page.locator('main > footer').getByRole('button',{name:'놀스토리로 보내기',exact:true})).toBeDisabled();
 // No KnolStory on this device yet: there is nothing to put the pages into either.
 await expect(page.getByRole('radio',{name:/쓰던 놀스토리에 넣기/})).toBeDisabled();
 const blocked=await page.context().newPage();
 await account(blocked,{me:'error'});
 await blocked.goto('/shortstory');
 await expect(blocked.getByRole('button',{name:'놀스토리로 보내기',exact:true})).toBeDisabled();
 expect(await workspace(blocked)).toBeNull();
});
