import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
async function confirmTransition(page:import('@playwright/test').Page){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('전환 화면',{timeout:15000});await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;await page.getByTestId('story-stage-viewport').screenshot({path:'docs/architecture/evidence/authoring-format/native-confirm.png'});const logicalHeight=Number(await status.getAttribute('data-scene-height'));await page.mouse.click(box.x+box.width*.5,box.y+box.height*(1-64/logicalHeight));await expect(status).not.toContainText('전환 화면',{timeout:15000});}
async function rendered(page:import('@playwright/test').Page){const s=page.getByTestId('story-runtime-status');await expect(s).toContainText('연결됨',{timeout:90000});await expect.poll(()=>s.evaluate(n=>n.getAttribute('data-scene-revision')===n.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);}
for(const source of ['google','excel','korean-google','korean-excel']) {
test(`real ${source} edited full-field work plays two RenPy choice endings after reopen`,async({page})=>{
 test.setTimeout(240000);await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await page.getByLabel('작품 파일 가져오기').setInputFiles(`docs/architecture/evidence/authoring-format/story-${source}-edited.xlsx`);await page.getByRole('dialog',{name:'작품 가져오기 확인'}).getByRole('button',{name:'내 사본으로 가져오기'}).click();await rendered(page);
 for(let option=0;option<2;option++){
  await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();await rendered(page);const frame=await page.getByTestId('story-runtime-frame').boundingBox();await page.mouse.click(frame!.x+frame!.width*.5,frame!.y+frame!.height*.1);await rendered(page);await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');await confirmTransition(page);
  const choices=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})}).getByRole('button');await expect(choices).toHaveCount(2);await choices.nth(option).click();await rendered(page);await confirmTransition(page);await page.getByRole('button',{name:'다음으로',exact:true}).click();await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
 }
 await page.getByRole('button',{name:'편집으로',exact:true}).click();await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');await page.reload();await rendered(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});
}

for (const viewport of [{width:1280,height:720},{width:390,height:844}]) {
 test(`long transition preserves a reachable native action at ${viewport.width}px`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize(viewport);
  const archive=JSON.parse(readFileSync('docs/architecture/evidence/authoring-format/all-fields-story.knolstory','utf8'));
  archive.document.project.lines[0].presentation.transition.actionLabel='긴 한국어 버튼 문구도 그대로 보존하며 이어 읽습니다. '.repeat(30);
  archive.document.project.lines[0].presentation.transition.description='긴 한국어 전환 설명을 스크롤해서 읽을 수 있습니다.\n'.repeat(45);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('기기에 저장됨');
  await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'long-transition.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await page.getByRole('dialog',{name:'작품 가져오기 확인'}).getByRole('button',{name:'내 사본으로 가져오기'}).click();
  await rendered(page);
  await page.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
  await rendered(page);
  await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
  const frame=(await page.getByTestId('story-runtime-frame').boundingBox())!;
  await page.mouse.click(frame.x+frame.width*.5,frame.y+frame.height*.1);
  await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');
  await confirmTransition(page);
  await expect(page.getByTestId('playback-status')).not.toHaveText('이야기 끝');
 });
}
