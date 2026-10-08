import {openShelfAction} from './library-entry';
import {test,expect} from '@playwright/test';
test.use({channel:process.env.KNOL_BROWSER_CHANNEL || undefined});
test('first browser entry introduces existing books, return enters library and introduction remains reachable',async({page})=>{
 await page.goto('/');
 const intro=page.getByRole('main',{name:'책 소개',exact:true});await expect(intro).toBeVisible();
 await expect(intro.getByRole('article')).toHaveCount(8);
 await expect(page.getByTestId('story-runtime-frame')).toHaveCount(0);
 await page.getByRole('button',{name:'서재로 가기',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
 await page.goto('/');await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
 await page.getByRole('button',{name:'책 소개',exact:true}).click();await expect(intro).toBeVisible();
 await page.reload();await expect(intro).toBeVisible();
 await page.getByRole('button',{name:'서재로 가기',exact:true}).click();
 const card=page.getByRole('region',{name:'원작',exact:true}).getByRole('article').filter({has:page.getByRole('heading',{name:'선녀와 나무꾼',exact:true})});
 await openShelfAction(page,card,'처음부터 읽기');
 await expect(page.getByRole('main',{name:'책 표지와 소개',exact:true})).toBeVisible();
 await expect(page.getByTestId('story-runtime-frame')).toHaveCount(0);
 await page.getByRole('button',{name:'서재로',exact:true}).click();
 await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
});

import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {enterLibrary,beginSelectedBook} from './library-entry';
const evidence='docs/architecture/evidence/book-entry-cover';
for(const [id,kind,title] of [['seonnyeo-classic','원작','선녀와 나무꾼'],['heungbu','기본 예제','흥부와 놀부, 서로의 몫']] as const)test(`${id}: full cover draft, cancellation, layered editing and archive restoration`,async({browser})=>{
 test.setTimeout(120000);mkdirSync(evidence,{recursive:true});const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto('/');await enterLibrary(page);
 const card=page.getByRole('region',{name:kind,exact:true}).getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})});
 await openShelfAction(page,card,'작품 준비');
 await expect.poll(()=>page.evaluate(()=>{const raw=localStorage.getItem('knolstory-next-workspace-v1');return raw?JSON.parse(raw).document.project.title:null;})).toBe(`${title} · 내 사본`);
 await expect(page.getByTestId('preparation-save-status')).toHaveText('기기에 저장됨');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();let dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});
 const author=await dialog.getByLabel('지은이',{exact:true}).inputValue();
 await dialog.getByLabel('지은이',{exact:true}).fill('취소할 내용');await dialog.getByRole('button',{name:'취소',exact:true}).click();
 await expect(page.getByLabel('지은이',{exact:true})).toHaveValue(author);
 await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});
 await dialog.getByLabel('작품 제목',{exact:true}).fill(`${title} · 표지 적용 검토`);await dialog.getByLabel('지은이',{exact:true}).fill('표지 검토');await dialog.getByLabel('표지 소개 문장',{exact:true}).fill('기존 이야기에서 만나는 선택과 마음');
 await dialog.getByRole('button',{name:'세 면과 글·그림 상자 편집 시작',exact:true}).click();
 await dialog.getByRole('button',{name:'글 상자 추가',exact:true}).click();await dialog.getByLabel('상자 문구',{exact:true}).fill('함께 읽는 우리 이야기');
 await dialog.getByLabel('상자 글꼴',{exact:true}).selectOption('handwriting');await dialog.getByLabel('가로 위치',{exact:true}).fill('12');await dialog.getByLabel('세로 위치',{exact:true}).fill('64');
 await dialog.getByRole('button',{name:'뒤표지',exact:true}).click();await dialog.getByRole('button',{name:'글 상자 추가',exact:true}).click();await dialog.getByLabel('상자 문구',{exact:true}).fill('이 책을 다시 펼치며');
 await dialog.getByRole('button',{name:'책등',exact:true}).click();await dialog.getByRole('button',{name:'앞표지',exact:true}).click();
 await page.screenshot({path:`${evidence}/${id}-cover-editor.png`,fullPage:true});
 await dialog.getByRole('button',{name:'표지 적용',exact:true}).click();await expect(page.getByTestId('preparation-save-status')).toHaveText('기기에 저장됨');
 await page.reload();await expect(page.getByRole('region',{name:'작품 준비'})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();const download=await pending;await download.saveAs(`${evidence}/${id}-cover.knolstory`);
 const archive=JSON.parse(readFileSync(`${evidence}/${id}-cover.knolstory`,'utf8'));expect({...archive.project,cover:before.cover,title:before.title,updatedAt:before.updatedAt}).toEqual(before);expect(archive.project.title).toBe(`${title} · 표지 적용 검토`);expect(archive.project.cover.design.faces.front.elements.some((e:{content?:{text?:string}})=>e.content?.text==='함께 읽는 우리 이야기')).toBe(true);
 const fresh=await browser.newContext({viewport:{width:1280,height:900}});const restored=await fresh.newPage();await restored.goto('/');await enterLibrary(restored);await restored.getByLabel('서재 작품 파일 가져오기',{exact:true}).setInputFiles(`${evidence}/${id}-cover.knolstory`);
 const exportAgain=restored.waitForEvent('download');await restored.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();expect(JSON.parse(readFileSync((await(await exportAgain).path())!,'utf8')).project).toEqual(archive.project);
 await restored.getByRole('button',{name:'서재로',exact:true}).click();const imported=restored.getByRole('article',{name:`가져온 작품 · ${archive.project.title}`,exact:true});await openShelfAction(restored,imported,'처음부터 읽기');await expect(restored.getByRole('main',{name:'책 표지와 소개'})).toBeVisible();
 for(const [width,height,label] of [[1280,900,'desktop'],[844,390,'landscape'],[390,844,'portrait']] as const){await restored.setViewportSize({width,height});await restored.screenshot({path:`${evidence}/${id}-start-${label}.png`,fullPage:true});expect(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 writeFileSync(`${evidence}/${id}-cover-roundtrip.json`,JSON.stringify({projectId:archive.project.id,exactProjectMatch:true,frontElements:archive.project.cover.design.faces.front.elements.length,backElements:archive.project.cover.design.faces.back.elements.length},null,2));await fresh.close();await context.close();
});

test('all eight existing editions enter actual RenPy through their stored book cover',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);mkdirSync(evidence,{recursive:true});await page.goto('/');await enterLibrary(page);
 const works=[['원작','선녀와 나무꾼'],['원작','흥부전'],['원작','옹고집전'],['원작','별주부전'],['기본 예제','선녀와 나무꾼'],['기본 예제','흥부와 놀부, 서로의 몫'],['기본 예제','옹고집전: 옹고집의 속죄'],['기본 예제','별주부전']];
 for(const [index,[kind,title]] of works.entries()){
  const card=page.getByRole('region',{name:kind,exact:true}).getByRole('article').filter({has:page.getByRole('heading',{name:title,exact:true})});await openShelfAction(page,card,'처음부터 읽기');await beginSelectedBook(page);
  const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});await expect.poll(()=>status.getAttribute('data-rendered-revision'),{timeout:30000}).toBe(await status.getAttribute('data-scene-revision'));
  const frame=page.getByTestId('story-runtime-frame');if(index===0)await frame.evaluate(n=>n.setAttribute('data-entry-instance','same'));else await expect(frame).toHaveAttribute('data-entry-instance','same');
  const rect=(await frame.boundingBox())!;await page.mouse.click(rect.x+rect.width*.5,rect.y+rect.height*.1);await expect(status).toHaveAttribute('data-audio-unlocked','true');await expect.poll(()=>status.getAttribute('data-music-path')).toContain('story-score/');
  await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
 }
 await page.screenshot({path:`${evidence}/all-eight-return-library.png`,fullPage:true});
});

