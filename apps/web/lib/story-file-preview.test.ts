import {it,expect,vi} from 'vitest';
import * as compatibility from '@knolstory/compatibility';
import {previewAuthoringFile} from './story-file-preview';
it('loads an official XLSX once before preview validation instead of parsing its notes and sheets twice',async()=>{
 const archive=await compatibility.blankAuthoringArchive('knolstory');
 const bytes=await compatibility.exportAuthoringExcel(archive);
 const sample=await compatibility.createExcelWorkbook();
 const load=vi.spyOn(Object.getPrototypeOf(sample.xlsx),'load');
 try{
  expect(await previewAuthoringFile(new File([new Uint8Array(bytes)],'story.xlsx'))).toEqual(archive);
  expect(load).toHaveBeenCalledTimes(1);
 }finally{load.mockRestore();}
});

import {readStoryFile} from './story-archive';
it('the common file reader reuses official multi-tab validation and rejects duplicate JSON without replacing content',async()=>{
 const archive=await compatibility.blankAuthoringArchive('knolstory');if(archive.format!=='knolstory')throw Error('kind');
 const bytes=await compatibility.exportAuthoringExcel(archive);
 expect(await readStoryFile(new File([new Uint8Array(bytes)],'shared-reader.xlsx'))).toEqual(archive.document.project);
 const invalid=JSON.stringify(archive).replace('"title":"','"title":"before","title":"');
 await expect(readStoryFile(new File([invalid],'duplicate.knolstory'))).rejects.toThrow(/중복/);
});
