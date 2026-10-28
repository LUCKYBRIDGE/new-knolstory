import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {readFileSync} from 'node:fs';
const base=createBlankStoryProject({id:'manuscript-choice',chapterId:'ch',lineId:'a'}),first=base.lines[0],project={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'audio:music:night',loop:true}}})),lines:[{...first,text:'앞 문장. 뒤 문장.',flow:{type:'choice' as const,options:[{id:'yes',label:'첫 번째 선택',targetLineId:'b'},{id:'no',label:'두 번째 선택',targetLineId:'b'}]}},{...first,id:'b',order:2,text:'같은 컷, 서로 다른 선택 조건',audio:{music:{action:'play' as const,assetId:'audio:music:forest',loop:true,sourceStartMs:200,sourceEndMs:1800,branchCondition:{sourceLineId:'a',choiceId:'yes'}}},presentation:{effects:[{id:'flash',type:'flash' as const,branchCondition:{sourceLineId:'a',choiceId:'yes'}}]}}]};
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
async function rendered(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const rev=await status.getAttribute('data-rendered-revision');return rev!==null&&Number(rev)>=0&&rev===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);}
async function load(page:Page,file?:string){
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file??{name:'choices.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 const menu=page.locator('[data-work-menu]');if(await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
}
async function exportFile(page:Page,file:string){const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();await(await download).saveAs(file);return parseAuthoringFile(readFileSync(file,'utf8')).project;}
for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:700,height:440},{width:701,height:440},{width:390,height:480}])test(`expanded editor tools never cover active editing at ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.setViewportSize(viewport);await load(page);await page.getByText('현재 컷 상세·메모·정리',{exact:true}).click();
 const dock=page.locator('[data-additional-dock]>details[open]'),body=page.locator('[data-editing-body]');
 const d=await dock.boundingBox(),b=await body.boundingBox();expect(d).toBeTruthy();expect(b).toBeTruthy();expect(d!.y).toBeGreaterThanOrEqual(b!.y+b!.height-1);
 await expect(page.locator('#story-line-text')).toBeVisible();await page.locator('#story-line-text').fill('겹침 없이 작성한 글');await dock.getByRole('button',{name:'현재 컷 복제',exact:true}).click();await expect.poll(async()=>(await stored(page)).lines.length).toBe(3);
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click({trial:true,timeout:5000});await page.screenshot({path:info.outputPath('expanded-tools.png')});
 await page.getByText('현재 컷 상세·메모·정리',{exact:true}).click();await expect(dock).toHaveCount(0);
 const context=page.locator('[data-stacked-context]');if(await context.isVisible()){
  await context.getByText('이 장의 컷 목록',{exact:true}).click();const panel=context.locator('details[open]'),r=await panel.boundingBox(),bb=await body.boundingBox();expect(r!.y).toBeGreaterThanOrEqual(bb!.y+bb!.height-1);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click({trial:true,timeout:5000});await page.keyboard.press('Escape');
  const listSummary=context.getByText('이 장의 컷 목록',{exact:true}),notesSummary=context.getByText('현재 컷 메모·연결 정보',{exact:true}),dockSummary=page.getByText('현재 컷 상세·메모·정리',{exact:true});
  await listSummary.focus();await listSummary.press('Enter');await expect(context.locator('details[open]')).toHaveCount(1);
  await notesSummary.focus();await notesSummary.press('Enter');await expect(context.locator('details[open]')).toHaveCount(1);
  await dockSummary.focus();await dockSummary.press('Enter');await expect(context.locator('details[open]')).toHaveCount(0);await expect(dock).toHaveCount(1);
  await dockSummary.press('Escape');await expect(dock).toHaveCount(0);await expect(dockSummary).toBeFocused();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('tools-no-overlap.png')});
});
