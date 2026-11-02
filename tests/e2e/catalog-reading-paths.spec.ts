import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {enterLibrary,openBuiltinEdition,beginSelectedBook} from './library-entry';

type Step={lineId:string;textSha256:string};
type Playback={lineId:string|null;path:string[];status:string;choiceHistory?:Array<{pathIndex:number;choiceId:string}>};
type Route={id:string;decisions:Array<{lineId:string;choiceId:string;label:string}>;steps:Step[];terminalLineId:string;finalState:Playback};
type Edition={workId:string;edition:'original'|'knolstory';projectId:string;title:string;projectSha256:string;routes:Route[]};
type Scene={sceneId:string;revision:number;width:number;height:number;mode:string;ended?:boolean;dialogue:{text:string};choices:Array<{id:string;text:string}>;presentation?:{transition?:unknown};effectSteps?:{current:number;total:number}};
type NativeEvent={type:string;revision?:number;sceneId?:string;message?:string;choicesRect?:{x:number;y:number;width:number;height:number};dialoguePage?:{index:number;count:number};choiceId?:string};
type ObservedWindow=Window&{__catalogPathScene?:Scene;__catalogPathEvents?:NativeEvent[]};
const manifest=JSON.parse(readFileSync(new URL('../../docs/architecture/evidence/catalog-native-paths-2026-11-02/manifest.json',import.meta.url),'utf8')) as {editions:Edition[]};
const canonical=(value:unknown)=>JSON.stringify(value,(_key,item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const projectHash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const workspace=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));

async function observed(page:Page){
 return page.getByTestId('story-runtime-frame').evaluate(node=>{
  const scene=((node as HTMLIFrameElement).contentWindow as ObservedWindow).__catalogPathScene;
  const events=(window as ObservedWindow).__catalogPathEvents??[];
  const report=events.findLast(event=>event.type==='sceneRendered'&&event.revision===scene?.revision&&event.sceneId===scene?.sceneId);
  const status=document.querySelector('[data-testid="story-runtime-status"]');
  return {scene,report,rendered:Number(status?.getAttribute('data-rendered-revision')??-1),transitionDone:events.some(event=>event.type==='presentationDone'&&event.revision===scene?.revision&&event.sceneId===scene?.sceneId)};
 });
}
async function ready(page:Page,expectedSceneId?:string){
 await expect.poll(async()=>{
  const state=await observed(page);return !!state.scene&&!!state.report&&state.rendered===state.scene.revision&&(!expectedSceneId||state.scene.sceneId===expectedSceneId);
 },{timeout:120000,message:`native acknowledgement for ${expectedSceneId??'current scene'}`}).toBe(true);
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});
 if(await gate.count()){
  await gate.press('Enter');await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');
 }
 const state=await observed(page);
 if(state.scene?.presentation?.transition)await expect.poll(async()=>(await observed(page)).transitionDone,{timeout:15000}).toBe(true);
 return observed(page);
}
async function nativeAdvance(page:Page){
 const before=await ready(page),signature=JSON.stringify([before.scene?.revision,before.report?.dialoguePage?.index]);
 await page.getByTestId('story-runtime-frame').contentFrame().locator('#canvas').press('Enter');
 await expect.poll(async()=>{
  const after=await observed(page);return JSON.stringify([after.scene?.revision,after.report?.dialoguePage?.index])!==signature;
 },{timeout:15000,message:'a real native Enter must advance a page, effect or cut'}).toBe(true);
 await ready(page);
}
async function nativeChoice(page:Page,choice:{choiceId:string;label:string}){
 const state=await ready(page),scene=state.scene!,report=state.report!,index=scene.choices.findIndex(option=>option.id===choice.choiceId);
 expect(index,choice.label).toBeGreaterThanOrEqual(0);expect(scene.choices[index].text).toBe(choice.label);
 const rect=report.choicesRect;expect(rect,'Ren’Py must report the visible choice panel').toBeDefined();
 // Heungbu's short two-choice labels fit the native 96px button minimum.
 // Validate the reported layout before clicking; never silently guess a wrapped/scrolling row.
 expect(rect!.height).toBe(24*2+92+scene.choices.length*96+(scene.choices.length-1)*12);
 const frame=page.getByTestId('story-runtime-frame');await frame.scrollIntoViewIfNeeded();const bounds=(await frame.boundingBox())!;
 const scale=Math.min(bounds.width/scene.width,bounds.height/scene.height);
 await page.mouse.click(bounds.x+(bounds.width-scene.width*scale)/2+(rect!.x+rect!.width/2)*scale,
  bounds.y+(bounds.height-scene.height*scale)/2+(rect!.y+24+92+48+index*108)*scale);
 await expect.poll(async()=>(await observed(page)).scene?.revision,{timeout:15000}).not.toBe(scene.revision);
 await ready(page);
}

