import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolveStageComposition,type StoryProject} from '../../packages/story-domain/src';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
import {enterLibrary,startShelfCreation} from './library-entry';
import {advanceReading,openEditorDetails,restartReading} from './native-reader';
import {nativeDiagnostics} from './native-diagnostics';
import {replayStoryVisits} from '../../packages/runtime-core/src/scene-visits';
import type {PlaybackState} from '../../packages/runtime-core/src/story-runtime';

const title='함께 건넌 숲의 다리 · 새 창작 검사';
const texts=['친구와 함께 다리를 건널까요?','친구는 내 손을 잡고 다리를 건넜다.','우리는 다리 건너 숲에서 다시 만났다.'];
const background='seonnyeo.background.BG01-valley-day';
const actor='seonnyeo.character.M01-base';
const workspace='knolstory-next-workspace-v1';

async function menu(page:Page){
 const details=page.locator('[data-work-menu]');
 if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();
}
async function screen(page:Page,value:string){
 await menu(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(value);
}
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function selectCut(page:Page,id:string){await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(id);}
async function pick(page:Page,label:string,asset:string,query:string){
 await page.getByRole('button',{name:new RegExp(`^${label} 이미지 찾기 ·`)}).click();
 const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
 await dialog.getByLabel('이미지 검색',{exact:true}).fill(query);
 await dialog.locator(`[data-asset-id="${asset}"]`).click();
 await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
}
async function flow(page:Page,value:string){
 await screen(page,'basic');await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');
 await page.getByRole('combobox',{name:'진행 방식',exact:true}).selectOption(value);
 const confirmation=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});
 if(await confirmation.isVisible())await confirmation.getByRole('button',{name:'진행 방식 변경',exact:true}).click();
}
async function exportFile(page:Page,path:string,action='작품 파일 내보내기'){
 await saved(page);await menu(page);const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:action,exact:true}).click();
 const download=await pending;expect(download.suggestedFilename()).toMatch(/\.knolstory$/);await download.saveAs(path);
 return parseAuthoringFile(readFileSync(path,'utf8')).project as StoryProject;
}
async function apiUnavailable(context:BrowserContext){
 await context.addInitScript(()=>{if(window!==window.top||location.protocol==='about:')return;sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:undefined});});
 await context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"SD-04 isolated API unavailable"}'}));
}
async function importFile(page:Page,path:string){
 await page.goto('/?view=editor');await saved(page);await menu(page);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(path);await confirmAuthoringImport(page);
 const preparation=page.getByRole('region',{name:'작품 설정',exact:true});
 if(await preparation.isVisible())await preparation.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();
 await saved(page);
}
async function ready(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:120000});
 await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision')),{timeout:30000}).toBe(true);
}
async function currentCut(page:Page,id:string){
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).playback.lineId,workspace),{timeout:30000}).toBe(id);
 await ready(page);
}
async function nativeScene(page:Page){
 const runtime=page.frames().find(frame=>frame.url().includes('/runtime/'));
 if(!runtime)throw Error('Actual RenPy iframe is missing');
 return runtime.evaluate(()=>(window as unknown as {renpy_exec:(code:string)=>Promise<{sceneId:string;effects:unknown[];sounds:unknown[]}>}).renpy_exec('result = {"sceneId": knol_scene["sceneId"], "effects": (knol_scene.get("presentation") or {}).get("effects", []), "sounds": (knol_scene.get("audio") or {}).get("sounds", [])}'));
}

