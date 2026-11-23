import {test,expect,type Page} from '@playwright/test';
import {writeFileSync,readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {openWorkFileExchange} from './work-file-exchange';

type Geometry={top:number;bottom:number};
const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as {id:string;geometry:Geometry}[];
const samples=[
 {name:'흥부',id:'heungbu.character.heungbu-default',scale:1},
 {name:'첫째 아이',id:'heungbu.character.child-01',scale:1},
 {name:'둘째 아이',id:'heungbu.character.child-02',scale:1},
 {name:'앉은 여자아이',id:'heungbu.character.child-06',scale:1},
 {name:'옹고집 아이',id:'onggojib.character.child-pixel',scale:1},
 {name:'어린 자라',id:'rabbit-turtle.character.turtle-child-unified-720x900',scale:1},
 {name:'선녀의 두 아이',id:'seonnyeo.character.classic-children',scale:1},
 {name:'직접 크기를 정한 아이',id:'heungbu.character.child-02',scale:1,manual:.8},
 {name:'마을 소녀',id:'creative.character.village-girl',scale:.85},
 {name:'젊은 여행자',id:'creative.character.young-traveler',scale:.89},
 {name:'옹고집 막내',id:'onggojib.character.youngest-child-pixel',scale:.84},
 {name:'제비',id:'heungbu.character.swallow',scale:.36},
];
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)writeFileSync(info.outputPath('native-diagnostic.json'),JSON.stringify(await page.getByTestId('story-runtime-status').evaluate(node=>Object.fromEntries([...node.attributes].map(a=>[a.name,a.value]))).catch(()=>({missing:true})),null,2));});
const base=createBlankStoryProject({id:'native-stature-check',chapterId:'chapter',lineId:'cut-1',title:'인물 크기 보존 검사'});
const source={...base,lines:samples.map((sample,index)=>({...base.lines[0],id:`cut-${index+1}`,order:index+1,type:'dialogue' as const,speaker:'left' as const,speakerName:'인물',leftAssetId:sample.id,rightAssetId:'',text:`${sample.name}의 키와 자세를 확인해요.`,backgroundMode:'none' as const,backgroundId:'',flow:{type:'goto' as const,targetLineId:index+1<samples.length?`cut-${index+2}`:null},stageComposition:{leftActors:[{key:'person',assetId:sample.id,position:'center' as const,facing:'original' as const,...(sample.manual?{scaleMultiplier:sample.manual,xAnchor:40}:{})}],rightActors:[]}}))};
async function rendered(page:Page,previous?:string|null){
 const state=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{const rev=await state.getAttribute('data-rendered-revision');return rev!==null&&(previous===undefined||rev!==previous)&&Number(rev)>=0&&rev===await state.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 return state;
}
async function measure(page:Page,index:number,previous?:string|null){
 const state=await rendered(page,previous);await expect.poll(async()=>{const actors=JSON.parse((await state.getAttribute('data-actor-rects'))??'[]') as {id:string}[];return actors.length===1&&actors[0].id==='person';},{timeout:30000}).toBe(true);const actors=JSON.parse((await state.getAttribute('data-actor-rects'))??'[]') as {id:string;rect:{x:number;y:number;width:number;height:number}}[];
 expect(actors).toHaveLength(1);expect(actors[0].id).toBe('person');
 const height=Number(await state.getAttribute('data-scene-height')),width=Number(await state.getAttribute('data-scene-width'));
 const sample=samples[index],geometry=catalog.find(asset=>asset.id===sample.id)!.geometry;
 const painted=actors[0].rect.height*(geometry.bottom-geometry.top);
 // Contract: one shared canvas scale, with explicit small-child defaults and authored multiplier.
 const expected=height*(width<height?.77:.67)*(geometry.bottom-geometry.top)*sample.scale*(sample.manual??1);
 expect(painted).toBeCloseTo(expected,3);
 if(sample.manual&&width>height)expect(actors[0].rect.x+actors[0].rect.width/2).toBeCloseTo(width*.4,3);
 return {name:sample.name,asset:sample.id,width,height,painted,expected};
}
for(const viewport of [{width:1280,height:800},{width:390,height:844}])test(`relative stature survives native edit/play, file and reopen at ${viewport.width}`,async({page,browser},info)=>{
 test.setTimeout(240000);await page.setViewportSize(viewport);await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'stature.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-30T00:00:00.000Z',appVersion:'test',project:source}))});await confirmAuthoringImport(page);
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(source.lines[0].text);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);expect(imported).toEqual({...source,id:imported.id});
 const records=[];
 for(let index=0;index<samples.length;index++){
  const previousEdit=index?await page.getByTestId('story-runtime-status').getAttribute('data-scene-revision'):undefined;
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(`cut-${index+1}`);await expect(page.getByRole('textbox',{name:`${index+1}컷 글`,exact:true})).toHaveValue(source.lines[index].text);
  records.push({mode:'edit',...await measure(page,index,previousEdit)});const previousPlay=await page.getByTestId('story-runtime-status').getAttribute('data-scene-revision');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  records.push({mode:'play',...await measure(page,index,previousPlay)});
  if(index===2||index===3)await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`${viewport.width}-${index}-native.png`)});
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(imported);
 await openWorkFileExchange(page);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const downloaded=await pending,file=info.outputPath('stature-preserved.knolstory');await downloaded.saveAs(file);expect(parseAuthoringFile(readFileSync(file,'utf8')).project).toEqual(imported);
 const context=await browser.newContext({viewport}),fresh=await context.newPage();await fresh.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await fresh.route('**/api/**',route=>route.abort());await fresh.goto('/?view=editor');await expect(fresh.getByTestId('save-status')).toHaveText('임시 보관됨');await fresh.locator('[data-work-menu]>summary').click();await fresh.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(fresh);await expect(fresh.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(source.lines[0].text);await expect(fresh.getByTestId('save-status')).toHaveText('임시 보관됨');const freshProject=await fresh.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);expect(freshProject).toEqual({...imported,id:freshProject.id});await fresh.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('cut-8');await expect(fresh.getByRole('textbox',{name:'8컷 글',exact:true})).toHaveValue(source.lines[7].text);await measure(fresh,7);await context.close();
 expect(errors).toEqual([]);writeFileSync(info.outputPath('stature-native-evidence.json'),JSON.stringify({viewport,records,errors,fileRoundtrip:true},null,2));
});

