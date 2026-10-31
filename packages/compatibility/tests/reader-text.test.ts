import {describe,expect,it} from 'vitest';
import {connectCatalogPerspective,connectPreviousCatalogPerspective} from '../src/catalog-perspective';
import {representativeStories,classicStories,refineProvidedStory,readerTextEdits,enhanceExistingStory,resolveProvidedCatalogStory} from '../src';
import {parseStoryDocument,createStoryDocument,type StoryProject,type StoryLine} from '@knolstory/story-domain';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import priorRabbitHeungbuEdits from '../src/reader-text-rabbit-heungbu.json';
import priorSeonnyeoOnggojibEdits from '../src/reader-text-seonnyeo-onggojib.json';

const priorEdits=[...priorRabbitHeungbuEdits,...priorSeonnyeoOnggojibEdits];
function priorProvidedEdition(project:StoryProject):StoryProject{
 const edits=new Map(priorEdits.filter(edit=>edit.projectId===project.id).map(edit=>[edit.lineId,edit]));
 return {...project,lines:project.lines.map(line=>{
  const edit=edits.get(line.id);
  if(!edit)return line;
  expect(line.text).toBe(edit.before);
  return {...line,text:edit.after};
 })};
}
function editFirstLine(project:StoryProject,patch:Partial<StoryLine>):StoryProject{
 return {...project,lines:project.lines.map((line,index)=>index===0?{...line,...patch}:line)};
}
describe('provided original and creative editions edited reading text',()=>{
 it('provides all eight editions with chapter titles, without retired act numbering',()=>{
  for(const entry of [...representativeStories,...classicStories]){
   expect(entry.project.chapters.every(chapter=>!/^\s*(?:제\s*)?[0-9]+\s*막(?=\s|[:：·.\-]|$)/u.test(chapter.title))).toBe(true);
  }
 });
 it('applies curated exact manuscript edits without touching IDs,flow,actors or source',()=>{
  expect(readerTextEdits.length).toBeGreaterThan(86);
  expect(new Set(readerTextEdits.map(e=>e.projectId)).size).toBe(8);
  expect(new Set(readerTextEdits.map(e=>`${e.projectId}/${e.lineId}`)).size).toBe(readerTextEdits.length);
  for(const entry of [...representativeStories,...classicStories]){
   const original=structuredClone(entry.project),next=refineProvidedStory(entry.project);
   const edits=readerTextEdits.filter(e=>e.projectId===original.id);expect(edits.length).toBeGreaterThan(0);
   for(const edit of edits){expect(original.lines.find(l=>l.id===edit.lineId)?.text).toBe(edit.before);expect(next.lines.find(l=>l.id===edit.lineId)?.text).toBe(edit.after);}
   expect({...next,lines:next.lines.map((line,i)=>({...line,text:original.lines[i].text}))}).toEqual(original);
   expect(entry.project).toEqual(original);expect(refineProvidedStory(next)).toBe(next);
   const parsed=parseStoryDocument(next,{savedAt:'2026-10-06T00:00:00.000Z',appVersion:'reader-text-test'});expect(parsed.ok,JSON.stringify(parsed)).toBe(true);
   const directed=enhanceExistingStory(next);expect(directed.lines.map(l=>l.text)).toEqual(next.lines.map(l=>l.text));
  }
 });
 it('preserves personal copies and any edited provided project completely',()=>{
  for(const entry of [...representativeStories,...classicStories]){
   const copy={...entry.project,id:'personal:'+entry.project.id};expect(refineProvidedStory(copy)).toBe(copy);
   const edited={...entry.project,title:'내가 편집한 제목'};expect(refineProvidedStory(edited)).toBe(edited);
   const textEdited={...entry.project,lines:entry.project.lines.map((line,i)=>i?line:{...line,text:'내가 쓴 원고'})};expect(refineProvidedStory(textEdited)).toBe(textEdited);
  }
 });
 it('refreshes every exact official edition of all eight stories without mutating the source',()=>{
  expect(priorEdits).toHaveLength(86);
  const entries=[...representativeStories,...classicStories];
  expect(entries).toHaveLength(8);
  for(const entry of entries){
   const original=entry.project,current=connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(original)));
   const editions=[original,enhanceExistingStory(original),enhanceExistingStory(priorProvidedEdition(original)),connectPreviousCatalogPerspective(enhanceExistingStory(refineProvidedStory(original))),current];
   expect(resolveProvidedCatalogStory(original)).toEqual(current);
   for(const edition of editions){
    const before=structuredClone(edition);
    expect(resolveProvidedCatalogStory(original,edition),original.id).toEqual(current);
    expect(edition).toEqual(before);
   }
  }
 });
 // Full-manuscript roundtrips exceed the short unit default on shared CI CPUs.
 it('preserves the same reference and every field after any authored edit to any official edition',{timeout:30000},()=>{
  for(const entry of [...representativeStories,...classicStories]){
   const original=entry.project,current=connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(original)));
   const editions=[original,enhanceExistingStory(original),enhanceExistingStory(priorProvidedEdition(original)),current];
   for(const edition of editions){
    const changes:Record<string,StoryProject>={
     personal:{...edition,id:'personal:'+edition.id},
     title:{...edition,title:edition.title+' 내가 정한 제목'},
     description:{...edition,description:(edition.description??'')+' 내가 수정한 설명'},
     text:editFirstLine(edition,{text:edition.lines[0].text+' 내가 쓴 원고'}),
     flow:editFirstLine(edition,{flow:{type:'goto',targetLineId:edition.lines[0].id}}),
     stage:editFirstLine(edition,{inheritActors:false,stageComposition:{leftActors:[{key:'L1',assetId:'personal:actor',xAnchor:45}],rightActors:[]}}),
     audio:editFirstLine(edition,{audio:{music:{action:'play',assetId:'audio:music:forest',volume:0.37}}}),
     updatedAt:{...edition,updatedAt:'2099-01-01T00:00:00.000Z'},
    };
    for(const [field,edited] of Object.entries(changes)){
     const before=structuredClone(edited);
     expect(resolveProvidedCatalogStory(original,edited),`${original.id}: ${field}`).toBe(edited);
     expect(edited).toEqual(before);
    }
   }
  }
 });

 it('refreshes earlier directed editions after document creation and storage parsing reorder object fields',()=>{
  for(const entry of [...representativeStories,...classicStories]){
   const original=entry.project,current=connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(original)));
   for(const edition of [enhanceExistingStory(original),enhanceExistingStory(priorProvidedEdition(original))]){
    const document=createStoryDocument({project:edition,savedAt:'2026-10-18T00:00:00.000Z',appVersion:'reader-storage-test'});
    const parsed=parseStoryDocument(JSON.parse(JSON.stringify(document)));
    expect(parsed.ok).toBe(true);
    if(!parsed.ok)throw Error(JSON.stringify(parsed));
    expect(resolveProvidedCatalogStory(original,parsed.document.project)).toEqual(current);
   }
  }
 });
 it('does not use an edited original as an official catalog migration source',()=>{
  for(const entry of [...representativeStories,...classicStories]){
   const edited=editFirstLine(structuredClone(entry.project),{text:'개인 원고로 바뀐 기준 작품'});
   const before=structuredClone(edited);
   expect(resolveProvidedCatalogStory(edited)).toBe(edited);
   expect(resolveProvidedCatalogStory(edited,entry.project)).toBe(entry.project);
   expect(edited).toEqual(before);
  }
 });
 it('isolates later catalog resolution from consumer edits to returned projects',()=>{
  for(const entry of [...representativeStories,...classicStories]){
   const before=structuredClone(entry.project),expected=connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(entry.project)));
   const returned=resolveProvidedCatalogStory(entry.project);
   // Simulate a consumer editing a selected work in place, including a nested manuscript line.
   returned.title='내 개인 제목';
   returned.lines[0].text='내 개인 원고';
   returned.chapters[0].title='내 개인 장 제목';
   const next=resolveProvidedCatalogStory(entry.project);
   expect(next).not.toBe(returned);
   expect(next).toEqual(expected);
   expect(resolveProvidedCatalogStory(entry.project,expected)).toEqual(expected);
   expect(entry.project).toEqual(before);
  }
 });
 for(const entry of [...representativeStories,...classicStories])it(`${entry.project.id}: current corrected manuscript survives archive, workbook, XLSX and JSONB`,async()=>{
  const original=structuredClone(entry.project),current=resolveProvidedCatalogStory(entry.project);
  const parsed=parseStoryDocument(current,{savedAt:'2026-10-18T00:00:00.000Z',appVersion:'reader-roundtrip-test'});
  expect(parsed.ok).toBe(true);
  if(!parsed.ok)throw Error(JSON.stringify(parsed));
  const archive=await createAuthoringArchive({format:'knolstory',document:parsed.document});
  expect(archive.format).toBe('knolstory');
  if(archive.format!=='knolstory')throw Error('Expected a KnolStory archive');
  expect(archive.document.project).toEqual(current);
  const results=[
   await decodeAuthoringArchive(await encodeAuthoringArchive(archive)),
   await importAuthoringWorkbook(await exportAuthoringWorkbook(archive)),
   await importAuthoringExcel(await exportAuthoringExcel(archive)),
   await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(archive)))),
  ];
  for(const result of results){
   expect(result).toEqual(archive);
   if(result.format!=='knolstory')throw Error('Expected a KnolStory archive');
   expect(result.document.project).toEqual(current);
  }
  expect(entry.project).toEqual(original);
 },20000);

});

