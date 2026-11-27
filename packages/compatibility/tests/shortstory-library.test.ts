import { describe, it, expect } from 'vitest';
import { getShortStoryOriginal, isShortStoryWorkKey, shortStoryOriginals } from '../src/shortstory-originals';
import { encodeShortStory, decodeShortStory, exportShortStoryTable, importShortStoryTable } from '../src/shortstory';
import { resolveAsset } from '../../asset-registry/src/index';
describe('provided picture books',()=>{
 it('preserves all actual pack scene text and illustration IDs independently',()=>{
  expect(shortStoryOriginals.map(book=>book.key)).toEqual(['rabbit','onggojib','seonnyeo','heungbu','bakssi']);
  for(const book of shortStoryOriginals){const p=getShortStoryOriginal(book.key);expect(p.pages.length).toBe(['seonnyeo','bakssi'].includes(book.key)?10:8);expect(p.pages.every(page=>page.text.length>30&&(book.key==='bakssi'&&!page.backgroundId||resolveAsset(page.backgroundId)))).toBe(true);expect(decodeShortStory(encodeShortStory(p))).toEqual(p);p.pages[0].text='changed';expect(getShortStoryOriginal(book.key).pages[0].text).not.toBe('changed');}
 });
 it('opens 박씨전 with the authored cover and ten pages while pending art is registered',()=>{
  expect(isShortStoryWorkKey('bakssi')).toBe(true);
  const project=getShortStoryOriginal('bakssi');
  expect(project).toMatchObject({id:'shortstory-original-bakssi',title:'박씨전',cover:{backgroundId:'bakssi-shortstory-cover'}});
  expect(resolveAsset(project.cover.backgroundId)).toMatchObject({type:'background'});
  expect(project.pages.map(page=>page.title)).toEqual([
   '찻잔 두 개','뒤뜰에 지은 집','빈 여물통','물 한 방울','마루 밑의 신발','한밤의 손님','쌀자루를 여는 날','문 하나를 사이에 두고','돌아가는 길','버선발',
  ]);
  const plannedIds=Array.from({length:10},(_,i)=>'bakssi-shortstory-page-'+String(i+1).padStart(2,'0'));
  expect(project.pages.map(page=>page.backgroundId)).toEqual(plannedIds.map(id=>resolveAsset(id)?id:''));
  if(process.env.KNOL_BAKSSI_REQUIRE_ART==='1')expect(project.pages.map(page=>page.backgroundId)).toEqual(plannedIds);
  expect(importShortStoryTable(exportShortStoryTable(project))).toEqual(project);
 });
 it('rejects extra envelope data and v2 activity projects before any content is discarded',()=>{const p=getShortStoryOriginal('rabbit');expect(()=>decodeShortStory(JSON.stringify({manifest:{format:'shortstory',version:1,kind:'project'},project:p,activities:[]}))).toThrow();expect(()=>decodeShortStory(JSON.stringify({manifest:{format:'shortstory',version:2,kind:'project'},project:p}))).toThrow();});
 it('rejects unrelated spreadsheet rows and unsupported cells rather than losing data',()=>{
  const rows=exportShortStoryTable(getShortStoryOriginal('rabbit'));
  expect(()=>importShortStoryTable([...rows,['chapter','foreign']])).toThrow();
  const extra=structuredClone(rows);extra.find(row=>row[0]==='page')![10]='audio';expect(()=>importShortStoryTable(extra)).toThrow();
 });
});
