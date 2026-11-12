import {openWorkFileExchange} from './work-file-exchange';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {advanceReading} from './native-reader';

type Entry={characterId:string;name:string;slots:Record<string,string>};
type Asset={id:string;src:string;revision:string;story:string};
const coverage=JSON.parse(readFileSync('packages/asset-registry/src/character-emotions.json','utf8')) as {labels:Record<string,string>;characters:Entry[]};
const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as Asset[];
const cards=coverage.characters.flatMap(character=>Object.entries(character.slots).map(([role,id])=>({character,role,asset:catalog.find(asset=>asset.id===id)!})));
const base=createBlankStoryProject({id:'all-character-emotions',chapterId:'chapter',lineId:'cut-1',title:'모든 인물의 희노애락'});
const source={...base,lines:cards.map((card,index)=>({...base.lines[0],id:`cut-${index+1}`,order:index+1,type:'dialogue' as const,speaker:'left' as const,speakerName:card.character.name,text:card.character.name+' · '+coverage.labels[card.role],leftAssetId:card.asset.id,rightAssetId:'',backgroundMode:'none' as const,backgroundId:'',flow:{type:'goto' as const,targetLineId:index+1<cards.length?`cut-${index+2}`:null},stageComposition:{leftActors:[{key:'person',assetId:card.asset.id,position:'center' as const,facing:'original' as const}],rightActors:[]}}))};

async function importWork(page:Page){
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'emotions.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-11T00:00:00.000Z',appVersion:'test',project:source}))});
 await confirmAuthoringImport(page);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.title)).toBe(source.title);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
}

for(const width of [390,1280])test(`all235cards render through native RenPy and preserve the whole work at ${width}`,async({page},info)=>{
 expect(coverage.characters).toHaveLength(47);expect(cards).toHaveLength(235);
 await page.setViewportSize({width,height:width===390?844:800});const imported=await importWork(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('cut-1');await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');let previous:string|null=null;
 for(const [index,card] of cards.entries()){
  await expect.poll(async()=>{const revision=await status.getAttribute('data-rendered-revision');return revision!==null&&revision!==previous&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);
  previous=await status.getAttribute('data-rendered-revision');
  const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'))!;
  const paths=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(script:string)=>Promise<string[]>}).renpy_exec('result = knol_prepared_image_paths'));
  const path=card.asset.src.slice(1);expect(paths,card.character.characterId+'/'+card.role).toContain(path);
  const response=await page.request.get('/runtime/game/'+path);expect(response.ok()).toBe(true);
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(card.asset.revision);
  if(index%25===0||index===cards.length-1)await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`card-${index+1}-${width}.png`)});
  if(index+1<cards.length)await advanceReading(page);
 }
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await openWorkFileExchange(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=await pending,path=info.outputPath('all-emotions.knolstory');await file.saveAs(path);
 expect(parseAuthoringFile(readFileSync(path,'utf8')).project).toEqual(imported);await page.keyboard.press('Escape');await page.reload();
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('cut-235');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(imported);
});

test('every individual can find five mood cards and preview/cancel/apply/save through the real editor',async({page})=>{
 await importWork(page);await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toHaveValue(source.lines[0].text);
 await page.locator('[data-work-menu]>summary').click();await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'인물 편집 사용',exact:true}).check();await page.getByLabel('편집화면 선택',{exact:true}).selectOption('characters');
 const opener=page.locator('button[aria-label^="1컷 인물 1 이미지 찾기"]');
 for(const character of coverage.characters){
  const before=await opener.getAttribute('data-asset-value');await opener.click();let dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});
  const story=catalog.find(asset=>asset.id===character.slots.neutral)!.story;
  await dialog.getByLabel('이미지 검색').fill(story+' '+character.name);
  for(const id of Object.values(character.slots))await expect(dialog.locator(`[data-asset-id="${id}"]`)).toBeVisible();
  await dialog.locator(`[data-asset-id="${character.slots.anger}"]`).click();await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',before!);
  await opener.click();dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 인물 1',exact:true});await dialog.getByLabel('이미지 검색').fill(story+' '+character.name+' 분노');await dialog.locator(`[data-asset-id="${character.slots.anger}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(opener).toHaveAttribute('data-asset-value',character.slots.anger);
 }
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(opener).toHaveAttribute('data-asset-value',coverage.characters.at(-1)!.slots.anger);
});