describe('옹고집전 perspective title without a confirm button (2026-11-01)',()=>{
 it('shows the reviewed titles by themselves and refreshes a saved copy of the button version',()=>{
  const entry=[...representativeStories,...classicStories].find(item=>item.project.id==='pinky-review-main-003')!;
  const base=enhanceExistingStory(refineProvidedStory(entry.project));
  const current=connectCatalogPerspective(base),previous=connectPreviousCatalogPerspective(base);
  const cues=current.lines.filter(line=>line.presentation?.transition?.type==='perspective-blackout');
  expect(cues.length).toBeGreaterThan(0);
  // No card in the current edition waits for a button; the titles stay exactly as reviewed.
  for(const cue of cues){const transition=cue.presentation!.transition!;expect(transition.mode).toBe('auto');expect(transition.actionLabel).toBeUndefined();expect(transition.durationMs).toBe(1800);expect(transition.title).toBe(cue.text);}
  expect(current.lines.map(line=>line.text)).toEqual(base.lines.map(line=>line.text));
  expect(previous.lines.filter(line=>line.presentation?.transition?.mode==='confirm')).toHaveLength(cues.length);
  expect(resolveProvidedCatalogStory(entry.project,previous)).toEqual(current);
  const edited={...previous,lines:previous.lines.map((line,index)=>index===0?{...line,text:`${line.text} 고침`}:line)};
  expect(resolveProvidedCatalogStory(entry.project,edited)).toBe(edited);
 });
});
