import {test,expect,type Page} from '@playwright/test';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {playbackScores} from '../../packages/runtime-core/src/story-scores';
import {confirmAuthoringImport} from './authoring-file';

const base=createBlankStoryProject({id:'history-journey',chapterId:'a',lineId:'a0',title:'지난기록 확인'});
const chapter=base.chapters[0]!,cut=base.lines[0]!;
const unseen='아직 읽지 않은 마지막 문장_숨김확인';
const project={...base,chapters:[{...chapter,title:'지난 장'},{...chapter,id:'b',order:2,chapterNumber:2,title:'이번 장'},{...chapter,id:'c',order:3,chapterNumber:3,title:'읽지 않은 장'}],
 scores:[{id:'trust',name:'신뢰',description:'',initial:0}],lines:[
  {...cut,text:'이전 장의 첫 글입니다.',flow:{type:'choice' as const,options:[{id:'chosen',label:'친구를 믿는다',targetLineId:'b0',effects:[{scoreId:'trust',operation:'add' as const,value:3}]},{id:'other',label:'기다린다',targetLineId:'b0'}]}},
  ...Array.from({length:12},(_,index)=>({...cut,id:`b${index}`,chapterId:'b',order:index+1,text:index===11?Array.from({length:26},(_,i)=>`${i+1}번째 문장. 토끼🐇와 친구는 바닷가에서 이야기를 나누었어요.\n`).join('')+unseen:`이번 장 ${index+1}번째 글. 친구들은 이야기를 이어갔어요. `.repeat(3),flow:{type:'goto' as const,targetLineId:index===11?'c0':`b${index+1}`}})),
  {...cut,id:'c0',chapterId:'c',text:'읽지 않은 장의 글',flow:{type:'goto' as const,targetLineId:null}}
 ]};
async function rendered(page:Page){const status=page.getByTestId('story-runtime-status');await expect.poll(async()=>{const revision=await status.getAttribute('data-scene-revision');return revision!==null&&revision===await status.getAttribute('data-rendered-revision');},{timeout:120000}).toBe(true);return status;}
async function workspace(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!));}
async function openHistory(page:Page){await page.getByRole('button',{name:'지난기록',exact:true}).click();return page.getByRole('dialog');}
test('chapter script opens at newest text and only previous chapter starts can rewind choices and scores',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});await page.route('**/api/**',route=>route.abort());await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.locator('[data-work-menu]>summary').click();
 await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'history.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-20T00:00:00.000Z',appVersion:'test',project}))});
 await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const original=(await workspace(page)).document.project;
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await rendered(page);
 const gate=page.getByTestId('story-runtime-frame').contentFrame().getByRole('button',{name:'소리 켜고 시작 · Enter 또는 Space',exact:true});if(await gate.count())await gate.press('Enter');
 await page.getByRole('button',{name:'친구를 믿는다',exact:true}).press('Enter');await rendered(page);
 for(let index=0;index<11;index++){
  await expect.poll(async()=>(await workspace(page)).playback.lineId).toBe(`b${index}`);
  for(let step=0;step<5&&(await workspace(page)).playback.lineId===`b${index}`;step++){
   const next=page.getByRole('button',{name:'다음으로',exact:true});await next.focus();await next.press('Enter');await rendered(page);
  }
 }
 await expect.poll(async()=>(await workspace(page)).playback.lineId).toBe('b11');
 const before=(await workspace(page)).playback;expect(playbackScores(original,before)).toEqual({trust:3});
 const boundary=JSON.parse((await status.getAttribute('data-dialogue-page'))!);expect(boundary.endOffset).toBeLessThan(Array.from(project.lines[12]!.text).length);
 let dialog=await openHistory(page);const scroll=dialog.locator('[data-reader-history-scroll]');
 await expect(dialog.locator('[data-reader-current-script] li')).toHaveCount(12);
 await expect(dialog.locator('[data-player-history-index]')).toHaveCount(1);await expect(dialog.locator('[data-player-history-index]')).toHaveAttribute('data-player-history-index','0');
 await expect(dialog).not.toContainText('이전 장의 첫 글입니다.');await expect(dialog).not.toContainText(unseen);await expect(dialog).not.toContainText('읽지 않은 장');
 await expect(dialog.locator('[data-reader-current-script] li').last()).toContainText(Array.from(project.lines[12]!.text).slice(0,boundary.endOffset).join(''));
 const atBottom=async()=>scroll.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<3);
 await expect.poll(atBottom).toBe(true);expect(await scroll.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await page.screenshot({path:info.outputPath('desktop-newest.png')});
 await scroll.hover();await page.mouse.wheel(0,-10000);await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBe(0);
 const previous=dialog.locator('[data-player-history-index]');await previous.click();await expect(page.getByRole('dialog')).toHaveAccessibleName('이전 장의 첫 컷부터 다시 읽을까요?');
 await page.getByRole('button',{name:'취소',exact:true}).click();await expect(previous).toBeFocused();await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBe(0);expect((await workspace(page)).playback.path).toEqual(before.path);
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await rendered(page);dialog=await openHistory(page);await expect.poll(atBottom).toBe(true);
 await page.screenshot({path:info.outputPath('phone-newest.png')});
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.setViewportSize({width:844,height:390});await rendered(page);dialog=await openHistory(page);await expect.poll(atBottom).toBe(true);
 await expect.poll(atBottom).toBe(true);
 const bounds=await dialog.evaluate(el=>{const script=el.querySelector('[data-reader-current-script] li:last-child')!,area=el.querySelector('[data-reader-history-scroll]')!;return {last:script.getBoundingClientRect().bottom,area:area.getBoundingClientRect().bottom,dialog:el.getBoundingClientRect().bottom,viewport:innerHeight};});
 expect(bounds.last).toBeLessThanOrEqual(bounds.area+1);expect(bounds.area).toBeLessThanOrEqual(bounds.dialog);expect(bounds.dialog).toBeLessThanOrEqual(bounds.viewport);
 await page.screenshot({path:info.outputPath('landscape-newest.png')});
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await dialog.locator('[data-player-history-index]').click();await page.getByRole('button',{name:'확인',exact:true}).click();await rendered(page);
 await expect.poll(async()=>(await workspace(page)).playback.path).toEqual(['a0']);
 const after=await workspace(page);expect(after.playback.choiceHistory).toEqual([]);expect(playbackScores(original,after.playback)).toEqual({trust:0});expect(after.document.project).toEqual(original);
});