for(const [width,height,label] of [[390,844,'portrait'],[844,390,'landscape']] as const)test(`existing book cover touch and keyboard editing at ${label}`,async({browser})=>{
 mkdirSync(evidence,{recursive:true});const context=await browser.newContext({viewport:{width,height},hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto('/');await expect(page.getByRole('main',{name:'책 소개',exact:true})).toBeVisible();await page.screenshot({path:`${evidence}/introduction-${label}.png`,fullPage:true});await page.getByRole('button',{name:'서재로 가기',exact:true}).tap();
 const work=page.getByRole('region',{name:'원작',exact:true}).getByRole('article').first();await openShelfAction(page,work,'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).tap();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await dialog.getByLabel('작품 제목',{exact:true}).fill('선녀와 나무꾼 · 표지 검토');await dialog.getByLabel('지은이',{exact:true}).fill('반영하지 않을 이름');await dialog.getByRole('button',{name:'편집 전 표지로 되돌리기',exact:true}).tap();await expect(dialog.getByLabel('지은이',{exact:true})).toHaveValue('전래 이야기');await expect(dialog.getByLabel('작품 제목',{exact:true})).toHaveValue('선녀와 나무꾼 · 내 사본');
 await dialog.getByRole('button',{name:'아치 창',exact:false}).tap();await dialog.getByText('내 마음대로 배치',{exact:true}).tap();await dialog.getByRole('button',{name:'자유 배치 시작',exact:true}).tap();await dialog.getByLabel('제목 세로 위치 숫자',{exact:true}).fill('25');await dialog.getByRole('button',{name:'현재 디자인의 기본 배치로 되돌리기',exact:true}).tap();
 await dialog.getByLabel('지은이',{exact:true}).focus();await page.keyboard.press('Tab');expect(await dialog.getByLabel('표지 소개 문장',{exact:true}).evaluate(n=>n===document.activeElement)).toBe(true);
 expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);await page.screenshot({path:`${evidence}/cover-editor-${label}.png`,fullPage:true});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByLabel('지은이',{exact:true})).toHaveValue('전래 이야기');await context.close();
});

test('cover title validation keeps the applied book intact and draft recoverable',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openShelfAction(page,page.getByRole('region',{name:'원작',exact:true}).getByRole('article').first(),'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await dialog.getByLabel('작품 제목',{exact:true}).fill('가'.repeat(201));await dialog.getByRole('button',{name:'표지 적용',exact:true}).click();await expect(dialog).toBeVisible();await expect(dialog.getByRole('status')).toContainText('200자');await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByRole('region',{name:'작품 준비',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue('선녀와 나무꾼 · 내 사본');
});
