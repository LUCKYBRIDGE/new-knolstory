import {it,expect} from 'vitest';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {blankAuthoringArchive,CURRENT_WORKBOOK_VERSION} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
it('generates validated blank official templates for external application verification',async()=>{mkdirSync('.cache',{recursive:true});const path=mkdtempSync('.cache/authoring-templates-');for(const kind of ['knolstory','shortstory'] as const){const archive=await blankAuthoringArchive(kind),bytes=await exportAuthoringExcel(archive);expect((await importAuthoringExcel(bytes)).format).toBe(kind);writeFileSync(`${path}/${kind}-blank-v${CURRENT_WORKBOOK_VERSION}.xlsx`,bytes);}});
