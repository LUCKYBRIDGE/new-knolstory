import {expect,type Page} from '@playwright/test';
/** Exercise actual first-visit introduction when a test needs the library. */
export async function enterLibrary(page:Page){
 await expect.poll(async()=>await page.getByRole('main',{name:'로컬 서재',exact:true}).isVisible()||await page.getByRole('button',{name:'서재로 가기',exact:true}).isEnabled().catch(()=>false)).toBe(true);
 if(await page.getByRole('main',{name:'책 소개',exact:true}).isVisible())await page.getByRole('button',{name:'서재로 가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
}
export async function beginSelectedBook(page:Page,resume=false){
 await expect(page.getByRole('main',{name:'책 표지와 소개',exact:true})).toBeVisible();
 await page.getByRole('main',{name:'책 표지와 소개',exact:true}).getByRole('button',{name:resume?'이어읽기':'처음부터 읽기',exact:true}).click();
}

/** Books expose their actions only after selection, as in the legacy shelf. */
export async function openShelfAction(page:Page,book:import('@playwright/test').Locator,intent:string){
 await book.getByRole('button',{name:/책 표지와 소개 보기$/}).click();
 const dialog=page.getByRole('dialog');if(intent==='작품 준비'||intent==='책 표지 편집'||intent==='파일로 보관')await dialog.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();
 await dialog.getByRole('button',{name:intent,exact:true}).click();
}

export async function openLibraryTools(page:Page){
 const tools=page.getByTestId('library-tools');
 if(await tools.isVisible()&&!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator('summary').click();
}
export async function importShelfFile(page:Page,...args:Parameters<import('@playwright/test').Locator['setInputFiles']>){
 await openLibraryTools(page);await page.getByLabel('서재 작품 파일 가져오기',{exact:true}).setInputFiles(...args);
}
export async function startShelfCreation(page:Page){
 await openLibraryTools(page);await page.getByRole('button',{name:'새 작품 만들기',exact:true}).click();
}
export async function selectShelfCollection(page:Page,kind:string){await page.getByLabel('책 분류',{exact:true}).selectOption(kind);}
export async function fillShelfSearch(page:Page,query:string){await openLibraryTools(page);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).fill(query);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).press('Enter');}
