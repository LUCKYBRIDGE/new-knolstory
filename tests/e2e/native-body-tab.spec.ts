import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';

test('native BODY and canvas Tab return to semantic reading controls after audio unlock',async({page},info)=>{
 test.setTimeout(150000);
 await page.setViewportSize({width:475,height:194});
 await page.goto('/');await enterLibrary(page);
 await openBuiltinEdition(page,'seonnyeo','knolstory','start');await beginSelectedBook(page);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const authored=()=>page.evaluate(()=>{
  const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);
  return {project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([id,entry])=>[id,(entry as {project:unknown}).project]))};
 });
 const before=await authored();
  const status=page.getByTestId('story-runtime-status'),frame=page.getByTestId('story-runtime-frame');
 await expect.poll(async()=>{
  const rendered=await status.getAttribute('data-rendered-revision');
  return Number(rendered)>=0&&rendered===await status.getAttribute('data-scene-revision');
 },{timeout:120000}).toBe(true);
 const originalFrame=await frame.elementHandle();
 await page.frameLocator('[data-testid="story-runtime-frame"]').getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true}).press('Enter');
 await expect(status).toHaveAttribute('data-audio-unlocked','true');
 const mirror=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})});
 const summary=mirror.locator('summary'),menu=page.getByRole('button',{name:'읽기 메뉴',exact:true});
 const initialText=await mirror.locator('[aria-live="polite"]>p').last().innerText();
 const observations:unknown[]=[];
 for(const source of ['body','canvas'] as const){
  for(const key of ['Tab','Shift+Tab']){
   // A pointer/AX entry can leave the iframe focused with BODY as its active
   // element. Real focus and blur model that state without dispatching or
   // replacing keyboard events, handlers, native scene/audio, or runtime DOM.
   await frame.evaluate((node,source)=>{
    const canvas=(node as HTMLIFrameElement).contentDocument!.querySelector<HTMLCanvasElement>('#canvas')!;
    canvas.focus();
    if(source==='body')canvas.blur();
   },source);
   const prepared=await frame.evaluate(node=>({iframeFocused:document.activeElement===node,tag:(node as HTMLIFrameElement).contentDocument?.activeElement?.tagName,id:(node as HTMLIFrameElement).contentDocument?.activeElement?.id}));
   expect(prepared.iframeFocused).toBe(true);
   expect(prepared.tag).toBe(source==='body'?'BODY':'CANVAS');
   await page.keyboard.press(key);
   const target=key==='Tab'?summary:menu;
   await expect.soft(target,`${source} ${key} returns to the host reading control`).toBeFocused();
   observations.push({source,key,prepared,returned:await target.evaluate(node=>node===document.activeElement),focus:await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.slice(0,120)}))});
  }
 }
 await writeFile(info.outputPath('native-body-tab.json'),JSON.stringify({scope:'Actual local RenPy, trusted Enter unlock and Tab keys; BODY focus modeled by real canvas blur. CSS viewport emulates narrow geometry, not actual browser zoom or a screen reader.',observations,initialText,finalText:await mirror.locator('[aria-live="polite"]>p').last().innerText(),authoredPreserved:JSON.stringify(await authored())===JSON.stringify(before),iframePreserved:await originalFrame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))},null,2)+'\n');
 await expect(mirror.locator('[aria-live="polite"]>p').last()).toHaveText(initialText);
 expect(await authored()).toEqual(before);
 expect(await originalFrame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
});
