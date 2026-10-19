import {it,expect} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registeredWorkbookCopy} from './fixtures/registered-workbook-copy';
for(const source of ['google','excel'])it(`preserves needed Korean authoring content in a current registered ${source} copy`,async()=>{
 const path=`docs/architecture/evidence/authoring-format/story-korean-${source}-edited.xlsx`,bytes=readFileSync(path),sourceSha256=createHash('sha256').update(bytes).digest('hex');
 const {original,archive,buffer,replacements}=await registeredWorkbookCopy(path);
 expect(archive.document.schemaVersion).toBe(8);expect(archive.document.project.lines[0]).toMatchObject({text:'한글 양식에서 수정한 작품 🌳',type:'narration'});expect(readFileSync(path)).toEqual(bytes);
 if(process.env.KNOL_WRITE_KOREAN_COPIES!=='1')return;
 const directory='docs/architecture/evidence/remaining-current-2026-10-14/registered-copies';mkdirSync(directory,{recursive:true});const name=path.split('/').at(-1)!;
 writeFileSync(`${directory}/${name}`,buffer);writeFileSync(`${directory}/${name}.json`,JSON.stringify({source:path,sourceSha256,original,archive,replacements:[...replacements]},null,2)+'\n');
});
