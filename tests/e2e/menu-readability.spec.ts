import {test,expect,type Page,type Locator} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
import {renderedTextContrast} from './rendered-contrast';
const project=createBlankStoryProject({id:'menu-readability',chapterId:'ch',lineId:'a',title:'읽고 쓰는 이야기'});
// Host menu QA; real native scene/touch regressions run separately.
const runtime=`<!doctype html><script>
const send=value=>parent.postMessage({protocol:1,...value},location.origin);
addEventListener('message',event=>{const scene=event.data?.payload;if(event.data?.type!=='loadScene'||!scene)return;send({type:'sceneRendered',sceneId:scene.sceneId,revision:scene.revision,renderMs:1,rendererRect:{x:0,y:0,width:scene.width,height:scene.height},textboxRect:{x:0,y:scene.height*.7,width:scene.width,height:scene.height*.3}});});send({type:'ready',runtimeVersion:'test',contractVersion:1});
</script>`;
async function open(page:Page){
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());await page.route('**/runtime/index.html*',route=>route.fulfill({contentType:'text/html',body:runtime}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'menu.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
}
async function actionIsClear(action:Locator){
 await action.scrollIntoViewIfNeeded();await action.click({trial:true});
 const style=await action.evaluate(node=>{const s=getComputedStyle(node),b=node.getBoundingClientRect();return {background:s.backgroundColor,border:s.borderTopColor,borderWidth:parseFloat(s.borderTopWidth),height:b.height,cursor:s.cursor};});
 expect(style.height).toBeGreaterThanOrEqual(44);expect(style.cursor).toBe('pointer');expect(style.background).not.toBe('rgba(0, 0, 0, 0)');expect(style.borderWidth).toBeGreaterThanOrEqual(1);expect(style.border).not.toBe('rgba(0, 0, 0, 0)');
}
async function opaquePanel(panel:Locator){
 const result=await panel.evaluate(node=>{const style=getComputedStyle(node),box=node.getBoundingClientRect(),rgba=style.backgroundColor.match(/[\d.]+/g)?.map(Number)??[];return {alpha:rgba[3]??1,x:box.x,y:box.y,right:box.right,bottom:box.bottom,vw:innerWidth,vh:innerHeight,overflow:node.scrollWidth>node.clientWidth+1};});
 expect(result.alpha,'menu must hide manuscript and stage underneath').toBe(1);expect(result.x).toBeGreaterThanOrEqual(0);expect(result.y).toBeGreaterThanOrEqual(0);expect(result.right).toBeLessThanOrEqual(result.vw+1);expect(result.bottom).toBeLessThanOrEqual(result.vh+1);expect(result.overflow).toBe(false);
}
for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
 test(`editor settings distinguish actions and explanations ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await open(page);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
  const details=page.locator('[data-work-menu]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();const panel=page.locator('[data-system-menu=editor]');await opaquePanel(panel);
  await actionIsClear(panel.getByRole('button',{name:'작품 정보·표지',exact:true}));const save=panel.getByRole('button',{name:'작품 파일 저장',exact:true});await actionIsClear(save);
  const contrast=await renderedTextContrast(save,info.outputPath('editor-save'));expect(contrast.minimum).toBeGreaterThanOrEqual(4.5);
  const help=panel.locator('[data-file-save-help]');await help.locator('summary').click();await expect(help).toHaveAttribute('open','');await expect(help).toContainText('작품 파일 저장을 대신하지 않아요');await help.locator('summary').click();
  await panel.screenshot({path:info.outputPath('editor-menu.png')});await panel.getByRole('button',{name:'편집 설정 닫기',exact:true}).click();await expect(details).not.toHaveAttribute('open','');await expect(details.locator(':scope>summary')).toBeFocused();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(before);
 });
 test(`reader menu and settings show distinct controls ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await open(page);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
  const menu=page.locator('[data-reader-top-menu]');await opaquePanel(menu);await actionIsClear(menu.getByRole('button',{name:'읽기 설정',exact:true}));await actionIsClear(menu.getByRole('button',{name:'계속 읽기',exact:true}));
  await menu.screenshot({path:info.outputPath('reader-menu.png')});await menu.getByRole('button',{name:'읽기 설정',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'읽기 설정',exact:true});await opaquePanel(dialog);await expect(dialog.getByRole('combobox',{name:'화면 터치 방식',exact:true})).toBeVisible();
  const select=dialog.getByRole('combobox',{name:'화면 터치 방식',exact:true});await select.selectOption('halves');await expect(select).toHaveValue('halves');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-reader-preferences-v1')??'{}').tapMode)).toBe('halves');
  await dialog.screenshot({path:info.outputPath('reader-settings.png')});await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await expect(dialog).not.toBeVisible();
 });
}
