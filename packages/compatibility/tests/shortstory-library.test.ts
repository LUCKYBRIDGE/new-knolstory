import { describe, it, expect } from 'vitest';
import { getShortStoryOriginal, shortStoryOriginals } from '../src/shortstory-originals';
import { encodeShortStory, decodeShortStory, exportShortStoryTable, importShortStoryTable } from '../src/shortstory';
import { resolveAsset } from '../../asset-registry/src/index';
describe('four fixed picture books',()=>{
 it('preserves all actual pack scene text and illustration IDs independently',()=>{
  expect(shortStoryOriginals.map(book=>book.key)).toEqual(['rabbit','onggojib','seonnyeo','heungbu']);
  for(const book of shortStoryOriginals){const p=getShortStoryOriginal(book.key);expect(p.pages.length).toBe(book.key==='seonnyeo'?10:8);expect(p.pages.every(page=>page.text.length>30&&resolveAsset(page.backgroundId))).toBe(true);expect(decodeShortStory(encodeShortStory(p))).toEqual(p);p.pages[0].text='changed';expect(getShortStoryOriginal(book.key).pages[0].text).not.toBe('changed');}
 });
 it('rejects extra envelope data and v2 activity projects before any content is discarded',()=>{const p=getShortStoryOriginal('rabbit');expect(()=>decodeShortStory(JSON.stringify({manifest:{format:'shortstory',version:1,kind:'project'},project:p,activities:[]}))).toThrow();expect(()=>decodeShortStory(JSON.stringify({manifest:{format:'shortstory',version:2,kind:'project'},project:p}))).toThrow();});
 it('rejects unrelated spreadsheet rows and unsupported cells rather than losing data',()=>{
  const rows=exportShortStoryTable(getShortStoryOriginal('rabbit'));
  expect(()=>importShortStoryTable([...rows,['chapter','foreign']])).toThrow();
  const extra=structuredClone(rows);extra.find(row=>row[0]==='page')![10]='audio';expect(()=>importShortStoryTable(extra)).toThrow();
 });
});
