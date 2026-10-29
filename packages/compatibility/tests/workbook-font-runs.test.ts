import {it,expect} from 'vitest';
import {fontRunText} from '../src/authoring-workbook/font-runs';
import {getRepresentativeStory} from '../src';
import {createExcelWorkbook} from '../src/excel';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {blankAuthoringArchive} from '../src/authoring-workbook';
// Full-workbook ZIP export/load/save/import is integration I/O; coverage on
// shared CI runners needs more than Vitest's 5s pure-unit-test budget.
const workbookRoundtripTimeout=30_000;
it('preserves plain text split into script font runs by external spreadsheet saves',{timeout:workbookRoundtripTimeout},async()=>{
 const document=getRepresentativeStory('rabbit'),book=await createExcelWorkbook();await book.xlsx.load(await exportAuthoringExcel({format:'knolstory',document}) as never);const sheet=book.getWorksheet('컷')!,keys=sheet.getRow(2).values as string[];
 sheet.getCell(3,keys.indexOf('text')).value={richText:[{font:{name:'Korean fallback',family:2,size:11,color:{argb:'FF183331'}},text:'001 한글 '},{font:{name:'Latin fallback',charset:1,size:11,color:{argb:'FF183331'}},text:'=literal 🌳\n'},{font:{name:'Korean fallback',family:2,size:11,color:{argb:'FF183331'}},text:'다음 줄'}]};
 const result=await importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()));if(result.format!=='knolstory')throw Error('kind');expect(result.document.project.lines[0].text).toBe('001 한글 =literal 🌳\n다음 줄');expect(result.document.project.lines.slice(1)).toEqual(document.project.lines.slice(1));
});
it('keeps rejecting inline emphasis differences and formulas rather than discarding authored meaning',{timeout:workbookRoundtripTimeout},async()=>{
 // The preceding test proves preservation of all 292 representative cuts.
 // These six rejection cases need a real XLSX, but only one authored cell;
 // avoid reserializing the entire manuscript for every unsupported style.
 const book=await createExcelWorkbook();await book.xlsx.load(await exportAuthoringExcel(await blankAuthoringArchive('knolstory')) as never);const sheet=book.getWorksheet('컷')!,keys=sheet.getRow(2).values as string[],cell=sheet.getCell(3,keys.indexOf('text'));
 for(const changed of [{bold:true},{italic:true},{underline:true},{size:20},{color:{argb:'FFFF0000'}}]){cell.value={richText:[{font:{size:11,color:{argb:'FF183331'}},text:'일반 '},{font:{size:11,color:{argb:'FF183331'},...changed},text:'강조'}]};await expect(importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow(/일반 값|서식/);}
 cell.value={formula:'1+1',result:2};await expect(importAuthoringExcel(new Uint8Array(await book.xlsx.writeBuffer()))).rejects.toThrow(/수식/);
});

it('limits accepted run objects to strings and known font metadata without mutating them',()=>{
 const input={richText:[{font:{name:'한글',family:2,charset:129,scheme:'minor',size:12,bold:false,italic:false,strike:false,outline:false,underline:'single',vertAlign:'superscript',color:{theme:1,indexed:2,argb:'FF123456'}},text:'001 '},{font:{name:'Latin',family:1,charset:1,scheme:'major',size:12,bold:false,italic:false,strike:false,outline:false,underline:'single',vertAlign:'superscript',color:{argb:'FF123456',indexed:2,theme:1}},text:'=literal\n🌳'}]},before=structuredClone(input);
 expect(fontRunText(input)).toBe('001 =literal\n🌳');expect(input).toEqual(before);expect(fontRunText({richText:[]})).toBe('');expect(fontRunText({richText:[{text:'글'},{font:{},text:'입니다'}]})).toBe('글입니다');expect(fontRunText({richText:[{font:{bold:true},text:''},{text:'글'}]})).toBe('글');
 const invalid=[null,undefined,'plain',new Date(),{richText:[],formula:'1+1'},{richText:'text'},{richText:new Array(2)},{richText:[{text:1}]},{richText:[{text:'x',hyperlink:'https://example.com'}]}];for(const value of invalid)expect(fontRunText(value)).toBeUndefined();
});
it('rejects malformed font values and inline distinctions while permitting uniform font styling',()=>{
 for(const font of [new Date(),[],{name:1},{family:-1},{charset:1.5},{scheme:'other'},{size:0},{size:Infinity},{bold:'yes'},{underline:'wavy'},{vertAlign:'other'},{color:'red'},{color:{argb:'red'}},{color:{theme:-1}},{color:{unexpected:1}},{unknown:1}])expect(fontRunText({richText:[{font,text:'글'}]})).toBeUndefined();
 for(const style of [{bold:true},{italic:true},{strike:true},{outline:true},{underline:false},{underline:'double'},{vertAlign:'subscript'},{color:{theme:1}},{color:{indexed:2}}])expect(fontRunText({richText:[{font:style,text:'앞'},{font:style,text:'뒤'}]})).toBe('앞뒤');
 expect(fontRunText({richText:[{font:{bold:true},text:'앞'},{text:'뒤'}]})).toBeUndefined();
});
