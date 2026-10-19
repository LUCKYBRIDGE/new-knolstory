import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
const directory='docs/architecture/evidence/non-audio-direction';
const before=parseAuthoringFile(readFileSync(`${directory}/rabbit-effect-duration.knolstory`,'utf8')).project;
async function management(page:Page){
 const menu=page.locator('[data-work-menu]');
 if(!await menu.evaluate(node=>(node as HTMLDetailsElement).open))await menu.locator(':scope > summary').click();
}
async function effects(page:Page){
 const tools=page.locator('[data-additional-tools]');
 if(!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator(':scope > summary').click();
 await page.getByRole('button',{name:'연출 편집',exact:true}).click();
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');
}
for(const app of ['excel','google'])test(`actual ${app} effect duration edit reopens, plays in RenPy and returns with exact full work`,async({page},info)=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(`${directory}/rabbit-${app}-edited.xlsx`);await confirmAuthoringImport(page);
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(before.lines[0].id);await effects(page);
 await expect(page.getByLabel('효과 지속 시간 (초)',{exact:true})).toHaveValue('0.6');
 await expect(page.getByLabel('효과 대기 시간 (초)',{exact:true})).toHaveValue('0.23');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await effects(page);await expect(page.getByLabel('효과 지속 시간 (초)',{exact:true})).toHaveValue('0.6');
 await expect(page.getByLabel('효과 대기 시간 (초)',{exact:true})).toHaveValue('0.23');
 if(info.project.name==='stories-runtime'){
  const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});
  await page.getByTestId('story-runtime-frame').evaluate(node=>node.setAttribute('data-direction-instance','original'));
  await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
  await expect(status).toContainText('연결됨',{timeout:90000});
  await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-rendered-revision')===node.getAttribute('data-scene-revision')),{timeout:30000}).toBe(true);
  await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath(`${app}-native.png`)});
  await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
  await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
  await expect(page.getByTestId('story-runtime-frame')).toHaveAttribute('data-direction-instance','original');
  await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue(before.lines[0].id);
 }
 await management(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=info.outputPath(`${app}.knolstory`);await(await download).saveAs(path);
 const restored=parseAuthoringFile(readFileSync(path,'utf8')).project;
 const expected={...before,lines:before.lines.map((line:typeof before.lines[number],index:number)=>index?line:{...line,presentation:{...line.presentation,effects:line.presentation.effects.map((effect:typeof line.presentation.effects[number])=>({...effect,durationMs:600}))}})};
 const content=(p:typeof before)=>{const{updatedAt:_time,id:_workId,...rest}=p;return rest;};expect(content(restored)).toEqual(content(expected));
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption(before.lines[0].id);await effects(page);await expect(page.getByLabel('효과 지속 시간 (초)',{exact:true})).toHaveValue('0.6');
});
