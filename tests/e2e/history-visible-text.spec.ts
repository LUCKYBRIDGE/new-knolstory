import {test,expect,type Page} from '@playwright/test';
const unreadSentence='아직 읽지 않은 마지막 문장입니다_숨김확인';
const manuscript=Array.from({length:26},(_,i)=>`${i+1}번째 문장. 토끼🐇와 친구는 바닷가에서 이야기를 나누었어요.\n`).join('')+unreadSentence;
async function rendered(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-scene-revision');return revision!==null&&revision===await status.getAttribute('data-rendered-revision');},{timeout:120000}).toBe(true);return status;}
async function history(page:Page){await page.getByRole('button',{name:'지난기록',exact:true}).click();return page.getByRole('dialog');}
test('native history includes the displayed page but never later pages of the current cut',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-current-cut] textarea').first().fill(manuscript);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=await page.evaluate(()=>localStorage.getItem('knolstory-next-workspace-v1'));
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await rendered(page),frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 const first=JSON.parse((await status.getAttribute('data-dialogue-page'))!);expect(first.index).toBe(0);expect(first.count).toBeGreaterThan(2);
 let dialog=await history(page);await expect(dialog).not.toContainText(unreadSentence);
 expect(first.endOffset).toBeGreaterThan(0);expect(first.endOffset).toBeLessThan(Array.from(manuscript).length);
 await expect(dialog.locator('ol li').last()).toContainText(Array.from(manuscript).slice(0,first.endOffset).join(''));
 await page.screenshot({path:info.outputPath('first-page-history.png')});await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 const next=page.getByRole('button',{name:'다음으로',exact:true});await expect(next).toBeEnabled();await next.focus();await next.press('Enter');
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).index).toBe(1);
 const second=JSON.parse((await status.getAttribute('data-dialogue-page'))!);expect(second.endOffset).toBeGreaterThan(first.endOffset);
 dialog=await history(page);await expect(dialog).not.toContainText(unreadSentence);await expect(dialog.locator('ol li').last()).toContainText(Array.from(manuscript).slice(0,second.endOffset).join(''));
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.getByRole('button',{name:'빠른 저장',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'빠른 저장 완료'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect(status).toHaveAttribute('data-engine-width','720');await rendered(page);const resized=JSON.parse((await status.getAttribute('data-dialogue-page'))!);
 dialog=await history(page);await expect(dialog).not.toContainText(unreadSentence);await expect(dialog.locator('ol li').last()).toContainText(Array.from(manuscript).slice(0,resized.endOffset).join(''));
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'빠른 불러오기',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'확인',exact:true}).click();await rendered(page);
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).offset).toBe(second.offset);
 const restored=JSON.parse((await status.getAttribute('data-dialogue-page'))!);dialog=await history(page);await expect(dialog).not.toContainText(unreadSentence);await expect(dialog.locator('ol li').last()).toContainText(Array.from(manuscript).slice(0,restored.endOffset).join(''));
 await dialog.getByRole('button',{name:'이 지점부터 다시 읽기',exact:true}).last().click();await page.getByRole('dialog').getByRole('button',{name:'확인',exact:true}).click();await rendered(page);
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-dialogue-page'))!).index).toBe(0);dialog=await history(page);await expect(dialog).not.toContainText(unreadSentence);await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 // Reading and backlog display must never alter authored content.
 expect(await page.evaluate(raw=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.lines[0].text===JSON.parse(raw!).document.project.lines[0].text,original)).toBe(true);
});
