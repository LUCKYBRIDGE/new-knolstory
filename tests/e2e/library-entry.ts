import {confirmAuthoringImport} from './authoring-file';
import {expect,type Page} from '@playwright/test';
/** Match the stable title/action prefix while retaining the visible cover text. */
export function shelfCoverButton(scope:Pick<Page,'getByRole'>,title:string){
 const escaped=title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return scope.getByRole('button',{name:new RegExp(`^${escaped} 책 표지와 소개 보기(?: ·|$)`)});
}
/** Exercise actual first-visit introduction when a test needs the library. */
export async function enterLibrary(page:Page){
 await expect.poll(async()=>await page.getByRole('main',{name:'놀스토리 서재',exact:true}).isVisible()||await page.getByRole('button',{name:'서재로 가기',exact:true}).isEnabled().catch(()=>false)).toBe(true);
 if(await page.getByRole('main',{name:'책 소개',exact:true}).isVisible())await page.getByRole('button',{name:'서재로 가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();
}
/**
 * Reading chosen on the shelf opens the story directly. The title page (책 표지와 소개) only greets readers
 * arriving from the home screen or an assignment; when it is showing, choose the reading action there.
 */
export async function beginSelectedBook(page:Page,resume=false){
 const start=page.getByRole('main',{name:'책 표지와 소개',exact:true}),reader=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>await start.isVisible()||await reader.count()>0,{timeout:30000}).toBe(true);
 if(await start.isVisible())await start.getByRole('button',{name:resume?'이어읽기':'처음부터 읽기',exact:true}).click();
}
/** Leave a story opened from the shelf through its reading menu, keeping the reading place when asked. */
export async function leaveReading(page:Page){
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 const confirm=page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true});
 await expect(confirm.or(page.getByRole('main',{name:'놀스토리 서재',exact:true}))).toBeVisible();
 if(await confirm.isVisible())await confirm.getByRole('button',{name:'보관하고 서재로',exact:true}).click();
 await expect(page.getByRole('main',{name:'놀스토리 서재',exact:true})).toBeVisible();
}
/** The book dialog keeps making and managing the book behind ‘더보기’. */
export async function openBookMore(dialog:import('@playwright/test').Locator){
 const more=dialog.locator('details').filter({has:dialog.page().locator('summary',{hasText:'더보기'})});
 if(!await more.count())return;
 if(!await more.evaluate(node=>(node as HTMLDetailsElement).open))await more.locator('summary').click();
}
const moreAction:Record<string,string>={'작품 준비':'작품 정보·기획','파일로 보관':'작품 파일 내보내기','작품 파일 내보내기':'작품 파일 내보내기','책 표지 편집':'책 표지 편집','작품 정보·기획':'작품 정보·기획','사본 만들기':'사본 만들기','이 기기에서 삭제':'이 기기에서 삭제'};
/** Books expose their actions only after selection, as in the legacy shelf. Built-in books use their 원작 edition. */
export async function openShelfAction(page:Page,book:import('@playwright/test').Locator,intent:string){
 await book.getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();
 const dialog=page.getByRole('dialog');
 const builtin=!!await book.getAttribute('data-work-id');
 if(builtin)await dialog.getByRole('radio',{name:'원작',exact:true}).check();
 if(intent==='처음부터 읽기'||intent==='이어읽기'){await readFromDialog(dialog,builtin?'원작':'',intent==='이어읽기');return;}
 if(intent==='편집하기'&&!builtin){await dialog.getByRole('button',{name:'편집하기',exact:true}).click();return;}
 await openBookMore(dialog);
 await dialog.getByRole('button',{name:intent==='편집하기'?'내 사본으로 편집':moreAction[intent]??intent,exact:true}).click();
}
/** The one reading action: ‘이어읽기’ when there is a saved place (with ‘처음부터 읽기’ beneath), otherwise ‘읽기’. */
async function readFromDialog(dialog:import('@playwright/test').Locator,edition:string,resume:boolean){
 const prefix=edition?`${edition} `:'';
 if(resume){await dialog.getByRole('button',{name:`${prefix}이어읽기`,exact:true}).click();return;}
 const restart=dialog.getByRole('button',{name:'처음부터 읽기',exact:true});
 await (await restart.isVisible()?restart:dialog.getByRole('button',{name:`${prefix}읽기`,exact:true})).click();
}

export async function openLibraryTools(page:Page,id='library-tools'){
 const tools=page.getByTestId(id);
 if(await tools.isVisible()&&!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator('summary').click();
}
export async function importShelfFile(page:Page,...args:Parameters<import('@playwright/test').Locator['setInputFiles']>){
 await openLibraryTools(page,'library-create');await page.getByLabel('서재 작품 파일 가져오기',{exact:true}).setInputFiles(...args);await confirmAuthoringImport(page);
}
export async function startShelfCreation(page:Page){
 await openLibraryTools(page,'library-create');
}
export async function selectShelfCollection(page:Page,kind:string){await openLibraryTools(page);await page.getByLabel('책 분류',{exact:true}).selectOption(kind==='original'||kind==='example'?'builtin':kind==='imported'?'own':kind);}
export async function fillShelfSearch(page:Page,query:string){await openLibraryTools(page);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).fill(query);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).press('Enter');}

export const builtinEditions = (['seonnyeo','heungbu','onggojib','rabbit'] as const).flatMap(id=>[[id,'original'],[id,'knolstory']] as const);
export function builtinShelfCard(page:Page,workId:string){return page.locator(`article[data-work-id="${workId}"]`);}
export async function openBuiltinEdition(page:Page,workId:string,edition:'original'|'knolstory',intent:'start'|'resume'|'edit'|'prepare'|'cover'|'export'='start'){
 await builtinShelfCard(page,workId).getByRole('button',{name:/ 책 표지와 소개 보기(?: ·|$)/}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toHaveAttribute('data-work-id',workId);
 const label=edition==='original'?'원작':'놀스토리';await dialog.getByRole('radio',{name:label,exact:true}).check();
 if(intent==='start'||intent==='resume'){await readFromDialog(dialog,label,intent==='resume');return;}
 await openBookMore(dialog);
 await dialog.getByRole('button',{name:({edit:'내 사본으로 편집',prepare:'작품 정보·기획',cover:'책 표지 편집',export:'작품 파일 내보내기'} as const)[intent],exact:true}).click();
}
