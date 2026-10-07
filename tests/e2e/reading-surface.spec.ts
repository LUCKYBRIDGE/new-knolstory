import {test,expect} from '@playwright/test';

test('reading gives the stage full width and keeps an exit while runtime is preparing',async({page})=>{
 await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
 await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'장과 컷 목록'})).toBeHidden();
 await expect(page.getByRole('button',{name:'새 작품 만들기',exact:true})).toBeHidden();
 await expect(page.getByRole('button',{name:'이 장 대본',exact:true})).toBeHidden();
 const stage=await page.getByTestId('story-stage-viewport').boundingBox();expect(stage!.width).toBeGreaterThan(1150);
 await expect(page.getByRole('button',{name:'전체 화면',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'편집으로',exact:true}).click();
 await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});

test('current cut exposes outgoing destination and local chapter cut count',async({page})=>{
 await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
 await page.getByText('이 컷에서 나가는 연결 1개',{exact:true}).click({timeout:5000});
 const context=page.getByTestId('flow-context');await expect(context).toContainText('2번째 컷');
 await context.getByRole('button',{name:/→ .*2번째 컷/}).click();
 await expect(page.getByLabel('대사 / 해설',{exact:true})).toHaveValue('“막내야. 하늘길이 열린다고 제일 먼저 나서더니, 돌아갈 생각은 없니?”');
 await expect(page.getByText('2컷 / 이 장 15컷',{exact:true})).toBeVisible();
});

test('choice-created chapters receive branch identity immediately',async({page})=>{
 await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
 await page.getByRole('button',{name:'새 작품 만들기',exact:true}).click();await page.getByLabel('새 작품 제목').fill('갈래 자동 표시');await page.getByRole('button',{name:'빈 작품 시작',exact:true}).click();
 await page.getByLabel('진행 방식',{exact:true}).selectOption('choice');
 await page.getByRole('button',{name:'선택지 1에 새 장 연결',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'장과 컷 목록'})).toContainText('2장A');
});

test('landscape reading fits the complete runtime viewport above the screen edge',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 const bounds=await page.getByTestId('story-stage-viewport').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(390);expect(bounds!.height).toBeGreaterThan(240);
});

test('portrait reading keeps dialogue and choices inside the visible runtime area',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
 const bounds=await page.getByTestId('story-stage-viewport').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(844);expect(bounds!.height).toBeGreaterThan(500);
});
