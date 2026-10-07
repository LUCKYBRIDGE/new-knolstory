import { describe, expect, it } from 'vitest';
import { getRepresentativeStory } from '../src/index';
import { exportStoryTable, importStoryTable, parseTableTsv, serializeTableTsv } from '../src/story-table';
import { exportStoryExcel, importStoryExcel } from '../src/excel';
import { decodeShortStory, encodeShortStory, newShortStory, exportShortStoryTable, importShortStoryTable } from '../src/shortstory';

describe('Next lossless table formats', () => {
  it('preserves branches, actors, all presentation and audio fields and embedded resources through TSV', () => {
    const document = getRepresentativeStory('heungbu');
    const resources = [{ id: 'audio:custom:sample:wav', data: 'x'.repeat(70000) }];
    const rows = exportStoryTable(document, resources);
    expect(rows.flat().every(cell => cell.length <= 30000)).toBe(true);
    const result = importStoryTable(parseTableTsv(serializeTableTsv(rows)));
    expect(result.document).toEqual(document);
    expect(result.audioResources).toEqual(resources);
  });
  it('applies editable chapter/cut cells while retaining unexposed fields', () => {
    const document = getRepresentativeStory('rabbit');
    const rows = exportStoryTable(document);
    const chapter = rows.find(row => row[0] === 'chapter')!;
    const cut = rows.find(row => row[0] === 'cut')!;
    chapter[4] = '3장A'; cut[6] = '새 대사\n탭\t따옴표 "한글"';
    const result = importStoryTable(rows).document;
    expect(result.project.chapters[0].title).toBe('3장A');
    expect(result.project.lines[0].text).toBe(cut[6]);
    expect(result.project.lines[0].flow).toEqual(document.project.lines[0].flow);
    expect(result.project.lines[0].presentation).toEqual(document.project.lines[0].presentation);
  });
  it('rejects unknown formats, damaged metadata, duplicates, and invalid edited links', () => {
    const rows = exportStoryTable(getRepresentativeStory('rabbit'));
    expect(() => importStoryTable([['wrong']])).toThrow();
    expect(() => importStoryTable(rows.filter(row => row[0] !== 'payload'))).toThrow();
    expect(() => importStoryTable([...rows, rows.find(row => row[0] === 'cut')!])).toThrow();
    const broken = structuredClone(rows); broken.find(row => row[0] === 'cut')![2] = 'missing';
    expect(() => importStoryTable(broken)).toThrow();
    expect(() => parseTableTsv('"unclosed')).toThrow();
  });
  it('writes an actual XLSX ZIP and loads it losslessly', async () => {
    const document = getRepresentativeStory('seonnyeo');
    const bytes = await exportStoryExcel(document);
    expect([...bytes.slice(0,2)]).toEqual([80,75]);
    expect((await importStoryExcel(bytes)).document).toEqual(document);
  });
});

describe('separate static shortstory contract', () => {
  it('roundtrips existing v1 envelope with pages and static artwork', () => {
    const project = newShortStory();
    const restored = decodeShortStory(encodeShortStory(project));
    expect(restored).toEqual(project);
    expect(importShortStoryTable(exportShortStoryTable(project))).toEqual(project);
  });
  it('rejects presentation/audio rather than silently dropping it or playing it', () => {
    const project = newShortStory();
    expect(() => encodeShortStory({ ...project, audio: { music: { action: 'stop' } } } as never)).toThrow();
    expect(() => encodeShortStory({ ...project, pages: [{ ...project.pages[0], presentation: {} }] } as never)).toThrow();
    expect(() => decodeShortStory('{"manifest":{"format":"shortstory","version":9}}')).toThrow();
  });
});

