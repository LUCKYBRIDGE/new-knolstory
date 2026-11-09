import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {confirmAuthoringImport} from './authoring-file';
import {openShortStoryDetails} from './shortstory-navigation';

const catalog = JSON.parse(readFileSync('packages/asset-registry/src/catalog.json', 'utf8')) as {
 id: string; displayName: string; src: string;
}[];
const packs = JSON.parse(readFileSync('packages/compatibility/src/shortstory-originals-data.json', 'utf8')) as {
 worldId: string; scenes: {art: {assetId: string}}[];
}[];
const slugs = [
 'rabbit-crossroads', 'rabbit-spilled-basket',
 'heungbu-shared-well', 'heungbu-wind-laundry',
 'seonnyeo-broken-bridge', 'seonnyeo-lost-bundle',
 'onggojib-market-scales', 'onggojib-rain-shelter',
];

for (const width of [390, 1440]) test(`ShortStory mixes familiar scenes and eight independent situations through reorder and file roundtrip ${width}`, async ({page, browser}) => {
 const originalId = packs.find(pack => pack.worldId === 'rabbit')!.scenes[0]!.art.assetId;
 const images = [originalId, ...slugs.map(slug => `shortstory.background.creative-${slug}-v1`)].map(id => {
  const asset = catalog.find(item => item.id === id);
  expect(asset, id).toBeDefined();
  return asset!;
 });
 const texts = images.map((_, index) => `익숙한 장면과 새 사건을 섞어 내가 쓴 ${index + 1}번째 이야기.`);
 await page.setViewportSize({width, height: 900});
 await page.goto('/shortstory?mode=library');
 await page.getByRole('button', {name: '새 그림책', exact: true}).click();
 await page.getByLabel('이야기 제목', {exact: true}).fill('장면을 섞어 만든 새로운 이야기');
 const writing = page.getByRole('region', {name: '숏스토리 쓰기', exact: true});
 for (const [index, asset] of images.entries()) {
  if (index > 0) await writing.getByRole('button', {name: '현재 쪽 뒤에 빈 쪽 추가', exact: true}).click();
  await writing.getByRole('button', {name: '삽화 고르기', exact: true}).click();
  const picker = page.getByRole('dialog', {name: '삽화 고르기', exact: true});
  await expect(picker.getByRole('button', {name: '모든 삽화', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await picker.getByRole('searchbox', {name: '삽화 검색'}).fill(asset.displayName);
  const card = picker.locator(`[data-asset-id="${asset.id}"]`);
  await expect(card).toBeVisible();
  await expect.poll(() => card.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await card.click();
  await writing.getByLabel('이 쪽 제목', {exact: true}).fill(`내가 잇는 장면 ${index + 1}`);
  await writing.getByLabel('이 쪽의 이야기', {exact: true}).fill(texts[index]!);
 }
 // Put a new event between the familiar opening and another independent situation.
 await writing.getByLabel('이 쪽 옮기기').selectOption({label: '2쪽'});
 await expect(writing.getByRole('heading', {name: /^2쪽/})).toBeVisible();
 await page.reload();
 await expect(writing.getByLabel('이 쪽의 이야기', {exact: true})).toHaveValue(texts.at(-1)!);
 const expected = [0, 8, 1, 2, 3, 4, 5, 6, 7].map((sourceIndex, index) => ({
  order: index + 1, backgroundId: images[sourceIndex]!.id, text: texts[sourceIndex],
 }));
 await openShortStoryDetails(page, '파일 교환·보관');
 const downloading = page.waitForEvent('download');
 await page.getByRole('button', {name: '작품 파일 내보내기', exact: true}).click();
 const path = await (await downloading).path();
 expect(path).toBeTruthy();
 const bytes = await readFile(path!);
 const exported = JSON.parse(bytes.toString()).project;
 expect(exported.pages.map((item: {order: number; backgroundId: string; text: string}) => ({
  order: item.order, backgroundId: item.backgroundId, text: item.text,
 }))).toEqual(expected);
 const context = await browser.newContext({viewport: {width, height: 900}});
 try {
  const imported = await context.newPage();
  await imported.goto(new URL('/shortstory?mode=library', page.url()).href);
  await imported.getByLabel('숏스토리 파일 가져오기', {exact: true}).setInputFiles({
   name: 'mixed-situations.shortstory', mimeType: 'application/json', buffer: bytes,
  });
  await confirmAuthoringImport(imported);
  const restored = await imported.evaluate(() => {
   const library = JSON.parse(localStorage.getItem('knolstory-shortstory-library-v1')!);
   return library.books.find((book: {id: string}) => book.id === library.activeId);
  });
  expect(restored).toEqual(exported);
  await imported.getByRole('button', {name: '읽기', exact: true}).click();
  const reading = imported.getByRole('region', {name: '숏스토리 읽기', exact: true});
  for (const [index, scene] of expected.entries()) {
   await expect(reading).toContainText(scene.text!);
   const art = reading.getByRole('img', {name: `${index + 1}쪽 삽화`, exact: true}).locator('img');
   await expect(art).toHaveAttribute('src', catalog.find(asset => asset.id === scene.backgroundId)!.src);
   await expect.poll(() => art.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
   if (index < expected.length - 1) await reading.getByRole('button', {name: '다음 쪽', exact: true}).click();
  }
  expect(await imported.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 } finally {
  await context.close();
 }
});
