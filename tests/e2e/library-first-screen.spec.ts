import {expect,test,type Page} from '@playwright/test';
import {builtinShelfCard,enterLibrary} from './library-entry';

/** 2026-11-23: one header row, shelf near the top, and a book dialog whose main actions need no scroll. */
const phones=[[320,700],[360,720],[390,844]] as const;
const books=['rabbit','onggojib','seonnyeo','heungbu'] as const;
const library=(page:Page)=>page.getByRole('main',{name:'놀스토리 서재',exact:true});

async function open(page:Page,width:number,height:number){
 await page.setViewportSize({width,height});
 await page.goto('/?view=library');await enterLibrary(page);
 await expect(page.locator('[data-shelf-cover]').first()).toBeVisible();
}
const rect=(page:Page,selector:string)=>page.locator(selector).first().evaluate(node=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,height:box.height};});

for(const [width,height] of phones)test(`${width}×${height}: the library header is one row and the shelf starts near the top`,async({page})=>{
 await open(page,width,height);
 const header=page.locator('[data-library-header]');
 await expect(header.getByRole('button',{name:'책 소개',exact:true})).toBeVisible();
 await expect(header.getByLabel('책 분류',{exact:true})).toHaveValue('all');
 await expect(header.getByLabel('책 분류',{exact:true}).locator('option:checked')).toHaveText('모든 작품');
 await expect(header.getByRole('button',{name:'책 찾기',exact:true})).toBeVisible();
 // Every control shares one row and keeps a 44px target.
 const rows=await header.evaluate(node=>[...node.querySelectorAll('summary,button,select')].filter(item=>(item as HTMLElement).offsetParent&&!item.closest('[data-account-menu] section')).map(item=>{const box=item.getBoundingClientRect();return {middle:box.top+box.height/2,height:box.height,width:box.width,right:box.right};}));
 expect(rows.length).toBeGreaterThanOrEqual(3);
 const middles=rows.map(row=>row.middle);expect(Math.max(...middles)-Math.min(...middles)).toBeLessThanOrEqual(2);
 for(const row of rows){expect(row.height).toBeGreaterThanOrEqual(44);expect(row.width).toBeGreaterThanOrEqual(44);expect(row.right).toBeLessThanOrEqual(width);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 // No visible screen title or routine storage sentence above the shelf.
 await expect(library(page).getByRole('heading',{name:'놀스토리 서재'})).toHaveCount(0);
 await expect(library(page).getByText('이 기기에 저장돼요')).toHaveCount(0);
 expect((await rect(page,'[data-shelf-cover]')).top).toBeLessThan(170);
 // One page of books: no paging controls in the drawer.
 await expect(page.getByRole('button',{name:'이전 선반'})).toHaveCount(0);
});

test('the magnifier turns the header row into search, and the query stays visible after closing',async({page})=>{
 await open(page,320,700);
 await page.locator('[data-search-toggle]').click();
 const field=page.getByRole('searchbox',{name:'책 찾기',exact:true});
 await expect(field).toBeFocused();
 const header=await rect(page,'[data-library-header]');expect(header.height).toBeLessThan(60);
 await field.fill('흥부');
 await expect(page.locator('[data-shelf-book]')).toHaveCount(1);
 await page.getByRole('button',{name:'검색어 지우기',exact:true}).click();
 await expect(field).toHaveValue('');await expect(field).toBeFocused();
 await field.fill('없는 제목');await field.press('Escape');
 await expect(page.locator('[data-search-toggle]')).toBeFocused();
 await expect(page.locator('[data-search-toggle]')).toHaveAccessibleName('책 찾기 · ‘없는 제목’ 찾는 중');
 await expect(page.getByRole('button',{name:'‘없는 제목’ · 0권',exact:true})).toBeVisible();
 const empty=page.locator('[data-empty-shelf]');
 await expect(empty).toContainText('‘없는 제목’와 맞는 책이 없어요.');
 await expect(page.getByRole('button',{name:'이전 선반'})).toHaveCount(0);
 await empty.getByRole('button',{name:'검색어 지우기',exact:true}).click();
 await expect(page.locator('[data-shelf-book]')).toHaveCount(4);
 // A Hangul syllable confirmed with Enter stays in the field; only a later Enter closes it.
 await page.locator('[data-search-toggle]').click();
 await field.evaluate(node=>{node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,isComposing:true}));});
 await expect(field).toBeVisible();
 await field.fill('별주');await field.press('Enter');
 await expect(field).toHaveCount(0);
 await expect(page.locator('[data-shelf-book]')).toHaveCount(1);
});

