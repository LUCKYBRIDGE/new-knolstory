import {test,expect,type Page} from '@playwright/test';

/**
 * 숏스토리 한 쪽 → 놀스토리 한 장 (docs/architecture/picturebook-to-chapters-claude-handoff.md).
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

for(const width of [1280,390])test(`그림책 4쪽에서 4장을 열어 첫 대사를 쓰고 같은 컷으로 돌아온다 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width<500?844:860});
 await account(page);
 await ownRabbitAtPage4(page);
 const story=page.getByLabel('이 쪽의 이야기',{exact:true});
 await story.fill(`${await story.inputValue()} 토끼는 파도 소리에 귀를 쫑긋 세웠어요.`);
 await page.getByRole('button',{name:'놀스토리로 펼쳐 쓰기',exact:true}).click();
 await expect(page).toHaveURL(/\/picturebook\?book=/);
 await expect(page.getByTestId('picturebook-summary')).toContainText('8쪽 → 8장');
 await expect(page.getByTestId('picturebook-summary')).toContainText('지금 열 장: 4장');
 // The empty first stage is shown on the actual Ren’Py stage.
 await expect(page.getByTestId('picturebook-stage-status')).toHaveAttribute('data-rendered-revision',/^(?!-1$)\d+$/,{timeout:90_000});
 await page.getByRole('button',{name:'이대로 놀스토리 만들기',exact:true}).click();
 await expect(page).toHaveURL(/\/(\?.*)?$/);
 const reference=page.getByTestId('picturebook-chapter-reference').first();
 await expect(page.getByTestId('workspace-error')).toContainText('4장 첫 컷');
 const first=await workspace(page);
 const key=first.storyId as string,work=first.document.project;
 expect(key).toMatch(/^new:/);
 expect(work.chapters).toHaveLength(8);
 const chapter4=work.chapters[3];
 expect(chapter4.summary).toContain('토끼는 파도 소리에 귀를 쫑긋 세웠어요.');
 expect(work.lines.find((line:{id:string})=>line.id===first.lineId).chapterId).toBe(chapter4.id);
 expect(Object.values(first.picturebookLinks)).toHaveLength(1);
 if(width>=1000)await expect(reference).toContainText('토끼는 파도 소리에');
 // The student writes the first line of chapter 4.
 const offer=page.getByRole('button',{name:'지금은 그대로',exact:true});
 if(await offer.isVisible())await offer.click();
 const text=page.getByRole('textbox',{name:'1컷 글',exact:true});
 await text.fill('바다 한가운데서 토끼가 물었어요. “용궁은 아직 멀었나요?”');
 await expect.poll(async()=>(await workspace(page)).document.project.lines.find((line:{id:string})=>line.id===first.lineId).text,{timeout:10_000}).toContain('용궁은 아직');
 // Back to the picture book: the same book now opens the work being written, not a new one.
 await page.goto('/shortstory');
 await page.getByRole('button',{name:'쓰던 놀스토리 열기',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(/용궁은 아직 멀었나요/);
 const again=await workspace(page);
 expect(again.storyId).toBe(key);expect(again.lineId).toBe(first.lineId);
 expect(Object.keys(again.works).concat(again.storyId).filter((item:string)=>item.startsWith('new:'))).toHaveLength(1);
});

test('두 번 누르거나 두 탭에서 만들어도 놀스토리는 하나만 생긴다',async({page,context})=>{
 await account(page);
 await ownRabbitAtPage4(page);
 await page.getByRole('button',{name:'놀스토리로 펼쳐 쓰기',exact:true}).click();
 const bookUrl=page.url();
 const second=await context.newPage();await account(second);await second.goto(bookUrl);
 const create=page.getByRole('button',{name:'이대로 놀스토리 만들기',exact:true});
 await create.dblclick();
 await expect(page.getByTestId('workspace-error')).toContainText('첫 컷',{timeout:60_000});
 // The second tab still shows its own preparation; its request finds the work the first tab made.
 await second.getByRole('button',{name:'이대로 놀스토리 만들기',exact:true}).click();
 await expect(second.getByTestId('workspace-error')).toContainText('새로 만들지 않았어요',{timeout:60_000});
 const stored=await workspace(second);
 const own=[stored.storyId,...Object.keys(stored.works)].filter((item:string)=>item.startsWith('new:'));
 expect(new Set(own).size).toBe(1);
});

test('선생님이 새 작품 만들기를 막거나 계정 확인에 실패하면 만들지 않는다',async({page})=>{
 await account(page,{me:'student',permissions:{newWorks:false}});
 await ownRabbitAtPage4(page);
 await expect(page.getByRole('button',{name:'놀스토리로 펼쳐 쓰기',exact:true})).toBeDisabled();
 const blocked=await page.context().newPage();
 await account(blocked,{me:'error'});
 await blocked.goto('/shortstory');
 await expect(blocked.getByRole('button',{name:'놀스토리로 펼쳐 쓰기',exact:true})).toBeDisabled();
 expect(await workspace(blocked)).toBeNull();
});
