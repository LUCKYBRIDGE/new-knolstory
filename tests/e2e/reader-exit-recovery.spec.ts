import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {createStoryDocument} from '../../packages/story-domain/src';
const workspace='knolstory-next-workspace-v1',saves='knolstory-player-v1';
const project=createBlankStoryProject({id:'reader-exit-recovery',chapterId:'chapter',lineId:'cut',title:'읽던 진행 실패 확인'});
// These are host-menu failure checks. Native reading regressions run separately.
const runtime=`<!doctype html><script>const send=value=>parent.postMessage({protocol:1,...value},location.origin);addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type==='loadScene'&&scene)send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:scene.width,height:scene.height},textboxRect:{x:0,y:scene.height*.7,width:scene.width,height:scene.height*.3}});});send({type:'ready',runtimeVersion:'test',contractVersion:1});</script>`;
async function open(page:Page){
 const document=createStoryDocument({project,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test'});
 await page.addInitScript(({key,document})=>{sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify({document,storyId:'new:reader-exit-recovery',view:'editor',mode:'edit'}));},{key:workspace,document});
 await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/index.html*',route=>route.fulfill({contentType:'text/html',body:runtime}));await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await expect(page.getByTestId('story-runtime-status')).toContainText('연결됨');
}
async function failProgressSave(page:Page){return page.evaluate(key=>{const before=localStorage.getItem(key),original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('full','QuotaExceededError');return original.call(this,name,value);};return before;},saves);}
async function requestLibrary(page:Page){await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();return page.getByRole('dialog',{name:'서재로 돌아갈까요?',exact:true});}
for(const width of [1280,390])test(`reader can explicitly leave after progress storage fails without changing manuscript ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await open(page);const before=await failProgressSave(page);const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace);
 const dialog=await requestLibrary(page);await dialog.getByRole('button',{name:'보관하고 서재로',exact:true}).click();await expect(dialog).toBeVisible();await expect(dialog.getByRole('alert')).toContainText('읽던 진행');
 await expect(dialog.getByRole('button',{name:'진행 저장 없이 서재로',exact:true})).toBeVisible();await expect(dialog).toContainText('이전 기록');
 await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByTestId('story-runtime-frame')).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key),saves)).toBe(before);
 const again=await requestLibrary(page);await again.getByRole('button',{name:'보관하고 서재로',exact:true}).click();await again.getByRole('button',{name:'진행 저장 없이 서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).document.project,workspace)).toEqual(original);expect(await page.evaluate(key=>localStorage.getItem(key),saves)).toBe(before);
});
test('retrying progress storage can return normally without claiming the failed attempt was saved',async({page})=>{
 await open(page);await page.evaluate(key=>{const original=Storage.prototype.setItem;let failing=true;(window as typeof window&{allowProgressSave:()=>void}).allowProgressSave=()=>{failing=false;};Storage.prototype.setItem=function(name,value){if(name===key&&failing)throw new DOMException('full','QuotaExceededError');return original.call(this,name,value);};},saves);
 const dialog=await requestLibrary(page);await dialog.getByRole('button',{name:'보관하고 서재로',exact:true}).click();await expect(dialog.getByRole('button',{name:'진행 저장 없이 서재로',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as typeof window&{allowProgressSave:()=>void}).allowProgressSave());await dialog.getByRole('button',{name:'보관하고 서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재',exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).works['reader-exit-recovery'].auto.playback.lineId,saves)).toBe('cut');
});
