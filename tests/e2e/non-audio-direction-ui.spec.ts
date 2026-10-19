import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';

const original=parseAuthoringFile(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8'));
const source={...original,title:'긴 한국어 문구를 읽으며 자유롭게 배치한 인물에게 연출을 만드는 작품',lines:original.lines.map((line:{id:string;stageComposition: {leftActors:unknown[]}})=>line.id==='shake'?{...line,presentation:{effects:[{type:'shake',intensity:'strong'}],actors:{left:{xAnchor:37,scaleMultiplier:1.1,facing:'left'},right:{opacity:.9}}},text:'소중한 인물의 표정과 자유 배치를 지키면서 화면의 연출 순서를 바꾸어 봅니다. '.repeat(4),stageComposition:{...line.stageComposition,leftActors:line.stageComposition.leftActors.map(actor=>({...actor as object,xAnchor:37,scaleMultiplier:1.17,facing:'left'}))}}:line)};
const file={name:'non-audio-directions.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-10T00:00:00.000Z',appVersion:'knolstory-next-test',project:source}))};
async function management(page:Page){
 const summary=page.locator('[data-work-menu]>summary');
 if(!await summary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await summary.click();
}
async function direction(page:Page,kind:'effects'|'actors'='effects'){
 const tools=page.locator('[data-additional-tools]');
 if(!await tools.evaluate(node=>(node as HTMLDetailsElement).open))await tools.locator('summary').click();
 await page.getByRole('button',{name:'연출 편집',exact:true}).click();
 await page.getByLabel('조정할 연출',{exact:true}).selectOption(kind);
}
async function readAndReturn(page:Page){
 const frame=page.getByTestId('story-runtime-frame');
 await frame.evaluate(node=>node.setAttribute('data-direction-instance','original'));
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:120000});
 await expect.poll(async()=>Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision')),{timeout:120000}).toBe(true);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await expect(frame).toHaveAttribute('data-direction-instance','original');
 await expect(page.getByLabel('현재 장과 컷 이동',{exact:true})).toHaveValue('shake');
}
async function exportWork(page:Page){
 await management(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const download=await pending;return {path:(await download.path())!,project:parseAuthoringFile(readFileSync((await download.path())!,'utf8')).project};
}
async function controls(page:Page){
 await page.getByLabel('현재 장과 컷 이동',{exact:true}).selectOption('shake');await direction(page);
 return page.getByTestId('story-effect-controls');
}
for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:844,height:390}])test(`effect editing, timing, undo and file reopen preserve manuscript and free placement at ${size.width}`,async({page},testInfo)=>{
 page.setDefaultTimeout(15000);await page.setViewportSize(size);await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await management(page);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(file);await confirmAuthoringImport(page);
 await expect(page.getByLabel('작품 제목',{exact:true})).toHaveValue(source.title);
 const panel=await controls(page);await expect(panel).toBeVisible();
 const appearance=page.getByTestId('story-actor-appearance-controls');
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('actors');
 // Merely discovering or opening controls does not author display defaults.
 expect((await exportWork(page)).project.lines).toEqual(source.lines);
 await direction(page,'actors');
 await appearance.getByLabel('왼쪽 인물 전체 강조',{exact:true}).selectOption('dim');
 await appearance.getByLabel('왼쪽 인물 전체 보이는 정도 (%)',{exact:true}).fill('65');await appearance.getByLabel('왼쪽 인물 전체 강조',{exact:true}).focus();
 await appearance.getByLabel('왼쪽 인물 전체 반투명 표현',{exact:true}).check();
 await appearance.getByRole('button',{name:'왼쪽 인물 전체 밝기·투명도 초기화',exact:true}).click();
 await expect(appearance.getByLabel('왼쪽 인물 전체 강조',{exact:true})).toHaveValue('normal');
 await expect(appearance.getByLabel('왼쪽 인물 전체 보이는 정도 (%)',{exact:true})).toHaveValue('100');
 await expect(appearance.getByLabel('왼쪽 인물 전체 반투명 표현',{exact:true})).not.toBeChecked();
 const reset=(await exportWork(page)).project.lines.find((line:{id:string})=>line.id==='shake');
 expect(reset.presentation.actors).toEqual({left:{xAnchor:37,scaleMultiplier:1.1,facing:'left'},right:{opacity:.9}});
 await direction(page,'actors');
 await appearance.getByLabel('왼쪽 인물 전체 강조',{exact:true}).selectOption('dim');
 await appearance.getByLabel('왼쪽 인물 전체 보이는 정도 (%)',{exact:true}).fill('65');await appearance.getByLabel('왼쪽 인물 전체 강조',{exact:true}).focus();
 await appearance.getByLabel('왼쪽 인물 전체 반투명 표현',{exact:true}).check();
 await appearance.getByLabel('오른쪽 인물 전체 보이는 정도 (%)',{exact:true}).fill('101');await appearance.getByLabel('오른쪽 인물 전체 강조',{exact:true}).focus();
 await expect(appearance.getByLabel('오른쪽 인물 전체 보이는 정도 (%)',{exact:true})).toHaveValue('90');
 await expect(appearance.getByRole('alert')).toContainText('기존 값은 유지됩니다');
 await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');
 await panel.getByLabel('효과 대상',{exact:true}).selectOption('actor:M01');
 await panel.getByLabel('효과 적용 범위',{exact:true}).selectOption('following');
 await panel.getByLabel('효과 지속 시간 (초)',{exact:true}).fill('1.2');await panel.getByLabel('효과 강도',{exact:true}).focus();
 await panel.getByRole('button',{name:'효과 추가',exact:true}).click();
 const second=panel.locator('details').nth(1);await second.locator('summary').click();
 await panel.getByLabel('2번째 효과',{exact:true}).selectOption('flash');
 await panel.getByLabel('2번째 효과 대상',{exact:true}).selectOption('background');
 await panel.getByRole('button',{name:'2번째 효과 위로',exact:true}).click();
 await expect(panel.getByLabel('효과',{exact:true})).toHaveValue('flash');
 await panel.getByRole('button',{name:'마지막 효과 변경 취소',exact:true}).click();
 await expect(panel.getByLabel('효과',{exact:true})).toHaveValue('shake');
 await panel.getByRole('button',{name:'순서대로 시작',exact:true}).click();
 await expect(panel.getByLabel('2번째 효과 대기 시간 (초)',{exact:true})).toHaveValue('1.2');
 await panel.getByLabel('2번째 효과 반복',{exact:true}).selectOption('loop');
 await panel.getByLabel('2번째 효과 반복 간격 (초)',{exact:true}).fill('2.6');await panel.getByLabel('2번째 효과 강도',{exact:true}).focus();
 // Invalid input must not replace the valid duration.
 await panel.getByLabel('효과 지속 시간 (초)',{exact:true}).fill('-1');await panel.getByLabel('효과 강도',{exact:true}).focus();
 await expect(panel.getByLabel('효과 지속 시간 (초)',{exact:true})).toHaveValue('1.2');await expect(panel.getByRole('alert')).toContainText('기존 값은 유지됩니다');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel.locator('details').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=false));
 await panel.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('effect-cards-full-page.png'),fullPage:true});
 await readAndReturn(page);
 const saved=await exportWork(page);const cut=saved.project.lines.find((line:{id:string})=>line.id==='shake');
 expect(cut.presentation.actors).toEqual({left:{xAnchor:37,scaleMultiplier:1.1,facing:'left',emphasis:'dim',opacity:.65,spectral:true},right:{opacity:.9}});
 expect(cut.presentation.effects).toEqual([{type:'shake',intensity:'strong',target:{kind:'actor',actorKey:'M01'},scope:'following',durationMs:1200,trigger:'scene-enter',delayMs:0},{type:'flash',intensity:'normal',target:{kind:'background'},trigger:'scene-enter',delayMs:1200,repeat:'loop',periodMs:2600}]);
 expect(saved.project.updatedAt).not.toBe(source.updatedAt);
 expect({...saved.project,id:source.id,updatedAt:source.updatedAt,lines:saved.project.lines.map((line:{id:string;presentation?:unknown})=>line.id==='shake'?{...line,presentation:source.lines.find((item:{id:string})=>item.id==='shake').presentation}:line)}).toEqual(source);
 expect(saved.project.lines.map((line:{stageComposition:unknown})=>line.stageComposition)).toEqual(source.lines.map((line:{stageComposition:unknown})=>line.stageComposition));
 expect(saved.project.lines.map((line:{text:string;flow:unknown})=>({text:line.text,flow:line.flow}))).toEqual(source.lines.map((line:{text:string;flow:unknown})=>({text:line.text,flow:line.flow})));
 await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles(saved.path);await confirmAuthoringImport(page);await page.reload();await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await controls(page);const reopened=await exportWork(page);expect(reopened.project).toEqual({...saved.project,id:reopened.project.id});
 await readAndReturn(page);
});

test('effect cancellation restores absence and cannot copy undo into another work with the same cut ID',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await management(page);
 const clean={...source,id:'undo-work-a',lines:source.lines.map((line:typeof source.lines[number])=>{const {presentation:_old,...rest}=line;return rest;})};
 const upload=async(project:typeof source)=>{await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'undo.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:6,savedAt:'2026-10-10T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);};
 await upload(clean);await controls(page);await page.getByLabel('효과',{exact:true}).selectOption('flash');await page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true}).click();
 expect((await exportWork(page)).project.lines.find((line:{id:string})=>line.id==='shake').presentation).toBeUndefined();
 await direction(page);await page.getByLabel('효과',{exact:true}).selectOption('shake');
 await management(page);await upload({...clean,id:'undo-work-b'});await controls(page);await expect(page.getByRole('button',{name:'마지막 효과 변경 취소',exact:true})).toHaveCount(0);
 expect((await exportWork(page)).project.lines.find((line:{id:string})=>line.id==='shake').presentation).toBeUndefined();
});
