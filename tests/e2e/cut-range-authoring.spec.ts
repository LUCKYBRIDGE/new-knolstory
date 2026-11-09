import {openWorkFileExchange} from './work-file-exchange';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {parseAuthoringFile,confirmAuthoringImport} from './authoring-file';
const current=(page:Page)=>page.locator('[data-writer-scroll] [aria-current="step"]');
async function tool(page:Page,name:string){
 const work=page.locator('[data-work-menu]');if(!await work.evaluate(node=>(node as HTMLDetailsElement).open))await work.locator(':scope>summary').click();
 const settings=page.getByText('편집 설정',{exact:true}).locator('..');if(!await settings.evaluate(node=>(node as HTMLDetailsElement).open))await settings.locator(':scope>summary').click();
 const direction=name==='연출 편집';await page.getByRole('checkbox',{name:`${direction?'연출':'음향'} 편집 사용`,exact:true}).check();
 await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption(direction?'direction':'audio');
 const summary=page.getByText(`1컷 ${direction?'연출':'음향'} 수정`,{exact:true});if(!await summary.locator('..').evaluate(el=>(el as HTMLDetailsElement).open))await summary.click();
}
async function effects(page:Page){await tool(page,'연출 편집');await page.getByLabel('조정할 연출',{exact:true}).selectOption('effects');}
async function exported(page:Page){await openWorkFileExchange(page);const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const path=(await(await pending).path())!;return {path,document:parseAuthoringFile(readFileSync(path,'utf8'))};}
test('actual work cut-end authoring saves, exports and reopens unchanged unrelated fields',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const baseline=(await exported(page)).document.project;
 const position=page.getByLabel('현재 장과 컷 이동'),start=await position.inputValue(),end=await position.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value)[1]);
 await effects(page);await page.getByLabel('효과',{exact:true}).selectOption('shake');await page.getByRole('dialog',{name:'화면 흔들림',exact:true}).getByRole('button',{name:'사용',exact:true}).click();await page.getByLabel('효과 적용 범위',{exact:true}).selectOption('following');await page.getByLabel('효과 종료 컷',{exact:true}).selectOption(end);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await tool(page,'소리 편집');await current(page).getByLabel('조정할 소리',{exact:true}).selectOption('music');await page.getByLabel('컷 배경음 동작',{exact:true}).selectOption('play');await page.getByLabel('배경음 종료 컷',{exact:true}).selectOption(end);
 const {path,document:saved}=await exported(page);expect(saved.schemaVersion).toBe(8);
 const first=saved.project.lines.find((line:{id:string})=>line.id===start);expect(first.presentation.effects[0]).toMatchObject({scope:'following',endLineId:end});expect(first.audio.music.endLineId).toBe(end);
 const before=baseline.lines.find((cut:{id:string})=>cut.id===start);const presentation={...first.presentation,effects:before.presentation?.effects},audio={...first.audio,music:before.audio?.music};const restoredFirst={...first,presentation:Object.values(presentation).every(value=>value===undefined)?undefined:presentation,audio:Object.values(audio).every(value=>value===undefined)?undefined:audio};expect(JSON.parse(JSON.stringify({...saved.project,updatedAt:baseline.updatedAt,lines:saved.project.lines.map((line:{id:string})=>line.id===start?restoredFirst:line)}))).toEqual(baseline);
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles(path);await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.reload();await effects(page);await expect(page.getByLabel('효과 종료 컷',{exact:true})).toHaveValue(end);await tool(page,'소리 편집');await current(page).getByLabel('조정할 소리',{exact:true}).selectOption('music');await expect(page.getByLabel('배경음 종료 컷',{exact:true})).toHaveValue(end);const reopened=(await exported(page)).document.project;expect(reopened).toEqual({...saved.project,id:reopened.id});
});

test('native presenter receives bounded effect through end then stops it without clearing another cue',async({page})=>{
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const end=await page.getByLabel('현재 장과 컷 이동').locator('option').evaluateAll(options=>(options[1] as HTMLOptionElement).value);
 await effects(page);await page.getByLabel('효과',{exact:true}).selectOption('shake');await page.getByRole('dialog',{name:'화면 흔들림',exact:true}).getByRole('button',{name:'사용',exact:true}).click();await page.getByLabel('효과 적용 범위',{exact:true}).selectOption('following');await page.getByLabel('효과 종료 컷',{exact:true}).selectOption(end);
 await page.getByRole('button',{name:'효과 추가',exact:true}).click();await page.getByTestId('story-effect-controls').locator('details').nth(1).locator('summary').click();await page.getByLabel('2번째 효과',{exact:true}).selectOption('flash');await page.getByRole('dialog',{name:'하얀 섬광',exact:true}).getByRole('button',{name:'사용',exact:true}).click();await page.getByLabel('2번째 효과 적용 범위',{exact:true}).selectOption('following');
 await page.frameLocator('iframe').locator('body').waitFor({state:'attached'});await page.getByTestId('story-runtime-frame').evaluate(frame=>{(frame as HTMLIFrameElement).contentWindow!.addEventListener('message',event=>{if(event.data?.type==='loadScene')(frame as HTMLIFrameElement).dataset.scene=JSON.stringify(event.data.payload);});});
 await current(page).getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const rendered=async()=>{await expect.poll(async()=>{const status=page.getByTestId('story-runtime-status');return Number(await status.getAttribute('data-rendered-revision'))>=0&&(await status.getAttribute('data-rendered-revision'))===(await status.getAttribute('data-scene-revision'));},{timeout:120000}).toBe(true);};
 const cues=async()=>JSON.parse((await page.getByTestId('story-runtime-frame').getAttribute('data-scene'))!).presentation.effects;
 await rendered();const gate=page.frameLocator('[data-testid="story-runtime-frame"]').getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');await rendered();expect(await cues()).toHaveLength(2);await page.getByRole('button',{name:'다음으로',exact:true}).focus();await page.getByRole('button',{name:'다음으로',exact:true}).press('Enter');await rendered();expect(await cues()).toHaveLength(2);
 await page.getByRole('button',{name:'다음으로',exact:true}).focus();await page.getByRole('button',{name:'다음으로',exact:true}).press('Enter');await rendered();expect((await cues()).map((cue:{type:string})=>cue.type)).toEqual(['flash']);
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();await expect(current(page).getByRole('button',{name:'이 컷부터 재생',exact:true})).toBeVisible();
});
