import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const base=createBlankStoryProject({id:'split',chapterId:'ch',lineId:'a',title:'효과음 나누기'});
const sound={id:'original',assetId:'audio:sound:chime',sourceStartMs:200,sourceEndMs:1100,delayMs:200,volume:.5};
const project={...base,lines:base.lines.map(line=>({...line,text:'원본 소리와 작성한 글을 보존합니다.',audio:{sounds:[sound]}}))};
test('split a sound, undo, edit two pieces, reopen actual file and play scheduled native segments',async({page,browser},info)=>{
 test.setTimeout(150000);await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'split.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();
 await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();
 await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('audio');await page.getByText('1컷 음향 수정',{exact:true}).click();
 const row=page.getByTestId('editing-cut-a'),list=row.getByRole('group',{name:'효과음 목록',exact:true});await row.getByLabel('조정할 소리',{exact:true}).selectOption('sounds');
 async function split(){const control=row.locator('[data-sound-split]:visible');if(!await control.evaluate(el=>(el as HTMLDetailsElement).open))await control.locator(':scope>summary').click();await row.getByLabel('1번 효과음 나눌 원본 위치 (초)',{exact:true}).fill('0.8');await row.getByLabel('1번 효과음 나눌 원본 위치 (초)',{exact:true}).press('Enter');await row.getByRole('button',{name:'이 위치에서 둘로 나누기',exact:true}).click();}
 await row.locator('[data-sound-split]:visible>summary').click();await row.getByLabel('1번 효과음 나눌 원본 위치 (초)',{exact:true}).fill('2');await row.getByLabel('1번 효과음 나눌 원본 위치 (초)',{exact:true}).press('Enter');await row.getByRole('button',{name:'이 위치에서 둘로 나누기',exact:true}).click();await expect(list.getByRole('button')).toHaveCount(1);await expect(row.getByRole('alert')).toBeVisible();
 await split();await expect(list.getByRole('button')).toHaveCount(2);await expect(list.getByRole('button').nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(row.getByLabel('2번 효과음 재생 대기 (초)',{exact:true})).toHaveValue('0.8');
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await expect.poll(async()=>(await stored()).lines[0].audio.sounds).toEqual([{...sound,sourceEndMs:800},{...sound,id:expect.any(String),sourceStartMs:800,delayMs:800}]);
 await row.getByRole('button',{name:'효과음 변경 취소',exact:true}).click();await expect(list.getByRole('button')).toHaveCount(1);await expect.poll(async()=>(await stored()).lines[0].audio.sounds).toEqual([sound]);
 await split();await expect(list.getByRole('button')).toHaveCount(2);
 await row.getByRole('button',{name:'효과음 추가',exact:true}).click();await row.getByRole('button',{name:'효과음 추가',exact:true}).click();
 await row.locator('[data-sound-split]:visible>summary').click();await expect(row.locator('[data-sound-split]:visible').getByText('효과음은 최대 4개예요. 하나를 삭제한 뒤 나눠 주세요.',{exact:true})).toBeVisible();
 await row.getByRole('button',{name:'효과음 변경 취소',exact:true}).click();await expect(list.getByRole('button')).toHaveCount(3);
 await list.getByRole('button').nth(2).click();await row.getByRole('button',{name:'효과음 3 삭제',exact:true}).click();await expect(list.getByRole('button')).toHaveCount(2);
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){await page.setViewportSize(viewport);await list.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`split-${viewport.width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:1280,height:800});await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const current=await stored();
 await menu.locator(':scope>summary').click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const file=info.outputPath('split.knolstory');await(await pending).saveAs(file);const saved=parseAuthoringFile(readFileSync(file,'utf8'));expect(saved.project).toEqual(current);expect(saved.project.lines[0].text).toBe(project.lines[0].text);
 await menu.locator(':scope>summary').click();await row.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:120000});
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});await expect(gate).toBeVisible({timeout:30000});await gate.press('Enter');
 await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count')),{timeout:30000,intervals:[50]}).toBe(1);const first=Date.now();
 await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count')),{timeout:5000,intervals:[50]}).toBe(2);expect(Date.now()-first).toBeGreaterThan(250);
 const context=await browser.newContext(),fresh=await context.newPage();await fresh.route('**/api/**',route=>route.abort());await fresh.goto('/?view=editor');await expect(fresh.getByTestId('save-status')).toHaveText('임시 보관됨');await fresh.locator('[data-work-menu]>summary').click();await fresh.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(file);await confirmAuthoringImport(fresh);await expect(fresh.getByTestId('save-status')).toHaveText('임시 보관됨');expect(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(saved.project);await context.close();
});
