import {it,expect} from 'vitest';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {exportAuthoringExcel} from '../src/authoring-workbook/excel';
for(const text of ['앞\u0000뒤','앞\ud800뒤'])it('fails clearly before XLSX can silently replace or remove unsupported text, keeping the original',async()=>{
 const original=await blankAuthoringArchive('shortstory');if(original.format!=='shortstory')throw Error('kind');
 const archive={...original,project:{...original.project,pages:original.project.pages.map(page=>({...page,text}))}};
 await expect(exportAuthoringExcel(archive)).rejects.toThrow(/문자/);
 expect(archive.project.pages[0].text).toBe(text);
});
