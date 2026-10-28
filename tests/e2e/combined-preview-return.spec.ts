import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
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

test('combined editor returns focus to current-cut controls after crossing a chapter',async({page})=>{
 await page.setViewportSize({width:800,height:1100});await setup(page,undefined,true);const row=page.getByTestId('editing-cut-cut99');await row.getByRole('button',{name:'이 컷 선택',exact:true}).click();await row.locator('textarea[data-cut-id]').fill('다음 장으로 이어갑니다.');
 await menu(page);await page.getByText('편집 설정',{exact:true}).click();for(const name of ['음향','연출'])await page.getByRole('checkbox',{name:`${name} 편집 사용`,exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('audio-direction');
 const before=await stored(page),details=page.locator('[data-combined-details]');await details.getByRole('button',{name:'이 컷 재생',exact:true}).click();const status=page.getByTestId('story-runtime-status');const rendered=()=>expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&await status.getAttribute('data-rendered-revision')===await status.getAttribute('data-scene-revision'),{timeout:120000}).toBe(true);await rendered();
 const advance=page.getByRole('button',{name:'다음으로',exact:true});await advance.focus();await advance.press('Enter');await rendered();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe('cut100');
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'편집할 장',exact:true})).toHaveValue('ch1');await expect(details).toContainText('1컷');await expect(details.getByRole('combobox',{name:'통합 화면 편집할 항목',exact:true})).toBeFocused();
 const current=page.locator('[data-combined-timeline]').getByRole('button',{name:'1컷으로 이동',exact:true});await expect(current).toHaveAttribute('aria-current','step');const visible=await current.evaluate(el=>{const row=el.getBoundingClientRect(),area=el.closest('[role="region"]')!.getBoundingClientRect();return {left:row.left,right:row.right,areaLeft:area.left,areaRight:area.right};});expect(visible.right).toBeGreaterThan(visible.areaLeft);expect(visible.left).toBeLessThan(visible.areaRight);expect(await stored(page)).toEqual(before);
 const area=page.getByRole('region',{name:'음향·연출 작업 영역',exact:true});await area.evaluate(el=>{el.scrollLeft=240;el.scrollTop=80;});const pan=await area.evaluate(el=>({left:el.scrollLeft,top:el.scrollTop}));expect(pan.left).toBeGreaterThan(0);
 await details.getByRole('button',{name:'이 컷 재생',exact:true}).click();await rendered();await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect.poll(()=>area.evaluate(el=>({left:el.scrollLeft,top:el.scrollTop}))).toEqual(pan);expect(await stored(page)).toEqual(before);
});
