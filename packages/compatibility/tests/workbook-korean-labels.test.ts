import {describe,it,expect} from 'vitest';
import {makeTable,readTable,type TableSpec} from '../src/authoring-workbook/model';
import {workbookValueChoices,workbookDisplayValue,workbookStoredValue} from '../src/authoring-workbook/labels';
import {exportAuthoringWorkbook,importAuthoringWorkbook,authoringWorkbookSpecs} from '../src/authoring-workbook';
import {createAuthoringArchive} from '../src/authoring-archive';
import {completeStoryDocument,completeShortStoryProject,completeAudioResources} from './fixtures/authoring-complete';
const cuts:TableSpec={key:'cuts',title:'컷',columns:[{key:'type',label:'대사 종류',type:'text'},{key:'text',label:'본문',type:'text'},{key:'inheritActors',label:'인물 상속',type:'boolean'}]};
describe('한국어 편집 값과 내부 계약의 가역 연결',()=>{
 it('exports Korean enums and booleans while never translating authored text',()=>{
  const table=makeTable(cuts,[{type:'dialogue',text:'dialogue 있음 001 🌳',inheritActors:true}]);
  expect(table.rows[0]).toEqual(['대사','dialogue 있음 001 🌳','있음']);
  expect(readTable({cuts:table},cuts)).toEqual([{type:'dialogue',text:'dialogue 있음 001 🌳',inheritActors:true}]);
 });
 it('accepts existing English codes and true/false files',()=>expect(readTable({cuts:{headers:['type','text','inheritActors'],rows:[['narration','left','FALSE']]}},cuts)).toEqual([{type:'narration',text:'left',inheritActors:false}]));
 it('maps all choices injectively in their context',()=>{for(const spec of authoringWorkbookSpecs('knolstory'))for(const column of spec.columns){const choices=workbookValueChoices(spec,column);expect(new Set(choices.map(c=>c.label)).size).toBe(choices.length);for(const choice of choices){expect(workbookDisplayValue(spec,column,choice.value)).toBe(choice.label);expect(workbookStoredValue(spec,column,choice.label)).toBe(choice.value);expect(workbookStoredValue(spec,column,choice.value)).toBe(choice.value);}}});
 for(const format of ['knolstory','shortstory'] as const)it(`${format}: all fields roundtrip in Korean and old English`,async()=>{
  const archive=await createAuthoringArchive(format==='knolstory'?{format,document:completeStoryDocument(),audioResources:completeAudioResources()}:{format,project:completeShortStoryProject()});
  const workbook=await exportAuthoringWorkbook(archive);expect(await importAuthoringWorkbook(workbook)).toEqual(archive);
  const specs=authoringWorkbookSpecs(format);const english={...workbook,tables:Object.fromEntries(Object.entries(workbook.tables).map(([key,table])=>{const spec=specs.find(s=>s.key===key)!;return [key,{...table,rows:table.rows.map(row=>row.map((text,index)=>workbookStoredValue(spec,spec.columns[index],text,Object.fromEntries(table.headers.map((key,i)=>[key,row[i]])))))}];}))};
  expect(await importAuthoringWorkbook(english)).toEqual(archive);
 });
 it('maps structure steps only on stage-list rows, preserving matching free names',()=>{const spec=authoringWorkbookSpecs('knolstory').find(s=>s.key==='projectLists')!;const records=[{kind:'storyStageKeys',ownerId:'001',position:0,value:'opening'},{kind:'speakerNames',ownerId:'001',position:0,value:'opening'},{kind:'speakerNames',ownerId:'001',position:1,value:'발단'}];const table=makeTable(spec,records);expect(table.rows.map(r=>r[3])).toEqual(['발단','opening','발단']);expect(readTable({projectLists:table},spec)).toEqual(records);});
 it('rejects unknown enum with sheet row column diagnostic',()=>expect(()=>readTable({cuts:{headers:['type','text','inheritActors'],rows:[['잘못된 종류','','없음']]}},cuts)).toThrow(/컷 · 3행 · 대사 종류/));
});
