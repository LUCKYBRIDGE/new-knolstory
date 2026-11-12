import {test,expect} from '@playwright/test';
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`compact header and bordered actions leave room for editing ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.goto('/?view=editor');await expect(page.getByLabel('1컷 글',{exact:true})).toBeVisible();
 const stage=page.getByTestId('story-stage-viewport');const top=(await stage.boundingBox())!.y;expect(top).toBeLessThan(size.width>1000?150:240);
 const settings=page.locator('[data-work-menu]>summary');expect(await settings.evaluate(node=>{const style=getComputedStyle(node);return parseFloat(style.borderTopWidth)>0&&style.borderTopStyle!=='none'&&style.borderTopColor!=='rgba(0, 0, 0, 0)';})).toBe(true);
 const next=page.getByRole('button',{name:/^다음 컷/}),previous=page.getByRole('button',{name:/^이전 컷/});await expect(next).toBeVisible();await expect(page.getByText('이전 컷이 없어요.',{exact:true})).toBeVisible();await expect(previous).toHaveCount(0);
 const position=page.getByLabel('현재 장과 컷 이동'),ids=await position.locator('option').evaluateAll(options=>options.map(node=>(node as HTMLOptionElement).value));await next.click();await expect(position).toHaveValue(ids[1]);await expect(previous).toBeVisible();
 const box=(await stage.boundingBox())!,left=(await previous.boundingBox())!,right=(await next.boundingBox())!;
 if(size.width===1440||size.width===844){expect(left.x+left.width).toBeLessThanOrEqual(box.x+1);expect(right.x).toBeGreaterThanOrEqual(box.x+box.width-1);}else{expect(left.y+left.height).toBeLessThanOrEqual(box.y+1);expect(right.y).toBeGreaterThanOrEqual(box.y+box.height-1);}
 await previous.click();await expect(position).toHaveValue(ids[0]);
 const text=page.getByLabel('1컷 글',{exact:true});await text.dispatchEvent('compositionstart');await expect(next).toBeDisabled();await text.dispatchEvent('compositionend');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`compact-editor-${size.width}.png`),fullPage:true});
});
test('next-cut card stays inside the chapter, offers a new cut at its end and protects failed saves',async({page})=>{
 await page.goto('/?view=editor');const position=page.getByLabel('현재 장과 컷 이동');const boundary=await position.locator('optgroup').evaluateAll(groups=>({last:(groups[0].lastElementChild as HTMLOptionElement).value,next:(groups[1].firstElementChild as HTMLOptionElement).value}));
 await position.selectOption(boundary.last);await expect(page.getByRole('button',{name:/^다음 컷/})).toHaveCount(0);await expect(page.getByRole('button',{name:/^\+ 다음 컷 만들기/})).toBeVisible();await expect(position).toHaveValue(boundary.last);
 const ids=await position.locator('option').evaluateAll(options=>options.map(node=>(node as HTMLOptionElement).value));await position.selectOption(ids[0]);
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});await page.getByRole('textbox',{name:'1컷 글',exact:true}).fill('저장 실패 때 이동하지 않을 글');await page.getByRole('button',{name:/^다음 컷/}).click();await expect(position).toHaveValue(ids[0]);await expect(page.getByTestId('save-status')).toContainText('임시 보관 실패');
});
