import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
async function ready(page:Page){const s=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const r=await s.getAttribute('data-rendered-revision');return r!==null&&Number(r)>=0&&r===await s.getAttribute('data-scene-revision');},{timeout:90000}).toBe(true);return s;}
for(const dpr of [1.25,2,4])test(`native SDL canvas caps density and preserves input/fullscreen at DPR ${dpr}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true,deviceScaleFactor:dpr});try{const page=await context.newPage();await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const base=createBlankStoryProject({id:'pixel-budget',chapterId:'ch',lineId:'first'}),project={...base,lines:[{...base.lines[0],text:'글과 배경을 확인합니다.',flow:{type:'goto' as const,targetLineId:'second'}},{...base.lines[0],id:'second',order:2,text:'다음 컷에 도착했습니다.',flow:{type:'goto' as const,targetLineId:null}}]};await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'pixels.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-26T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project),iframe=await page.getByTestId('story-runtime-frame').elementHandle();
 async function pixels(){const s=await ready(page),width=Number(await s.getAttribute('data-scene-width')),height=Number(await s.getAttribute('data-scene-height'));const frame=page.frames().find(f=>f.url().includes('/runtime/'))!;await expect.poll(()=>frame.evaluate(()=>{const c=document.querySelector('canvas')!;return [c.width,c.height];})).toEqual([Math.round(width*Math.min(dpr,2)),Math.round(height*Math.min(dpr,2))]);expect(await page.evaluate(()=>devicePixelRatio)).toBe(dpr);expect(await frame.evaluate(()=>devicePixelRatio)).toBe(dpr);expect(await iframe!.evaluate(e=>e===document.querySelector('[data-testid=story-runtime-frame]'))).toBe(true);}
 await pixels();const engineFrame=page.frames().find(f=>f.url().includes('/runtime/'))!;expect(await engineFrame.evaluate(()=>[...document.scripts].some(s=>/renpy\.js\?v=[a-f0-9]{16}$/.test(s.src)))).toBe(true);await page.screenshot({path:info.outputPath('editor-density.png')});for(const screen of ['text','background','basic']){const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(screen);await pixels();}
 let menu=page.locator('[data-work-menu]');if(!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await page.getByRole('button',{name:'전체 화면',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===document.documentElement)).toBe(true);await pixels();await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await pixels();
 const box=(await page.getByTestId('story-runtime-frame').boundingBox())!,s=await ready(page),w=Number(await s.getAttribute('data-scene-width')),h=Number(await s.getAttribute('data-scene-height')),scale=Math.min(box.width/w,box.height/h);await page.screenshot({path:info.outputPath('reader-density.png')});await page.touchscreen.tap(box.x+(box.width-w*scale)/2+w*scale*.8,box.y+(box.height-h*scale)/2+h*scale*.2);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('second');await pixels();
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'전체 화면 해제',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);await pixels();await page.setViewportSize({width:844,height:390});await pixels();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await pixels();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
 }finally{await context.close();}
});

for(const viewport of [{width:390,height:844},{width:844,height:460}])test(`DPR4 illustrated choices retain native hit coordinates ${viewport.width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport,deviceScaleFactor:4,hasTouch:true});
 try{
  const page=await context.newPage();await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const source=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')),first=source.lines[0];
  const project={...source,id:`pixel-art-${viewport.width}`,title:'고밀도 장면 선택 검사',lines:[{...first,id:'illustrated',text:'친구들과 함께 숲을 바라보았다.\n어느 길로 걸어갈까?',ending:undefined,flow:{type:'choice',options:[{id:'forest',label:'숲길을 따라간다',targetLineId:'forest-end'},{id:'stream',label:'물소리가 나는 길로 간다',targetLineId:'stream-end'}]}},{...first,id:'forest-end',order:2,text:'숲길에 도착했다.',ending:undefined,flow:{type:'goto',targetLineId:null}},{...first,id:'stream-end',order:3,text:'물소리를 따라 도착했다.',ending:undefined,flow:{type:'goto',targetLineId:null}}]};
  await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'illustrated.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-26T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project),identity=await page.getByTestId('story-runtime-frame').elementHandle();const editorStatus=await ready(page);expect(JSON.parse((await editorStatus.getAttribute('data-actor-rects'))!)).toHaveLength(2);await page.screenshot({path:info.outputPath('illustrated-editor.png')});await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await ready(page),runtime=page.frames().find(f=>f.url().includes('/runtime/'))!;
  const gate=runtime.getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');await ready(page);
  const layout=await runtime.evaluate(()=> (window as unknown as {renpy_exec:(code:string)=>Promise<{rect:{x:number;y:number;width:number;height:number};padding:number;headerHeight:number;gap:number;buttonHeights:number[];scroll:boolean}>}).renpy_exec('result = knol_choice_layout(knol_scene)'));
  await expect.poll(async()=>{const value=await status.getAttribute('data-choices-rect');return !!value&&value!=='null'&&JSON.parse(value).width>0;}).toBe(true);expect(layout.buttonHeights).toHaveLength(2);expect(layout.scroll).toBe(false);
  const dimensions=await runtime.evaluate(()=>{const canvas=document.querySelector('canvas')!;return {width:canvas.width,height:canvas.height,dpr:devicePixelRatio};});const w=Number(await status.getAttribute('data-scene-width')),h=Number(await status.getAttribute('data-scene-height'));expect(dimensions).toEqual({width:w*2,height:h*2,dpr:4});expect(JSON.parse((await status.getAttribute('data-actor-rects'))!)).toHaveLength(h>w?0:2);await page.screenshot({path:info.outputPath('illustrated-native-choices.png')});
  const box=(await page.getByTestId('story-runtime-frame').boundingBox())!,scale=Math.min(box.width/w,box.height/h),x=layout.rect.x+layout.rect.width/2,y=layout.rect.y+layout.padding+layout.headerHeight+layout.buttonHeights[0]+layout.gap+layout.buttonHeights[1]/2;
  await page.touchscreen.tap(box.x+(box.width-w*scale)/2+x*scale,box.y+(box.height-h*scale)/2+y*scale);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('stream-end');await ready(page);expect(await identity!.evaluate(e=>e===document.querySelector('[data-testid=story-runtime-frame]'))).toBe(true);
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(page.getByRole('combobox',{name:'현재 장과 컷 이동',exact:true})).toHaveValue('stream-end');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
  writeFileSync(info.outputPath('geometry.json'),JSON.stringify({viewport,dpr:4,dimensions,logical:{w,h},nativeChoiceLayout:layout,chosen:'stream-end',sameIframe:true,wholeProjectEqual:true},null,2));
 }finally{await context.close();}
});

