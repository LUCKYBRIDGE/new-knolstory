import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {blankAuthoringArchive} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('generates validated blank official templates for external application verification',async()=>{const path='docs/architecture/evidence/authoring-format';mkdirSync(path,{recursive:true});for(const kind of ['knolstory','shortstory'] as const){const archive=await blankAuthoringArchive(kind),bytes=await exportAuthoringExcel(archive);expect((await importAuthoringExcel(bytes)).format).toBe(kind);writeFileSync(`${path}/${kind}-blank-v2.xlsx`,bytes);}});
