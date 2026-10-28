import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport} from './authoring-file';
import {readFileSync} from 'node:fs';
import {parseStoryDocument} from '../../packages/story-domain/src';
import {connectCatalogPerspective} from '../../packages/compatibility/src/catalog-perspective';

const base=createBlankStoryProject({id:'perspective-cue',chapterId:'a',lineId:'intro',title:'시점 안내 확인'}),cut=base.lines[0]!;
const transition={type:'perspective-blackout' as const,mode:'confirm' as const,durationMs:300,title:'친구의 시점',actionLabel:'친구의 이야기 읽기'};
const project={...base,lines:[
 {...cut,text:'앞에서 읽은 글입니다.'},
 {...cut,id:'cue',order:2,speakerName:'시점 전환',text:'친구의 시점',presentation:{transition}},
 {...cut,id:'body',order:3,text:'창문으로 아침 햇살이 들어왔어요.',presentation:{transition:{...transition,mode:'auto' as const,durationMs:300,title:'아침의 시점'}}},
 {...cut,id:'last',order:4,text:'마지막 글입니다.'}
]};
async function state(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));}
async function rendered(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-scene-revision');return revision!==null&&revision===await status.getAttribute('data-rendered-revision');},{timeout:120000}).toBe(true);return status;}

test.use({hasTouch:true});
test('perspective cue confirms once, proceeds to real dialogue and preserves the authored manuscript',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'perspective.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=(await state(page)).document.project;
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await rendered(page);
 const frame=page.getByTestId('story-runtime-frame');const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 await page.getByRole('button',{name:'다음으로',exact:true}).press('Enter');await rendered(page);
 await expect(status).toContainText('전환 화면에서 계속을 눌러 주세요');
 await expect(page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})})).not.toContainText('시점 전환');
 const bounds=(await frame.boundingBox())!;await page.touchscreen.tap(bounds.x+bounds.width*.2,bounds.y+bounds.height*.2);
 expect((await state(page)).playback.lineId).toBe('cue');
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('perspective-confirm.png')});
 const height=Number(await status.getAttribute('data-scene-height'));
 await page.touchscreen.tap(bounds.x+bounds.width*.5,bounds.y+bounds.height*(height-56)/height);
 await expect.poll(async()=>(await state(page)).playback.lineId,{timeout:15000}).toBe('body');await rendered(page);
 await expect(page.getByRole('region',{name:'이야기 무대',exact:true}).getByText('창문으로 아침 햇살이 들어왔어요.',{exact:true})).toBeAttached();
 // A real passage carrying a perspective effect must remain until the reader advances.
 await page.waitForTimeout(1200);expect((await state(page)).playback.lineId).toBe('body');
 expect((await state(page)).playback.path).toEqual(['intro','cue','body']);expect((await state(page)).document.project).toEqual(original);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('perspective-body.png')});
 await page.getByRole('button',{name:'이전 읽은 컷',exact:true}).press('Enter');await rendered(page);
 await expect.poll(async()=>(await state(page)).playback.lineId).toBe('intro');
 expect((await state(page)).playback.path).toEqual(['intro']);expect((await state(page)).document.project).toEqual(original);
});


test('provided Onggojib opens with one perspective entrance and proceeds directly into its story',async({page},info)=>{
 const parsed=parseStoryDocument(JSON.parse(readFileSync('tests/fixtures/stories/onggojib.json','utf8')),{savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test'});
 if(!parsed.ok)throw Error('제공 원고를 확인해 주세요.');
 const current=connectCatalogPerspective(parsed.document.project);
 await page.setViewportSize({width:1280,height:800});await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'onggojib.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project:current}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=(await state(page)).document.project;
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await rendered(page),frame=page.getByTestId('story-runtime-frame');
 const gate=frame.contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 await expect(status).toContainText('전환 화면에서 계속을 눌러 주세요');
 const cue=(await state(page)).playback.lineId;expect(current.lines.find(line=>line.id===cue)?.text).toBe('옹고집의 시점');
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('onggojib-entrance.png')});
 const bounds=(await frame.boundingBox())!,height=Number(await status.getAttribute('data-scene-height'));
 await page.touchscreen.tap(bounds.x+bounds.width*.5,bounds.y+bounds.height*(height-56)/height);
 await expect.poll(async()=>(await state(page)).playback.lineId).not.toBe(cue);await rendered(page);
 const mirror=page.locator('details').filter({has:page.getByText('대사·해설 텍스트 보기',{exact:true})});
 await expect(mirror).not.toContainText('시점 전환');await expect(mirror).not.toContainText('옹고집의 시점');
 expect((await state(page)).document.project).toEqual(original);
 await page.getByTestId('story-stage-viewport').screenshot({path:info.outputPath('onggojib-first-prose.png')});
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'읽기 설정',exact:true}).click();
 await page.getByRole('dialog').getByLabel('화면 터치 방식').selectOption('halves');await page.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();await rendered(page);
 const prose=(await state(page)).playback.lineId,revision=await status.getAttribute('data-scene-revision');
 await page.touchscreen.tap(bounds.x+bounds.width*.2,bounds.y+bounds.height*.2);
 await expect.poll(()=>status.getAttribute('data-scene-revision')).not.toBe(revision);await rendered(page);
 expect((await state(page)).playback.lineId).toBe(prose);
 const previousPage=await status.getAttribute('data-dialogue-page');
 await page.touchscreen.tap(bounds.x+bounds.width*.8,bounds.y+bounds.height*.2);
 await expect.poll(async()=>`${(await state(page)).playback.lineId}/${await status.getAttribute('data-dialogue-page')}`).not.toBe(`${prose}/${previousPage}`);
 expect((await state(page)).document.project).toEqual(original);

});