test('three and four automatic actors retain child/adult proportions on both sides of the native stage',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});
 const project={...base,id:'stature-multi',title:'여러 인물 키 보존 검사',lines:[false,true].map((four,index)=>({...base.lines[0],id:`multi-${index}`,order:index+1,leftAssetId:'rabbit-turtle.character.classic-turtle-water',rightAssetId:'rabbit-turtle.character.turtle-child-unified-720x900',text:`${four?'네':'세'} 인물의 키를 함께 확인해요.`,backgroundMode:'none' as const,backgroundId:'',stageComposition:{leftActors:[{key:'wide',assetId:'rabbit-turtle.character.classic-turtle-water'},{key:'king',assetId:'rabbit-turtle.character.dragonking-unified-720x900'}],rightActors:[{key:'child',assetId:'rabbit-turtle.character.turtle-child-unified-720x900'},...(four?[{key:'adult',assetId:'rabbit-turtle.character.turtle-unified-720x900'}]:[])]}}))};
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'multi.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-30T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(project.lines[0].text);
 const evidence=[];
 for(const index of [0,1]){
  const previous=index?await page.getByTestId('story-runtime-status').getAttribute('data-scene-revision'):undefined;
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(`multi-${index}`);await expect(page.getByRole('textbox',{name:`${index+1}컷 글`,exact:true})).toHaveValue(project.lines[index].text);
  await rendered(page,previous);
  for(const mode of ['edit','play']){
   if(mode==='play'){const before=await page.getByTestId('story-runtime-status').getAttribute('data-scene-revision');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered(page,before);}
   const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>JSON.parse((await status.getAttribute('data-actor-rects'))??'[]').length).toBe(index+3);
   const actors=JSON.parse((await status.getAttribute('data-actor-rects'))!) as {id:string;rect:{height:number}}[];
   const geometry=(id:string)=>catalog.find(asset=>asset.id===id)!.geometry;
   const child=geometry('rabbit-turtle.character.turtle-child-unified-720x900'),king=geometry('rabbit-turtle.character.dragonking-unified-720x900');
   const ratio=actors.find(a=>a.id==='child')!.rect.height*(child.bottom-child.top)/(actors.find(a=>a.id==='king')!.rect.height*(king.bottom-king.top));
   expect(ratio).toBeLessThan(.8);expect(ratio).toBeCloseTo((child.bottom-child.top)/(king.bottom-king.top),5);evidence.push({index,mode,ratio,actors});
   if(mode==='play'){await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`multi-${index+3}-native.png`)});await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();}
  }
 }
 const actual=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);expect(actual).toEqual({...project,id:actual.id});writeFileSync(info.outputPath('multi-stature-evidence.json'),JSON.stringify(evidence,null,2));
});

