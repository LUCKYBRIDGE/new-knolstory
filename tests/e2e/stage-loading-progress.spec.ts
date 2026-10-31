import {test,expect,type Page} from '@playwright/test';
/** The stage loading screen shows only the runtime's real download share, then the start step, then the stage. */
const runtime=`<!doctype html><script>
const send=value=>parent.postMessage({protocol:1,...value},location.origin);
window.knolTest={progress:ratio=>send({type:'loadProgress',stage:'download',ratio}),start:()=>send({type:'loadProgress',stage:'start'}),ready:()=>send({type:'ready',runtimeVersion:'test',contractVersion:1})};
addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type!=='loadScene'||!scene)return;send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:1280,height:720},textboxRect:{x:0,y:500,width:1280,height:200}});});
</script>`;
async function controls(page:Page){
 const handle=await page.getByTestId('story-runtime-frame').elementHandle();const frame=await handle!.contentFrame();
 await expect.poll(()=>frame!.evaluate(()=>typeof (window as unknown as {knolTest?:unknown}).knolTest)).toBe('object');
 return {run:(script:string)=>frame!.evaluate(script)};
}
for(const size of [{width:1440,height:900},{width:390,height:844}])test(`stage loading shows real runtime progress ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());
 await page.route('**/runtime/index.html*',route=>route.fulfill({contentType:'text/html',body:runtime}));
 await page.goto('/?view=editor');
 const loading=page.locator('[data-story-loading="stage"]');await expect(loading).toBeVisible({timeout:60000});
 const bar=loading.getByRole('progressbar',{name:'무대 자료 받기'});
 await expect(bar,'nothing is shown before the runtime reports progress').toHaveCount(0);
 const frame=await controls(page);
 await frame.run('knolTest.progress(0.1);knolTest.progress(0.426)');
 await expect(bar).toHaveAttribute('aria-valuenow','42');
 await expect(loading.getByText('무대 자료를 받고 있어요 · 42%',{exact:true})).toBeVisible();
 await frame.run('knolTest.progress(0.3)');
 await page.waitForTimeout(200);await expect(bar,'a late lower share does not move the bar back').toHaveAttribute('aria-valuenow','42');
 await loading.screenshot({path:info.outputPath('stage-loading-progress.png')});
 const [track,box]=await Promise.all([bar.boundingBox(),loading.boundingBox()]);
 expect(track!.x).toBeGreaterThanOrEqual(box!.x);expect(track!.x+track!.width).toBeLessThanOrEqual(box!.x+box!.width+0.5);expect(track!.y+track!.height).toBeLessThanOrEqual(box!.y+box!.height+0.5);
 await frame.run('knolTest.start()');
 await expect(loading.getByText('무대를 열고 있어요',{exact:true})).toBeVisible();
 await expect(bar).toHaveAttribute('aria-valuenow','100');
 await expect(loading.getByText(/%/)).toHaveCount(0);
 await frame.run('knolTest.ready()');
 await expect(loading).toHaveCount(0);
});