// The older authoring journey proves basic UI creation and score skipping. This
// scenario adds their unproven intersection with conditional media and re-saving.
test('new scored story retains conditional native media through isolated edit and re-save',async({page,browser},info)=>{
 test.setTimeout(300000);page.setDefaultTimeout(15000);await page.setViewportSize({width:1280,height:900});
 await apiUnavailable(page.context());await page.route('**/runtime/**',route=>route.abort());
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
 await page.getByLabel('새 작품 제목',{exact:true}).fill(title);
 await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await page.locator('[data-current-cut] textarea').fill(texts[0]!);
 await pick(page,'1컷 배경',background,'계곡');
 await menu(page);await openEditorDetails(page,'편집 설정');
 for(const feature of ['인물','음향','연출','선택지','점수','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
 await page.getByRole('button',{name:'이야기 점수 설정 열기',exact:true}).click();
 const scores=page.getByRole('region',{name:'이야기 점수 설정',exact:true});
 await scores.getByLabel('새 점수 이름',{exact:true}).fill('신뢰');
 await scores.getByLabel('새 점수 설명',{exact:true}).fill('친구와 함께 건넌 마음');
 await scores.getByRole('button',{name:'점수 만들기',exact:true}).click();
 await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'현재 컷으로 돌아가기',exact:true}).click();
 await screen(page,'characters');await pick(page,'1컷 인물 추가',actor,'나무꾼');await screen(page,'basic');
 const ids:string[]=[];
 for(const [index,text] of texts.entries()){
  if(index){await menu(page);await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();}
  ids.push(await page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue());
  await page.locator('[data-current-cut] textarea').fill(text);
 }
 await selectCut(page,ids[0]!);await flow(page,'choice');await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');
 await page.getByLabel('선택지 1 문구',{exact:true}).fill('함께 건넌다');
 await page.getByLabel('선택지 2 문구',{exact:true}).fill('혼자 건넌다');
 for(const option of [1,2])await page.getByLabel(`선택지 ${option} 도착 컷`,{exact:true}).selectOption(ids[1]!);
 const choice=page.locator('[class*="choiceCard"]').first();
 await choice.locator('summary').filter({hasText:'선택 결과·표시 조건'}).click();
 await choice.getByRole('button',{name:'점수 변화 추가',exact:true}).click();
 const delta=page.getByLabel('선택지 1 결과 1 적용할 값',{exact:true});await delta.fill('2');await delta.blur();
 await selectCut(page,ids[1]!);await openEditorDetails(page,'이 컷을 보여 줄 조건');
 await page.locator('[data-scene-visibility]').getByRole('button',{name:'조건 추가',exact:true}).click();
 await expect(page.getByLabel('2컷 표시 점수 조건 조건 1 값',{exact:true})).toHaveValue('1');
 await selectCut(page,ids[2]!);await flow(page,'ending');
 await screen(page,'audio');await openEditorDetails(page,'3컷 음향 수정');
 await page.getByRole('combobox',{name:'조정할 소리',exact:true}).selectOption('sounds');
 await page.getByRole('button',{name:'효과음 추가',exact:true}).click();
 await page.getByLabel('1번 효과음',{exact:true}).selectOption('audio:sound:chime');
 const condition=page.getByLabel('1번 효과음 갈래 조건',{exact:true});
 const exactChoice=await condition.locator('option').filter({hasText:'함께 건넌다'}).getAttribute('value');
 expect(exactChoice).toBeTruthy();await condition.selectOption(exactChoice!);
 await screen(page,'direction');await openEditorDetails(page,'3컷 연출 수정');
 await page.getByRole('combobox',{name:'조정할 연출',exact:true}).selectOption('effects');
 await page.getByLabel('효과',{exact:true}).selectOption('shake');
 await page.getByRole('dialog',{name:'화면 흔들림',exact:true}).getByRole('button',{name:'사용',exact:true}).click();
 await page.getByLabel('효과 갈래 조건',{exact:true}).selectOption(exactChoice!);
 const file=info.outputPath('new-creation.knolstory');const authored=await exportFile(page,file,'작품 파일 저장');
 expect(authored.title).toBe(title);expect(authored.lines.map(line=>line.text)).toEqual(texts);
 const decision=authored.lines[0]!,common=authored.lines[2]!;
 if(decision.flow?.type!=='choice')throw Error('Authored choice is missing');
 const branchCondition={sourceLineId:ids[0]!,choiceId:decision.flow.options[0]!.id};
 expect(common.audio?.sounds?.[0]).toMatchObject({assetId:'audio:sound:chime',branchCondition});
 expect(common.presentation?.effects?.[0]).toMatchObject({type:'shake',branchCondition});
 expect(authored.lines[1]!.visibility?.scores).toMatchObject({terms:[{scoreId:authored.scores![0]!.id,operator:'gte',value:1}]});
 expect(decision.backgroundId).toBe(background);
 expect(resolveStageComposition(authored.chapters[0],decision,authored).leftActors.map(value=>value.assetId)).toContain(actor);

 const diagnostics=nativeDiagnostics(info.outputPath('native-diagnostics.jsonl'));
 const fresh=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1280,height:900}});
 diagnostics.attach(fresh);await apiUnavailable(fresh);
 let revised:StoryProject;
 try{
  const reading=await fresh.newPage();reading.setDefaultTimeout(15000);await importFile(reading,file);
  expect(await exportFile(reading,info.outputPath('fresh-original.knolstory'))).toEqual(authored);
  await screen(reading,'basic');await selectCut(reading,ids[0]!);
  await reading.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(reading);
  const frame=reading.getByTestId('story-runtime-frame'),identity=await frame.elementHandle();
  const status=reading.getByTestId('story-runtime-status');
  for(const [active,label] of [[true,'함께 건넌다'],[false,'혼자 건넌다']] as const){
   if(!active){await restartReading(reading);await ready(reading);}
   const before=Number(await status.getAttribute('data-sound-play-count'));
   const button=reading.getByRole('button',{name:label,exact:true});await button.focus();await button.press('Enter');
   await currentCut(reading,active?ids[1]!:ids[2]!);
   await expect(reading.getByLabel('신뢰 현재 점수',{exact:true})).toHaveText(active?'2':'0');
   if(active){await advanceReading(reading);await currentCut(reading,ids[2]!);}
   const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});
   if(await gate.count())await gate.press('Enter');await ready(reading);
   const scene=await nativeScene(reading);expect(scene.sceneId).toMatch(new RegExp(`/${ids[2]!}$`));
   expect(scene.effects).toHaveLength(active?1:0);expect(scene.sounds).toHaveLength(active?1:0);
   if(active){
    expect(scene.effects[0]).toMatchObject({type:'shake'});expect(scene.effects[0]).not.toHaveProperty('branchCondition');
    await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBeGreaterThan(before);
   }else await expect(status).toHaveAttribute('data-sound-play-count',String(before));
   await reading.getByTestId('story-stage-viewport').screenshot({path:info.outputPath(`native-${active?'active':'inactive'}.png`)});
   await advanceReading(reading);await expect(reading.getByTestId('playback-status')).toHaveText('이야기 끝');
   // Core preserves hidden structural visits for replay; the visible path differs.
   await expect.poll(()=>reading.evaluate(key=>JSON.parse(localStorage.getItem(key)!).playback.path,workspace)).toEqual(ids);
   const playback:PlaybackState=await reading.evaluate(key=>JSON.parse(localStorage.getItem(key)!).playback,workspace);
   expect(replayStoryVisits(authored,playback).visits.filter(visit=>visit.visible).map(visit=>visit.lineId)).toEqual(active?ids:[ids[0],ids[2]]);
   expect(await identity!.evaluate(node=>node===document.querySelector('[data-testid=story-runtime-frame]'))).toBe(true);
  }
  await reading.getByRole('button',{name:'편집으로 돌아가기',exact:true}).click();await screen(reading,'basic');
  expect(await exportFile(reading,info.outputPath('after-native.knolstory'))).toEqual(authored);
  await selectCut(reading,ids[2]!);
  const editedText='우리는 다리 건너 숲에서 서로의 이야기를 들었다.';
  await reading.locator('[data-current-cut] textarea').fill(editedText);
  revised=await exportFile(reading,info.outputPath('new-creation-revised.knolstory'),'작품 파일 저장');
  expect(revised).toEqual({...authored,updatedAt:revised.updatedAt,lines:authored.lines.map(line=>line.id===ids[2]?{...line,text:editedText}:line)});
  await reading.reload();await saved(reading);
  expect(await exportFile(reading,info.outputPath('revised-after-reload.knolstory'))).toEqual(revised);
 }finally{await fresh.close();}
 const third=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1280,height:900}});
 await apiUnavailable(third);await third.route('**/runtime/**',route=>route.abort());
 try{
  const reopened=await third.newPage();await importFile(reopened,info.outputPath('new-creation-revised.knolstory'));
  expect(await exportFile(reopened,info.outputPath('third-context.knolstory'))).toEqual(revised!);
 }finally{await third.close();}
});
