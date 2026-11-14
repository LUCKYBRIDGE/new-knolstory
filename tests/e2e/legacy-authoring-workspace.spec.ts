import {expectIndependentImportedProject,parseAuthoringFile,confirmAuthoringImport,currentCutRow,currentCutText} from './authoring-file';
import {enableEditing,openChoiceEditing,openCurrentCutDetail,openEditingScreen} from './editor-screens';
import {enterLibrary,startShelfCreation} from './library-entry';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {suppressFullscreenOffer} from './mobile-fullscreen-offer';
test.beforeEach(async({page})=>{await suppressFullscreenOffer(page);});
const hero='heungbu.character.heungbu-swallow-care';
const variant='heungbu.character.heungbu-young';
// The picker lists primary backgrounds first; the former scene illustration is now a secondary candidate.
const bg='rabbit-turtle.background.rabbit-turtle-bg-palace';
async function management(page:Page) {
 const summary=page.locator('[data-work-menu]>summary');
 if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open)) await summary.click();
}
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');}
async function exportProject(page:Page){await saved(page);await management(page);const exchange=page.locator('[data-file-exchange]');if(!await exchange.evaluate(node=>(node as HTMLDetailsElement).open))await exchange.locator(':scope>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,project:parseAuthoringFile(readFileSync(path,'utf8')).project};}
async function tool(page:Page,name:string){if(['컷 목록','선택지 편집','연출 편집','소리 편집'].includes(name)){const details=page.locator('[data-additional-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();}await page.getByRole('button',{name,exact:true}).click();if(name==='배경·인물 편집'){const details=page.locator('[data-placement-details]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();}}
async function writer(page:Page){const details=page.locator('[data-writing-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await page.getByRole('button',{name:'장 전체 글 고치기',exact:true}).click();return page.getByRole('region',{name:'장 전체 글 고치기',exact:true});}
async function cutView(page:Page){const details=page.locator('[data-writing-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await page.getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();}
async function currentId(page:Page){return page.getByLabel('현재 장과 컷 이동',{exact:true}).inputValue();}
async function selectCut(page:Page,id:string){await cutView(page);await tool(page,'컷 목록');const cut=page.locator(`[data-line-id="${id}"]`);const details=cut.locator('..');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await cut.click();}
async function pick(page:Page,label:string,id:string,search=''){
 await page.getByRole('button',{name:label.endsWith('이미지')?`${label} 찾기`:`${label} 이미지 찾기`,exact:true}).click();
 const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
 await expect(dialog).toBeVisible();if(search)await dialog.getByLabel('이미지 검색').fill(search);
 await dialog.locator(`[data-asset-id="${id}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);
}
/** Current-UI authoring: chapter settings in the 설정 menu, text and speaker in the basic view, character placement on 인물 편집, flow in the choice dock. */
async function pickAsset(page:Page,button:string,dialogName:string,id:string,search=''){
 await page.getByRole('button',{name:new RegExp(`^${button} ·`)}).click();
 const dialog=page.getByRole('dialog',{name:dialogName,exact:true});await expect(dialog).toBeVisible();if(search)await dialog.getByLabel('이미지 검색').fill(search);
 await dialog.locator(`[data-asset-id="${id}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);
}
async function pickTo(page:Page,label:string,id:string,search=''){await pickAsset(page,label.endsWith('이미지')?`${label} 찾기`:`${label} 이미지 찾기`,`이미지 선택 · ${label}`,id,search);}
async function chooseCut(page:Page,id:string){await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(id);}
async function setFlow(page:Page,value:string){
 await page.getByLabel('진행 방식',{exact:true}).selectOption(value);
 const confirm=page.getByRole('dialog',{name:'진행 방식 변경 확인',exact:true});if(await confirm.isVisible())await confirm.getByRole('button',{name:'진행 방식 변경',exact:true}).click();
}
async function author(page:Page){
 await page.goto('/');await enterLibrary(page);
 await startShelfCreation(page);await page.getByLabel('새 작품 제목').fill('장 대본과 그림 자료실');await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
 const first=await currentId(page);
 // Chapter title, outline and default background live in 설정 > 현재 컷의 장 설정. (The old chapter-wide speaker registry no longer exists; speakers are set per cut below.)
 await management(page);const chapter=page.locator('details[data-chapter-settings]');if(!await chapter.evaluate(node=>(node as HTMLDetailsElement).open))await chapter.locator(':scope>summary').click();
 await chapter.getByLabel('장 제목').fill('첫 만남');await chapter.getByLabel('장 개요').fill('두 선택지로 서로 다른 이야기를 써요.');
 await pickTo(page,'장 기본 배경',bg,'용궁');
 await enableEditing(page,'인물','선택지');
 // Cut 1: dialogue by the speaker 나, written in the basic view.
 await page.getByLabel('현재 컷 글 종류',{exact:true}).selectOption('dialogue');await page.getByLabel('현재 컷 화자',{exact:true}).fill('나');await (await currentCutText(page)).fill('나는 두 길 앞에서 흥부의 이야기를 들었다.');
 // Speaker details (folded in 현재 컷 상세·메모·정리): register 흥부 with a default image, then put it on stage.
 const detail=await openCurrentCutDetail(page);
 await detail.getByText('말하는 인물 상세 설정',{exact:true}).click();await detail.getByText('말하는 인물 설정 · 기본 이미지',{exact:true}).click();await detail.getByLabel('새 말하는 인물 이름').fill('흥부');await detail.getByRole('button',{name:'말하는 인물 등록',exact:true}).click();await detail.getByLabel('등록된 말하는 인물').selectOption('흥부');
 await pickTo(page,'말하는 인물 기본 이미지',hero,'흥부');
 const before=(await exportProject(page)).project;expect(before.lines[0].stageComposition.leftActors).toEqual([]);
 await (await openCurrentCutDetail(page)).getByRole('button',{name:'기본 이미지를 무대에 배치',exact:true}).click();
 const composed=(await exportProject(page)).project;const key=composed.lines[0].stageComposition.leftActors[0].key;
 await (await openCurrentCutDetail(page)).getByLabel('말하는 인물 그림').selectOption(key);
 // Placement, size and facing belong to the 인물 편집 screen's per-cut row.
 await openEditingScreen(page,'인물 편집');const row=await currentCutRow(page);
 await row.getByLabel('1컷 인물 1 배치 위치',{exact:true}).selectOption('center');await row.getByLabel('1컷 인물 1 크기',{exact:true}).fill('90');await row.getByLabel('1컷 인물 1 방향',{exact:true}).selectOption('original');
 const beforeVariant=(await exportProject(page)).project;
 // Draft selection and cancel must not mutate the current actor or its identity.
 await row.getByRole('button',{name:/^1컷 인물 1 이미지 찾기 ·/}).click();
 let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'장 자료',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${hero}"]`)).toBeVisible();await dialog.getByRole('button',{name:'전체',exact:true}).click();await dialog.getByRole('button',{name:'같은 인물의 다른 모습',exact:true}).click();await dialog.locator(`[data-asset-id="${variant}"]`).click();await dialog.getByRole('button',{name:'취소',exact:true}).click();
 expect((await exportProject(page)).project).toEqual(beforeVariant);
 await row.getByRole('button',{name:/^1컷 인물 1 이미지 찾기 ·/}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('이미지 검색').fill('흥부');const card=dialog.locator(`[data-asset-id="${variant}"]`);await card.click();await card.locator('..').getByRole('button',{name:/^즐겨찾기 /}).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
 const changed=(await exportProject(page)).project;expect(changed.lines[0].speakerName).toBe('흥부');expect(changed.lines[0].stageComposition.leftActors[0]).toMatchObject({key,assetId:variant,position:'center',scaleMultiplier:.9,facing:'original',characterKey:composed.characters[0].id});
 await row.getByRole('button',{name:/^1컷 인물 1 이미지 찾기 ·/}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'즐겨찾기',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${variant}"]`)).toBeVisible();await dialog.getByRole('button',{name:'최근 사용',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${variant}"]`)).toBeVisible();await dialog.getByRole('button',{name:'취소',exact:true}).click();
 // Two ending cuts, appended with the next-cut card and written in the basic view.
 await openEditingScreen(page,'기본편집');
 await page.getByRole('button',{name:/^\+ 다음 컷 만들기/}).click();const endA=await currentId(page);await page.getByLabel('현재 컷 글 종류',{exact:true}).selectOption('dialogue');await page.getByLabel('현재 컷 화자',{exact:true}).fill('흥부');await (await currentCutText(page)).fill('첫 갈래의 끝이에요.');
 await page.getByRole('button',{name:/^\+ 다음 컷 만들기/}).click();const endB=await currentId(page);await page.getByLabel('현재 컷 글 종류',{exact:true}).selectOption('narration');await (await currentCutText(page)).fill('두 번째 갈래의 끝이에요.');
 for(const id of [endA,endB]){await chooseCut(page,id);await openChoiceEditing(page);await setFlow(page,'ending');}
 await chooseCut(page,first);await openChoiceEditing(page);await setFlow(page,'choice');await page.getByLabel('선택지 1 도착 컷').selectOption(endA);await page.getByLabel('선택지 2 도착 컷').selectOption(endB);await saved(page);
 return {first,endA,endB,key};
}
for(const width of [1280,390]) test(`legacy authoring integrates manuscript, speakers, assets and safe cut operations at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='host');page.setDefaultTimeout(10000);await page.setViewportSize({width,height:width===390?844:900});
 const ids=await author(page);await chooseCut(page,ids.endA);let panel=await openCurrentCutDetail(page);const beforeCopy=(await exportProject(page)).project;await (await openCurrentCutDetail(page)).getByRole('button',{name:'현재 컷 복제',exact:true}).click();const afterCopy=(await exportProject(page)).project;expect(afterCopy.lines.find((line:{id:string})=>line.id===ids.endA)).toEqual(beforeCopy.lines.find((line:{id:string})=>line.id===ids.endA));const copy=await currentId(page);panel=await openCurrentCutDetail(page);await panel.getByRole('button',{name:'현재 컷 위로',exact:true}).click();await panel.getByRole('button',{name:'현재 컷 아래로',exact:true}).click();
 // Moving a cut into another chapter existed only in the removed chapter-wide writer (see report); adding a chapter and keeping every other cut's flow intact remains.
 await management(page);const views=page.getByText('보기 설정',{exact:true}).locator('..');if(!await views.evaluate(node=>(node as HTMLDetailsElement).open))await views.locator(':scope>summary').click();await page.getByRole('button',{name:'장 추가',exact:true}).click();const withChapter=(await exportProject(page)).project;expect(withChapter.chapters.length).toBe(beforeCopy.chapters.length+1);expect(withChapter.lines.find((line:{id:string})=>line.id===ids.endA).flow).toEqual(beforeCopy.lines.find((line:{id:string})=>line.id===ids.endA).flow);
 await chooseCut(page,ids.endA);panel=await openCurrentCutDetail(page);const before=await exportProject(page);await (await openCurrentCutDetail(page)).getByRole('button',{name:'현재 컷 삭제',exact:true}).click();const dialog=page.getByRole('dialog',{name:'컷 삭제 확인'});await expect(dialog).toContainText('이 컷으로 이어지는 곳');await expect(dialog).toContainText('1컷에서 ‘선택 1’를 선택하면');await expect(dialog).toContainText('도착지를 다시 정해야 해요');await dialog.getByRole('button',{name:'삭제 취소'}).click();expect((await exportProject(page)).project).toEqual(before.project);
 await (await openCurrentCutDetail(page)).getByRole('button',{name:'현재 컷 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 실행'}).click();expect((await exportProject(page)).project.lines.find((l:{id:string})=>l.id===ids.first).flow.options[0].targetLineId).toBe('');await page.getByRole('button',{name:'삭제 되돌리기'}).click();expect((await exportProject(page)).project).toEqual(before.project);
 await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(before.path); await confirmAuthoringImport(page);await page.getByRole('region',{name:'작품 설정',exact:true}).getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await saved(page);await page.reload();expectIndependentImportedProject((await exportProject(page)).project,before.project);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`writer-${width}.png`)});
});
test('new manuscript story survives files and reaches both endings in native RenPy',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(180000);page.setDefaultTimeout(10000);const ids=await author(page);await selectCut(page,ids.endA);let panel=await writer(page);await panel.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();const sourceBefore=(await exportProject(page)).project.lines.find((line:{id:string})=>line.id===ids.endA);await panel.getByRole('button',{name:'현재 컷 복제',exact:true}).click();const copy=await currentId(page);expect((await exportProject(page)).project.lines.find((line:{id:string})=>line.id===ids.endA)).toEqual(sourceBefore);await cutView(page);await tool(page,'컷 목록');await page.getByRole('button',{name:'새 장 추가',exact:true}).click();const destination=(await exportProject(page)).project.lines.find((line:{id:string})=>![ids.first,ids.endA,ids.endB,copy].includes(line.id)).chapterId;await selectCut(page,copy);panel=await writer(page);await panel.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await panel.getByLabel('컷 이동할 장').selectOption(destination);await panel.getByRole('button',{name:'다른 장으로 이동',exact:true}).click();expect((await exportProject(page)).project.lines.find((line:{id:string})=>line.id===ids.endA).flow).toEqual(sourceBefore.flow);const file=await exportProject(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(file.path); await confirmAuthoringImport(page);await page.getByRole('region',{name:'작품 설정',exact:true}).getByRole('button',{name:'현재 컷 쓰기',exact:true}).click();await saved(page);await page.reload();
 const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(n=>n.setAttribute('data-legacy-instance','persistent'));
 async function rendered(){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:120000});await expect.poll(async()=>{const rev=await status.getAttribute('data-rendered-revision');return rev!==null&&Number(rev)>=0&&rev===await status.getAttribute('data-scene-revision');},{timeout:120000}).toBe(true);}
 for (const [index,id] of [ids.endA,ids.endB].entries()) {
  if(index===0){const views=page.getByText('보기 설정',{exact:true}).locator('..');if(!await views.evaluate(node=>(node as HTMLDetailsElement).open))await views.locator(':scope>summary').click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();}
  else{await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await page.getByRole('dialog',{name:'처음부터 읽을까요?',exact:true}).getByRole('button',{name:'처음부터 읽기',exact:true}).click();}
  await rendered();await expect(page.getByTestId('playback-status')).toHaveText('선택해 주세요');await frame.scrollIntoViewIfNeeded();const bounds=(await frame.boundingBox())!,status=page.getByTestId('story-runtime-status'),rect=JSON.parse((await status.getAttribute('data-choices-rect'))!) as {x:number;y:number;width:number;height:number};expect(rect).not.toBeNull();const width=Number(await status.getAttribute('data-scene-width')),height=Number(await status.getAttribute('data-scene-height')),scale=Math.min(bounds.width/width,bounds.height/height);
  await page.mouse.click(bounds.x+(bounds.width-width*scale)/2+(rect.x+rect.width/2)*scale,bounds.y+(bounds.height-height*scale)/2+(rect.y+Math.min(20,Math.floor(rect.height/8))+25+index*50)*scale);
  await expect(page.locator(`[data-line-id="${id}"]`)).toHaveAttribute('aria-current','true');await rendered();const next=page.getByRole('button',{name:'다음으로',exact:true});await expect(next).toBeEnabled();await next.focus();await next.press('Enter');await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');await rendered();await expect(frame).toHaveAttribute('data-legacy-instance','persistent');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).playback);expect(state.path).toEqual([ids.first,id]);
 }
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).focus();await page.screenshot({path:info.outputPath('native-authored-ending.png')});await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();expectIndependentImportedProject((await exportProject(page)).project,file.project);await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(ids.endB);await writer(page);await rendered();await page.screenshot({path:info.outputPath('native-manuscript.png')});
});
for(const width of [1280,390])test(`thumbnail facets, target comparison and cancel preserve authored work at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='host');page.setDefaultTimeout(10000);await page.addInitScript(()=>{if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');});await page.setViewportSize({width,height:width===390?844:900});await page.goto('/?view=editor');await saved(page);await management(page);await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('background');const before=await exportProject(page);
 await page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false}).click();const dialog=page.getByRole('dialog',{name:'이미지 선택 · 1컷 배경'});await expect(dialog).toContainText('현재 이미지');await expect(dialog).toContainText('선택 미리보기');await expect(dialog).toContainText('적용 대상: 1컷 배경');
 await dialog.getByText('상세 조건으로 찾기',{exact:true}).click();
 for(const label of ['작품','장소','시간','분위기']){
  const summary=dialog.getByText(label,{exact:true});await expect(summary).toHaveCount(1);await summary.click();const group=dialog.getByRole('group',{name:`${label} 조건`});await group.getByRole('button').first().click();await expect(dialog.getByLabel('현재 찾는 조건')).toBeVisible();await dialog.getByRole('button',{name:'모두 지우기',exact:true}).click();
 }
 await dialog.getByLabel('이미지 검색').fill('용궁');const candidate=dialog.locator(`[data-asset-id="${bg}"]`);await expect(candidate).toBeVisible();await candidate.click();await page.screenshot({path:info.outputPath(`asset-browser-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:/^1컷 배경 이미지 찾기 ·/,exact:false})).toBeFocused();expect((await exportProject(page)).project).toEqual(before.project);
});
