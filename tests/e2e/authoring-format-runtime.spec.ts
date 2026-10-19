import {registeredWorkbookCopy} from './registered-workbook-copy';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
import {existingPrivateWorkspace} from './existing-private-audio';
import {startReading,restartReading,editReadCut,advanceReading} from './native-reader';
import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
async function confirmTransition(page:import('@playwright/test').Page){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('전환 화면',{timeout:15000});await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;await page.getByTestId('story-stage-viewport').screenshot({path:`${process.env.KNOL_NATIVE_EVIDENCE_DIR??'test-results/native-current'}/authoring-format/native-confirm.png`});const logicalHeight=Number(await status.getAttribute('data-scene-height'));await page.mouse.click(box.x+box.width*.5,box.y+box.height*(1-64/logicalHeight));await expect(status).not.toContainText('전환 화면',{timeout:15000});}
async function rendered(page:import('@playwright/test').Page){const s=page.getByTestId('story-runtime-status');await expect(s).toContainText('연결됨',{timeout:90000});await expect.poll(()=>s.evaluate(n=>n.getAttribute('data-scene-revision')===n.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);}
for(const source of ['google','excel','korean-google','korean-excel']) {
test(`real ${source} edited full-field work plays two RenPy choice endings after reopen`,async({page})=>{
 test.setTimeout(240000);
 const path=`docs/architecture/evidence/authoring-format/story-${source}-edited.xlsx`;
 const directory=source.startsWith('korean-')?'docs/architecture/evidence/remaining-current-2026-10-14/registered-copies':undefined;
 const copy=await registeredWorkbookCopy(path,directory);
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기').setInputFiles({name:`registered-${source}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:copy.buffer});
 await confirmAuthoringImport(page);await rendered(page);
 const project=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 expect(project).toEqual({...copy.archive.document.project,id:project.id});
 await page.reload();await rendered(page);
 for(let option=0;option<2;option++){
  if(option===0)await startReading(page);else await restartReading(page);await rendered(page);const frame=await page.getByTestId('story-runtime-frame').boundingBox();await page.mouse.click(frame!.x+frame!.width*.5,frame!.y+frame!.height*.1);await rendered(page);await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');await confirmTransition(page);
  const choices=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})}).getByRole('button').filter({hasNotText:/^(다음으로|이전 읽은 컷)$/});await expect(choices).toHaveCount(2);await choices.nth(option).focus();await choices.nth(option).press('Enter');await rendered(page);await confirmTransition(page);await advanceReading(page);await expect(page.getByTestId('playback-status')).toHaveText('이야기 끝');
 }
 await editReadCut(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await rendered(page);await expect(page.getByLabel('대사 / 해설',{exact:true})).toBeVisible();
});
}

for (const viewport of [{width:1280,height:720},{width:390,height:844}]) {
 test(`long transition preserves a reachable native action at ${viewport.width}px`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize(viewport);
  const archive=JSON.parse(readFileSync('docs/architecture/evidence/authoring-format/all-fields-story.knolstory','utf8'));
  archive.document.project.lines[0].presentation.transition.actionLabel='긴 한국어 버튼 문구도 그대로 보존하며 이어 읽습니다. '.repeat(30);
  archive.document.project.lines[0].presentation.transition.description='긴 한국어 전환 설명을 스크롤해서 읽을 수 있습니다.\n'.repeat(45);
  const prior=parseAuthoringFile(JSON.stringify(archive));
  await existingPrivateWorkspace(page,prior.project,prior.audioResources);
  await page.goto('/?view=editor');
  await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
  await rendered(page);
  await startReading(page);
  await rendered(page);
  await page.getByTestId('story-stage-viewport').scrollIntoViewIfNeeded();
  const frame=(await page.getByTestId('story-runtime-frame').boundingBox())!;
  await page.mouse.click(frame.x+frame.width*.5,frame.y+frame.height*.1);
  await expect(page.getByTestId('story-runtime-status')).toHaveAttribute('data-audio-unlocked','true');
  await confirmTransition(page);
  await expect(page.getByTestId('playback-status')).not.toHaveText('이야기 끝');
 });
}
