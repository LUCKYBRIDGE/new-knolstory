import {test,expect,type Page} from '@playwright/test';
import {openEditingScreen,openChoiceEditing} from './editor-screens';
import {currentCutText,currentCutRow} from './authoring-file';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
/** Wide layouts keep the memo list beside the cut; stacked ones fold it inside "현재 컷 메모·연결 정보". Returns the memo list once its summary is visible. */
async function relatedMemos(page:Page){
 const related=page.locator('[data-related-memos]').first(),summary=related.locator(':scope>summary');
 if(!await summary.isVisible()){const folded=page.locator('details').filter({has:page.locator(':scope>summary',{hasText:'현재 컷 메모·연결 정보'})}).first();if(!await folded.evaluate(node=>(node as HTMLDetailsElement).open))await folded.locator(':scope>summary').click();}
 return related;
}
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`writing starts with current text and brief neighbours ${size.width}`,async({page},info)=>{
 await suppressFullscreenOffer(page);await page.setViewportSize(size);await page.goto('/?view=editor');
 const position=page.getByLabel('현재 장과 컷 이동',{exact:true}),text=page.getByLabel('1컷 글',{exact:true});await expect(text).toBeVisible();
 // Only the always-on screens are offered; sound, direction, character and choice tools stay closed until switched on in the settings menu.
 await page.locator('[data-work-menu]>summary').click();await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true}).locator('option')).toHaveText(['기본편집','글 편집','배경 편집']);await page.locator('[data-work-menu]>summary').click();
 await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen','basic');
 await expect(page.getByRole('button',{name:'+ 여기서 이야기 나누기',exact:true})).toBeVisible();await expect(page.getByText('현재 컷의 선택지·분기조건 편집',{exact:true})).toHaveCount(0);
 await expect(page.locator('summary').filter({hasText:/컷 (음향|연출) 수정$/})).toHaveCount(0);
 // The short landscape arrangement only offers the cut's own memo with "메모 수정"; the full list is beside or below the cut elsewhere.
 const related=await relatedMemos(page);if(await related.locator(':scope>summary').isVisible())await expect(related.locator(':scope>summary')).toBeVisible();else await expect(page.getByRole('region',{name:'현재 컷 메모·연결 정보',exact:true}).getByRole('button',{name:'메모 수정',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/^다음 컷/}).click();const nextId=await position.inputValue(),field=await currentCutText(page),original=await field.inputValue();await expect(page.getByRole('button',{name:/^이전 컷/})).toBeVisible();await expect(page.getByRole('button',{name:/^다음 컷/})).toBeVisible();
 await field.fill(original+'\n글쓰기 중심 확인');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(position).toHaveValue(nextId);await expect(await currentCutText(page)).toHaveValue(original+'\n글쓰기 중심 확인');
 // The whole-chapter writing screen shows the edited cut and returns to the same text.
 await openEditingScreen(page,'글 편집');await expect(page.locator('[data-screen="text"]')).toBeVisible();await expect(page.locator(`[data-screen="text"] textarea[data-cut-id="${nextId}"]`)).toHaveValue(original+'\n글쓰기 중심 확인');
 await openEditingScreen(page,'기본편집');await expect(page.locator('[data-screen="basic"]')).toBeVisible();await expect(position).toHaveValue(nextId);await expect(await currentCutText(page)).toHaveValue(original+'\n글쓰기 중심 확인');
 // Background display tuning is folded until asked for.
 await openEditingScreen(page,'배경 편집');const row=await currentCutRow(page),fit=row.getByRole('combobox',{name:/컷 배경 표시$/});await expect(fit).toBeHidden();await row.locator('summary').filter({hasText:/컷 배경 표시 조정$/}).click();await expect(fit).toBeVisible();
 await openEditingScreen(page,'기본편집');const choice=await openChoiceEditing(page);await expect(choice.getByLabel('진행 방식',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(async()=>{const status=page.getByTestId('story-runtime-status');return Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);await expect(page.getByRole('button',{name:/위치 편집$/})).toHaveCount(0);await page.screenshot({path:info.outputPath(`writing-${size.width}.png`),fullPage:true});
});
test('empty memo entry creates a cut memo and returns to the same text',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const id=await page.getByLabel('현재 장과 컷 이동').inputValue(),text=await currentCutText(page),original=await text.inputValue();
 let related=await relatedMemos(page);await related.locator(':scope>summary').click();await related.getByRole('button',{name:'창작 메모 관리',exact:true}).click();await expect(page.getByRole('button',{name:'작품 메모 추가',exact:true})).toBeFocused();await page.getByRole('button',{name:'현재 컷 메모 추가',exact:true}).click();await page.getByLabel('메모 1 제목',{exact:true}).fill('쓰다가 떠오른 생각');await page.getByLabel('메모 1 메모 내용',{exact:true}).fill('다음 대사에서 약속을 떠올린다.');await page.getByRole('button',{name:'메모를 두고 현재 컷 편집으로 돌아가기'}).click();await expect(page.getByLabel('현재 장과 컷 이동')).toHaveValue(id);await expect(text).toHaveValue(original);related=await relatedMemos(page);await related.locator(':scope>summary').click();await expect(related).toContainText('다음 대사에서 약속을 떠올린다.');await text.fill(original+'\n메모를 보며 쓴 문장');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
});
