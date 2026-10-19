import {test,expect} from '@playwright/test';
import {builtinShelfCard,openShelfAction} from './library-entry';

const workspaceKey='knolstory-next-workspace-v1';
const visitKey='knolstory-landing-visit-v1';

test('introduction waits for a choice and stays open across reloads and new navigation',async({page})=>{
 await page.goto('/');
 const intro=page.getByRole('main',{name:'책 소개',exact:true});
 await expect(intro).toBeVisible();
 await expect(intro.getByRole('button',{name:'서재로 가기',exact:true})).toBeEnabled();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.view,workspaceKey)).toBe('home');
 // Allow hydration and autosave to settle without choosing a destination.
 await page.waitForTimeout(1500);
 await expect(intro).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),visitKey)).toBeNull();
 await intro.getByRole('button',{name:'다른 이야기 표지로 바꾸기',exact:true}).click();
 await expect(intro).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),visitKey)).toBeNull();
 await page.reload();await expect(intro).toBeVisible();
 await page.goto('/');await expect(intro).toBeVisible();
 await intro.getByRole('button',{name:'서재로 가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.visited,visitKey)).toBe(true);
 await page.goto('/');await expect(intro).toBeVisible();
 await page.goto('/');await expect(intro).toBeVisible();
 await intro.getByRole('button',{name:'이야기 읽기',exact:true}).click();
 await expect(page.getByRole('main',{name:'책 표지와 소개',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'서재로',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await openShelfAction(page,builtinShelfCard(page,'seonnyeo'),'작품 준비');
 await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toBeVisible();
 await page.goto('/');await expect(intro).toBeVisible();
 await page.goto('/shortstory/?work=seonnyeo&mode=read');
 await page.getByRole('link',{name:'놀스토리 서재로 돌아가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'책 소개',exact:true}).click();await expect(intro).toBeVisible();
 await page.reload();await expect(intro).toBeVisible();
});

test('my works leaves introduction only after an explicit choice',async({page})=>{
 await page.goto('/');
 const intro=page.getByRole('main',{name:'책 소개',exact:true});await expect(intro).toBeVisible();
 await intro.getByRole('button',{name:'내 작품 보기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('own');
 await page.reload();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
});

test('a corrupt workspace stays intact while introduction waits for explicit navigation',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('knolstory-next-workspace-v1','{invalid workspace');
  localStorage.setItem('knolstory-landing-visit-v1','{invalid preference');
  localStorage.setItem('storygame-legacy','preserved');
 });
 await page.goto('/');
 const intro=page.getByRole('main',{name:'책 소개',exact:true});await expect(intro).toBeVisible();
 await expect(intro.getByRole('status')).toContainText('원본을 유지');
 await page.waitForTimeout(300);await expect(intro).toBeVisible();
 expect(await page.evaluate(()=>({workspace:localStorage.getItem('knolstory-next-workspace-v1'),preference:localStorage.getItem('knolstory-landing-visit-v1'),legacy:localStorage.getItem('storygame-legacy')}))).toEqual({workspace:'{invalid workspace',preference:'{invalid preference',legacy:'preserved'});
});

test('explicit ShortStory library return is consumed so later preparation survives reload',async({page})=>{
 await page.goto('/shortstory/?work=rabbit&mode=read');const back=page.getByRole('link',{name:'놀스토리 서재로 돌아가기',exact:true});await expect(back).toHaveAttribute('href','/?view=library');await back.click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 await openShelfAction(page,builtinShelfCard(page,'rabbit'),'작품 준비');await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null')?.view,workspaceKey)).toBe('prepare');await page.reload();await expect(page.getByRole('region',{name:'작품 설정',exact:true})).toBeVisible();
});
