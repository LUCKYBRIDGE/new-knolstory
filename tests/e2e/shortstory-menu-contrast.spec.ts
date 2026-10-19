import {test,expect} from '@playwright/test';
import {renderedTextContrast} from './rendered-contrast';
for(const width of [390,1280])test(`ShortStory account and online popup text retains contrast against parent styles ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('/auth/config'))return route.fulfill({json:{success:true,data:{signupProvider:'kakao',providers:{kakao:false,google:false}}}});if(path.endsWith('/me'))return route.fulfill({json:{success:true,data:{accountId:'11111111-1111-4111-8111-111111111111',csrf:'test'}}});return route.fulfill({json:{success:true,data:{documents:[],nextCursor:null}}});});
 await page.goto('/shortstory');const before=await page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true}).inputValue();
 for(const [key,name] of [['account-menu','놀스토리 계정'],['online-works','온라인 작품']] as const){
  await page.locator(`[data-${key}]>summary`).click();const panel=page.getByRole('region',{name,exact:true});
  const paragraph=panel.locator('p').first();await paragraph.scrollIntoViewIfNeeded();
  const result=await renderedTextContrast(paragraph,info.outputPath(`${key}-paragraph`));expect(result.minimum,JSON.stringify(result)).toBeGreaterThanOrEqual(4.5);
  if(key==='online-works'){
   const selected=panel.getByRole('button',{name:'업로드한 작품',exact:true});await selected.scrollIntoViewIfNeeded();const selectedResult=await renderedTextContrast(selected,info.outputPath('active-online-tab'));expect(selectedResult.minimum,JSON.stringify(selectedResult)).toBeGreaterThanOrEqual(4.5);
  }
  await page.keyboard.press('Escape');
 }
 await expect(page.getByRole('textbox',{name:'이 쪽의 이야기',exact:true})).toHaveValue(before);await page.locator('[data-online-works]>summary').click();await page.screenshot({path:info.outputPath('readable-online-panel.png'),fullPage:true});
});
