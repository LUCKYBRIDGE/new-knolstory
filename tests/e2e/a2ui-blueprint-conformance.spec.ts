import {test,expect,type Page} from '@playwright/test';
import {applyMessages,controlNames,focusScreenBlueprints,type Device} from '../../packages/ui/src/index';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
import {enterLibrary,openBuiltinEdition} from './library-entry';
import {openEditingScreen} from './editor-screens';

// The A2UI blueprints (packages/ui/src/a2ui/screens) describe the list screens' controls. This compares the
// real screen with its blueprint: the toolbar above the list and the current cut, with every panel closed.
// Names are compared after numbers become # and picked material names are dropped, so the blueprint's sample
// data (선녀와 나무꾼 1장 1컷) does not have to match every cut.
const TASKS=[['text','원고'],['background','배경 편집'],['characters','인물 편집'],['audio','음향 편집'],['direction','연출 편집']] as const;
const SIZES:{device:Device;width:number;height:number}[]=[{device:'tablet',width:768,height:1024},{device:'phone',width:390,height:844}];
// Neighbour cut cards are named by their whole content (label, order, preview state, text); their side is what counts.
const normal=(name:string)=>name.replace(/\s+/g,' ').trim().replace(/(이미지 찾기) · .*$/,'$1').replace(/^(이전 컷|다음 컷) .*$/,'$1').replace(/\d+/g,'#');

async function realControlNames(page:Page,whole=false){
 return page.evaluate(whole=>{
  const body=document.querySelector('[data-screen] [data-editing-body]')!;
  const card=body.querySelector('article[aria-current=step]')??body.querySelector('article');
  // 쓰기 has no list: everything the workbench draws below the top bar (outside the settings drawer) counts.
  const scopes=whole?[body.parentElement!]:[...body.querySelectorAll('[class*=options]'),...(card?[card]:[])];
  // A chip's checkbox may be visually hidden; the chip (its label) is what the author sees and presses.
  const target=(el:Element)=>el.matches('input[type=checkbox]')&&el.closest('label')?el.closest('label')!:el;
  const shown=(el:Element)=>target(el).checkVisibility({visibilityProperty:true,opacityProperty:true})&&target(el).getBoundingClientRect().width>0;
  const name=(el:Element)=>{
   const labelled=el.getAttribute('aria-label');
   if(labelled)return labelled;
   if(el.tagName==='SUMMARY')return (el.textContent??'').trim();
   const label=el.closest('label');
   return ((el as HTMLElement).innerText||label?.textContent||el.textContent||'').trim();
  };
  return scopes.flatMap(scope=>[...scope.querySelectorAll('button,select,input,textarea,summary')].filter(el=>!el.closest('[data-work-menu]')).filter(shown).map(name));
 },whole);
}

for(const {device,width,height} of SIZES)test(`real focus screens match their A2UI blueprints · ${device}`,async({browser},info)=>{
 test.setTimeout(240_000);
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();await suppressFullscreenOffer(page);
 await page.goto('/?view=library');await expect(page.locator('main').first()).toBeVisible({timeout:90_000});await enterLibrary(page);
 await openBuiltinEdition(page,'seonnyeo','knolstory','edit');
 await expect(page.locator('[data-current-cut] textarea').first()).toBeVisible({timeout:60_000});
 // 쓰기 first (the screen the editor opens on): the cut head, the text, the cut's background and what follows.
 {
  const surface=[...applyMessages(focusScreenBlueprints.basic).values()][0]!;
  const expected=[...new Set(['stage','current','next-card','work','more-column'].flatMap(id=>controlNames(surface,device,id)).map(normal))];
  const real=(await realControlNames(page,true)).map(normal);
  // Every custom (x-host) catalog component is registered by the real editor: no placeholder may be drawn.
  await expect(page.locator('[data-host-part]')).toHaveCount(0);
  const extra=[...new Set(real.filter(name=>!expected.some(want=>name.endsWith(want))))];
  const missing=expected.filter(want=>!real.some(name=>name.endsWith(want)));
  expect({task:'basic',extra,missing},`basic · ${device}: 실제 화면과 설계도의 조작이 달라요`).toEqual({task:'basic',extra:[],missing:[]});
 }
 // Every optional screen on, so 함께 보기 offers all of them like the blueprint.
 await openEditingScreen(page,'인물 편집');await openEditingScreen(page,'음향 편집');await openEditingScreen(page,'연출 편집');
 for(const [task,label] of TASKS){
  await openEditingScreen(page,label);
  await expect(page.locator(`[data-screen="${task}"] article`).first()).toBeVisible();
  const surface=[...applyMessages(focusScreenBlueprints[task]).values()][0]!;
  const expected=[...new Set(['list-tools','companions','cut-1'].flatMap(id=>controlNames(surface,device,id)).map(normal))];
  const real=(await realControlNames(page)).map(normal);
  await expect(page.locator('[data-host-part]')).toHaveCount(0);
  const extra=[...new Set(real.filter(name=>!expected.some(want=>name.endsWith(want))))];
  const missing=expected.filter(want=>!real.some(name=>name.endsWith(want)));
  expect({task,extra,missing},`${task} · ${device}: 실제 화면과 설계도의 조작이 달라요`).toEqual({task,extra:[],missing:[]});
 }
 await context.close();
});
