import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createChoiceWritingDraft} from './choice-writing';
import {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,exportAuthoringWorkbook,importAuthoringWorkbook,exportAuthoringExcel,importAuthoringExcel} from '@knolstory/compatibility';
import {CURRENT_SCHEMA_VERSION,type StoryProject} from '@knolstory/story-domain';
const original=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
const cuts=original.lines.slice(0,3),chapter=original.chapters.find(ch=>ch.id===cuts[0].chapterId)!;
const source={...original,chapters:[chapter],lines:cuts.map((cut,index)=>({...cut,ending:undefined,flow:index===0?{type:'choice' as const,options:[{id:'new',label:'친구를 찾아간다',targetLineId:''},{id:'existing',label:'남은 글을 읽는다',targetLineId:cuts[1].id}]}:undefined}))};
describe('new choice branch writing draft',()=>{
 it('prepares a separate destination and actual editor visit without mutating existing text/assets/staging',()=>{
  const before=structuredClone(source);let count=0;const draft=createChoiceWritingDraft(source,cuts[0].id,'new',[cuts[0].id],()=>`new-${count++}`);
  expect(source).toEqual(before);expect(draft.editingPath).toEqual([cuts[0].id,draft.line.id]);expect(draft.line.text).toBe('');expect(draft.line.stageComposition).toEqual(cuts[0].stageComposition);expect(draft.line.audio).toBeUndefined();expect(draft.project.lines[0].flow).toMatchObject({options:[{id:'new',targetLineId:draft.line.id},{id:'existing',targetLineId:cuts[1].id}]});
  expect(draft.closedLinearTailId).toBe(cuts[2].id);expect(draft.project.lines.slice(1,3)).toEqual([source.lines[1],{...source.lines[2],flow:{type:'goto',targetLineId:null}}]);
 });
 it('retains authored ending/route rather than changing it and rejects a finished choice',()=>{
  const ended={...source,lines:source.lines.map((cut,index)=>index===2?{...cut,flow:{type:'goto' as const,targetLineId:null}}:cut)};let count=0;const draft=createChoiceWritingDraft(ended,cuts[0].id,'new',['removed',cuts[0].id],()=>`branch-${count++}`);expect(draft.closedLinearTailId).toBeUndefined();expect(draft.project.lines[2]).toEqual(ended.lines[2]);expect(()=>createChoiceWritingDraft(ended,cuts[0].id,'existing',[],()=> 'unused')).toThrow();
 });
 it('records the actual choice origin after a reader return changed the current cut',()=>{let count=0;const draft=createChoiceWritingDraft(source,cuts[0].id,'new',[cuts[1].id],()=>`return-${count++}`);expect(draft.editingPath).toEqual([cuts[1].id,cuts[0].id,draft.line.id]);});
 it('roundtrips the complete generated branch via archive/workbook/XLSX/JSONB without editor visits',async()=>{
  let count=0;const draft=createChoiceWritingDraft(source,cuts[0].id,'new',[cuts[0].id],()=>`format-${count++}`);const archive=await createAuthoringArchive({format:'knolstory',document:{documentType:'story-maker-project',schemaVersion:CURRENT_SCHEMA_VERSION,savedAt:'2026-10-13T00:00:00.000Z',appVersion:'test',project:draft.project}});
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);expect(JSON.stringify(archive)).not.toContain('editingPath');
 });
});