test('characters from different stories share a natural scale in RenPy',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});
 const actors=[
  {key:'adult',assetId:'seonnyeo.character.M02-neutral'},
  {key:'traveler',assetId:'creative.character.young-traveler'},
  {key:'child',assetId:'onggojib.character.youngest-child-pixel'},
  {key:'bird',assetId:'heungbu.character.swallow'},
 ];
 const line={...base.lines[0],type:'dialogue' as const,speaker:'left' as const,
  speakerName:'나무꾼',text:'서로 다른 이야기의 인물들이 한 장면에서 만났어요.',
  leftAssetId:actors[0].assetId,rightAssetId:actors[2].assetId,
  stageComposition:{leftActors:actors.slice(0,2),rightActors:actors.slice(2)}};
 const project={...base,id:'mixed-stature',lines:[line]};
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await openWorkFileExchange(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({
  name:'mixed-stature.knolstory',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-12T00:00:00.000Z',appVersion:'test',project})),
 });
 await confirmAuthoringImport(page);
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(line.text);
 for(const mode of ['edit','play']){
  if(mode==='play'){
   const previous=await page.getByTestId('story-runtime-status').getAttribute('data-scene-revision');
   await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
   await rendered(page,previous);
  }
  const status=await rendered(page);
  const rects=JSON.parse((await status.getAttribute('data-actor-rects'))!) as {id:string;rect:{y:number;height:number}}[];
  const metrics=actors.map(({key,assetId})=>{
   const rect=rects.find(row=>row.id===key)!.rect;
   const g=catalog.find(asset=>asset.id===assetId)!.geometry;
   return {height:rect.height*(g.bottom-g.top),floor:rect.y+rect.height*g.bottom};
  });
  expect(metrics[1].height/metrics[0].height).toBeGreaterThan(.93);
  expect(metrics[1].height/metrics[0].height).toBeLessThan(1.07);
  expect(metrics[2].height/metrics[0].height).toBeLessThan(.75);
  expect(metrics[3].height/metrics[0].height).toBeLessThan(.34);
  for(const actor of metrics.slice(1))expect(actor.floor).toBeCloseTo(metrics[0].floor,4);
  await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`mixed-stature-${mode}.png`)});
 }
});

for (const sample of [
 {id:'rabbit-turtle.character.classic-turtle-water',width:390,height:844,stageWidth:720},
 {id:'heungbu.character.swallow',width:844,height:390,stageWidth:1280},
]) test(`native framing keeps ${sample.id} readable at ${sample.width}px`,async({page},info)=>{
 await page.setViewportSize({width:sample.width,height:sample.height});
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 const line={...base.lines[0],type:'dialogue' as const,speaker:'left' as const,
  speakerName:'인물',text:'잠깐, 여기 좀 봐요.',leftAssetId:sample.id,
  stageComposition:{leftActors:[{key:'person',assetId:sample.id,position:'center' as const}],rightActors:[]}};
 const project={...base,id:'framing-check',lines:[line]};
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await openWorkFileExchange(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({
  name:'framing-check.knolstory',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-12T00:00:00.000Z',appVersion:'test',project})),
 });
 await confirmAuthoringImport(page);
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(line.text);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=await rendered(page);
 await expect(status).toHaveAttribute('data-scene-width',String(sample.stageWidth));
 await expect.poll(async()=>JSON.parse((await status.getAttribute('data-textbox-rect'))??'null')?.y).toBeGreaterThan(0);
 const [{rect}]=JSON.parse((await status.getAttribute('data-actor-rects'))!) as {rect:{x:number;y:number;width:number;height:number}}[];
 const geometry=catalog.find(a=>a.id===sample.id)!.geometry as Geometry&{left:number;right:number};
 // The audited artwork must fit regardless of the mirrored orientation.
 const visibleWidth=rect.width*(geometry.right-geometry.left);
 expect(visibleWidth).toBeLessThanOrEqual(sample.stageWidth-39);
 const panel=JSON.parse((await status.getAttribute('data-textbox-rect'))!) as {y:number};
 const top=rect.y+rect.height*geometry.top;
 const height=rect.height*(geometry.bottom-geometry.top);
 expect((panel.y-top)/height).toBeGreaterThan(.72);
 await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath('native-framing.png')});
});