for(const viewport of [{width:360,height:677},{width:844,height:460}])test(`native audio entry fits the current story stage ${viewport.width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport,deviceScaleFactor:4,hasTouch:true});try{
 const page=await context.newPage();await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const base=createBlankStoryProject({id:'audio-entry-fit',chapterId:'ch',lineId:'first'}),project={...base,lines:[{...base.lines[0],text:'소리를 켠 뒤 이야기를 시작합니다.',audio:{music:{action:'play',assetId:'audio:music:forest',volume:.7,loop:true}},flow:{type:'goto',targetLineId:'second'}},{...base.lines[0],id:'second',order:2,text:'다음 컷에 도착했습니다.',flow:{type:'goto',targetLineId:null}}]};await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'audio-entry.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-27T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await ready(page);const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await ready(page),frame=page.frames().find(f=>f.url().includes('/runtime/'))!,gate=frame.getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});await expect(gate).toBeVisible();
 const dimensions=await frame.evaluate(()=> (window as unknown as {renpy_exec:(s:string)=>Promise<{width:number;height:number}[]>}).renpy_exec('items = []\nrenpy.get_screen("knol_stage").visit_all(lambda d, items=items: items.append(d) if isinstance(d, renpy.display.behavior.Button) and getattr(d.action, "callable", None) is knol_unlock_audio else None)\nresult = [{"width": renpy.render(d, int(knol_scene["width"]), int(knol_scene["height"]), 0, 0).width, "height": renpy.render(d, int(knol_scene["width"]), int(knol_scene["height"]), 0, 0).height} for d in items]'));
 const w=Number(await status.getAttribute('data-scene-width')),h=Number(await status.getAttribute('data-scene-height'));await page.screenshot({path:info.outputPath('audio-entry.png')});expect(dimensions).toEqual([{width:w,height:h}]);const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await expect(gate).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('first');await page.touchscreen.tap(box.x+box.width*.8,box.y+box.height*.2);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('second');await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
 }finally{await context.close();}
});

for(const initial of [{width:360,height:677},{width:844,height:460}])test(`native fractured-reality look follows the story stage through resize ${initial.width}`,async({browser},info)=>{
 const context=await browser.newContext({viewport:initial,deviceScaleFactor:2,hasTouch:true});
 try{
  const page=await context.newPage();
  await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
  await page.route('**/api/**',route=>route.abort());
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const project=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
  await page.locator('[data-work-menu]>summary').click();
  await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({
   name:'portrait-look.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({
    documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-27T00:00:00.000Z',appVersion:'test',project,
   })),
  });
  await confirmAuthoringImport(page);
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  const iframe=await page.getByTestId('story-runtime-frame').elementHandle();
  const cut=page.getByLabel('현재 장과 컷 이동',{exact:true});
  await cut.selectOption('fractured-reality');
  await expect(cut).toHaveValue('fractured-reality');
  await ready(page);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  await ready(page);
  const frame=page.frames().find(f=>f.url().includes('/runtime/'))!;
  const stageSize=async()=>{
   const status=await ready(page);
   return {width:Number(await status.getAttribute('data-scene-width')),height:Number(await status.getAttribute('data-scene-height'))};
  };
  const crackSizes=async()=>frame.evaluate(()=>
   (window as unknown as {renpy_exec:(code:string)=>Promise<{width:number;height:number}[]>}).renpy_exec(
    'items = []\nrenpy.get_screen("knol_stage").visit_all(lambda d, items=items: items.append(d) if type(d).__name__ == "Transform" and "crack.svg" in repr(d) else None)\nresult = [{"width": renpy.render(d, int(knol_scene["width"]), int(knol_scene["height"]), 0, 0).width, "height": renpy.render(d, int(knol_scene["width"]), int(knol_scene["height"]), 0, 0).height} for d in items]'
   )
  );
  const first=await stageSize();
  expect(first).toEqual(initial.width<initial.height?{width:720,height:1280}:{width:1280,height:720});
  await expect.poll(crackSizes,{timeout:30000}).toEqual([first]);
  await page.screenshot({path:info.outputPath('fractured-look-initial.png')});
  const rotated=initial.width<initial.height?{width:844,height:460}:{width:360,height:677};
  await page.setViewportSize(rotated);
  const second=rotated.width<rotated.height?{width:720,height:1280}:{width:1280,height:720};
  await expect.poll(stageSize,{timeout:30000}).toEqual(second);
  await expect.poll(crackSizes,{timeout:30000}).toEqual([second]);
  await page.screenshot({path:info.outputPath('fractured-look-after-resize.png')});
  expect(await iframe!.evaluate(e=>e===document.querySelector('[data-testid=story-runtime-frame]'))).toBe(true);
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
  await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('fractured-reality');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(original);
 }finally{await context.close();}
});
