import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {openBuiltinEdition,beginSelectedBook} from './library-entry';

test('actual native reading retains menu focus and semantic advance at phone width',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:390,height:844});
 const wasmResponses:{path:string;status:number}[]=[];page.on('response',response=>{const path=new URL(response.url()).pathname;if(path.endsWith('.wasm'))wasmResponses.push({path,status:response.status()});});
 await page.goto('/?view=library');await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await openBuiltinEdition(page,'seonnyeo','original','start');await beginSelectedBook(page);
 const state=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{const rendered=await state.getAttribute('data-rendered-revision');return Number(rendered)>=0&&rendered===await state.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 const stageBox=(await page.getByTestId('story-runtime-frame').boundingBox())!;
 await page.mouse.click(stageBox.x+stageBox.width*.5,stageBox.y+stageBox.height*.1);
 await expect(state).toHaveAttribute('data-audio-unlocked','true');
 const authored=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!);return {project:value.document.project,works:Object.fromEntries(Object.entries(value.works).map(([id,entry])=>[id,(entry as {project:unknown}).project]))};});
 const before=await authored(),frame=await page.getByTestId('story-runtime-frame').elementHandle();
 const mirror=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})}),text=mirror.locator('[aria-live="polite"]>p').last();
 const initial=await text.innerText();expect(initial.trim()).not.toBe('');
 const trigger=page.getByRole('button',{name:'읽기 메뉴',exact:true});await trigger.focus();await trigger.press('Enter');
 const top=page.getByRole('group',{name:'읽기 메뉴',exact:true});await top.getByRole('button',{name:'읽기 설정',exact:true}).press('Enter');
 const dialog=page.getByRole('dialog',{name:'읽기 설정',exact:true});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await trigger.press('Enter');await top.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).focus();await page.keyboard.press('Tab');await expect(top).toHaveCount(0);
 const next=mirror.getByRole('button',{name:'다음으로',exact:true});await expect(next).toBeEnabled();await next.focus();await next.press('Enter');await expect(text).not.toHaveText(initial);
 await expect.poll(async()=>await state.getAttribute('data-rendered-revision')===await state.getAttribute('data-scene-revision'),{timeout:30000}).toBe(true);
 expect(await frame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);expect(await authored()).toEqual(before);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('native-stage.png')});
 expect(wasmResponses.some(response=>response.status===200)).toBe(true);
 await writeFile(info.outputPath('native-reader.json'),JSON.stringify({scope:'Unintercepted local RenPy Web runtime, actual scene acknowledgement and semantic Core advance; no real screen reader or physical phone',wasmResponses,initial,next:await text.innerText(),renderedRevision:await state.getAttribute('data-rendered-revision'),sceneRevision:await state.getAttribute('data-scene-revision'),authoredPreserved:true,iframePreserved:true},null,2)+'\n');
});
