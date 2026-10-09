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
 const dialog=page.getByRole('dialog');
 if(await book.getAttribute('data-work-id')){if(intent==='처음부터 읽기'||intent==='이어읽기'){await dialog.getByRole('button',{name:`원작 ${intent==='처음부터 읽기'?'읽기':'이어읽기'}`,exact:true}).click();return;}await dialog.getByLabel('바탕 판본',{exact:true}).selectOption('original');}
 if(intent==='작품 준비'||intent==='책 표지 편집'||intent==='파일로 보관')await dialog.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();
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
export async function selectShelfCollection(page:Page,kind:string){await page.getByLabel('책 분류',{exact:true}).selectOption(kind==='original'||kind==='example'?'builtin':kind);}
export async function fillShelfSearch(page:Page,query:string){await openLibraryTools(page);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).fill(query);await page.getByRole('searchbox',{name:'책 찾기',exact:true}).press('Enter');}

export const builtinEditions = (['seonnyeo','heungbu','onggojib','rabbit'] as const).flatMap(id=>[[id,'original'],[id,'knolstory']] as const);
export function builtinShelfCard(page:Page,workId:string){return page.locator(`article[data-work-id="${workId}"]`);}
export async function openBuiltinEdition(page:Page,workId:string,edition:'original'|'knolstory',intent:'start'|'resume'|'edit'|'prepare'|'cover'|'export'='start'){
 await builtinShelfCard(page,workId).getByRole('button',{name:/책 표지와 소개 보기$/}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toHaveAttribute('data-work-id',workId);
 if(intent==='start'||intent==='resume'){await dialog.getByRole('button',{name:`${edition==='original'?'원작':'놀스토리'} ${intent==='start'?'읽기':'이어읽기'}`,exact:true}).click();return;}
 await dialog.getByLabel('바탕 판본',{exact:true}).selectOption(edition);
 if(intent!=='edit')await dialog.locator('summary').filter({hasText:'책 꾸미기·작품 도구'}).click();
 await dialog.getByRole('button',{name:({edit:'편집하기',prepare:'작품 준비',cover:'책 표지 편집',export:'파일로 보관'} as const)[intent],exact:true}).click();
}
