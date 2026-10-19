import {describe,it,expect} from 'vitest';
import {getRepresentativeStory} from '../src';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
describe('complete editable workbook assembly',()=>{
 for(const id of ['rabbit','heungbu'] as const)it(`${id}: builds content from editable tables without a hidden project payload`,async()=>{const document=getRepresentativeStory(id);const workbook=await exportAuthoringWorkbook({format:'knolstory',document});expect(Object.keys(workbook.tables)).not.toContain('payload');expect((await importAuthoringWorkbook(workbook)).format).toBe('knolstory');const result=await importAuthoringWorkbook(workbook);if(result.format==='knolstory')expect(result.document).toEqual(JSON.parse(JSON.stringify(document)));});
 it('rejects unrecognized sheets before dropping authored content',async()=>{const workbook=await exportAuthoringWorkbook({format:'knolstory',document:getRepresentativeStory('rabbit')});await expect(importAuthoringWorkbook({...workbook,tables:{...workbook.tables,unknown:{headers:['note'],rows:[['작성한 글']]}}})).rejects.toThrow(/탭/);});
});

import {blankAuthoringArchive} from '../src/authoring-workbook';
import {newShortStory} from '../src/shortstory';
it('blank official templates are authorable and shortstory has complete structural parity',async()=>{
 for(const kind of ['knolstory','shortstory'] as const){const archive=await blankAuthoringArchive(kind),workbook=await exportAuthoringWorkbook(archive);expect((await importAuthoringWorkbook(workbook)).format).toBe(kind);}
 const project=newShortStory(),workbook=await exportAuthoringWorkbook({format:'shortstory',project});const result=await importAuthoringWorkbook(workbook);if(result.format==='shortstory')expect(result.project).toEqual(project);
});
