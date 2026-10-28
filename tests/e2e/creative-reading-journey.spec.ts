import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {startShelfCreation,enterLibrary} from './library-entry';
import {advanceReading,editReadCut,loadReadSlot,openEditorDetails,readerFullscreen,readerTools,restartReading,saveReadSlot,startReading} from './native-reader';
import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {nativeDiagnostics} from './native-diagnostics';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
// This spec owns traces for its two explicit contexts.
test.use({trace:'off'});
const evidence=`${process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/native-current'}/creative-reading`; // Outputs only; historical fixtures remain read-only.
const title='숲의 약속 · 두 길에서 만나는 친구';
const background='seonnyeo.background.BG-forest-roots';
const actor='heungbu.character.heungbu-young';
const chapters=[
 {number:1,branch:'',title:'여행의 시작',texts:['아침 빛이 작은 숲을 깨웠다.','흥부는 친구에게 줄 선물을 챙겼다.','나는 흥부와 함께 숲 입구로 걸었다.']},
 {number:2,branch:'',title:'두 길 앞에서',texts:['숲 깊은 곳에서 두 길이 나타났다.','밝은 길에서는 새가 노래하고, 밤길에서는 별이 빛났다.','어느 길로 친구를 찾아갈까?']},
 {number:3,branch:'A',title:'햇빛의 길',texts:['햇빛 아래에서 작은 제비를 만났다.','제비가 알려 준 길을 따라 다리로 향했다.']},
 {number:3,branch:'B',title:'별빛의 길',texts:['별빛 아래에서 길 잃은 친구를 만났다.','우리는 서로 손을 잡고 다리로 향했다.']},
 {number:4,branch:'',title:'다시 만나는 다리',texts:['서로 다른 길을 지나 같은 다리에서 만났다.','다음 여행에서도 서로의 이야기를 듣기로 약속했다.']},
];
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function manage(page:Page){const summary=page.locator('[data-work-menu]>summary');if(!await summary.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await summary.click();}
async function settings(page:Page){await manage(page);await openEditorDetails(page,'편집 설정');}
async function screen(page:Page,label:string){await manage(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption({label});}
async function setFlow(page:Page,value:string){await page.getByLabel('진행 방식').selectOption(value);const dialog=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});await page.waitForTimeout(60);if(await dialog.isVisible())await dialog.getByRole('button',{name:'진행 방식 변경',exact:true}).click();}
async function tool(page:Page,name:string){
 if(name==='선택지 편집'){await screen(page,'기본편집');await openEditorDetails(page,'현재 컷의 선택지·분기조건 편집');return;}
 if(name==='글 편집'){await screen(page,'기본편집');await openEditorDetails(page,'현재 컷 상세·메모·정리');return;}
 const target=name==='배경·인물 편집'?'인물 편집':name==='소리 편집'?'음향 편집':name;await screen(page,target);
 if(target==='음향 편집'||target==='연출 편집'){const current=await id(page),row=page.getByTestId(`editing-cut-${current}`),summary=row.getByText(target==='음향 편집'?/^[0-9]+컷 음향 수정$/:/^[0-9]+컷 연출 수정$/);if(!await summary.locator('..').evaluate(n=>(n as HTMLDetailsElement).open))await summary.click();await expect(row.getByLabel(target==='음향 편집'?'조정할 소리':'조정할 연출',{exact:true})).toBeVisible();}
}
async function writing(page:Page,view:'현재 컷 쓰기'|'장 전체 글 고치기'){await screen(page,view==='현재 컷 쓰기'?'기본편집':'글 편집');}
async function chapterSettings(page:Page){await manage(page);await openEditorDetails(page,'현재 컷의 장 설정');return page.locator('[data-chapter-settings]');}
async function addCut(page:Page){await manage(page);await page.getByRole('button',{name:'현재 컷 뒤에 추가',exact:true}).click();await screen(page,'기본편집');}
async function newChapter(page:Page){await manage(page);await openEditorDetails(page,'보기 설정');await page.getByRole('button',{name:'장 추가',exact:true}).click();await screen(page,'기본편집');}
async function id(page:Page){return page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();}
async function select(page:Page,lineId:string){await writing(page,'현재 컷 쓰기');await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(lineId);}
async function pick(page:Page,label:string,asset:string){await page.getByRole('button',{name:new RegExp(`^${`${label} 이미지 찾기`} ·`),exact:false}).click();const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});await dialog.getByLabel('이미지 검색').fill(asset===background?'폭풍이 지나간 숲':'흥부');await dialog.locator(`[data-asset-id="${asset}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();}
async function exportFile(page:Page,path:string){await saved(page);await manage(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();await(await pending).saveAs(path);return parseAuthoringFile(readFileSync(path,'utf8'));}
async function ready(page:Page){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});await expect.poll(()=>status.evaluate(n=>Number(n.getAttribute('data-rendered-revision'))>=0&&n.getAttribute('data-scene-revision')===n.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);await expect.poll(()=>page.evaluate(()=>{const viewport=document.querySelector('[data-testid="story-stage-viewport"]')!.getBoundingClientRect();const status=document.querySelector('[data-testid="story-runtime-status"]')!;const width=Number(status.getAttribute('data-scene-width')),height=Number(status.getAttribute('data-scene-height')),frame=document.querySelector('[data-testid="story-runtime-frame"]')!.getBoundingClientRect();return Math.abs(width/height-frame.width/frame.height)<.02&&frame.width<=viewport.width+2&&frame.height<=viewport.height+2&&Number(status.getAttribute('data-engine-width'))===width&&Number(status.getAttribute('data-engine-height'))===height;}),{timeout:30000}).toBe(true);}
async function currentReadCut(page:Page,lineId:string){
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(lineId);await ready(page);
}
async function next(page:Page){
 const state=()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback));
 const before=await state();await advanceReading(page);await expect.poll(state).not.toBe(before);await ready(page);
}
async function choose(page:Page,index:number,target:string){
 await ready(page);const frame=page.getByTestId('story-runtime-frame');await frame.scrollIntoViewIfNeeded();await frame.contentFrame().locator('#canvas').focus();
 const bounds=(await frame.boundingBox())!,status=page.getByTestId('story-runtime-status');
 const rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};expect(rect).not.toBeNull();
 const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height);
 await page.mouse.click(bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+(rect.y+24+92+48+index*108)*scale);
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.lineId)).toBe(target);await ready(page);
}
async function shot(page:Page,name:string){await page.screenshot({path:`${evidence}/${name}.png`});}
async function author(page:Page){
 await page.goto('/');await enterLibrary(page);await startShelfCreation(page);await page.getByLabel('새 작품 제목').fill(title);await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 await settings(page);for(const feature of ['인물','음향','선택지','분기조건'])await page.getByRole('checkbox',{name:`${feature} 편집 사용`,exact:true}).check();
 const groups:string[][]=[];
 for(const [chapterIndex,chapter] of chapters.entries()){
  if(chapterIndex===1||chapterIndex===4)await newChapter(page);
  if(chapterIndex===2||chapterIndex===3){await select(page,groups[1]![2]!);await tool(page,'선택지 편집');await page.getByRole('button',{name:`선택지 ${chapterIndex-1}에 새 장 연결`,exact:true}).click();await page.getByRole('dialog',{name:'새 갈래 작성',exact:true}).getByRole('button',{name:'새 갈래 만들고 글쓰기',exact:true}).click();}
  let controls=await chapterSettings(page);await openEditorDetails(page,'장 번호·갈래 표시');
  if(chapter.branch){await expect(controls.getByLabel('장 번호',{exact:true})).toHaveValue('3');await expect(controls.getByLabel('장 갈래 표시',{exact:true})).toHaveValue(chapter.branch);}else{await controls.getByLabel('장 번호',{exact:true}).fill(String(chapter.number));await controls.getByLabel('장 갈래 표시',{exact:true}).fill('');}
  await controls.getByLabel(/ 장 제목$/).fill(chapter.title);await controls.getByLabel(/ 장 개요$/).fill(`${chapter.number}장${chapter.branch}에서 친구를 만나는 이야기`);
  await pick(page,'장 기본 배경',background);await openEditorDetails(page,'장 기본 인물');await pick(page,'장 기본 왼쪽 인물',actor);
  if(chapterIndex===0){await openEditorDetails(page,'장 기본 음향');await controls.getByLabel('장 배경음 동작').selectOption('play');await controls.getByLabel('장 배경음',{exact:true}).selectOption('audio:music:forest');await expect(controls.getByLabel('장 배경음',{exact:true})).toHaveValue('audio:music:forest');}
  await writing(page,'현재 컷 쓰기');const cuts:string[]=[];
  for(const [cutIndex,text] of chapter.texts.entries()){
   if(cutIndex)await addCut(page);cuts.push(await id(page));await page.locator('[data-current-cut] textarea').fill(text);await page.getByLabel('현재 컷 글 종류',{exact:true}).selectOption(cutIndex===0?'narration':'dialogue');if(cutIndex)await page.getByLabel('현재 컷 화자',{exact:true}).fill('흥부');
  }
  groups.push(cuts);
  if(chapterIndex===1){await select(page,cuts[2]!);await tool(page,'선택지 편집');await setFlow(page,'choice');await page.getByLabel('선택지 1 문구').fill('햇빛의 길로 가기');await page.getByLabel('선택지 2 문구').fill('별빛의 길로 가기');}
 }
 for(const [from,to] of [[groups[0]![2],groups[1]![0]],[groups[2]![1],groups[4]![0]],[groups[3]![1],groups[4]![0]]]){await select(page,from!);await tool(page,'선택지 편집');await setFlow(page,'goto');await page.getByLabel('도착 컷',{exact:true}).selectOption(to!);}
 await select(page,groups[4]![1]!);await tool(page,'선택지 편집');await setFlow(page,'ending');
 await select(page,groups[0]![0]!);await tool(page,'배경·인물 편집');const first=page.getByTestId(`editing-cut-${groups[0]![0]}`);await pick(page,'1컷 인물 추가',actor);const size=first.getByLabel('1컷 인물 1 크기',{exact:true});await size.press('Home');for(let step=0;step<40;step++)await size.press('ArrowRight');const position=first.getByLabel('1컷 인물 1 가로 위치',{exact:true});await position.press('Home');for(let step=0;step<27;step++)await position.press('ArrowRight');
 await tool(page,'소리 편집');await page.getByRole('combobox',{name:'조정할 소리',exact:true}).selectOption('sounds');await page.getByRole('button',{name:'효과음 추가',exact:true}).click();await page.getByLabel('1번 효과음',{exact:true}).selectOption('audio:sound:chime');await expect(page.getByLabel('1번 효과음',{exact:true})).toHaveValue('audio:sound:chime');
 await settings(page);await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await tool(page,'연출 편집');await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');await page.getByLabel('효과',{exact:true}).selectOption('shake');await page.getByRole('dialog',{name:'화면 흔들림',exact:true}).getByRole('button',{name:'사용',exact:true}).click();await page.getByLabel('효과 대상').selectOption('background');await page.getByLabel('효과 적용 범위').selectOption('following');await page.getByLabel('효과 강도').selectOption('soft');
 await select(page,groups[1]![0]!);await tool(page,'연출 편집');await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');await page.getByLabel('이어지는 효과 끝내기').check();await saved(page);await shot(page,'authoring-scope');
 for(const cuts of groups){await select(page,cuts[1]!);await tool(page,'배경·인물 편집');await pick(page,'2컷 인물 추가',actor);await tool(page,'글 편집');await openEditorDetails(page,'말하는 인물 상세 설정');const speaker=page.getByLabel('말하는 인물 그림',{exact:true});const actorKey=await speaker.locator('option').nth(1).getAttribute('value');expect(actorKey).toBeTruthy();await speaker.selectOption(actorKey!);await page.keyboard.press('Escape');}
 await select(page,groups[1]![2]!);await tool(page,'선택지 편집');await shot(page,'authoring-choice-links');await settings(page);await page.getByRole('button',{name:'전체 흐름 보기',exact:true}).click();await shot(page,'authored-flow');await page.keyboard.press('Escape');
 return groups;
}

test('UI-authored twelve-cut story survives local files and both actual RenPy reading paths',async({playwright},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(480000);mkdirSync(evidence,{recursive:true});
 const diagnostics=nativeDiagnostics(`${evidence}/native-events-${info.repeatEachIndex}.jsonl`);
 const browser=await playwright.chromium.launch({channel:process.env.KNOL_BROWSER_CHANNEL || undefined});const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1280,height:900}});
 let fresh:BrowserContext|undefined,authorTrace=false,readingTrace=false,failed=false;
 diagnostics.attach(context);
 try{
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});authorTrace=true;
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const groups=await author(page);const path=`${evidence}/forest-promise.knolstory`;const original=await exportFile(page,path);expect(original.project.lines).toHaveLength(12);expect(original.project.chapters.map((c:{chapterNumber:number;branchLabel?:string})=>[c.chapterNumber,c.branchLabel??''])).toEqual([[1,''],[2,''],[3,'A'],[3,'B'],[4,'']]);expect(original.audioResources).toEqual([]);expect(original.project.chapters[0].audio.music.assetId).toBe('audio:music:forest');expect(original.project.lines[0].audio.sounds[0].assetId).toBe('audio:sound:chime');
  await page.reload();await saved(page);expect(await exportFile(page,path)).toMatchObject({project:original.project,audioResources:original.audioResources});
  fresh=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1280,height:900},hasTouch:true});diagnostics.attach(fresh);await fresh.tracing.start({screenshots:true,snapshots:true,sources:true});readingTrace=true;const reading=await fresh.newPage();reading.setDefaultTimeout(15000);await reading.goto(new URL('/?view=editor',page.url()).href);await saved(reading);await manage(reading);await reading.getByLabel('작품 파일 가져오기').setInputFiles(path); await confirmAuthoringImport(reading);await saved(reading);const imported=await exportFile(reading,info.outputPath('fresh.knolstory'));expect(imported.project).toEqual(original.project);expect(imported.audioResources).toEqual([]);await manage(reading);await openEditorDetails(reading,'보기 설정');
  await startReading(reading);await ready(reading);const frame=reading.getByTestId('story-runtime-frame');await frame.evaluate(n=>n.setAttribute('data-journey-instance','same'));
  const box=(await frame.boundingBox())!;await reading.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.1);await ready(reading);await expect(reading.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');
  const status=reading.getByTestId('story-runtime-status');await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBeGreaterThan(0);await expect.poll(async()=>Number(await status.getAttribute('data-music-start-count'))).toBeGreaterThan(0);const soundBefore=await status.getAttribute('data-sound-play-count');const musicBefore=await status.getAttribute('data-music-start-count');await readerFullscreen(reading);await expect.poll(()=>reading.evaluate(()=>!!document.fullscreenElement)).toBe(true);await expect(frame).toHaveAttribute('data-journey-instance','same');await readerFullscreen(reading,true);await expect.poll(()=>reading.evaluate(()=>!!document.fullscreenElement)).toBe(false);await ready(reading);await saveReadSlot(reading,1);await expect(reading.getByRole('button',{name:'1번 저장',exact:true})).toContainText(chapters[0]!.texts[0]!);await shot(reading,'reading-save');await reading.getByRole('button',{name:'읽기 메뉴 닫기'}).click();await expect(status).toHaveAttribute('data-sound-play-count',soundBefore!);await expect(status).toHaveAttribute('data-music-start-count',musicBefore!);
  for(const [width,height,name] of [[1280,900,'desktop'],[844,390,'phone-landscape'],[390,844,'phone-portrait']] as const){await reading.setViewportSize({width,height});await ready(reading);await expect(frame).toHaveAttribute('data-journey-instance','same');await shot(reading,`reading-${name}`);expect(await reading.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await next(reading);await shot(reading,'reading-phone-portrait-speaker');await loadReadSlot(reading,1);await ready(reading);await reading.setViewportSize({width:1280,height:900});await ready(reading);
  for(const branch of [0,1]){
   if(branch){await loadReadSlot(reading,1);await ready(reading);}
   for(let n=0;n<5;n++)await next(reading);
   await expect(reading.getByTestId('playback-status')).toHaveText('선택해 주세요');if(!branch){for(const [width,height,name] of [[1280,900,'desktop'],[844,390,'landscape'],[390,844,'portrait']] as const){await reading.setViewportSize({width,height});await ready(reading);await shot(reading,`reading-choice-${name}`);}await reading.setViewportSize({width:1280,height:900});await ready(reading);}await choose(reading,branch,groups[branch+2]![0]!);await ready(reading);await saved(reading);const branchState=await reading.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback);for(const size of [{width:844,height:390},{width:390,height:844},{width:1280,height:900}]){await reading.setViewportSize(size);await ready(reading);await saved(reading);expect(await reading.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback)).toEqual(branchState);}await readerFullscreen(reading);await expect.poll(()=>reading.evaluate(()=>!!document.fullscreenElement)).toBe(true);await readerFullscreen(reading,true);await ready(reading);await saved(reading);expect(await reading.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback)).toEqual(branchState);await expect(frame).toHaveAttribute('data-journey-instance','same');
   for(let n=0;n<3;n++)await next(reading);
   await readerTools(reading);await reading.getByRole('button',{name:'지난기록',exact:true}).click();const log=reading.getByRole('dialog',{name:'지난기록',exact:true});await expect(log.locator('[data-reader-current-script]')).toContainText(chapters[4]!.texts[1]!);await expect(log.locator('[data-reader-current-script]')).not.toContainText(chapters[branch+2]!.texts[0]!);await expect(log.locator('[data-reader-previous-chapters]')).toContainText(chapters[branch+2]!.title);await expect(log.locator('[data-reader-previous-chapters]')).not.toContainText(chapters[branch?2:3]!.title);await shot(reading,`read-path-${branch?'B':'A'}`);await reading.getByRole('button',{name:'읽기 메뉴 닫기'}).click();await next(reading);await expect(reading.getByTestId('playback-status')).toHaveText('이야기 끝');const actualPath:string[]=await reading.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback.path);expect(actualPath).toEqual([...groups[0]!,...groups[1]!,...groups[branch+2]!,...groups[4]!]);for(const excluded of groups[branch?2:3]!)expect(actualPath).not.toContain(excluded);
  }
  await readerTools(reading);await reading.getByRole('button',{name:'지난기록',exact:true}).click();await reading.getByRole('dialog',{name:'지난기록',exact:true}).locator('[data-player-history-index="3"]').click();await reading.getByRole('dialog',{name:'이전 장의 첫 컷부터 다시 읽을까요?',exact:true}).getByRole('button',{name:'확인',exact:true}).click();await currentReadCut(reading,groups[1]![0]!);await next(reading);await next(reading);await expect(reading.getByTestId('playback-status')).toHaveText('선택해 주세요');await choose(reading,0,groups[2]![0]!);await ready(reading);
  await editReadCut(reading);const afterReading=await exportFile(reading,info.outputPath('after-reading.knolstory'));expect(afterReading.project).toEqual(imported.project);expect(afterReading.audioResources).toEqual([]);await select(reading,groups[0]![1]!);await tool(reading,'글 편집');await reading.getByLabel('대사 / 해설',{exact:true}).fill('흥부는 친구에게 줄 선물과 편지를 챙겼다.');await saved(reading);await reading.keyboard.press('Escape');await reading.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();await ready(reading);await currentReadCut(reading,groups[0]![1]!);await expect(reading.getByRole('region',{name:'이야기 무대',exact:true}).getByText('흥부는 친구에게 줄 선물과 편지를 챙겼다.',{exact:true})).toHaveCount(1);await expect(frame).toHaveAttribute('data-journey-instance','same');await shot(reading,'edited-native-reading');await restartReading(reading);await ready(reading);await currentReadCut(reading,groups[0]![0]!);await expect(reading.getByRole('region',{name:'이야기 무대',exact:true}).getByText(chapters[0]!.texts[0]!,{exact:true})).toHaveCount(1);await expect(frame).toHaveAttribute('data-journey-instance','same');
  writeFileSync(`${evidence}/run-summary.json`,JSON.stringify({browser:await browser.version(),authorship:'Created from blank story using UI controls; no seeded project',cutCount:12,audioPolicy:'Registered forest/chime references; no private uploads or embedded audioResources',chapters:['1','2','3A','3B','4'],routes:['A → 4','B → 4'],checks:['reload','export','isolated-context import','native audio unlock','save/load','actual-path history','history reselection','desktop/phone-landscape/phone-portrait','touch','keyboard Enter','fullscreen enter/exit','menu preserves audio counts','restart','portrait speaker','edit return'],hardware:'Chrome viewport conditions only; no Android hardware claim'},null,2));
 }catch(error){failed=true;throw error;}
 finally{
  const finish=async(target:BrowserContext,name:string,tracing:boolean)=>{
   try{if(tracing){const path=info.outputPath(`${name}-trace.zip`);await target.tracing.stop({path});await info.attach(`${name} actual-context trace`,{path,contentType:'application/zip'});}}
   finally{await target.close();}
  };
  const results=await Promise.allSettled([finish(context,'authoring',authorTrace),...(fresh?[finish(fresh,'reading',readingTrace)]:[])]);
  await browser.close();
  const errors=results.filter((result):result is PromiseRejectedResult=>result.status==='rejected').map(result=>result.reason);
  for(const error of errors)diagnostics.record('cleanup-error',{message:String(error)});
  if(errors.length&&!failed)throw new AggregateError(errors,'Could not preserve actual-context trace or close creative journey contexts.');
 }

});
