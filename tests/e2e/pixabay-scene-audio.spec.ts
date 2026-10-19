import {createStoryDocument} from '../../packages/story-domain/src';
import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {confirmAuthoringImport,parseAuthoringFile} from './authoring-file';

const source=parseAuthoringFile(readFileSync('tests/fixtures/responsive-audio.json','utf8'));
const AUDIO_CATALOG=JSON.parse(readFileSync('packages/asset-registry/src/pixabay-audio.json','utf8')) as {id:string;metadata:{tags:string[];originalName:string};origin:{url:string;termsUrl:string;contentIdRegistered?:boolean}}[];
const cues=[
 {label:'컷 배경음',id:'audio:music:pixabay-501446',name:'잔잔한피아노1',file:'501446.mp3'},
 {label:'컷 주변 소리',id:'audio:music:pixabay-22484',name:'밤벌레소리1',file:'22484.mp3'},
 {label:'1번 효과음',id:'audio:sound:pixabay-199584',name:'학교종소리1',file:'199584.mp3'},
] as const;

async function openEditorTools(page:Page,label='컷 배경음'){
 const tools=page.locator('[data-additional-tools]');if(!await tools.evaluate(n=>(n as HTMLDetailsElement).open))await tools.locator(':scope>summary').click();await page.getByRole('button',{name:'소리 편집',exact:true}).click();await page.getByLabel('조정할 소리',{exact:true}).selectOption(label==='컷 배경음'?'music':label==='컷 주변 소리'?'ambience':'sounds');
}
async function management(page:Page){const menu=page.locator('[data-work-menu]');if(!await menu.evaluate(n=>(n as HTMLDetailsElement).open))await menu.locator(':scope>summary').click();}
async function runtimeReady(page:Page){
 const status=page.getByTestId('story-runtime-status');
 await expect(status).toContainText('연결됨',{timeout:90000});
 await expect.poll(()=>status.evaluate(node=>Number(node.getAttribute('data-rendered-revision'))>=0&&node.getAttribute('data-scene-revision')===node.getAttribute('data-rendered-revision')),{timeout:30000}).toBe(true);
 return status;
}

