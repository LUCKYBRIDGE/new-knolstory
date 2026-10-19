import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

for(const viewport of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`nearby writing views keep cut text and cursor ${viewport.width}`,async({page},info)=>{
 await page.setViewportSize(viewport);await page.goto('/?view=editor');
 await page.locator('[data-writing-tools]>summary').click();const views=page.getByRole('group',{name:'글 편집 보기'});await expect(views).toBeVisible();
 const position=page.getByLabel('현재 장과 컷 이동'),id=await position.inputValue();
 const text=page.getByLabel('대사 / 해설',{exact:true});await text.fill('앞 이야기와 다음 이야기를 오가며 이 문장을 수정합니다.');
 await text.evaluate(node=>{(node as HTMLTextAreaElement).setSelectionRange(7,11);});
 await views.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();
 const manuscript=page.locator('[data-writer-current="true"] textarea[aria-label$="컷 대사 / 해설"]');await expect(manuscript).toHaveValue('앞 이야기와 다음 이야기를 오가며 이 문장을 수정합니다.');await expect(position).toHaveValue(id);
 await manuscript.fill('장 대본에서 고친 한국어와 줄바꿈\n그대로 유지합니다.');
 await views.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await expect(text).toHaveValue('장 대본에서 고친 한국어와 줄바꿈\n그대로 유지합니다.');await expect(text).toBeFocused();
 expect(await text.evaluate(node=>[(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd])).toEqual([7,11]);
 await text.dispatchEvent('compositionstart');await expect(views.getByRole('button',{name:'장 전체 글 고치기'})).toBeDisabled();await text.dispatchEvent('compositionend');
 await page.locator('[data-cut-notes] summary').click();await page.getByLabel('컷 작업 제목',{exact:true}).fill('긴 한국어 작업 제목을 읽고 편집하는 장면 '.repeat(5));
 const layout=await page.locator('[data-cut-notes]').evaluate(node=>{const fields=[...node.querySelectorAll('input,textarea')].map(el=>el.getBoundingClientRect());const rect=node.getBoundingClientRect();return fields.every((field,index)=>field.x>=rect.x&&field.right<=rect.right+1&&(index===0||field.top>=fields[index-1].bottom));});expect(layout).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(async()=>{const status=page.getByTestId('story-runtime-status');return Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);
 await page.screenshot({path:info.outputPath(`cut-notes-${viewport.width}.png`),fullPage:true});
});

test('cut notes edit in both views, save, export, reimport and return from native reading',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const id=await page.getByLabel('현재 장과 컷 이동').inputValue();
 const notes=page.locator('[data-cut-notes]');await expect(notes).not.toHaveAttribute('open','');await notes.locator('summary').click();
 const values={'컷 작업 제목':'길을 함께 찾는 장면','이 컷의 목적':'독자가 두 인물의 만남을 이해한다.','인물의 감정':'걱정과 안도\n둘 다 느낀다.','연출 메모':'인물이 가까워지지만\n자유 배치는 그대로 둔다.'};
 for(const [label,value] of Object.entries(values))await page.getByLabel(label,{exact:true}).fill(value);
 await page.locator('[data-writing-tools]').evaluate(node=>(node as HTMLDetailsElement).open=true);await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();await page.locator('[data-cut-notes] summary').click();await expect(page.getByLabel('연출 메모',{exact:true})).toHaveValue(values['연출 메모']);
 await page.getByLabel('인물의 감정',{exact:true}).fill('장 대본에서 수정한 안도감');await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await page.locator('[data-cut-notes] summary').click();await expect(page.getByLabel('인물의 감정',{exact:true})).toHaveValue('장 대본에서 수정한 안도감');
 await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const download=await pending;const raw=readFileSync((await download.path())!,'utf8'),saved=parseAuthoringFile(raw);
 const line=saved.project.lines.find((cut:{id:string})=>cut.id===id);expect(line).toMatchObject({workingTitle:values['컷 작업 제목'],purposeNote:values['이 컷의 목적'],emotionNote:'장 대본에서 수정한 안도감',directionNote:values['연출 메모']});
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'cut-notes.knolstory',mimeType:'application/json',buffer:Buffer.from(raw)});await confirmAuthoringImport(page);await page.getByLabel('현재 장과 컷 이동').selectOption(id);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await expect.poll(async()=>{const status=page.getByTestId('story-runtime-status');return Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await page.locator('[data-cut-notes] summary').click();await expect(page.getByLabel('컷 작업 제목',{exact:true})).toHaveValue(values['컷 작업 제목']);
});

test('failed storage keeps the author in the current writing view',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const original=await page.evaluateHandle(()=>Storage.prototype.setItem);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
 await page.getByLabel('대사 / 해설',{exact:true}).fill('저장 실패 때도 현재 글을 유지합니다.');
 await page.locator('[data-writing-tools]').evaluate(node=>(node as HTMLDetailsElement).open=true);await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();await expect(page.getByTestId('save-status')).toContainText('임시 보관 실패');await expect(page.getByRole('button',{name:'현재 컷 쓰기',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('저장 실패 때도 현재 글을 유지합니다.');
 await page.evaluate(fn=>{Storage.prototype.setItem=fn;},original);const text=page.getByLabel('대사 / 해설',{exact:true});await text.focus();await text.evaluate(node=>(node as HTMLTextAreaElement).setSelectionRange(1,4));await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await expect(text).toBeFocused();expect(await text.evaluate(node=>[(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd])).toEqual([1,4]);
});
