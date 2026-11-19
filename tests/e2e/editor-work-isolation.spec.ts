import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
async function menu(page:Page){const m=page.locator('[data-work-menu]');if(!await m.evaluate(el=>(el as HTMLDetailsElement).open))await m.locator(':scope>summary').click();}
async function mode(page:Page){await menu(page);const settings=page.getByText('편집 설정',{exact:true});if(!await settings.locator('..').evaluate(el=>(el as HTMLDetailsElement).open))await settings.click();await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label:'연출 편집'});}
async function load(page:Page,id:string){await menu(page);const project=createBlankStoryProject({id,chapterId:'a',lineId:'shared',title:id});await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:`${id}.knolstory`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
test('same cut ids in independent works do not carry open direction details or draft values',async({page})=>{
 page.setDefaultTimeout(12000);await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await load(page,'first-work');await mode(page);await page.getByText('1컷 연출 수정',{exact:true}).click();await page.getByLabel('화면 전환',{exact:true}).selectOption('perspective-blackout');await page.getByRole('dialog',{name:'시점 전환',exact:true}).getByRole('button',{name:'사용',exact:true}).click();await page.getByText('전환에 표시할 글',{exact:true}).click();await page.getByLabel('전환 제목',{exact:true}).fill('첫 작품에서만 쓰는 제목');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await menu(page);await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label:'음향 편집'});await page.getByText('1컷 음향 수정',{exact:true}).click();await expect(page.getByTestId('editing-cut-shared').getByLabel('조정할 소리',{exact:true})).toBeVisible();await mode(page);await page.getByText('1컷 연출 수정',{exact:true}).click();await expect(page.getByTestId('editing-cut-shared').getByLabel('조정할 연출',{exact:true})).toBeVisible();
 const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await load(page,'second-work');await mode(page);
 const row=page.getByTestId('editing-cut-shared');await expect(row.getByLabel('조정할 연출',{exact:true})).toHaveCount(0);
 await row.getByText('1컷 연출 수정',{exact:true}).click();await expect(row.getByLabel('화면 전환',{exact:true})).toHaveValue('');
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));expect(data.document.project.lines[0].presentation).toBeUndefined();expect(data.works[`import:${first.id}`].project).toEqual(first);
});

test('the bookshelf continues writing at the saved personal cut, scoped to the same account',async({page})=>{
 const first='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 let account=first;
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.endsWith('/auth/config')?{signupProvider:'kakao',providers:{kakao:true,google:false}}
   :path.endsWith('/class/me')?{role:'member',account:{id:account}}
   :path.endsWith('/me')?{accountId:account,csrf:'csrf'}:{documents:[]};
  return route.fulfill({json:{success:true,data}});
 });
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await load(page,'나의 이어쓰기');
 await page.getByRole('button',{name:/^\+ 다음 컷 만들기/}).click();
 await page.getByLabel('2컷 글',{exact:true}).fill('두 번째 컷에서 이어 써요.');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const cut=await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();
 await page.goto('/?view=library');
 const recent=page.getByRole('region',{name:'최근 편집한 작품',exact:true});
 await expect(recent).toContainText('나의 이어쓰기');
 await expect(recent).toContainText('2컷');
 await recent.getByRole('button',{name:'이어서 쓰기',exact:true}).click();
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(cut);
 await expect(page.getByLabel('2컷 글',{exact:true})).toHaveValue('두 번째 컷에서 이어 써요.');
 await page.goto('/?view=library');
 await expect(recent).toBeVisible();
 account=other;
 await page.evaluate(()=>window.dispatchEvent(new Event('knolstory-account-session-changed')));
 await expect(recent).toHaveCount(0);
 await page.reload();
 await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await expect(recent).toHaveCount(0);
});
