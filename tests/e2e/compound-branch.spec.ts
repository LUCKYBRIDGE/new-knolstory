import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const base=createBlankStoryProject({id:'compound-choice-ui',chapterId:'ch',lineId:'first'});
const first={sourceLineId:'first',choiceId:'yes'},second={sourceLineId:'second',choiceId:'yes'};
function project(mode:'single'|'all'|'any'='single'){
 const branchCondition=mode==='single'?first:{mode,terms:[first,second]};
 return {...base,title:'여러 선택 조건 확인',lines:[
  {...base.lines[0],text:'첫 선택',flow:{type:'choice' as const,options:[{id:'yes',label:'첫 선택 예',targetLineId:'second'},{id:'no',label:'첫 선택 아니요',targetLineId:'second'}]}},
  {...base.lines[0],id:'second',order:2,text:'두 번째 선택',flow:{type:'choice' as const,options:[{id:'yes',label:'둘째 선택 예',targetLineId:'scene'},{id:'no',label:'둘째 선택 아니요',targetLineId:'scene'}]}},
  {...base.lines[0],id:'scene',order:3,text:'합류한 장면의 기본 글',presentation:{effects:[{id:'light',type:'spotlight' as const,scope:'following' as const,durationMs:1000,branchCondition}]},audio:{music:{action:'play' as const,assetId:'audio:music:forest',volume:.5,loop:true,branchCondition},ambience:{action:'play' as const,assetId:'audio:music:ambience-forest',volume:.3,branchCondition},sounds:[{id:'bell',assetId:'audio:sound:chime',volume:.5,branchCondition}]}}
 ]};
}
const work=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
async function menu(page:Page){const m=page.locator('[data-work-menu]');if(!await m.evaluate(el=>(el as HTMLDetailsElement).open))await m.locator(':scope>summary').click();}
async function setup(page:Page,mode:'single'|'all'|'any'='single'){await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await menu(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'compound.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-22T00:00:00.000Z',appVersion:'test',project:project(mode)}))});await confirmAuthoringImport(page);await expect.poll(async()=>(await work(page)).title).toBe('여러 선택 조건 확인');
}
async function direction(page:Page){
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('scene');await menu(page);const settings=page.getByText('편집 설정',{exact:true}).locator('..');if(!await settings.evaluate(el=>(el as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();
 await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.getByLabel('편집화면 선택',{exact:true}).selectOption('direction');
 const row=page.getByTestId('editing-cut-scene');await row.getByText('3컷 연출 수정',{exact:true}).click();await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');return row.locator('[data-branch-condition="효과 갈래 조건"]');
}
async function rendered(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-rendered-revision');return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);}
async function choose(page:Page,label:string,lineId:string){await rendered(page);await page.getByRole('button',{name:label,exact:true}).focus();await page.keyboard.press('Enter');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(lineId);await rendered(page);}

test('compound choice editing is optional, exact, undoable and preserved by files',async({page,browser},info)=>{
 await setup(page);const baseline=await work(page),field=await direction(page);
 await expect(field.getByLabel('효과 갈래 조건',{exact:true})).toHaveValue(JSON.stringify(['first','yes']));
 await field.getByRole('button',{name:'선택 조건 추가',exact:true}).click();expect(await work(page)).toEqual(baseline);
 await field.getByLabel('효과 갈래 조건 추가할 선택',{exact:true}).selectOption(JSON.stringify(['second','yes']));
 await expect.poll(async()=>(await work(page)).lines[2].presentation.effects[0].branchCondition).toEqual({mode:'all',terms:[first,second]});
 await expect(field.getByRole('button',{name:'효과 갈래 조건 2번 선택 · 이 조건 삭제',exact:true})).toHaveAccessibleName(/이 조건 삭제/);
 await field.getByLabel('효과 갈래 조건 결합 방식',{exact:true}).selectOption('any');
 await page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true}).click();await expect(field.getByLabel('효과 갈래 조건 결합 방식',{exact:true})).toHaveValue('all');
 await field.getByLabel('효과 갈래 조건 결합 방식',{exact:true}).selectOption('any');
 await expect(field.getByLabel('효과 갈래 조건 2번 선택',{exact:true}).locator('option').filter({hasText:'첫 선택 예'})).toHaveAttribute('disabled','');
 for(const size of [{width:1280,height:800},{width:768,height:1024},{width:390,height:844},{width:844,height:460}]){
  await page.setViewportSize(size);await field.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const bounds=(await field.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(size.width);await page.screenshot({path:info.outputPath(`compound-${size.width}.png`)});
 }
 const authored=await work(page);await menu(page);const settings=page.getByText('편집 설정',{exact:true}).locator('..');if(!await settings.evaluate(el=>(el as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).uncheck();await expect(page.locator('[data-branch-condition]')).toHaveCount(0);expect(await work(page)).toEqual(authored);await page.getByRole('checkbox',{name:'분기조건 편집 사용',exact:true}).check();await page.keyboard.press('Escape');expect({...authored,updatedAt:baseline.updatedAt,lines:authored.lines.map((line:{id:string;presentation?:{effects?:Record<string,unknown>[]}})=>line.id==='scene'?{...line,presentation:{...line.presentation,effects:line.presentation!.effects!.map(cue=>({...cue,branchCondition:baseline.lines[2].presentation.effects[0].branchCondition}))}}:line)}).toEqual(baseline);
 await menu(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=info.outputPath('compound.knolstory');await(await download).saveAs(file);expect(parseAuthoringFile(readFileSync(file,'utf8')).project).toEqual(authored);
 const fresh=await browser.newContext();const other=await fresh.newPage();await setup(other);await menu(other);await other.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(other);await expect.poll(async()=>(await work(other)).lines[2].presentation.effects[0].branchCondition).toEqual(authored.lines[2].presentation.effects[0].branchCondition);const reopened=await work(other);expect(reopened).toEqual({...authored,id:reopened.id});await fresh.close();
 await page.reload();const restored=await direction(page);await expect(restored.getByLabel('효과 갈래 조건 결합 방식',{exact:true})).toHaveValue('any');await restored.getByRole('button',{name:'효과 갈래 조건 2번 선택 · 이 조건 삭제',exact:true}).click();await expect.poll(async()=>(await work(page)).lines[2].presentation.effects[0].branchCondition).toEqual({mode:'any',terms:[first]});
});
for(const [mode,a,b,active] of [['all',true,true,true],['all',true,false,false],['any',true,false,true],['any',false,false,false]] as const)test(`actual same-target choices resolve ${mode} ${a}/${b}`,async({page},info)=>{
 await setup(page,mode);const authored=await work(page),frame=page.getByTestId('story-runtime-frame');await frame.evaluate(node=>(node as HTMLIFrameElement).contentWindow!.addEventListener('message',event=>{if(event.data?.type==='loadScene')node.setAttribute('data-compound-scene',JSON.stringify(event.data.payload));}));
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await choose(page,a?'첫 선택 예':'첫 선택 아니요','second');await choose(page,b?'둘째 선택 예':'둘째 선택 아니요','scene');
 const status=page.getByTestId('story-runtime-status');if(active){const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');}
 const scene=JSON.parse((await frame.getAttribute('data-compound-scene'))!);expect(scene.presentation?.effects??[]).toHaveLength(active?1:0);expect(scene.audio?.sounds??[]).toHaveLength(active?1:0);await expect(status).toHaveAttribute('data-music-path',active?/forest/:'');await expect(status).toHaveAttribute('data-ambience-path',active?/forest/:'');
 if(active){expect(scene.presentation.effects[0]).not.toHaveProperty('branchCondition');await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBeGreaterThan(0);}
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath(`compound-${mode}-${a}-${b}.png`)});await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();expect(await work(page)).toEqual(authored);
});