import { googleSheetTsvUrl, serializeTableCsv, parseTableCsv } from '../src/story-table';
import { importTableExcel, exportTableExcel, importShortStoryExcel, exportShortStoryExcel } from '../src/excel';
import ExcelJS from 'exceljs';
describe('table boundaries and external spreadsheet edits',()=>{
  it('escapes formulas reversibly with quoted multiline, BOM-safe text and apostrophes',()=>{
    const rows=[['=1+1',' +SUM(A1)','-10','@call',"'literal",'tab\tcomma,\n"quote"','한글']];
    const tsv=serializeTableTsv(rows),csv=serializeTableCsv(rows);
    expect(tsv.startsWith("'=1+1")).toBe(true);
    expect(parseTableTsv(tsv)).toEqual(rows);expect(parseTableCsv(csv)).toEqual(rows);
    expect(()=>parseTableTsv('"a"bad')).toThrow();
  });
  it('creates validated new chapter and cut rows and rejects unknown row types or order',()=>{
    const rows=exportStoryTable(getRepresentativeStory('rabbit'));
    const chapter=[...rows.find(row=>row[0]==='chapter')!];chapter[1]='new-chapter';chapter[3]='99';
    const cut=[...rows.find(row=>row[0]==='cut')!];cut[1]='new-cut';cut[2]='new-chapter';cut[3]='1';cut[12]='';
    expect(importStoryTable([...rows,chapter,cut]).document.project.lines.some(c=>c.id==='new-cut')).toBe(true);
    expect(()=>importStoryTable([...rows,['future','extra']])).toThrow();
    const invalid=structuredClone(rows);invalid.find(row=>row[0]==='cut')![3]='zero';
    expect(()=>importStoryTable(invalid)).toThrow();
    const json=structuredClone(rows);json.find(row=>row[0]==='cut')![13]='{invalid';
    expect(()=>importStoryTable(json)).toThrow();
  });
  it('allows only Google public-sheet targets and explicit gid',()=>{
    expect(googleSheetTsvUrl('https://docs.google.com/spreadsheets/d/abc_123/edit#gid=42')).toContain('export?format=tsv&gid=42');
    expect(googleSheetTsvUrl('https://docs.google.com/spreadsheets/d/e/pubId/pubhtml?gid=7')).toContain('/d/e/pubId/pub?output=tsv&gid=7');
    for(const value of ['garbage','https://evil.test/a','http://docs.google.com/spreadsheets/d/a','https://docs.google.com/document/d/a','https://docs.google.com/spreadsheets/d/a?gid=no'])expect(()=>googleSheetTsvUrl(value)).toThrow();
  });
  it('reads actual XLSX edits, refuses formulas and unsupported tabs',async()=>{
    const rows=exportStoryTable(getRepresentativeStory('heungbu'));
    const bytes=await exportTableExcel(rows);const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
    const sheet=book.getWorksheet('KnolStory Next')!;
    const cutIndex=rows.findIndex(row=>row[0]==='cut')+1;
    sheet.getCell(cutIndex,7).value='Excel에서 고친 대사';
    const edited=await importStoryExcel(new Uint8Array(await book.xlsx.writeBuffer()));
    expect(edited.document.project.lines[0].text).toBe('Excel에서 고친 대사');
    sheet.getCell(cutIndex,7).value={formula:'1+1',result:2};
    await expect(importTableExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow('수식');
    sheet.getCell(cutIndex,7).value='text';book.addWorksheet('unsupported');
    await expect(importTableExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow();
    await expect(importTableExcel(new Uint8Array([1,2,3]))).rejects.toThrow();
    await expect(importTableExcel(new Uint8Array())).rejects.toThrow();
  });
  it('roundtrips static page edits through Excel with no runtime cues',async()=>{
    const project=newShortStory();project.pages[0].text='정적인 그림책';
    expect(await importShortStoryExcel(await exportShortStoryExcel(project))).toEqual(project);
    const table=exportShortStoryTable(project);table.find(row=>row[0]==='page')![6]='표에서 고친 글';
    expect(importShortStoryTable(table).pages[0].text).toBe('표에서 고친 글');
  });
});
