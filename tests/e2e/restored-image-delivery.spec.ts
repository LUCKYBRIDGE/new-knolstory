import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {advanceReading} from './native-reader';

const file='docs/architecture/evidence/new-creation-complete-2026-11-02/new-creation-revised.knolstory';
const authored=parseAuthoringFile(readFileSync(file,'utf8')).project;
const proof=JSON.parse(readFileSync('docs/architecture/evidence/isolated-restore-2026-11-03/static-restore.json','utf8'));

test('independently restored static files render imported choices and conditional media',async({page},info)=>{
 await page.addInitScript(()=>{if(window===window.top&&location.protocol!=='about:')sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});
 const origin=new URL(info.project.use.baseURL!).origin;
 const unexpected:string[]=[],unverified:string[]=[],resources=new Set<string>();
 page.on('request',request=>{if(new URL(request.url()).origin!==origin)unexpected.push(request.url());});
 page.on('response',response=>{
  const path=new URL(response.url()).pathname;
  if(response.ok()&&path.startsWith('/runtime/')){
   resources.add(path);
   if(response.headers()['x-knolstory-restored-manifest']!==proof.restore.manifestSha256)unverified.push(path);
  }
 });
 const response=await page.goto('/?view=editor');
 expect(response?.headers()['x-knolstory-restored-manifest']).toBe(proof.restore.manifestSha256);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(authored.lines[0].id);
 const ready=async()=>{
  const status=page.getByTestId('story-runtime-status');
  await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision')),{timeout:90000}).toBe(true);
 };
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready();
 const frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});
 if(await gate.count())await gate.press('Enter');
 const choice=page.getByRole('button',{name:'함께 건넌다',exact:true});await choice.focus();await choice.press('Enter');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(authored.lines[1].id);
 await ready();await expect(page.getByLabel('신뢰 현재 점수',{exact:true})).toHaveText('2');
 await advanceReading(page);await ready();
 const runtime=page.frames().find(item=>item.url().includes('/runtime/'))!;
 const scene=await runtime.evaluate(()=>(window as unknown as {renpy_exec:(script:string)=>Promise<{text:string;effects:unknown[];sounds:unknown[];paths:string[]}>}).renpy_exec('result = {"text": knol_scene["dialogue"]["text"], "effects": knol_scene["presentation"].get("effects", []), "sounds": knol_scene["audio"].get("sounds", []), "paths": knol_prepared_image_paths}'));
 expect(scene.text).toBe(authored.lines[2].text);expect(scene.effects).toHaveLength(1);expect(scene.sounds).toHaveLength(1);expect(scene.paths.length).toBeGreaterThan(0);
 // This work first uses audio on the common cut, so the native unlock appears here.
 if(await gate.count())await gate.press('Enter');await ready();
 await expect.poll(async()=>Number(await page.getByTestId('story-runtime-status').getAttribute('data-sound-play-count'))).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(authored.lines[2].id);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(authored);
 expect(resources.has('/runtime/game.zip')).toBe(true);expect([...resources].some(path=>path.startsWith('/runtime/game/assets/'))).toBe(true);
 expect(unexpected).toEqual([]);expect(unverified).toEqual([]);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('restored-native.png')});
 await info.attach('restored-serving-proof',{body:JSON.stringify({manifestSha256:proof.restore.manifestSha256,files:proof.restore.files,sourceOrigin:origin,verifiedRuntimeResources:[...resources].sort(),unexpectedRequests:unexpected,unverifiedResponses:unverified,wholeManuscriptPreserved:true,score:2,conditionalSoundAndEffect:true}),contentType:'application/json'});
});
