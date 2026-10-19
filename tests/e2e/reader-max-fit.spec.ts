import {test,expect} from '@playwright/test';
test('reader uses the largest contained fixed format after every window resize',async({page},info)=>{
 test.setTimeout(180000);await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const authored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const before=await authored();await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const frame=page.getByTestId('story-runtime-frame'),identity=await frame.elementHandle(),status=page.getByTestId('story-runtime-status');
 const reports=[];
 for(const size of [{width:1440,height:900},{width:2400,height:300},{width:300,height:1400},{width:360,height:360},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  const portrait=size.width<size.height,w=portrait?720:1280,h=portrait?1280:720,scale=Math.min(size.width/w,size.height/h);
  await expect.poll(()=>frame.evaluate((n,expected)=>Math.abs(n.getBoundingClientRect().width-expected),w*scale),{timeout:15000}).toBeLessThan(1);
  const box=(await frame.boundingBox())!;
  expect(Math.abs(box.height-h*scale)).toBeLessThan(1);expect(Math.abs(box.x-(size.width-box.width)/2)).toBeLessThan(1);expect(Math.abs(box.y-(size.height-box.height)/2)).toBeLessThan(1);
  await expect.poll(async()=>{const r=await status.getAttribute('data-rendered-revision');return r!==null&&Number(r)>=0&&r===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
  expect(await identity!.evaluate(n=>n===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);expect(await authored()).toEqual(before);
  reports.push({size,box,logical:{w,h},scale});await page.screenshot({path:info.outputPath(`${size.width}x${size.height}.png`)});
 }
 for(const [format,size,w,h] of [['portrait',{width:1440,height:900},720,1280],['landscape',{width:390,height:844},1280,720]] as const){
  await page.setViewportSize(size);await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'화면 비율',exact:true}).selectOption(format);await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
  const scale=Math.min(size.width/w,size.height/h);
  await expect.poll(()=>frame.evaluate((n,expected)=>Math.abs(n.getBoundingClientRect().width-expected),w*scale)).toBeLessThan(1);
  const box=(await frame.boundingBox())!;expect(Math.abs(box.height-h*scale)).toBeLessThan(1);expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(await authored()).toEqual(before);reports.push({format,size,box,logical:{w,h},scale});
 }
 await info.attach('maximum-fit',{body:JSON.stringify(reports,null,2),contentType:'application/json'});
});

test('visible viewport resize and pan keep the frame inside the currently visible rectangle',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:1000,height:800});
 await page.addInitScript(()=>{
  const visual=new EventTarget() as EventTarget&{width:number;height:number;offsetLeft:number;offsetTop:number};
  Object.assign(visual,{width:390.5,height:600.25,offsetLeft:17.5,offsetTop:31.25});
  Object.defineProperty(window,'visualViewport',{configurable:true,value:visual});
 });
 await page.goto('/?view=editor');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const frame=page.getByTestId('story-runtime-frame');
 for(const rect of [{width:390.5,height:600.25,left:17.5,top:31.25},{width:820.5,height:230.25,left:3.5,top:71.25}]){
  await page.evaluate(rect=>{Object.assign(window.visualViewport!,{width:rect.width,height:rect.height,offsetLeft:rect.left,offsetTop:rect.top});window.visualViewport!.dispatchEvent(new Event('resize'));window.visualViewport!.dispatchEvent(new Event('scroll'));},rect);
  const w=rect.width<rect.height?720:1280,h=rect.width<rect.height?1280:720,scale=Math.min(rect.width/w,rect.height/h);
  await expect.poll(()=>frame.evaluate((n,expected)=>Math.abs(n.getBoundingClientRect().width-expected),w*scale)).toBeLessThan(0.1);
  const box=(await frame.boundingBox())!;expect(Math.abs(box.x-(rect.left+(rect.width-w*scale)/2))).toBeLessThan(.1);expect(Math.abs(box.y-(rect.top+(rect.height-h*scale)/2))).toBeLessThan(.1);
 }
 await page.screenshot({path:info.outputPath('visual-viewport-modeled.png')});
});

test('real fullscreen enter and exit retain maximum fit and restore editor sizing',async({page},info)=>{
 test.setTimeout(150000);await page.setViewportSize({width:1180,height:740});await page.goto('/?view=editor');
 const input=page.getByRole('textbox',{name:'대사 / 해설',exact:true});await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const authored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 const before=await authored(),frame=page.getByTestId('story-runtime-frame'),identity=await frame.elementHandle();
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');
 async function ready(){await expect.poll(async()=>{const r=await status.getAttribute('data-rendered-revision');return r!==null&&Number(r)>=0&&r===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);}
 async function fit(){await expect.poll(()=>frame.evaluate(node=>{const r=node.getBoundingClientRect(),w=innerWidth<innerHeight?720:1280,h=innerWidth<innerHeight?1280:720,scale=Math.min(innerWidth/w,innerHeight/h);return Math.max(Math.abs(r.width-w*scale),Math.abs(r.height-h*scale),Math.abs(r.x-(innerWidth-r.width)/2),Math.abs(r.y-(innerHeight-r.height)/2));})).toBeLessThan(1);await ready();}
 await ready();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'전체 화면',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.tagName)).toBe('MAIN');await fit();await page.screenshot({path:info.outputPath('fullscreen.png')});
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'전체 화면 해제',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);await fit();
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(input).toBeVisible();
 expect(await page.locator('main[data-keyboard-occluded]').evaluate(n=>({position:(n as HTMLElement).style.position,width:(n as HTMLElement).style.width}))).toEqual({position:'',width:''});
 expect(await authored()).toEqual(before);expect(await identity!.evaluate(n=>n===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);
 await page.screenshot({path:info.outputPath('editor-restored.png')});
});
