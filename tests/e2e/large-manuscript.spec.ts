import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const base=createBlankStoryProject({id:'large-manuscript',chapterId:'ch0',lineId:'cut0',title:'세 장의 긴 작품'});
const project={...base,chapters:Array.from({length:3},(_,i)=>({...base.chapters[0],id:`ch${i}`,order:i+1,chapterNumber:i+1,title:`긴 원고 ${i+1}장`})),lines:Array.from({length:300},(_,i)=>({...base.lines[0],id:`cut${i}`,chapterId:`ch${Math.floor(i/100)}`,order:i%100+1,text:`${i+1}번째 원고.\n`+'앞뒤 문맥과 등장인물의 이야기를 차분히 이어 씁니다. '.repeat(20),flow:{type:'goto' as const,targetLineId:i===299?null:`cut${i+1}`}}))};
const stored=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
async function menu(page:Page){const node=page.locator('[data-work-menu]');if(!await node.evaluate(el=>(el as HTMLDetailsElement).open))await node.locator(':scope>summary').click();}
async function screen(page:Page,value:string){await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(value);}
async function setup(page:Page,file?:string,native=false){
 await page.route('**/api/**',r=>r.abort());if(!native)await page.route('**/runtime/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file??{name:'large.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-23T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await expect.poll(async()=>(await stored(page)).id).toBe(project.id);await screen(page,'text');
}
test('three hundred cuts retain late edits, chapter navigation and full file reopen',async({page,browser},info)=>{
 await setup(page);
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390},{width:820,height:1180}]){
  await page.setViewportSize(viewport);
  const chapters=page.getByRole('combobox',{name:'편집할 장',exact:true});
  await chapters.selectOption('ch0');const first=page.getByTestId('editing-cut-cut99');await first.getByRole('button',{name:'이 컷 선택',exact:true}).click();
  await first.locator('textarea[data-cut-id]').fill(project.lines[99].text+`\n첫 장 교정 ${viewport.width}`);
  await chapters.selectOption('ch2');await expect(page.getByRole('button',{name:'현재 컷 찾기',exact:true})).toBeDisabled();
  const last=page.getByTestId('editing-cut-cut299');await last.getByRole('button',{name:'이 컷 선택',exact:true}).click();await last.locator('textarea[data-cut-id]').fill(project.lines[299].text+`\n마지막 장 교정 ${viewport.width}`);
  await chapters.selectOption('ch1');const middle=page.getByTestId('editing-cut-cut150');await middle.getByRole('button',{name:'이 컷 선택',exact:true}).click();
  const list=page.locator('[data-writer-scroll]').last();await list.evaluate(el=>{el.scrollTop=0;});await page.getByRole('button',{name:'현재 컷 찾기',exact:true}).click();
  await expect(middle).toHaveAttribute('aria-current','step');
  const position=await middle.locator('header').evaluate(el=>{const row=el.getBoundingClientRect(),list=el.closest('[data-writer-scroll]')!.getBoundingClientRect();return {top:row.top,bottom:row.bottom,listTop:list.top,listBottom:list.bottom};});expect(position.top).toBeGreaterThanOrEqual(position.listTop-1);expect(position.top).toBeLessThan(position.listBottom);
  await screen(page,'background');await screen(page,'text');await expect(middle).toHaveAttribute('aria-current','step');await expect(chapters).toHaveValue('ch1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const after=await stored(page);
 expect(after.chapters).toEqual(project.chapters);expect(after.lines).toHaveLength(300);
 for(let i=0;i<300;i++){expect(after.lines[i]).toEqual({...project.lines[i],text:i===99?project.lines[i].text+'\n첫 장 교정 820':i===299?project.lines[i].text+'\n마지막 장 교정 820':project.lines[i].text});}
 await menu(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=info.outputPath('large.knolstory');await(await download).saveAs(file);expect(parseAuthoringFile(readFileSync(file,'utf8')).project).toEqual(after);
 const context=await browser.newContext();try{const reopened=await context.newPage();await setup(reopened,file);expect(await stored(reopened)).toEqual(after);}finally{await context.close();}
});


test('large manuscript native playback crosses chapter and returns to its current editor cut',async({page},info)=>{
 await setup(page,undefined,true);
 await page.setViewportSize({width:390,height:844});
 const row=page.getByTestId('editing-cut-cut99');await row.getByRole('button',{name:'이 컷 선택',exact:true}).click();
 const text=row.locator('textarea[data-cut-id]');await text.fill('첫 장 마지막 컷에서 다음 장으로 이어집니다.');await text.blur();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await stored(page);
 const frame=await page.getByTestId('story-runtime-frame').elementHandle();
 await row.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');
 const rendered=()=>expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);
 await rendered();
 const advance=page.getByRole('button',{name:'다음으로',exact:true});
 for(let i=0;i<20;i++){if(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)==='cut100')break;await advance.focus();await advance.press('Enter');await rendered();}
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('cut100');await rendered();
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await expect(page.getByLabel('편집할 장',{exact:true})).toHaveValue('ch1');await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('cut100');const current=page.getByTestId('editing-cut-cut100').locator('textarea[data-cut-id]');await expect(current).toHaveValue(project.lines[100].text);await expect(current).toBeFocused();
 const visible=await page.getByTestId('editing-cut-cut100').locator('header').evaluate(el=>{const row=el.getBoundingClientRect(),area=el.closest('[data-writer-scroll]')!.getBoundingClientRect();return {top:row.top,bottom:row.bottom,areaTop:area.top,areaBottom:area.bottom};});expect(visible.top).toBeGreaterThanOrEqual(visible.areaTop-1);expect(visible.top).toBeLessThan(visible.areaBottom);
 expect(await frame!.evaluate(node=>node===document.querySelector('[data-testid="story-runtime-frame"]'))).toBe(true);await rendered();
 expect(await stored(page)).toEqual(before);await page.screenshot({path:info.outputPath('large-native-return-390.png')});
});

