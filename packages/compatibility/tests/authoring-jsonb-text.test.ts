import {it,expect} from 'vitest';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {validateAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
for(const text of ['본문\u0000내용','본문\ud800내용'])it('rejects PostgreSQL-incompatible text before producing a JSONB snapshot, preserving source',async()=>{
 const blank=await blankAuthoringArchive('shortstory');if(blank.format!=='shortstory')throw Error('kind');
 const source={...blank,project:{...blank.project,pages:blank.project.pages.map(page=>({...page,text}))}};
 const archive=await validateAuthoringArchive(source);
 await expect(prepareJsonbSnapshot(archive)).rejects.toThrow(/project.pages\[0\].text.*PostgreSQL/);
 expect(source.project.pages[0].text).toBe(text);
});
it('preserves Korean, valid emoji pairs and object-key reordering in a JSONB snapshot',async()=>{
 const archive=await blankAuthoringArchive('shortstory');if(archive.format!=='shortstory')throw Error('kind');
 const checked=await validateAuthoringArchive({...archive,project:{...archive.project,pages:archive.project.pages.map(page=>({...page,text:'한글 🌳 줄바꿈\n001 =문구'}))}});
 const snapshot=await prepareJsonbSnapshot(checked);
 const reordered={assetReferences:snapshot.assetReferences,contentSha256:snapshot.contentSha256,content:snapshot.content,payloadVersion:1};
 expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(reordered)))).toEqual(checked);
});
