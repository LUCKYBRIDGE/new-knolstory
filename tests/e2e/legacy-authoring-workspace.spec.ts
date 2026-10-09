import {startShelfCreation} from './library-entry';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const hero='heungbu.character.heungbu-swallow-care';
const variant='heungbu.character.heungbu-young';
const bg='rabbit-turtle.background.rabbit-palace-reveal';
async function management(page:Page) {
 const summary=page.getByText('작품 관리',{exact:true});
 if(await summary.isVisible() && !await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open)) await summary.click();
}
async function saved(page:Page){await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');}
async function exportProject(page:Page){await saved(page);await management(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,project:JSON.parse(readFileSync(path,'utf8')).project};}
async function tool(page:Page,name:string){const button=page.getByRole('button',{name,exact:true});if(await button.isVisible())await button.click();}
async function writer(page:Page){await page.getByRole('button',{name:'이 장 대본',exact:true}).click();return page.getByRole('region',{name:'이 장 대본',exact:true});}
async function cutView(page:Page){await page.getByRole('button',{name:'현재 컷 꾸미기',exact:true}).click();}
async function currentId(page:Page){return(await page.locator('[data-line-id][aria-current="true"]').getAttribute('data-line-id'))!;}
async function selectCut(page:Page,id:string){await cutView(page);await tool(page,'컷 목록');const cut=page.locator(`[data-line-id="${id}"]`);await cut.evaluate(node=>{const d=node.closest('details');if(d)d.open=true;});await cut.click();}
async function pick(page:Page,label:string,id:string,search=''){
 await page.getByRole('button',{name:`${label} 이미지 찾기`,exact:true}).click();
 const dialog=page.getByRole('dialog',{name:`이미지 선택 · ${label}`,exact:true});
 await expect(dialog).toBeVisible();if(search)await dialog.getByLabel('이미지 검색').fill(search);
 await dialog.locator(`[data-asset-id="${id}"]`).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();await expect(dialog).toHaveCount(0);
}
async function author(page:Page){
 await page.goto('/?view=editor');await saved(page);await management(page);
 await startShelfCreation(page);await page.getByLabel('새 작품 제목').fill('장 대본과 그림 자료실');await page.getByRole('button',{name:'빈 작품 시작',exact:true}).click();
 const first=await currentId(page);let panel=await writer(page);
 await panel.getByText('장 설정 · 화자와 기본 자료',{exact:true}).click();await page.getByLabel('대본 장 제목').fill('첫 만남');await page.getByLabel('장 개요').fill('두 선택지로 서로 다른 이야기를 씁니다.');await page.getByLabel('장 화자 추가').fill('나');await panel.getByRole('button',{name:'장 화자 등록',exact:true}).click();
 await pick(page,'장 기본 배경',bg,'용궁');
 await pick(page,'장 자료에 인물 추가',hero,'흥부');
 await panel.getByLabel('1컷 글 종류').selectOption('dialogue');await panel.getByLabel('1컷 화자').selectOption('나');await panel.getByLabel('1컷 대사 / 해설').fill('나는 두 길 앞에서 흥부의 이야기를 들었다.');
 await panel.locator(`[data-writer-cut-id="${first}"]`).click();await tool(page,'글 편집');
 await page.getByText('화자 설정 · 기본 이미지',{exact:true}).click();await page.getByLabel('새 화자 이름').fill('흥부');await page.getByRole('button',{name:'화자 등록',exact:true}).click();await page.getByLabel('등록 화자').selectOption('흥부');
 await pick(page,'화자 기본 이미지',hero,'흥부');
 const before=(await exportProject(page)).project;expect(before.lines[0].stageComposition.leftActors).toEqual([]);
 await page.getByRole('button',{name:'기본 이미지를 무대에 배치',exact:true}).click();
 const composed=(await exportProject(page)).project;const key=composed.lines[0].stageComposition.leftActors[0].key;
 await page.getByLabel('말하는 무대 인물').selectOption(key);await tool(page,'자산 편집');await page.getByLabel(`왼쪽 1번 인물 배치`,{exact:true}).selectOption('center');await page.getByLabel(`왼쪽 1번 인물 크기 배율`,{exact:true}).fill('0.9');await page.getByLabel(`왼쪽 1번 인물 방향`,{exact:true}).selectOption('original');
 // Draft selection and cancel must not mutate the current actor or its identity.
 await page.getByRole('button',{name:`왼쪽 1번 인물 이미지 이미지 찾기`,exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'장 자료',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${hero}"]`)).toBeVisible();await dialog.getByRole('button',{name:'전체',exact:true}).click();await dialog.getByRole('button',{name:'같은 인물의 다른 모습',exact:true}).click();await dialog.locator(`[data-asset-id="${variant}"]`).click();await dialog.getByRole('button',{name:'취소',exact:true}).click();
 expect((await exportProject(page)).project.lines[0].stageComposition.leftActors[0].assetId).toBe(hero);
 await page.getByRole('button',{name:`왼쪽 1번 인물 이미지 이미지 찾기`,exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('이미지 검색').fill('흥부');const card=dialog.locator(`[data-asset-id="${variant}"]`);await card.click();await card.locator('..').getByRole('button',{name:/^즐겨찾기 /}).click();await dialog.getByRole('button',{name:'선택한 이미지 적용',exact:true}).click();
 const changed=(await exportProject(page)).project;expect(changed.lines[0].speakerName).toBe('흥부');expect(changed.lines[0].stageComposition.leftActors[0]).toMatchObject({key,assetId:variant,position:'center',scaleMultiplier:.9,facing:'original',characterKey:composed.characters[0].id});
 await page.getByRole('button',{name:`왼쪽 1번 인물 이미지 이미지 찾기`,exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'즐겨찾기',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${variant}"]`)).toBeVisible();await dialog.getByRole('button',{name:'최근 사용',exact:true}).click();await expect(dialog.locator(`[data-asset-id="${variant}"]`)).toBeVisible();await dialog.getByRole('button',{name:'취소',exact:true}).click();
 panel=await writer(page);await panel.getByRole('button',{name:'대사 컷 추가',exact:true}).click();const endA=await currentId(page);await panel.getByLabel('2컷 대사 / 해설').fill('첫 갈래의 끝입니다.');await panel.getByLabel('2컷 화자').selectOption('흥부');await panel.getByRole('button',{name:'해설 컷 추가',exact:true}).click();const endB=await currentId(page);await panel.getByLabel('3컷 대사 / 해설').fill('두 번째 갈래의 끝입니다.');
 for(const id of [endA,endB]){await selectCut(page,id);await tool(page,'선택지 편집');await page.getByLabel('진행 방식').selectOption('ending');}
 await selectCut(page,first);await tool(page,'선택지 편집');await page.getByLabel('진행 방식').selectOption('choice');await page.getByLabel('선택지 1 도착 컷').selectOption(endA);await page.getByLabel('선택지 2 도착 컷').selectOption(endB);await saved(page);
 return {first,endA,endB,key};
}
for(const width of [1280,390]) test(`legacy authoring integrates manuscript, speakers, assets and safe cut operations at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='host');page.setDefaultTimeout(10000);await page.setViewportSize({width,height:width===390?844:900});
 const ids=await author(page);await selectCut(page,ids.endA);let panel=await writer(page);await panel.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await panel.getByRole('button',{name:'현재 컷 복제',exact:true}).click();const copy=await currentId(page);await panel.getByRole('button',{name:'현재 컷 위로',exact:true}).click();await panel.getByRole('button',{name:'현재 컷 아래로',exact:true}).click();
 await cutView(page);await tool(page,'컷 목록');await page.getByRole('button',{name:'새 장 추가',exact:true}).click();const secondChapter=(await exportProject(page)).project.lines.find((l:{id:string})=>l.id!==ids.first&&l.id!==ids.endA&&l.id!==ids.endB&&l.id!==copy).chapterId;
 await selectCut(page,copy);panel=await writer(page);await panel.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();await panel.getByLabel('컷 이동할 장').selectOption(secondChapter);await panel.getByRole('button',{name:'다른 장으로 이동',exact:true}).click();expect((await exportProject(page)).project.lines.find((l:{id:string})=>l.id===copy).chapterId).toBe(secondChapter);
 await selectCut(page,ids.endA);panel=await writer(page);await panel.getByText('컷 정리 · 복제/이동/삭제',{exact:true}).click();const before=await exportProject(page);await panel.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();const dialog=page.getByRole('dialog',{name:'컷 삭제 확인'});await expect(dialog).toContainText('명시 연결 1개');await dialog.getByRole('button',{name:'삭제 취소'}).click();expect((await exportProject(page)).project).toEqual(before.project);
 await panel.getByRole('button',{name:'현재 컷 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 실행'}).click();expect((await exportProject(page)).project.lines.find((l:{id:string})=>l.id===ids.first).flow.options[0].targetLineId).toBe('');await page.getByRole('button',{name:'삭제 되돌리기'}).click();expect((await exportProject(page)).project).toEqual(before.project);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(before.path);await saved(page);await page.reload();expect((await exportProject(page)).project).toEqual(before.project);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await writer(page);await page.screenshot({path:info.outputPath(`writer-${width}.png`)});
});
test('new manuscript story survives files and reaches both endings in native RenPy',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(180000);page.setDefaultTimeout(10000);const ids=await author(page);const file=await exportProject(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(file.path);await saved(page);await page.reload();
 const frame=page.getByTestId('story-runtime-frame');await frame.evaluate(n=>n.setAttribute('data-legacy-instance','persistent'));
 async function rendered(){await expect(page.getByTestId('story-runtime-status')).toContainText('연결됨',{timeout:90000});await expect.poll(()=>page.getByTestId('story-runtime-status').evaluate(n=>n.getAttribute('data-rendered-revision')===n.getAttribute('data-scene-revision')),{timeout:30000}).toBe(true);}
 for(const [index,id] of [ids.endA,ids.endB].entries()) {await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered();const bounds=(await frame.boundingBox())!;await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*(Math.min(110,Number(await page.getByTestId('story-runtime-status').getAttribute('data-textbox-y'))*.2)+45+index*55)/Number(await page.getByTestId('story-runtime-status').getAttribute('data-scene-height')));await expect(page.locator(`[data-line-id="${id}"]`)).toHaveAttribute('aria-current','true');await rendered();await page.getByRole('button',{name:'다음으로',exact:true}).click();await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');await expect(frame).toHaveAttribute('data-legacy-instance','persistent');}
 await page.screenshot({path:info.outputPath('native-authored-ending.png')});await page.getByRole('button',{name:'편집으로',exact:true}).click();expect((await exportProject(page)).project).toEqual(file.project);await writer(page);await rendered();await page.screenshot({path:info.outputPath('native-manuscript.png')});
});
for(const width of [1280,390])test(`thumbnail facets, target comparison and cancel preserve authored work at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='host');page.setDefaultTimeout(10000);await page.setViewportSize({width,height:width===390?844:900});await page.goto('/?view=editor');await saved(page);await tool(page,'자산 편집');const before=await exportProject(page);
 await page.getByRole('button',{name:'배경 이미지 찾기',exact:true}).click();const dialog=page.getByRole('dialog',{name:'이미지 선택 · 배경'});await expect(dialog).toContainText('현재 이미지');await expect(dialog).toContainText('선택 미리보기');await expect(dialog).toContainText('적용 대상: 배경');
 for(const label of ['작품','장소','시간','분위기']){
  const summary=dialog.getByText(label,{exact:true});if(await summary.count()){await summary.click();const group=dialog.getByRole('group',{name:`${label} 조건`});await group.getByRole('button').first().click();await expect(dialog.getByLabel('현재 찾는 조건')).toBeVisible();await dialog.getByRole('button',{name:'모두 지우기',exact:true}).click();}
 }
 await dialog.getByLabel('이미지 검색').fill('용궁');const candidate=dialog.locator(`[data-asset-id="${bg}"]`);await expect(candidate).toBeVisible();await candidate.click();await page.screenshot({path:info.outputPath(`asset-browser-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'배경 이미지 찾기',exact:true})).toBeFocused();expect((await exportProject(page)).project).toEqual(before.project);
});
