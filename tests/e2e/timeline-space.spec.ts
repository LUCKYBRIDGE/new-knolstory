import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createBlankStoryProject} from '../../packages/runtime-core/src/authoring';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
const base=createBlankStoryProject({id:'combined',chapterId:'ch',lineId:'first',title:'함께 편집 확인'}),cut=base.lines[0]!;
const project={...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'audio:music:forest',volume:.7}}})),lines:Array.from({length:12},(_,i)=>({...cut,id:i===0?'first':`cut${i+1}`,order:i+1,text:`${i+1}컷의 보존할 글`,...(i===0?{presentation:{effects:[{id:'effect',type:'shake' as const,scope:'following' as const,endLineId:'cut3',durationMs:600},{id:'second',type:'flash' as const,trigger:'on-click' as const,clickStep:2,durationMs:800}]}}:i===3?{audio:{music:{action:'stop' as const}}}:{})}))};

test('timeline space changes preserve selection and manuscript across viewports',async({page},info)=>{
 await page.route('**/api/**',r=>r.abort());await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const menu=page.locator('[data-work-menu]');await menu.locator(':scope>summary').click();await page.getByLabel('작품 파일 가져오기',{exact:true}).setInputFiles({name:'combined.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:8,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 if(!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();await expect(page.getByRole('combobox',{name:'편집화면 선택',exact:true}).locator('option[value="audio-direction"]')).toHaveCount(0);await page.getByText('편집 설정',{exact:true}).click();await page.getByRole('checkbox',{name:'음향 편집 사용',exact:true}).check();await page.getByRole('checkbox',{name:'연출 편집 사용',exact:true}).check();await page.getByRole('combobox',{name:'편집화면 선택',exact:true}).selectOption('audio-direction');

 const timeline=page.locator('[data-combined-timeline]');
 const area=page.getByRole('region',{name:'음향·연출 작업 영역',exact:true});
 const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 for(const size of [{width:1280,height:800},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  const options=timeline.getByText('보기 설정',{exact:true});await options.click();
  const slider=timeline.getByRole('slider',{name:'시간축 공간 비율',exact:true});await expect(slider).toHaveValue('50');
  const initial=await timeline.evaluate(el=>el.getBoundingClientRect().height);
  await slider.focus();await slider.press('End');await expect(slider).toHaveValue('75');
  await expect.poll(()=>timeline.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(initial);
  await slider.press('Home');await expect(slider).toHaveValue('30');
  const bounds=(await slider.boundingBox())!;await slider.click({position:{x:bounds.width-2,y:bounds.height/2}});await expect(slider).toHaveValue('75');
  await timeline.getByRole('button',{name:'기본 공간으로 복원',exact:true}).click();await expect(slider).toHaveValue('50');
  await options.click();await timeline.getByRole('button').filter({hasText:'화면 흔들림'}).click();
  await expect(page.locator('[data-combined-details]').getByLabel('효과 지속 시간 (초)',{exact:true})).toHaveValue('0.6');
  await timeline.getByRole('button',{name:'현재 컷 시간 보기',exact:true}).click();await options.click();await slider.focus();await slider.press('ArrowRight');await expect(slider).toHaveValue('55');
  await timeline.getByRole('button',{name:'기본 공간으로 복원',exact:true}).click();await options.click();
  await expect(page.getByRole('region',{name:'현재 컷 초 단위 작업 영역',exact:true})).toBeVisible();
  await timeline.getByRole('button',{name:'컷 구간 보기',exact:true}).click();await expect(area).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(`timeline-space-${size.width}.png`)});
 }
 await timeline.getByText('보기 설정',{exact:true}).click();const space=timeline.getByRole('slider',{name:'시간축 공간 비율',exact:true});await space.focus();await space.press('End');await page.setViewportSize({width:390,height:844});await expect(space).toHaveValue('75');await page.screenshot({path:info.outputPath('timeline-space-settings-portrait.png')});await timeline.getByRole('button',{name:'기본 공간으로 복원',exact:true}).click();await expect(space).toHaveValue('50');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project)).toEqual(baseline);
});
