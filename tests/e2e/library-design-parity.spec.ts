import {builtinShelfCard,openBuiltinEdition,builtinEditions} from './library-entry';
import {selectShelfCollection,fillShelfSearch,importShelfFile,openLibraryTools} from './library-entry';
import {openShelfAction} from './library-entry';
import {test,expect} from '@playwright/test';
import {enterLibrary} from './library-entry';
import {mkdirSync} from 'node:fs';
const evidence='docs/architecture/evidence/four-work-library/library-design';
for(const [width,height] of [[1365,900],[820,1180],[390,844],[844,390],[320,740]])test(`legacy book surfaces and focus browsing at ${width}x${height}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<900});const page=await context.newPage();mkdirSync(evidence,{recursive:true});
 await page.goto('/');const intro=page.getByRole('main',{name:'책 소개',exact:true});await expect(intro.locator('[data-intro-poster]')).toHaveCount(1);await expect(intro.getByRole('navigation',{name:'놀스토리 메인 메뉴'}).getByRole('button')).toHaveCount(2);
 const first=await intro.getByRole('region',{name:'놀스토리 소개'}).getByRole('heading',{level:2}).innerText();await intro.getByRole('button',{name:'다른 이야기 표지로 바꾸기',exact:true}).click();await expect(intro.getByRole('region',{name:'놀스토리 소개'}).getByRole('heading',{level:2})).not.toHaveText(first);
 await page.screenshot({path:`${evidence}/intro-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await enterLibrary(page);await selectShelfCollection(page,'example');await expect(page.locator('[data-shelf-book]')).toHaveCount(4);await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('article')).toHaveCount(4);
 await fillShelfSearch(page,'흥부');await expect(page.getByRole('main',{name:'로컬 서재'}).getByRole('article')).toHaveCount(1);await fillShelfSearch(page,'');await selectShelfCollection(page,'all');
 const card=builtinShelfCard(page,'seonnyeo');const opener=card.getByRole('button',{name:/책 표지와 소개 보기$/});await opener.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.locator('[data-edition="knolstory"]')).toHaveCount(1);await page.screenshot({path:`${evidence}/focus-${width}.png`,fullPage:true});const title=await dialog.getByRole('heading').innerText();await dialog.getByRole('button',{name:'다음 책',exact:true}).click();await expect(dialog.getByRole('heading')).not.toHaveText(title);await page.keyboard.press('ArrowLeft');await expect(dialog.getByRole('heading')).toHaveText(title);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 await page.screenshot({path:`${evidence}/library-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
test('cover canvas supports keyboard, drag cancellation and one-operation undo without applying a draft',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openShelfAction(page,builtinShelfCard(page,'seonnyeo'),'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});
 const original=await dialog.getByLabel('작품 제목',{exact:true}).inputValue();await dialog.getByLabel('작품 제목',{exact:true}).fill('되돌릴 제목');await dialog.getByRole('button',{name:'되돌리기',exact:true}).click();await expect(dialog.getByLabel('작품 제목',{exact:true})).toHaveValue(original);
 await dialog.getByRole('button',{name:'제목 선택',exact:true}).click();const title=dialog.getByRole('button',{name:'제목 위치 직접 조정',exact:true});const before=await title.getAttribute('style');await title.focus();await page.keyboard.press('ArrowDown');await expect(title).not.toHaveAttribute('style',before!);await dialog.getByRole('button',{name:'되돌리기',exact:true}).click();await expect(title).toHaveAttribute('style',before!);
 const rect=(await title.boundingBox())!;await page.mouse.move(rect.x+10,rect.y+10);await page.mouse.down();await page.mouse.move(rect.x+10,rect.y+40);await title.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await expect(title).toHaveAttribute('style',before!);
 const handle=dialog.getByRole('button',{name:'제목 크기 직접 조정'});expect((await handle.boundingBox())!.width).toBeGreaterThanOrEqual(44);
 await dialog.getByRole('button',{name:'취소',exact:true}).click();await expect(page.getByRole('region',{name:'작품 준비',exact:true}).getByLabel('작품 제목',{exact:true})).toHaveValue(original);
});

test('imported shelf pages retain all existing-book copies and filter back to the first matching book',async({page})=>{
 await page.setViewportSize({width:1100,height:900});
 const {readFileSync}=await import('node:fs');
 const project=JSON.parse(readFileSync('tests/fixtures/stories/heungbu-classic.json','utf8'));
 await page.goto('/');await enterLibrary(page);
 for(let index=0;index<9;index++){
  const copy={...project,id:`shelf-copy-${index}`,title:`흥부전 서재 ${index+1}`};
  await importShelfFile(page,{name:`copy-${index}.knolstory`,mimeType:'application/json',buffer:Buffer.from(JSON.stringify({documentType:'story-maker-project',schemaVersion:5,savedAt:new Date().toISOString(),appVersion:'knolstory-next',project:copy}))});
  await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
 }
 await selectShelfCollection(page,'imported');const region=page.getByRole('region',{name:'가져온 작품',exact:true});const capacity=Number(await page.locator('[data-capacity]').getAttribute('data-capacity'));await expect(region.getByRole('article')).toHaveCount(Math.min(9,capacity));const paging=page.getByRole('navigation',{name:'가져온 작품 선반 페이지'});await paging.getByRole('button',{name:'다음 선반'}).click();await expect(region.getByRole('article')).toHaveCount(1);await expect(region).toContainText('흥부전 서재 9');await fillShelfSearch(page,'서재 1');await expect(region.getByRole('article')).toHaveCount(1);await expect(region).toContainText('흥부전 서재 1');await fillShelfSearch(page,'');await paging.getByRole('button',{name:'이전 선반'}).click();await expect(region.getByRole('article')).toHaveCount(8);
});

test('layered front, spine and back covers keep direct edits in the draft until apply',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openShelfAction(page,builtinShelfCard(page,'seonnyeo'),'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await dialog.getByRole('button',{name:'세 면과 글·그림 상자 편집 시작',exact:true}).click();
 for(const face of ['앞표지','책등','뒤표지']){
  await dialog.getByRole('button',{name:face,exact:true}).click();const target=dialog.getByRole('button',{name:/글 상자 직접 이동/}).first();const before=await target.getAttribute('style');await target.focus();await page.keyboard.press('ArrowDown');await expect(target).not.toHaveAttribute('style',before!);await dialog.getByRole('button',{name:'되돌리기',exact:true}).click();await expect(target).toHaveAttribute('style',before!);
  await target.click();const handle=dialog.getByRole('button',{name:'선택한 상자 크기 직접 조정'});await expect(handle).toBeVisible();expect((await handle.boundingBox())!.width).toBeGreaterThanOrEqual(44);
 }
 await dialog.getByRole('button',{name:'취소',exact:true}).click();await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();await expect(page.getByRole('button',{name:'세 면과 글·그림 상자 편집 시작',exact:true})).toBeVisible();await page.keyboard.press('Escape');
});

test('all eight books start native RenPy from the library focus and retain the same runtime',async({page},info)=>{
 test.skip(info.project.name!=='stories-runtime');test.setTimeout(240000);
 await page.goto('/');await enterLibrary(page);
 const works=builtinEditions;
 for(const [index,[workId,edition]] of works.entries()){
  await openBuiltinEdition(page,workId,edition,'start');const start=page.getByRole('main',{name:'책 표지와 소개'});await expect(start.locator('[data-edition]')).toHaveAttribute('data-edition',edition);await start.getByRole('button',{name:'처음부터 읽기',exact:true}).click();
  const status=page.getByTestId('story-runtime-status');await expect(status).toContainText('연결됨',{timeout:90000});await expect.poll(()=>status.getAttribute('data-rendered-revision'),{timeout:30000}).toBe(await status.getAttribute('data-scene-revision'));
  const frame=page.getByTestId('story-runtime-frame');if(index===0)await frame.evaluate(node=>node.setAttribute('data-design-instance','persistent'));else await expect(frame).toHaveAttribute('data-design-instance','persistent');
  const rect=(await frame.boundingBox())!;await page.mouse.click(rect.x+rect.width*.5,rect.y+rect.height*.1);await expect(status).toHaveAttribute('data-audio-unlocked','true');await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByRole('main',{name:'로컬 서재'})).toBeVisible();
 }
});

test('one pointer drag can undo, redo and apply while preserving the existing manuscript',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openShelfAction(page,builtinShelfCard(page,'seonnyeo'),'작품 준비');await expect(page.getByTestId('preparation-save-status')).toHaveText('기기에 저장됨');const preparedTitle=await page.getByRole('region',{name:'작품 준비',exact:true}).getByLabel('작품 제목',{exact:true}).inputValue();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.title)).toBe(preparedTitle);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);
 await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await dialog.getByRole('button',{name:'제목 선택',exact:true}).click();await dialog.getByText('내 마음대로 배치',{exact:true}).click();const y=dialog.getByLabel('제목 세로 위치 숫자',{exact:true});const oldY=await y.inputValue();const handle=dialog.getByRole('button',{name:'제목 이동 손잡이',exact:true});const box=(await handle.boundingBox())!;
 await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();await page.mouse.move(box.x+22,box.y+58,{steps:5});await page.mouse.up();await expect(y).not.toHaveValue(oldY);const draggedY=await y.inputValue();await dialog.getByRole('button',{name:'되돌리기',exact:true}).click();await expect(y).toHaveValue(oldY);await dialog.getByRole('button',{name:'다시 하기',exact:true}).click();await expect(y).toHaveValue(draggedY);await dialog.getByRole('button',{name:'표지 적용',exact:true}).click();await expect(page.getByTestId('preparation-save-status')).toHaveText('기기에 저장됨');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project.cover.composition?.titleY)).toBeCloseTo(Number(draggedY));const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document.project);expect({...after,cover:before.cover,updatedAt:before.updatedAt}).toEqual(before);expect(after.cover.composition.titleY).toBeCloseTo(Number(draggedY));
});

test('tab browsing preferences survive book work and reload without entering the story file',async({page})=>{
 await page.goto('/');await enterLibrary(page);await selectShelfCollection(page,'example');await fillShelfSearch(page,'흥부');await page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('button',{name:/책 표지와 소개 보기$/}).click();await page.getByRole('dialog').getByRole('button',{name:'놀스토리 읽기',exact:true}).click();await page.getByRole('button',{name:'서재로',exact:true}).click();await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('builtin');await openLibraryTools(page);await expect(page.getByRole('searchbox',{name:'책 찾기'})).toHaveValue('흥부');await page.reload();await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('builtin');await openLibraryTools(page);await expect(page.getByRole('searchbox',{name:'책 찾기'})).toHaveValue('흥부');
 const data=await page.evaluate(()=>({view:JSON.parse(sessionStorage.getItem('knolstory-library-view-v1')!),document:JSON.parse(localStorage.getItem('knolstory-next-workspace-v1')!).document}));expect(data.view.query).toBe('흥부');expect(JSON.stringify(data.document)).not.toContain('knolstory-library-view-v1');
});

test('modal keyboard boundaries include collapsed settings and nested image selection',async({page})=>{
 await page.goto('/');await enterLibrary(page);const card=builtinShelfCard(page,'seonnyeo');const opener=card.getByRole('button',{name:/책 표지와 소개 보기$/});await opener.click();const focus=page.getByRole('dialog');for(let i=0;i<16;i++){await page.keyboard.press(i<8?'Tab':'Shift+Tab');expect(await focus.evaluate(dialog=>dialog.contains(document.activeElement))).toBe(true);}await page.keyboard.press('Escape');await expect(opener).toBeFocused();await openShelfAction(page,card,'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const editor=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await editor.getByRole('button',{name:'표지 적용',exact:true}).focus();await page.keyboard.press('Tab');await expect(editor.getByRole('button',{name:'닫기',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(editor.getByRole('button',{name:'표지 적용',exact:true})).toBeFocused();await editor.getByText('내 마음대로 배치',{exact:true}).focus();await page.keyboard.press('Tab');await expect(editor.getByRole('button',{name:'세 면과 글·그림 상자 편집 시작',exact:true})).toBeFocused();await editor.getByRole('button',{name:'표지 배경 이미지 찾기',exact:true}).click();const child=page.getByRole('dialog',{name:'이미지 선택 · 표지 배경'});await child.locator('button:not([disabled])').last().focus();await page.keyboard.press('Tab');await expect(child.getByRole('button',{name:'이미지 선택 닫기'})).toBeFocused();await page.keyboard.press('Escape');await expect(child).toHaveCount(0);await expect(editor).toBeVisible();await page.keyboard.press('Escape');
});

test('cover title size changes the rendered typography without covering the whole artwork panel',async({page})=>{
 await page.goto('/');await enterLibrary(page);await openShelfAction(page,builtinShelfCard(page,'seonnyeo'),'작품 준비');await page.getByRole('button',{name:'책 표지 편집',exact:true}).click();const dialog=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});const preview=dialog.getByRole('region',{name:'표지 미리보기'});const title=preview.locator('h2[data-font]');await dialog.getByLabel('제목 크기 숫자',{exact:true}).fill('14');const small=await title.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));await dialog.getByLabel('제목 크기 숫자',{exact:true}).fill('80');await expect.poll(()=>title.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThan(small+1);await expect(dialog.getByLabel('제목 크기 숫자',{exact:true})).toHaveValue('80');const separation=await title.evaluate(node=>{const copy=node.closest('[data-role=title]')!.getBoundingClientRect();const art=node.closest('[data-cover-face]')!.querySelector('[class*=art]')!.getBoundingClientRect();return copy.bottom<=art.top;});expect(separation).toBe(true);await dialog.getByLabel('제목 크기 숫자',{exact:true}).fill('36');await dialog.getByRole('button',{name:'제목 선택',exact:true}).click();const geometry=await title.evaluate(node=>({panel:getComputedStyle(node.parentElement!.parentElement!).backgroundColor,textHeight:node.parentElement!.getBoundingClientRect().height,frameHeight:node.parentElement!.parentElement!.getBoundingClientRect().height}));expect(geometry.panel).toBe('rgba(0, 0, 0, 0)');expect(geometry.textHeight).toBeLessThan(geometry.frameHeight*.7);await page.keyboard.press('Escape');
});

test('books physically rest on shelf faces and room decoration frames the focused shelves',async({browser})=>{
 const context=await browser.newContext();const page=await context.newPage();await page.goto('/');await enterLibrary(page);
 for(const [width,height] of [[1365,900],[820,1180],[390,844],[844,390],[320,740]]){
  await page.setViewportSize({width,height});await page.getByRole('main',{name:'로컬 서재'}).scrollIntoViewIfNeeded();
  await expect(page.locator('[data-shelf-book]').first().getByRole('button')).toHaveCount(1);
  const contact=await page.locator('[data-shelf-book]').evaluateAll(nodes=>nodes.map(node=>{const cover=node.querySelector('[data-shelf-cover]')!.getBoundingClientRect();const plank=node.querySelector('[class*="plank"]')!.getBoundingClientRect();return Math.abs(cover.bottom-plank.top);}));expect(Math.max(...contact)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`${evidence}/shelf-contact-${width}.png`,fullPage:true});
 }
 const layers=await page.getByRole('main',{name:'로컬 서재'}).evaluate(root=>{const props=Array.from(root.querySelectorAll<HTMLElement>('[class*="foreground"]'));return props.map(node=>({filter:getComputedStyle(node).filter,pointerEvents:getComputedStyle(node).pointerEvents}));});expect(layers).toHaveLength(2);expect(layers.every(item=>item.filter.includes('blur(')&&item.pointerEvents==='none')).toBe(true);await context.close();
});

test('cabinet preserves shelf capacity and compacts occupied rows around four books',async({page})=>{
 await page.goto('/');await enterLibrary(page);const shelf=page.locator('[data-shelf-room]');await expect(shelf).toHaveCount(1);await expect(page.getByLabel('책장 서랍',{exact:true})).toBeVisible();
 for(const [width,height,columns,rows] of [[1500,1000,5,2],[1200,900,4,2],[820,1180,3,3],[390,844,2,3]]){
  await page.setViewportSize({width,height});await expect(shelf).toHaveAttribute('data-columns',String(columns));await expect(shelf).toHaveAttribute('data-rows',String(Math.min(rows,Math.ceil(4/columns))));await expect(shelf).toHaveAttribute('data-capacity',String(columns*rows));await expect(page.locator('[data-shelf-book]')).toHaveCount(Math.min(4,columns*rows));await expect(page.locator('[data-shelf-book]').getByRole('button')).toHaveCount(Math.min(4,columns*rows));const contact=await page.locator('[data-shelf-book]').evaluateAll(nodes=>nodes.map(node=>Math.abs(node.querySelector('[data-shelf-cover]')!.getBoundingClientRect().bottom-node.querySelector('[class*="plank"]')!.getBoundingClientRect().top)));expect(Math.max(...contact)).toBeLessThanOrEqual(2);
 }
});

test('reference introduction uses exact rectangular posters and quiet library controls',async({page})=>{
 await page.goto('/');const intro=page.getByRole('main',{name:'책 소개'});await expect(intro.getByRole('heading',{name:'옹고집전',exact:true})).toBeVisible();await expect(intro.getByRole('button',{name:'나만의 이야기',exact:true})).toBeVisible();await expect(intro.getByRole('button',{name:'서재로 가기',exact:true})).toHaveText('서재 입장');await expect(intro.getByText('이 이야기의 작가: 당신',{exact:false})).toBeVisible();
 for(const art of ['onggojib','seonnyeo','heungbu','rabbit']){const image=intro.locator('[data-intro-poster]');await expect(image).toHaveAttribute('data-intro-poster',art);await expect(image).toHaveAttribute('src',`/assets/legacy-ui/intro-${art}.webp`);const corner=await image.evaluate(node=>getComputedStyle(node.parentElement!).borderTopLeftRadius);expect(parseFloat(corner)).toBeLessThanOrEqual(16);await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);await intro.getByRole('button',{name:'다른 이야기 표지로 바꾸기',exact:true}).click();}
 await enterLibrary(page);const tools=page.getByTestId('library-tools');await expect(tools).not.toHaveAttribute('open','');await expect(page.getByLabel('서재 작품 파일 가져오기',{exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'새 작품 만들기',exact:true})).toBeHidden();await expect(page.getByRole('searchbox',{name:'책 찾기'})).toBeHidden();await expect(page.locator('img[src*="legacy-cover.onggojib"]')).toHaveCount(0);await expect(page.locator('[data-shelf-room]')).toHaveCount(1);
 const top=await page.locator('[data-shelf-room]').evaluate(node=>node.getBoundingClientRect().top);expect(top).toBeLessThan(240);await page.getByRole('button',{name:'책 소개',exact:true}).click();await intro.getByRole('button',{name:'나만의 이야기',exact:true}).click();await expect(page.getByLabel('책 분류',{exact:true})).toHaveValue('own');
});


test('compact shelf keeps all four books and drawer near the first viewport',async({page})=>{
 await page.goto('/');await enterLibrary(page);
 for(const [width,height] of [[390,844],[320,740],[820,1180],[1200,900],[1500,1000]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  const drawer=page.getByLabel('책장 서랍',{exact:true});await expect.poll(async()=>{const rect=await drawer.boundingBox();return rect!.y+rect!.height;}).toBeLessThanOrEqual(height+48);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});await expect(page.locator('[data-shelf-book]')).toHaveCount(4);
 expect(await page.locator('article[data-work-id]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-work-id')).sort())).toEqual(['heungbu','onggojib','rabbit','seonnyeo']);
 await expect(page.getByRole('button',{name:'다음 선반',exact:true})).toBeDisabled();
 await page.setViewportSize({width:1200,height:900});await expect(page.locator('[data-shelf-book]')).toHaveCount(4);
});

test('cabinet joinery uses visible wood grain and preserves the book selection experience',async({page})=>{
 await page.goto('/');await enterLibrary(page);
 await expect(page.locator('[data-cabinet-upright]')).toHaveCount(2);await expect(page.locator('[data-cabinet-rail]')).toHaveCount(Number(await page.locator('[data-shelf-room]').getAttribute('data-rows')));await expect(page.locator('[data-cabinet-base]')).toHaveCount(1);
 const surfaces=await page.locator('[data-cabinet-upright], [data-cabinet-base], [data-drawer-face]').evaluateAll(nodes=>nodes.map(node=>({image:getComputedStyle(node).backgroundImage,pointer:getComputedStyle(node).pointerEvents})));
 expect(surfaces.every(surface=>surface.image.includes('shelf.webp'))).toBe(true);
 const shelf=page.locator('[data-shelf-book]').first();const opener=shelf.getByRole('button');await opener.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(opener).toBeFocused();
});

test('book page blocks stay narrow and rest above the shelf instead of protruding below the cover',async({page})=>{
 await page.goto('/');await enterLibrary(page);
 const edges=await page.locator('[data-shelf-book] [data-cover-face="front"]').evaluateAll(books=>books.map(book=>{const cover=book.getBoundingClientRect();const edge=book.querySelector('[class*="pageEdges"]')!.getBoundingClientRect();return {projection:edge.right-cover.right,bottom:edge.bottom-cover.bottom,image:getComputedStyle(book.querySelector('[class*="pageEdges"]')!).backgroundImage};}));
 expect(edges.every(edge=>edge.projection<=4&&edge.bottom<=1)).toBe(true);expect(edges.every(edge=>!edge.image.includes('repeating-linear-gradient'))).toBe(true);
});

test('branded library shows word-safe cover titles and opens cover editing directly from the chosen book',async({page})=>{
 await page.goto('/');await enterLibrary(page);await expect(page.getByRole('heading',{name:'놀스토리 서재',exact:true})).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 const words=await page.locator('[data-shelf-book] h2[data-font]').evaluateAll(titles=>titles.flatMap(title=>{const text=title.firstChild;if(!text||text.nodeType!==Node.TEXT_NODE)return [];const value=text.textContent??'';return Array.from(value.matchAll(/\S+/g)).map(match=>{const tops=[];for(let i=match.index!;i<match.index!+match[0].length;i++){const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);tops.push(range.getBoundingClientRect().top);}return Math.max(...tops)-Math.min(...tops);});}));expect(words.every(delta=>delta<=1)).toBe(true);
 const original=builtinShelfCard(page,'seonnyeo');await openShelfAction(page,original,'책 표지 편집');const editor=page.getByRole('dialog',{name:'내 책 표지 꾸미기'});await expect(editor).toBeVisible();await editor.getByLabel('작품 제목',{exact:true}).fill('겹치지 않는 나의 이야기');await editor.getByRole('button',{name:'글·그림 분리 배치',exact:true}).click();await editor.getByRole('button',{name:'표지 적용',exact:true}).click();await page.getByRole('button',{name:'서재로',exact:true}).click();
 await expect(page.getByRole('region',{name:'기본 작품',exact:true}).getByRole('heading',{name:'선녀와 나무꾼',exact:true})).toHaveCount(1);
 await selectShelfCollection(page,'own');await page.getByRole('article').filter({has:page.getByRole('heading',{name:'겹치지 않는 나의 이야기',exact:true})}).getByRole('button',{name:/책 표지와 소개 보기$/}).click();await page.getByRole('dialog').locator('summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'파일로 보관',exact:true}).click();expect((await download).suggestedFilename()).toBe('겹치지 않는 나의 이야기.knolstory');
});