for(const target of ['background','characters','audio','direction'])test(`advanced ${target} native return reveals current cut without a text field`,async({page},info)=>{
 await setup(page,undefined,true);await page.setViewportSize({width:390,height:844});
 const row=page.getByTestId('editing-cut-cut99');await row.getByRole('button',{name:'이 컷 선택',exact:true}).click();await row.locator('textarea[data-cut-id]').fill('이 장을 마치고 다음 장으로 이어집니다.');
 await menu(page);await page.getByText('편집 설정',{exact:true}).click();for(const name of ['인물','음향','연출'])await page.getByRole('checkbox',{name:`${name} 편집 사용`,exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(target);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await stored(page);
 await row.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=page.getByTestId('story-runtime-status');
 const rendered=()=>expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);await rendered();
 const advance=page.getByRole('button',{name:'다음으로',exact:true});await advance.focus();await advance.press('Enter');await rendered();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('cut100');
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 const current=page.getByTestId('editing-cut-cut100');await expect(current).toHaveAttribute('aria-current','step');await expect(page.getByLabel('편집할 장',{exact:true})).toHaveValue('ch1');
 const visible=await current.locator('header').evaluate(el=>{const row=el.getBoundingClientRect(),area=el.closest('[data-writer-scroll]')!.getBoundingClientRect();return {top:row.top,bottom:row.bottom,areaTop:area.top,areaBottom:area.bottom};});expect(visible.top).toBeGreaterThanOrEqual(visible.areaTop-1);expect(visible.top).toBeLessThan(visible.areaBottom);
 await expect(current.getByRole('button',{name:'이 컷 선택',exact:true})).toBeFocused();expect(await stored(page)).toEqual(before);await page.screenshot({path:info.outputPath(`advanced-return-${target}-390.png`)});
});

test('same-cut closed detail preview preserves an already visible row position',async({page})=>{
 await setup(page,undefined,true);await page.setViewportSize({width:390,height:844});const row=page.getByTestId('editing-cut-cut50');await row.getByRole('button',{name:'이 컷 선택',exact:true}).click();await menu(page);await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await page.getByLabel('편집화면 선택',{exact:true}).selectOption('audio');
 const summary=row.getByText('51컷 음향 수정',{exact:true});await summary.click();const field=row.getByLabel('조정할 소리',{exact:true});await field.focus();await summary.click();
 const list=page.locator('[data-writer-scroll]').last();await list.evaluate(el=>{const header=el.querySelector('[aria-current="step"] header')!.getBoundingClientRect(),bounds=el.getBoundingClientRect();el.scrollTop+=header.top-bounds.top-90;});const before=await list.evaluate(el=>el.scrollTop),projectBefore=await stored(page);
 await row.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(row.getByRole('button',{name:'이 컷 선택',exact:true})).toBeFocused();await expect(field).toBeHidden();await expect.poll(()=>list.evaluate(el=>el.scrollTop)).toBeCloseTo(before,0);expect(await stored(page)).toEqual(projectBefore);
});
