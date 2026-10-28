import {test, expect, type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
import {READER_PREFERENCES_KEY} from '../../apps/web/lib/reader-preferences';

// Exercise Ren'Py's real touch surface, never a mocked runtime or postMessage input.
test.use({hasTouch:true});
const workspaceKey='knolstory-next-workspace-v1';
const base=createBlankStoryProject({id:'reader-touch',chapterId:'chapter',lineId:'first',title:'화면 터치 확인'});
const cut=base.lines[0]!;
const project={...base,lines:[
 {...cut,text:'처음 컷의 짧은 글입니다.',flow:{type:'goto' as const,targetLineId:'long'}},
 {...cut,id:'long',order:2,text:Array.from({length:24},(_,i)=>`${i+1}번째 글. 토끼와 친구가 책을 함께 읽어요. 다음 글을 읽고 이전 글도 확인해요.\n`).join(''),flow:{type:'goto' as const,targetLineId:'choice'}},
 {...cut,id:'choice',order:3,text:'어떤 책을 읽을까요?',flow:{type:'choice' as const,options:[{id:'a',label:'첫 번째 책',targetLineId:'end'},{id:'b',label:'두 번째 책',targetLineId:'end'}]}},
 {...cut,id:'end',order:4,text:'함께 책을 읽었어요.',flow:{type:'goto' as const,targetLineId:null}},
]};
async function workspace(page:Page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),workspaceKey);}
async function rendered(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect.poll(async()=>{const rev=await status.getAttribute('data-rendered-revision');return rev!==null&&Number(rev)>=0&&rev===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
 return status;
}
async function textPage(page:Page){return JSON.parse((await page.getByTestId('story-runtime-status').getAttribute('data-dialogue-page'))!) as {index:number;count:number;offset:number};}
async function line(page:Page){return (await workspace(page)).playback.lineId as string;}
async function stageTap(page:Page,half:'left'|'right'){
 await rendered(page);
 const bounds=(await page.getByTestId('story-runtime-frame').boundingBox())!;
 const status=page.getByTestId('story-runtime-status');
 const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height'));
 const scale=Math.min(bounds.width/width,bounds.height/height);
 // Above the textbox, inside the actual stage, including when the iframe letterboxes.
 await page.touchscreen.tap(bounds.x+(bounds.width-width*scale)/2+width*scale*(half==='left'?.2:.8),bounds.y+(bounds.height-height*scale)/2+height*scale*.2);
}
async function settings(page:Page){const quick=page.getByRole('button',{name:'설정',exact:true});if(await quick.isVisible())await quick.tap();else{await page.getByRole('button',{name:'읽기 메뉴',exact:true}).tap();await page.getByRole('button',{name:'읽기 설정',exact:true}).tap();}return page.getByRole('dialog');}
async function closeMenu(page:Page){await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).tap();await expect(page.getByRole('dialog')).not.toBeVisible();await rendered(page);}
async function assertStill(page:Page,expectedLine:string,index:number){
 // Allow multiple native polling frames so an accidental delayed advance is observable.
 await page.waitForTimeout(300);
 expect(await line(page)).toBe(expectedLine);expect((await textPage(page)).index).toBe(index);
}

for(const viewport of [{width:390,height:844},{width:844,height:390}]){
 test(`native touch navigation and persisted reading controls at ${viewport.width}x${viewport.height}`,async({page},info)=>{
  test.setTimeout(150000);
  await page.route('**/api/**',route=>route.abort());
  await page.setViewportSize({width:1280,height:800});await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await page.locator('[data-work-menu]>summary').click();
  await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'touch.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});
  await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const original=(await workspace(page)).document.project;
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await rendered(page);
  await page.setViewportSize(viewport);const status=await rendered(page);
  await expect.poll(()=>line(page)).toBe('first');
  // Default left background touch advances, rather than selecting previous.
  await stageTap(page,'left');await expect.poll(()=>line(page)).toBe('long');await rendered(page);
  expect((await textPage(page)).index).toBe(0);expect((await textPage(page)).count).toBeGreaterThan(2);
  await page.getByRole('button',{name:'다음으로',exact:true}).focus();
  let dialog=await settings(page);
  await expect(dialog.getByLabel('화면 터치 방식')).toHaveValue('next');
  await dialog.getByLabel('화면 터치 방식').selectOption('halves');
  await expect(dialog.getByLabel('화면 터치 방식')).toHaveValue('halves');
  await dialog.getByRole('heading').tap();await assertStill(page,'long',0);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).tapMode,READER_PREFERENCES_KEY)).toBe('halves');
  await page.screenshot({path:info.outputPath('touch-settings.png')});await closeMenu(page);
  await stageTap(page,'right');await expect.poll(async()=>(await textPage(page)).index).toBe(1);
  await stageTap(page,'left');await expect.poll(async()=>(await textPage(page)).index).toBe(0);
  expect(await line(page)).toBe('long');
  await stageTap(page,'left');await expect.poll(()=>line(page)).toBe('first');await rendered(page);
  // Ignored first-cut left input must not consume the revision and lock subsequent right input.
  const firstRevision=await status.getAttribute('data-scene-revision');
  await stageTap(page,'left');await assertStill(page,'first',0);expect(await status.getAttribute('data-scene-revision')).toBe(firstRevision);
  await stageTap(page,'right');await expect.poll(()=>line(page)).toBe('long');await rendered(page);
  // Reload the actual service, requiring the reader control to survive remount/reopen.
  await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  const play=page.getByRole('button',{name:'이 컷부터 재생',exact:true});if(await play.isVisible())await play.click();
  await rendered(page);
  dialog=await settings(page);await expect(dialog.getByLabel('화면 터치 방식')).toHaveValue('halves');await closeMenu(page);
  // Continue all remaining native text pages to the choice cut.
  for(let step=0;step<80&&await line(page)!=='choice';step++){
   const beforeLine=await line(page),beforePage=(await textPage(page)).index;
   await stageTap(page,'right');
   await expect.poll(async()=>`${await line(page)}:${(await textPage(page)).index}`).not.toBe(`${beforeLine}:${beforePage}`);await rendered(page);
  }
  expect(await line(page)).toBe('choice');
  await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');
  const beforeChoice=(await workspace(page)).playback;
  await stageTap(page,'right');await assertStill(page,'choice',0);
  expect((await workspace(page)).playback).toEqual(beforeChoice);
  await stageTap(page,'left');await expect.poll(()=>line(page)).toBe('long');await rendered(page);
  for(let step=0;step<80&&await line(page)!=='choice';step++){
   const before=`${await line(page)}:${(await textPage(page)).index}`;
   await stageTap(page,'right');await expect.poll(async()=>`${await line(page)}:${(await textPage(page)).index}`).not.toBe(before);await rendered(page);
  }
  expect(await line(page)).toBe('choice');
  await page.screenshot({path:info.outputPath('native-choice-touch-gate.png')});
  // Select the actual native first choice, above the modal's background back target.
  const bounds=(await page.getByTestId('story-runtime-frame').boundingBox())!;
  const rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};
  const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height'));
  const scale=Math.min(bounds.width/width,bounds.height/height);
  await page.touchscreen.tap(bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+(rect.y+24+92+48)*scale);
  await expect.poll(()=>line(page)).toBe('end');await rendered(page);
  await stageTap(page,'right');await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');await rendered(page);
  await stageTap(page,'left');await expect(page.getByTestId('playback-status')).toHaveText('읽는 중');await rendered(page);
  expect(await line(page)).toBe('end');
  expect((await workspace(page)).document.project).toEqual(original);
 });
}
