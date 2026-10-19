import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport} from './authoring-file';
import {enterLibrary,startShelfCreation} from './library-entry';

test.beforeEach(async({page})=>{page.setDefaultTimeout(10_000);});

async function checkGuide(page:import('@playwright/test').Page){
 const opener=page.getByRole('button',{name:'편집 용어 안내',exact:true});
 await opener.click();
 const dialog=page.getByRole('dialog',{name:'편집 용어 안내',exact:true});
 await expect(dialog).toBeVisible();
 const search=dialog.getByRole('searchbox',{name:'용어 검색',exact:true});
 await expect(search).toBeFocused();
 await search.fill('환경음');
 await expect(dialog.locator('dt')).toHaveCount(1);
 await expect(dialog.locator('dt')).toContainText('주변 소리');
 await dialog.getByLabel('분류',{exact:true}).selectOption('원고');
 await expect(dialog).toContainText('찾는 용어가 없어요');
 await dialog.getByRole('button',{name:'검색 초기화',exact:true}).click();
 await search.fill('0.23');
 await expect(dialog.locator('dt')).toContainText('시간(초)');
 await expect(dialog).toContainText('0.23초');
 await search.fill('지금 저장');await expect(dialog.locator('dt')).toContainText('임시 보관');await search.fill('소리 파일');await expect(dialog).toContainText('외부 파일은 업로드할 수 없어요');
 const close=dialog.getByRole('button',{name:'편집 용어 안내 닫기',exact:true});
 await close.focus();await page.keyboard.press('Shift+Tab');
 await expect(dialog.locator('summary').filter({hasText:'이전 이름·검색어'}).last()).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();
 await search.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
 await expect(search).toBeFocused();
 expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
}

test('guide preserves author drafts and restores focus in four viewport layouts',async({page})=>{
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목',{exact:true}).fill('용어 안내를 쓰는 작품');
 await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 if(!await page.getByRole('region',{name:'작품 설정',exact:true}).isVisible()){await page.locator('[data-work-menu]>summary').click();await page.getByRole('button',{name:'작품 정보·표지',exact:true}).click();}
 const title=page.getByRole('region',{name:'작품 설정',exact:true}).getByLabel('작품 제목',{exact:true});
 await title.fill('내가 쓴 긴 한국어 작품 제목을 유지합니다');
 for(const viewport of [{width:1280,height:800},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);await checkGuide(page);
  await expect(title).toHaveValue('내가 쓴 긴 한국어 작품 제목을 유지합니다');
 }
 await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();
 await checkGuide(page);
 await expect(page.getByRole('dialog',{name:'내 책 표지 꾸미기',exact:true})).toBeVisible();
});

test('ShortStory guide leaves edited page text untouched',async({page})=>{
 await page.goto('/shortstory');
 const body=page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});
 await body.fill('숏스토리의 문구와 자유 배치는 그대로 둡니다.');
 await checkGuide(page);
 await expect(body).toHaveValue('숏스토리의 문구와 자유 배치는 그대로 둡니다.');
});

test('current vocabulary distinguishes work files, browser recovery and optional companion views',async({page})=>{
 await page.goto('/shortstory');
 const body=page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true});
 await body.fill('용어를 찾아보는 동안 이 원고를 보존합니다.');
 await page.getByRole('button',{name:'편집 용어 안내',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'편집 용어 안내',exact:true});
 const search=dialog.getByRole('searchbox',{name:'용어 검색',exact:true});
 for(const term of ['기본편집','글 편집','배경 편집','인물 편집','음향 편집','연출 편집','함께 보기','작품 파일 저장','온라인 업로드','임시 보관','자동 저장','사본으로 열기','말하는 인물의 역할']){
  await search.fill(term);await expect(dialog.locator('dt').filter({hasText:term}).first()).toBeVisible();
 }
 await search.fill('Flow');
 await expect(dialog.locator('dt')).toContainText('이야기 진행');
 const aliases=dialog.locator('details').filter({has:page.locator('summary',{hasText:'이전 이름·검색어'})}).first();
 await expect(aliases).not.toHaveAttribute('open','');await aliases.locator('summary').click();await expect(aliases).toContainText('Flow');
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(body).toHaveValue('용어를 찾아보는 동안 이 원고를 보존합니다.');
});

test('authoring labels distinguish file save, temporary retention and earlier manuscripts',async({page})=>{
 await page.route('**/runtime/**',route=>route.abort());await page.route('**/api/**',route=>route.abort());
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 const project=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'small.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,savedAt:'2026-10-19T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 await expect(page.getByRole('button',{name:'작품 파일 저장',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'다른 파일로 저장',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'임시 보관',exact:true})).toBeVisible();
 await page.locator('summary').filter({hasText:/^이전 원고$/}).click();
 await expect(page.getByRole('button',{name:'현재 원고 보관',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'현재 원고 보관',exact:true}).click();
 await expect(page.getByRole('button',{name:'이 원고를 사본으로 열기',exact:true}).first()).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'))).toEqual(before);
});
