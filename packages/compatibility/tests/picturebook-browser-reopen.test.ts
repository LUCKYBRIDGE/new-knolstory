import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {assertCatalogOnlyMedia} from '../../asset-registry/src/catalog-media-policy';
import {orderedLines} from '../../runtime-core/src/story-runtime';

/**
 * The work a student made in the browser (2026-11-20): 별주부전 8쪽 → 8장, the first line of chapter 4
 * and a second cut in chapter 2. Saving it as a file, Excel or online snapshot and opening it again keeps
 * every chapter sketch and every written line.
 */
it('reopens the browser-made picture-book work from every saved form unchanged',async()=>{
 const document=JSON.parse(readFileSync('docs/architecture/evidence/picturebook-chapters-2026-11-20/browser-rabbit-work.json','utf8'));
 const archive=await createAuthoringArchive({format:'knolstory',document});
 if(archive.format!=='knolstory')throw Error('expected KnolStory');
 assertCatalogOnlyMedia(archive);
 const reopened=[
  await decodeAuthoringArchive(await encodeAuthoringArchive(archive)),
  await importAuthoringWorkbook(await exportAuthoringWorkbook(archive)),
  await importAuthoringExcel(await exportAuthoringExcel(archive)),
  await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(archive)))),
 ];
 for(const value of reopened)expect(value).toEqual(archive);
 const project=archive.document.project;
 expect(project.chapters.map(chapter=>chapter.picturebookSketch?.backgroundId)).toEqual([1,2,3,4,5,6,7,8].map(n=>`rabbit-turtle.scene.shortstory-classic-0${n}`));
 const texts=orderedLines(project).map(line=>line.text);
 expect(texts).toHaveLength(9);
 expect(texts[2]).toContain('토끼님, 어디 계세요?');
 expect(texts[4]).toContain('용궁은 아직 멀었나요?');
});
