import {it,expect} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registeredWorkbookCopy} from './fixtures/registered-workbook-copy';
const files=['docs/architecture/evidence/editor-terminology/seconds-excel-edited.xlsx','docs/architecture/evidence/editor-terminology/seconds-google-edited.xlsx','docs/architecture/evidence/authoring-format/story-excel-edited.xlsx','docs/architecture/evidence/authoring-format/story-google-edited.xlsx'];
for(const path of files)it(`preserves historical private artifact and every field of explicit registered copy: ${path}`,async()=>{
 const bytes=readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex');
 const {original,archive,buffer,replacements}=await registeredWorkbookCopy(path);
 expect(readFileSync(path)).toEqual(bytes);expect(original.audioResources.length).toBeGreaterThan(0);
 if(process.env.KNOL_WRITE_CURRENT_COPIES!=='1')return;
 const directory='docs/architecture/evidence/full-current-2026-10-14/registered-copies';mkdirSync(directory,{recursive:true});
 const name=path.split('/').at(-1)!;
 writeFileSync(`${directory}/${name}`,buffer);writeFileSync(`${directory}/${name}.json`,JSON.stringify({source:path,sourceSha256:hash,original,archive,replacements:[...replacements]},null,2)+'\n');
});
