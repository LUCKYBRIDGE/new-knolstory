import {test,expect} from '@playwright/test';
for(const destination of ['text','library'] as const)test(`native engine initializes with nonzero surface after early ${destination} navigation`,async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:390,height:844});let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let requested=false;const errors:string[]=[];
 page.on('console',message=>{const t=message.text();if(/FS\.syncfs operations in flight|ZeroDivisionError|NoneType.*update/.test(t)&&errors.length<12)errors.push(t);});page.on('pageerror',error=>{if(errors.length<12)errors.push(error.message);});
 await page.route('**/runtime/index.html',async route=>{requested=true;await gate;await route.continue().catch(()=>{});});
 try{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await expect.poll(()=>requested).toBe(true);const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(node=>node.setAttribute('data-engine-identity','single-native'));
 const authored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);const before=await authored();const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();
 if(destination==='text')await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('text');else await page.getByRole('button',{name:'서재로',exact:true}).click();
 // Prove the engine's iframe document has a positive layout viewport BEFORE allowing any engine startup.
 expect(await frame.evaluate(node=>({width:(node as HTMLIFrameElement).clientWidth,height:(node as HTMLIFrameElement).clientHeight}))).toEqual({width:1280,height:720});await expect(frame).toHaveCount(1);await expect(frame).toHaveAttribute('data-engine-identity','single-native');
 if(destination==='text'){const parked=page.locator('[data-runtime-parked=true]');await expect(parked).toHaveAttribute('aria-hidden','true');expect(await parked.evaluate(node=>node.hasAttribute('inert'))).toBe(true);}
 release();await expect.poll(()=>frame.evaluate(node=>{const w=(node as HTMLIFrameElement).contentWindow!;return w.innerWidth>0&&w.innerHeight>0;}),{timeout:30000}).toBe(true);const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const rendered=await status.getAttribute('data-rendered-revision');return rendered!==null&&Number(rendered)>=0&&rendered===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 expect(await frame.evaluate(node=>{const canvas=(node as HTMLIFrameElement).contentDocument?.querySelector('canvas');return Boolean(canvas&&canvas.width>0&&canvas.height>0);})).toBe(true);expect(errors).toEqual([]);expect(await authored()).toEqual(before);
 if(destination==='text'){
 await menu.locator(':scope>summary').click();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('basic');await expect(page.locator('[data-runtime-parked=true]')).toHaveCount(0);await expect.poll(async()=>await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:15000}).toBe(true);
 await page.setViewportSize({width:1280,height:720});await page.setViewportSize({width:390,height:844});await expect.poll(async()=>await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:15000}).toBe(true);
 await menu.locator(':scope>summary').click();const download=page.waitForEvent('download',{timeout:10000});await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.knolstory$/);await page.screenshot({path:info.outputPath('native-restored-after-delayed-start.png'),fullPage:true});}
 expect(errors).toEqual([]);await expect(frame).toHaveAttribute('data-engine-identity','single-native');expect(await authored()).toEqual(before);
 }finally{release();await info.attach('runtime-diagnostics',{body:JSON.stringify(errors),contentType:'application/json'});}
});
