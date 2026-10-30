import {test,expect,type Page} from '@playwright/test';
import {writeFileSync,readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

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
 const details=page.locator('[data-work-menu]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
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
