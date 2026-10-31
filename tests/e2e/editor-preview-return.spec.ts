import {test,expect,type Page} from '@playwright/test';
import {enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';

/** Editor playback differs from story reading: the way back to editing stays visible outside the reader menu. */
const sizes=[{width:1440,height:900},{width:390,height:844},{width:844,height:390}] as const;
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());});
async function previewFromEditor(page:Page){
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨',{timeout:60000});
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'읽기 메뉴',exact:true})).toBeVisible({timeout:30000});
}
for(const size of sizes)test(`editor playback keeps a visible way back to editing ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await previewFromEditor(page);
 const back=page.getByRole('button',{name:'편집으로 돌아가기',exact:true}),menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});
 await expect(back).toBeVisible();
 const [box,trigger]=await Promise.all([back.boundingBox(),menu.boundingBox()]);
 expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width);
 expect(box!.x+box!.width<=trigger!.x||box!.y+box!.height<=trigger!.y,'does not cover the reader menu').toBe(true);
 await page.screenshot({path:info.outputPath('editor-playback.png')});
 await back.click();
 await expect(page.getByRole('button',{name:'이 컷부터 재생',exact:true}).first()).toBeVisible();await expect(back).toHaveCount(0);
});
test('the way back to editing works from the keyboard while the runtime is unavailable',async({page})=>{
 await page.route('**/runtime/index.html',route=>route.fulfill({status:503,body:'Unavailable'}));
 await previewFromEditor(page);
 const back=page.getByRole('button',{name:'편집으로 돌아가기',exact:true});
 await expect(back).toBeEnabled();await back.focus();await expect(back).toBeFocused();await back.press('Enter');
 await expect(page.getByRole('button',{name:'이 컷부터 재생',exact:true}).first()).toBeVisible();
});
test('story reading from the library has no editing return',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,'seonnyeo','original','start');await beginSelectedBook(page);
 const menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});await expect(menu).toBeVisible({timeout:30000});
 await expect(page.getByRole('button',{name:'편집으로 돌아가기',exact:true})).toHaveCount(0);
 await menu.click();await expect(page.getByRole('group',{name:'읽기 메뉴',exact:true}).getByRole('button',{name:'이 컷 편집하기',exact:true})).toHaveCount(0);
});