test('an empty 내 작품 shelf says so inside the shelf and offers a new work',async({page})=>{
 await open(page,320,700);
 await page.getByLabel('책 분류',{exact:true}).selectOption('own');
 const empty=page.locator('[data-empty-shelf]');
 await expect(empty).toContainText('아직 내 작품이 없어요.');
 const message=await rect(page,'[data-empty-shelf]'),rail=await rect(page,'[data-cabinet-rail]');
 expect(message.bottom).toBeLessThanOrEqual(rail.top+1);
 await empty.getByRole('button',{name:'새 작품',exact:true}).click();
 const sheet=page.getByRole('dialog',{name:'새 작품',exact:true});
 await expect(sheet.getByLabel('새 작품 제목',{exact:true})).toBeFocused();
 await expect(sheet.getByLabel('서재 작품 파일 가져오기',{exact:true})).toBeVisible();
 await expect(sheet.getByRole('link',{name:'그림책 보관함',exact:true})).toHaveAttribute('href','/shortstory?mode=library');
 await page.keyboard.press('Escape');
 await expect(sheet).toHaveCount(0);
 await expect(empty.getByRole('button',{name:'새 작품',exact:true})).toBeFocused();
});

for(const [width,height] of phones)test(`${width}×${height}: each book dialog shows cover, title, reading, editing and close without scrolling`,async({page})=>{
 await open(page,width,height);
 for(const id of books){
  const card=builtinShelfCard(page,id),shelfArt=await card.locator('img').evaluateAll(nodes=>nodes.map(node=>(node as HTMLImageElement).getAttribute('src')));
  await card.getByRole('button',{name:/ 책 표지와 소개 보기/}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toHaveAttribute('data-work-id',id);
  // The representative cover chosen on the shelf, not another edition's.
  const dialogArt=await dialog.locator('img').evaluateAll(nodes=>nodes.map(node=>(node as HTMLImageElement).getAttribute('src')));
  // Shelf previews and full images share the content hash (‘…/previews/v1/<hash>.webp’ · ‘…?v=<hash>’).
  const hash=(src:string|null)=>src?.match(/([0-9a-f]{16})(?:\.webp)?$/)?.[1]??src;
  expect(dialogArt.map(hash)).toEqual(shelfArt.map(hash));
  expect(shelfArt.length).toBeGreaterThan(0);
  const targets=[dialog.getByRole('button',{name:'닫기 · 서재로 돌아가기'}),dialog.getByRole('heading',{level:2}),dialog.getByRole('button',{name:'원작 읽기',exact:true}),dialog.getByRole('button',{name:'놀스토리 읽기',exact:true}),dialog.getByRole('link',{name:'숏스토리 읽기',exact:true}),dialog.getByRole('button',{name:'편집하기',exact:true})];
  for(const target of targets){
   const box=(await target.boundingBox())!;
   expect(box.y,`${id} ${await target.textContent()}`).toBeGreaterThanOrEqual(0);
   expect(box.y+box.height,`${id} ${await target.getAttribute('aria-label')??await target.textContent()}`).toBeLessThanOrEqual(height);
  }
  const rows=await Promise.all(targets.slice(2,5).map(async target=>(await target.boundingBox())!));
  expect(new Set(rows.map(row=>Math.round(row.height))).size).toBe(1);
  expect(new Set(rows.map(row=>Math.round(row.x))).size).toBe(1);
  expect((await targets[0]!.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await expect(dialog.getByText('← → 다른 책')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole('button',{name:/ 책 표지와 소개 보기/})).toBeFocused();
 }
});

test('편집하기 on a built-in book asks for the edition in place and keeps the cover',async({page})=>{
 await open(page,360,720);
 await builtinShelfCard(page,'seonnyeo').getByRole('button',{name:/ 책 표지와 소개 보기/}).click();
 const dialog=page.getByRole('dialog'),cover=await dialog.locator('img').first().getAttribute('src');
 await dialog.getByRole('button',{name:'편집하기',exact:true}).click();
 const pick=dialog.getByRole('group',{name:'편집할 판 고르기'});
 await expect(pick.getByRole('button',{name:'원작으로 편집',exact:true})).toBeVisible();
 await expect(pick.getByRole('button',{name:'놀스토리로 편집',exact:true})).toBeVisible();
 expect(await dialog.locator('img').first().getAttribute('src')).toBe(cover);
 // Escape first leaves the edition choice, then closes the dialog.
 await page.keyboard.press('Escape');
 await expect(pick).toHaveCount(0);await expect(dialog).toBeVisible();
 await dialog.locator('summary',{hasText:'더보기'}).click();
 await dialog.getByRole('radio',{name:'원작',exact:true}).check();
 expect(await dialog.locator('img').first().getAttribute('src')).toBe(cover);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});

test('책 소개 lands on the four stories and returns to the library',async({page})=>{
 await open(page,320,700);
 await page.getByRole('button',{name:'책 소개',exact:true}).click();
 const list=page.getByRole('region',{name:'놀스토리의 네 이야기'});
 await expect(list.getByRole('heading',{name:'놀스토리의 네 이야기'})).toBeFocused();
 await expect(list.getByRole('listitem')).toHaveCount(4);
 const box=(await list.boundingBox())!;expect(box.y).toBeLessThan(700);
 await list.getByRole('button',{name:'서재로 돌아가기',exact:true}).click();
 await expect(library(page)).toBeVisible();
});

for(const [width,height] of [...phones,[1280,800]] as const)test(`${width}×${height}: shelf books read as real books — nothing overlaps, clips or fails to load`,async({page})=>{
 await open(page,width,height);
 await page.evaluate(()=>document.fonts.ready);
 await expect.poll(()=>page.locator('[data-shelf-cover] img').evaluateAll(nodes=>nodes.every(node=>(node as HTMLImageElement).complete&&(node as HTMLImageElement).naturalWidth>0)),{timeout:20_000}).toBe(true);
 const report=await page.evaluate(()=>{
  const box=(node:Element)=>node.getBoundingClientRect();
  const overlap=(a:DOMRect,b:DOMRect)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const books=[...document.querySelectorAll('article[data-work-id]')].map(article=>{
   const face=article.querySelector('[data-cover-face="front"]')!,title=face.querySelector('h2')!,art=face.querySelector('[class*="art"]'),copy=title.parentElement!,frame=copy.parentElement!;
   const range=document.createRange();range.selectNodeContents(title);const text=range.getBoundingClientRect();
   return {id:article.getAttribute('data-work-id'),font:parseFloat(getComputedStyle(title).fontSize),
    textInsideCover:text.left>=box(face).left-.5&&text.right<=box(face).right+.5&&text.top>=box(face).top-.5,
    textInsideFrame:copy.scrollWidth<=frame.clientWidth+1&&copy.scrollHeight<=frame.clientHeight+1,
    titleOverArt:art?overlap(text,box(art)):0,lines:Math.round(text.height/parseFloat(getComputedStyle(title).lineHeight))};
  });
  const plate=document.querySelector('[data-library-nameplate]'),header=document.querySelector('[data-library-header]')!;
  const covers=[...document.querySelectorAll('[data-shelf-cover]')].map(box);
  return {books,plate:plate?{visible:box(plate).width>0,overHeader:overlap(box(plate),box(header)),overBooks:covers.reduce((sum,cover)=>sum+overlap(box(plate),cover),0)}:null};
 });
 expect(report.plate?.visible).toBe(true);expect(report.plate?.overHeader).toBe(0);expect(report.plate?.overBooks).toBe(0);
 for(const book of report.books){
  expect(book.textInsideCover,`${book.id} title stays on the cover`).toBe(true);
  expect(book.textInsideFrame,`${book.id} title fits its band`).toBe(true);
  expect(book.titleOverArt,`${book.id} title does not cover the picture`).toBe(0);
  if(width<=600){expect(book.font,`${book.id} title is readable`).toBeGreaterThanOrEqual(12);expect(book.lines).toBe(1);}
 }
});
