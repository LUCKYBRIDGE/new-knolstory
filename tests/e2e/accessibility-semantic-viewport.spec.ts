import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {confirmAuthoringImport} from './authoring-file';
test('focused semantic choice fits the short viewport and scrolls without clipping',async({page},info)=>{
 await page.setViewportSize({width:475,height:194});
 await page.route('**/runtime/index.html',route=>route.fulfill({contentType:'text/html',body:`<script>const send=v=>parent.postMessage({protocol:1,...v},location.origin);addEventListener('message',e=>{const s=e.data?.payload;if(e.data?.type==='loadScene'){send({type:'sceneRendered',sceneId:s.sceneId,revision:s.revision,renderMs:1,rendererRect:{x:0,y:0,width:s.width,height:s.height},textboxRect:s.textboxRect,engineLogicalSize:{width:s.width,height:s.height}});send({type:'presentationDone',sceneId:s.sceneId,revision:s.revision});}});send({type:'ready',runtimeVersion:'ack-only',contractVersion:1});</script>`}));
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const project=JSON.parse(readFileSync('tests/fixtures/stories/seonnyeo.json','utf8'));project.lines[0].flow={type:'choice',options:[{id:'first',label:'短い画面でもこの選択肢を全部表示する',targetLineId:project.lines[1].id},{id:'other',label:'다른 갈래',targetLineId:project.lines[2].id}]};
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'semantic.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:7,project,savedAt:'2026-10-17T00:00:00.000Z',appVersion:'test'}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const choice=page.getByRole('button',{name:'短い画面でもこの選択肢を全部表示する',exact:true});await expect(choice).toBeEnabled();await choice.focus();
 const measure=await choice.evaluate(node=>{const button=node.getBoundingClientRect(),panel=node.closest('details')!,box=panel.getBoundingClientRect();return {button:{top:button.top,bottom:button.bottom,height:button.height},panel:{top:box.top,bottom:box.bottom,height:box.height,overflow:getComputedStyle(panel).overflowY},viewportHeight:innerHeight};});
 await writeFile(info.outputPath('bounds.json'),JSON.stringify({scope:'Host acknowledgment harness at equivalent CSS layout dimensions; actual Chrome zoom has separate evidence',measure},null,2)+'\n');await page.screenshot({path:info.outputPath('focused-choice.png')});
 expect(measure.panel.overflow).toBe('auto');expect(measure.button.top).toBeGreaterThanOrEqual(Math.max(0,measure.panel.top));expect(measure.button.bottom).toBeLessThanOrEqual(Math.min(measure.viewportHeight,measure.panel.bottom));
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).focus();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).press('Enter');await expect(page.getByRole('group',{name:'읽기 메뉴',exact:true})).toBeVisible();
});