// Both projects exercise the authoring contract; the native project additionally
// verifies that scene playback supplies the three approved original audio paths.
test('Pixabay audio is selected with source terms, exported as scene references and played in Ren’Py',async({page},info)=>{
 test.setTimeout(180000);
 const native=info.project.name==='stories-runtime';
 const firstCutAudio={
  music:{action:'play',assetId:cues[0].id,volume:.2,loop:true},
  ambience:{action:'play',assetId:cues[1].id,volume:.15,loop:true},
  sounds:[{id:'school-bell',assetId:cues[2].id,volume:.5}],
 };
 const project={...source,
  chapters:source.chapters.map((chapter:Record<string,unknown>)=>({...chapter,audio:undefined})),
  lines:source.lines.map((line:Record<string,unknown>,index:number)=>index?{...line,audio:undefined}:{...line,audio:firstCutAudio}),
 };
 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await management(page);await page.getByLabel('작품 파일 가져오기').setInputFiles({name:'pixabay-scene.knolstory',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(createStoryDocument({project,savedAt:'2026-10-14T00:00:00.000Z',appVersion:'current-pixabay-test'})))});
 await confirmAuthoringImport(page);
 await openEditorTools(page);

 for(const cue of cues){
  await openEditorTools(page,cue.label);
  const asset=AUDIO_CATALOG.find(item=>item.id===cue.id)!;
  expect(asset,`${cue.id} must be admitted by its reviewed usage policy`).toBeDefined();
  const picker=page.getByLabel(cue.label,{exact:true});
  await expect(picker.locator('option:checked')).toHaveText(cue.name);
  const filters=page.getByLabel(`${cue.label} 출처 필터`).locator('..').locator('..').locator('..');if(!await filters.evaluate(n=>(n as HTMLDetailsElement).open))await filters.locator(':scope>summary').click();await page.getByLabel(`${cue.label} 출처 필터`).selectOption('Pixabay');
  await page.getByLabel(`${cue.label} 속성 필터`).selectOption(asset.metadata!.tags[0]);
  await page.getByLabel(`${cue.label} 찾기`).fill(asset.metadata!.originalName!);
  await expect(picker.locator(`option[value="${cue.id}"]`)).toHaveCount(1);
  await picker.selectOption(cue.id);
  const summary=page.getByText(`${cue.label} 이름·속성·원래 이름`,{exact:true});
  await summary.click();
  const metadata=summary.locator('..');
  await expect(metadata.getByText(asset.metadata!.originalName!,{exact:true})).toBeVisible();
  await expect(metadata.getByRole('link',{name:'원래 소리와 출처 확인',exact:true})).toHaveAttribute('href',asset.origin!.url);
  await expect(metadata.getByRole('link',{name:'Pixabay Content License',exact:true})).toHaveAttribute('href',asset.origin!.termsUrl);
  await expect(metadata.getByText('이야기 장면에 결합해 사용',{exact:true})).toBeVisible();
  await expect(metadata.getByText('원음 별도 다운로드/재배포 제한',{exact:true})).toBeVisible();
  if(asset.origin!.contentIdRegistered)await expect(metadata).toContainText('Content ID 등록 표시 있음');
  await expect(page.getByLabel(`${cue.label} 미리 듣기`,{exact:true})).toHaveCount(0);
  await expect(page.locator(`audio[src$="${cue.file}"]`)).toHaveCount(0);
  await expect(page.locator(`a[href$="${cue.file}"]`)).toHaveCount(0);
 }
 await expect(page.getByText('선택한 뒤 ‘이 컷부터 재생’에서 장면과 함께 들어 주세요.',{exact:false})).toHaveCount(3);
 await expect(page.locator('audio[controls][src*="/pixabay/"]')).toHaveCount(0);
 await expect(page.locator('a[download][href*="/pixabay/"]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/원음.*다운로드|소리.*다운로드/})).toHaveCount(0);
 // CC0 still supports a native asset preview, then restore the retained cue.
 const effect=page.getByLabel('1번 효과음',{exact:true});
 await page.getByLabel('1번 효과음 찾기').fill('');
 await page.getByLabel('1번 효과음 출처 필터').selectOption('');
 await page.getByLabel('1번 효과음 속성 필터').selectOption('');
 await effect.selectOption('audio:sound:cc0-kenney-bookFlip1');
 await expect(page.getByLabel('1번 효과음 미리 듣기',{exact:true})).toHaveAttribute('src','/assets/audio/cc0/kenney-bookFlip1.ogg');
 await expect(page.getByLabel('1번 효과음 미리 듣기',{exact:true})).toHaveAttribute('controlslist','nodownload');
 await effect.selectOption(cues[2].id);const volume=page.getByLabel('1번 효과음 음량',{exact:true});await volume.focus();await volume.press('Home');for(let step=0;step<50;step++)await volume.press('ArrowRight');await expect(volume).toHaveValue('50');
 await expect(page.getByLabel('1번 효과음 미리 듣기',{exact:true})).toHaveCount(0);
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');

 const menuSummary=page.locator('[data-work-menu]>summary');
 if(!await menuSummary.locator('..').evaluate(node=>(node as HTMLDetailsElement).open))await menuSummary.click();
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
 const path=info.outputPath('pixabay-scene-reference.knolstory');
 await(await pending).saveAs(path);
 const exported=parseAuthoringFile(readFileSync(path,'utf8'));
 expect(exported.project.lines[0].audio).toEqual(firstCutAudio);
 expect(exported.audioResources??[]).toEqual([]);
 expect(exported.attachments??[]).toEqual([]);
 await page.getByLabel('작품 파일 가져오기').setInputFiles(path);
 await confirmAuthoringImport(page);
 await page.reload();
 await openEditorTools(page);
 for(const cue of cues){
  await openEditorTools(page,cue.label);await expect(page.getByLabel(cue.label,{exact:true})).toHaveValue(cue.id);
  await expect(page.getByLabel(`${cue.label} 미리 듣기`,{exact:true})).toHaveCount(0);
 }
 if(!native)return;
 await runtimeReady(page);
 const nativeFrame=(await(await page.getByTestId('story-runtime-frame').elementHandle())!.contentFrame())!;
 await nativeFrame.evaluate(()=>{
  window.addEventListener('message',event=>{
   if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='loadScene'||event.data.payload?.mode!=='play')return;
   (window as unknown as Record<string,unknown>).__testStorySoundPaths=event.data.payload.audio?.sounds.map((sound:{audioPath:string})=>sound.audioPath);
  });
 });
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 const status=await runtimeReady(page);
 const box=(await page.getByTestId('story-runtime-frame').boundingBox())!;
 await page.mouse.click(box.x+box.width*.5,box.y+box.height*.1);
 await expect(status).toHaveAttribute('data-audio-unlocked','true',{timeout:20000});
 await runtimeReady(page);
 await expect(status).toHaveAttribute('data-music-path',`assets/audio/pixabay/${cues[0].file}`);
 await expect(status).toHaveAttribute('data-ambience-path',`assets/audio/pixabay/${cues[1].file}`);
 await expect.poll(async()=>Number(await status.getAttribute('data-sound-play-count'))).toBe(1);
 await expect.poll(async()=>Number(await status.getAttribute('data-music-position')),{timeout:15000}).toBeGreaterThan(0);
 // One-shot soundPaths can already be empty after the effect ends. Verify the
 // exact delivered scene command together with the native once-only play count.
 await expect.poll(()=>nativeFrame.evaluate(()=>(window as unknown as Record<string,unknown>).__testStorySoundPaths)).toEqual([`assets/audio/pixabay/${cues[2].file}`]);
 await expect(status).toHaveAttribute('data-music-start-count','1');
 await expect(status).toHaveAttribute('data-ambience-start-count','1');
 await expect(status).toHaveAttribute('data-sound-play-count','1');
 await expect(status).not.toContainText('찾을 수 없습니다');
 await page.getByRole('button',{name:'읽기 메뉴',exact:true}).click();await page.getByRole('button',{name:'이 컷 편집하기',exact:true}).click();
 await openEditorTools(page);
 for(const cue of cues){await openEditorTools(page,cue.label);await expect(page.getByLabel(cue.label,{exact:true})).toHaveValue(cue.id);}
});
