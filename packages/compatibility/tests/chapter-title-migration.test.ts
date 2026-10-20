import {expect,it} from 'vitest';
import {getRepresentativeStory} from '../src';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';

it('normalizes retired act titles across current archive, workbook and JSONB without changing the source or story semantics',async()=>{
 const document=getRepresentativeStory('rabbit');
 document.project.chapters[0].title='제1막: 용궁 대청';
 const before=structuredClone(document);
 const archive=await createAuthoringArchive({format:'knolstory',document,audioResources:[]});
 if(archive.format!=='knolstory')throw Error('format');
 expect(archive.document.project.chapters[0].title).toBe('용궁 대청');
 expect(archive.document.project).toEqual({...before.project,chapters:before.project.chapters.map((chapter,index)=>index===0?{...chapter,title:'용궁 대청'}:chapter)});
 expect(document).toEqual(before);
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
});
