import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';
async function sound(page:Page,kind:'music'|'sounds'){const details=page.locator('[data-additional-tools]');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator(':scope>summary').click();await page.getByRole('button',{name:'소리 편집',exact:true}).click();await page.getByLabel('조정할 소리',{exact:true}).selectOption(kind);}
const source=parseAuthoringFile(readFileSync('tests/fixtures/responsive-audio.json','utf8'));
test('all 21 CC0 originals load and decode in the browser',async({page},info)=>{
 test.skip(info.project.name!=='host');
 await page.goto('/?view=editor');
 const entries=JSON.parse(readFileSync('packages/asset-registry/src/external-cc0-audio.json','utf8')) as {src:string,durationSeconds:number}[];
 const observed=[];
 for(const entry of entries){
  const result=await page.evaluate(async src=>{
   const response=await fetch(src);if(!response.ok)throw Error(`HTTP ${response.status}: ${src}`);
   const context=new AudioContext();
   try {const buffer=await context.decodeAudioData(await response.arrayBuffer());return {duration:buffer.duration,channels:buffer.numberOfChannels};}
   finally {await context.close();}
  },entry.src);
  expect(result.channels,entry.src).toBeGreaterThan(0);expect(result.duration).toBeGreaterThan(0);
  // Decode the complete file; HTML canplay may report a provisional Vorbis duration.
  expect(Math.abs(result.duration-entry.durationSeconds),entry.src).toBeLessThan(.1);
  observed.push({src:entry.src,containerSeconds:entry.durationSeconds,browserSeconds:result.duration});
 }
 writeFileSync(info.outputPath('browser-decode.json'),JSON.stringify(observed,null,2));
});
async function ready(page:import('@playwright/test').Page){const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});await expect.poll(()=>status.evaluate(n=>n.getAttribute('data-scene-revision')===n.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);return status;}
test('CC0 Korean labels and source facets select real files and native runtime plays all three channels',async({page},info)=>{
 test.setTimeout(180000);const native=info.project.name==='stories-runtime';
 const project={...source,chapters:source.chapters.map((c:any)=>({...c,audio:undefined})),lines:source.lines.map((l:any,i:number)=>i?l:{...l,audio:{music:{action:'play',assetId:'audio:music:cc0-oga-forest',volume:.2,loop:true},ambience:{action:'play',assetId:'audio:music:cc0-oga-rain-1',volume:.15,loop:true},sounds:[{id:'bell',assetId:'audio:sound:cc0-kenney-bookFlip1',volume:.5}]}})};
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'cc0.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:'2026-10-10T00:00:00.000Z',appVersion:'test',project}))});await confirmAuthoringImport(page);
 await sound(page,'music');await expect(page.getByLabel('컷 배경음',{exact:true}).locator('option:checked')).toHaveText('숲분위기배경음1');await page.getByLabel('조정할 소리',{exact:true}).selectOption('sounds');await page.getByRole('region',{name:'효과음 편집',exact:true}).getByText('자세히 찾기',{exact:true}).click();await page.getByLabel('1번 효과음 출처 필터').selectOption('Kenney');await page.getByLabel('1번 효과음 속성 필터').selectOption('넘기기');await expect(page.getByLabel('1번 효과음',{exact:true}).locator('option:checked')).toHaveText('책장넘기는소리1');await page.getByText('1번 효과음 이름·속성·원래 이름',{exact:true}).click();await expect(page.getByText('bookFlip1.ogg',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'원래 소리와 출처 확인',exact:true})).toHaveAttribute('href',/kenney.nl/);
 await page.getByLabel('1번 효과음',{exact:true}).selectOption('audio:sound:cc0-kenney-bookFlip2');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const management=page.locator('[data-work-menu]>summary');
 if(!await management.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await management.click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=info.outputPath('cc0-edited.knolstory');await(await pending).saveAs(path);
 expect(parseAuthoringFile(readFileSync(path,'utf8')).project.lines[0].audio).toMatchObject({music:{assetId:'audio:music:cc0-oga-forest'},ambience:{assetId:'audio:music:cc0-oga-rain-1'},sounds:[{assetId:'audio:sound:cc0-kenney-bookFlip2'}]});
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);await confirmAuthoringImport(page);
 await page.reload();await sound(page,'sounds');
 await expect(page.getByLabel('1번 효과음',{exact:true}).locator('option:checked')).toHaveText('책장넘기는소리2');
 if(!native)return;
 await ready(page);await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();const status=await ready(page);const frame=page.getByTestId('story-runtime-frame');
 const box=(await frame.boundingBox())!;
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.1);await expect(status).toHaveAttribute('data-audio-unlocked','true',{timeout:20000});
 await ready(page);await expect(status).toHaveAttribute('data-audio-unlocked','true');await expect(status).toHaveAttribute('data-music-path','assets/audio/cc0/oga-forest.mp3');await expect(status).toHaveAttribute('data-ambience-path','assets/audio/cc0/oga-rain-1.ogg');await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBe(1);await expect.poll(async()=>Number(await status.getAttribute('data-music-position')),{timeout:15000}).toBeGreaterThan(0);await expect(page.getByTestId('story-runtime-status')).not.toContainText('찾을 수 없습니다');
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await sound(page,'sounds');
 await expect(page.getByLabel('1번 효과음',{exact:true}).locator('option:checked')).toHaveText('책장넘기는소리2');
});
