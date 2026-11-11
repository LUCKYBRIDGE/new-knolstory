import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

type Recipe={id:string;slug:string;name:string;label:string;output:string;outputSha256:string};
const recipes=JSON.parse(readFileSync('docs/architecture/evidence/character-expression-expansion-2026-11-11/generation.json','utf8')).assets as Recipe[];
const base=createBlankStoryProject({id:'expression-review',chapterId:'chapter',lineId:'cut-1',title:'네 작품 인물 동작과 표정'});
const source={...base,lines:recipes.map((row,index)=>({...base.lines[0],id:`cut-${index+1}`,order:index+1,type:'dialogue' as const,speaker:'left' as const,speakerName:row.name,text:row.name+' · '+row.label,leftAssetId:row.id,rightAssetId:'',backgroundMode:'none' as const,backgroundId:'',flow:{type:'goto' as const,targetLineId:index+1<recipes.length?`cut-${index+2}`:null},stageComposition:{leftActors:[{key:'person',assetId:row.id,position:'center' as const,facing:'original' as const}],rightActors:[]}}))};

for(const width of [390,1280])test(`all sixteen new expressions render through RenPy and preserve authored export at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===390?844:800});
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'expressions.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-11T00:00:00.000Z',appVersion:'test',project:source}))});
 await confirmAuthoringImport(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.title)).toBe(source.title);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 for(const [index,row] of recipes.entries()){
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(`cut-${index+1}`);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  const status=page.getByTestId('story-runtime-status');
  await expect.poll(async()=>{const revision=await status.getAttribute('data-rendered-revision');return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
  const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'))!;
  const paths=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(script:string)=>Promise<string[]>}).renpy_exec('result = knol_prepared_image_paths'));
  const path=row.output.replace('apps/web/public/','');expect(paths).toContain(path);
  const response=await page.request.get('/runtime/game/'+path);expect(response.ok()).toBe(true);
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(row.outputSha256);
  if(index===15||index%4===0)await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`${row.slug}-${width}.png`)});
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 }
 await page.locator('[data-work-menu]>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending,path=info.outputPath('expressions.knolstory');await file.saveAs(path);
 expect(parseAuthoringFile(readFileSync(path,'utf8')).project).toEqual(imported);
 await page.keyboard.press('Escape');await page.reload();await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('cut-16');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(imported);
});

test('each story addition can be searched, previewed, cancelled and applied in the editor picker',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'expressions.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-11T00:00:00.000Z',appVersion:'test',project:source}))});await confirmAuthoringImport(page);
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(source.lines[0].text);
 await page.locator('[data-work-menu]>summary').click();await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await page.getByLabel('편집화면 선택',{exact:true}).selectOption('characters');
 const opener=page.locator('button[aria-label^="1컷 인물 1 이미지 찾기"]');
 for(const index of [0,4,8,12]){
  const row=recipes[index],before=await opener.getAttribute('data-asset-value');await opener.click();let dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});await dialog.getByLabel('이미지 검색').fill(row.name+' '+row.label);await dialog.locator(`[data-asset-id="${row.id}"]`).click();await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',before!);
  await opener.click();dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});await dialog.getByLabel('이미지 검색').fill(row.name+' '+row.label);await dialog.locator(`[data-asset-id="${row.id}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',row.id);
 }
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(opener).toHaveAttribute('data-asset-value',recipes[12].id);
});
