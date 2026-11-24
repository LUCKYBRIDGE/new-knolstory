import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,startShelfCreation} from './library-entry';
import {openEditingScreen} from './editor-screens';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';

const title='작은 화면에서도 끝까지 읽을 수 있는 긴 한국어 작품 제목과 창작 이야기';
const manuscript='우리는 서로의 이야기를 끝까지 듣고, 작은 화면에서도 줄바꿈과 문단을 그대로 지키기로 했다.\n이 문단은 저장하고 화면을 돌려도 그대로 남아야 한다.';
const sizes=[{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390}];
async function noOverflow(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
async function create(page:Page){
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목').fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
const writer=(page:Page)=>page.locator('[data-screen="text"]');
for(const size of sizes)test(`editor writing and preparation stay compact and preserve Korean input at ${size.width}x${size.height}`,async({page},testInfo)=>{
 page.setDefaultTimeout(15000);await suppressFullscreenOffer(page);await page.setViewportSize(size);await create(page);
 // Whole-chapter writing is the 원고 screen of the settings menu's 편집화면 선택.
 await openEditingScreen(page,'원고');
 await expect(writer(page)).toBeVisible();await writer(page).getByLabel('1컷 글',{exact:true}).fill(manuscript);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await noOverflow(page);
 const writerPadding=await writer(page).locator('article').first().evaluate(node=>parseFloat(getComputedStyle(node).paddingLeft));
 expect(writerPadding).toBeLessThanOrEqual(16);// The screen itself is unpadded; each cut row keeps 16px of framing (4px scale).
 // Keep real touch targets while reducing the framing around the manuscript.
 const editCut=writer(page).getByRole('button',{name:/· 이 컷 선택$/}).first();await editCut.scrollIntoViewIfNeeded();
 // Visible 36px, with a transparent 44px touch area (DESIGN 집중 편집 규칙 6).
 expect((await editCut.boundingBox())!.height).toBeGreaterThanOrEqual(30);expect(await editCut.evaluate(el=>parseFloat(getComputedStyle(el,'::after').height))).toBeGreaterThanOrEqual(44);
 const management=page.locator('[data-work-menu]>summary');
 if(await management.isVisible()&&!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 await page.getByRole('button',{name:'작품 정보·표지',exact:true}).click();
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});
 const info=preparation.locator('section').filter({has:page.getByRole('heading',{name:'작품 정보',exact:true})});
 expect(await info.evaluate(node=>parseFloat(getComputedStyle(node).paddingLeft))).toBeLessThanOrEqual(12);
 // Short information forms should not stretch to the longer planning column.
 const panelBounds=(await info.boundingBox())!,lastControl=(await info.locator(':scope > details').last().boundingBox())!;
 expect(panelBounds.y+panelBounds.height-lastControl.y-lastControl.height).toBeLessThanOrEqual(14);
 await page.getByLabel('작품 설정 항목').selectOption('planning');await preparation.getByLabel('핵심 아이디어',{exact:true}).fill(manuscript);
 await page.getByTestId('preparation-save-status').waitFor();
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');await noOverflow(page);
 await page.screenshot({path:testInfo.outputPath('preparation.png'),fullPage:true});
 await preparation.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();await openEditingScreen(page,'원고');
 await expect(writer(page).getByLabel('1컷 글',{exact:true})).toHaveValue(manuscript);
 await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await openEditingScreen(page,'원고');await expect(writer(page).getByLabel('1컷 글',{exact:true})).toHaveValue(manuscript);await noOverflow(page);
 await page.screenshot({path:testInfo.outputPath('writer.png'),fullPage:true});
});
