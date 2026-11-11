import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

const receipt=JSON.parse(readFileSync('docs/architecture/evidence/transparency-repair-2026-11-11/generation.json','utf8'));
const source=JSON.parse(readFileSync('tests/fixtures/stories/heungbu.json','utf8'));
const samples=[{line:'scene-2-4',name:'heungbu-pleading'},{line:'scene-12a-27',name:'nolbu-working'}];

for(const width of [390,1280])test(`existing Heungbu work resolves transparent repairs in native playback and preserves export at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===390?844:800});
 await page.addInitScript(()=>sessionStorage.setItem('knolstory-fullscreen-offered-v1','1'));
 await page.route('**/api/**',route=>route.abort());
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'heungbu.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-11-11T00:00:00.000Z',appVersion:'test',project:source}))});
 await confirmAuthoringImport(page);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.title)).toBe(source.title);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 for(const sample of samples){
  await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(sample.line);
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  const status=page.getByTestId('story-runtime-status');
  await expect.poll(async()=>{
   const revision=await status.getAttribute('data-rendered-revision');
   return revision!==null&&Number(revision)>=0&&revision===await status.getAttribute('data-scene-revision');
  },{timeout:120000}).toBe(true);
  const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'))!;
  const paths=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(script:string)=>Promise<string[]>}).renpy_exec('result = knol_prepared_image_paths'));
  const path=`assets/characters/transparency-v2/${sample.name}.webp`;
  expect(paths).toContain(path);
  const response=await page.request.get('/runtime/game/'+path);
  expect(response.ok()).toBe(true);
  const row=receipt.assets.find((asset:{output:string})=>asset.output.endsWith('/'+sample.name+'.webp'));
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(row.outputSha256);
  await page.getByTestId('story-runtime-frame').screenshot({path:info.outputPath(`${sample.name}-${width}.png`)});
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
  await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 }
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const file=await pending,path=info.outputPath('preserved.knolstory');await file.saveAs(path);
 expect(parseAuthoringFile(readFileSync(path,'utf8')).project).toEqual(imported);
 await page.keyboard.press('Escape');await page.reload();
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(samples[1].line);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(imported);
});
