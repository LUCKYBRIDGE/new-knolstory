import {expect,type Page} from '@playwright/test';

/** Use the reader's keyboard/semantic control without clicking clipped visual text. */
export async function previousReadCut(page:Page){
 const button=page.getByRole('button',{name:'이전 읽은 컷',exact:true});
 await expect(button).toBeEnabled();
 await button.focus();
 await page.keyboard.press('Enter');
}
/**
 * Where to touch choice `index` (of `count`) inside the native stage, in page pixels.
 * The choice panel now opens with a heading (‘이야기의 갈림길 · 어떻게 할까요?’), so buttons are counted up from the
 * panel's bottom edge: 24 scene px padding, 96 px buttons, 12 px gaps.
 */
export async function nativeChoicePoint(page:Page,index:number,count:number){
 const frame=page.getByTestId('story-runtime-frame'),status=page.getByTestId('story-runtime-status');
 const bounds=(await frame.boundingBox())!;
 const rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number}|null;
 if(!rect)throw new Error('The native stage reported no choice panel.');
 const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height);
 const centre=rect.y+rect.height-24-(count-1-index)*108-48;
 return {x:bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,y:bounds.y+(bounds.height-height*scale)/2+centre*scale};
}