for(const edition of manifest.editions)for(const route of edition.routes)test(`Heungbu ${route.id}: complete native route with API unavailable`,async({page},info)=>{
 test.setTimeout(360000);await page.setViewportSize({width:1280,height:800});
 // Fresh Playwright contexts isolate all work. This flag only dismisses the optional browser-chrome offer.
 await page.addInitScript(()=>{
  if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');
  (window as ObservedWindow).__catalogPathEvents=[];
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||!event.data||event.data.protocol!==1)return;
   if(window!==window.top&&event.source===window.parent&&event.data.type==='loadScene') (window as ObservedWindow).__catalogPathScene=event.data.payload;
   if(window===window.top&&event.source===(document.querySelector('[data-testid="story-runtime-frame"]') as HTMLIFrameElement|null)?.contentWindow){
    const events=(window as ObservedWindow).__catalogPathEvents!;events.push(event.data);if(events.length>15000)events.shift();
   }
  });
 });
 let apiRequests=0;await page.route('**/api/**',async request=>{apiRequests++;await request.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'검사 중 온라인 기능을 사용할 수 없습니다.'})});});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await enterLibrary(page);await openBuiltinEdition(page,edition.workId,edition.edition,'start');await beginSelectedBook(page);
 await ready(page,`${edition.projectId}/${route.steps[0].lineId}`);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const before=await workspace(page);expect(projectHash(before.document.project),'current official manuscript must match the generated manifest').toBe(edition.projectSha256);
 const visits:Step[]=[];
 try{
  for(const [index,step] of route.steps.entries()){
   const state=await ready(page,`${edition.projectId}/${step.lineId}`);expect(state.scene!.mode).toBe('play');expect(createHash('sha256').update(state.scene!.dialogue.text).digest('hex'),step.lineId).toBe(step.textSha256);
   visits.push(step);
   if(index%40===0)console.log(`[catalog-native ${route.id}] ${index+1}/${route.steps.length}: ${step.lineId}`);
   let turns=0;
   while(true){const current=await observed(page);if((current.report?.dialoguePage?.index??0)>=(current.report?.dialoguePage?.count??1)-1)break;expect(++turns,'bounded dialogue pagination').toBeLessThan(40);await nativeAdvance(page);expect((await observed(page)).scene!.sceneId).toBe(`${edition.projectId}/${step.lineId}`);}
   while(true){const current=await observed(page),effects=current.scene?.effectSteps;if(!effects||effects.current>=effects.total)break;expect(++turns,'bounded explicit effect inputs').toBeLessThan(44);await nativeAdvance(page);expect((await observed(page)).scene!.sceneId).toBe(`${edition.projectId}/${step.lineId}`);}
   const decision=route.decisions.find(item=>item.lineId===step.lineId);
   if(decision)await nativeChoice(page,decision);else await nativeAdvance(page);
   if(index===route.steps.length-1){await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');expect((await observed(page)).scene!.ended).toBe(true);}
  }
  await expect.poll(async()=>(await workspace(page)).playback).toEqual(route.finalState);
  const after=await workspace(page);expect(after.document.project).toEqual(before.document.project);expect(after.playback.path).toEqual(visits.map(step=>step.lineId));
  expect(after.playback.choiceHistory??[]).toEqual(route.finalState.choiceHistory??[]);expect(errors).toEqual([]);
  const events=await page.evaluate(()=>(window as ObservedWindow).__catalogPathEvents??[]);
  const nativeSelections=events.filter(event=>event.type==='choiceSelected').map(event=>event.choiceId);
  expect(nativeSelections).toEqual(route.decisions.map(choice=>choice.choiceId));
  expect(events.filter(event=>event.type==='error')).toEqual([]);
  await info.attach('complete-path-evidence',{body:JSON.stringify({edition:edition.edition,route:route.id,projectSha256:edition.projectSha256,visitedCuts:visits,decisions:route.decisions,finalPlayback:after.playback,apiRequests,nativeSelections},null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath(`${route.id}-ending.png`)});
 }catch(error){await info.attach('path-progress-on-failure',{body:JSON.stringify({route:route.id,visitedCuts:visits,last:await observed(page),workspace:await workspace(page)},null,2),contentType:'application/json'});throw error;}
});
