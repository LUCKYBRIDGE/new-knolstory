import {describe,expect,it} from 'vitest';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook,authoringWorkbookSpecs} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {authoringSchema,type AuthoringSchema} from '../src/authoring-fields';
import {compileStoryScene} from '../../runtime-core/src/story-runtime';
import {completeStoryDocument,completeStoryVariants,completeShortStoryProject,completeAudioResources} from './fixtures/authoring-complete';
import {scoreNarrativeDocument} from './fixtures/score-narrative';
function paths(value:unknown,path='$'):string[]{
 if(Array.isArray(value))return value.flatMap(item=>paths(item,`${path}[]`));
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,item])=>paths(item,`${path}.${key}`));
 return [path];
}
function schemaPaths(schema:AuthoringSchema,path='$'):string[]{
 if(schema.kind==='undefined')return [];
 if(schema.kind==='union')return schema.variants!.flatMap(item=>schemaPaths(item,path));
 if(schema.kind==='array')return schemaPaths(schema.element!,`${path}[]`);
 if(schema.kind==='object')return Object.entries(schema.properties!).flatMap(([key,item])=>schemaPaths(item,`${path}.${key}`));
 return [path];
}
/** Every field path names the ownerModule and actual editable tables exercised by parity tests. */
function fieldMapping(path:string,format:'knolstory'|'shortstory'){
 let ownerModule='project',tables=['project'];
 if(path.includes('.cover.design.')){
  ownerModule='cover';tables=path.includes('.elements[]')?['coverTextLayers','coverImageLayers']:path.includes('.faces.')?['coverFaces']:['coverDesign'];
 }else if(path.includes('.cover.composition.')){ownerModule='cover';tables=['coverComposition'];}
 else if(path.startsWith('$.cover.')){ownerModule=format==='shortstory'?'index':'cover';tables=[format==='shortstory'?'shortProject':'cover'];}
 else if(format==='shortstory'){ownerModule='index';tables=[path.startsWith('$.pages[]')?'pages':'shortProject'];}
 else if(path.includes('.audio.')){ownerModule='audio';tables=[path.includes('.sounds[]')?'audioSounds':'audioTracks'];}
 else if(path.includes('.stageComposition.')){ownerModule='stage';tables=[path.includes('Actors[]')?'stageActors':path.includes('speakerActorKeys[]')?'stageSpeakers':'stages'];}
 else if(path.includes('.presentation.')){ownerModule='presentation';tables=[path.includes('.effects[]')?'presentationEffects':'presentations'];}
 else if(path.startsWith('$.scores[]')){ownerModule='scores';tables=['scoreDefinitions'];}
 else if(path.includes('.flow.')&&/routes|condition|effects/.test(path)){ownerModule='scores';tables=[path.includes('.effects[]')?'scoreEffects':path.includes('.condition.')?'scoreConditions':'scoreRoutes'];}
 else if(path.includes('.flow.')){ownerModule='flow';tables=[path.includes('.options[]')?'flowChoices':'flows'];}
 else if(path.includes('.ending.')){ownerModule='flow';tables=['endings'];}
 else if(path.startsWith('$.planning.')){ownerModule='preparation';tables=['planning'];}
 else if(path.startsWith('$.creativeMemos[]')){ownerModule='preparation';tables=[path.includes('.fields[]')?'memoFields':/linked(ChapterIds|LineIds|CharacterNames)\[\]/.test(path)?'memoLinks':'memos'];}
 else if(path.startsWith('$.chapters[]'))tables=[/storyStageKeys|chapterSpeakerNames|characterAssetIds|backgroundAssetIds/.test(path)?'projectLists':'chapters'];
 else if(path.startsWith('$.lines[]'))tables=[path.includes('.coSpeakerNames[]')?'projectLists':'cuts'];
 else if(path.startsWith('$.characters[]'))tables=['characters'];
 else if(path.startsWith('$.stageDefaults.'))tables=['stageDefaults'];
 else if(path.startsWith('$.continuation.'))tables=['continuation'];
 else if(path.startsWith('$.source.linearCreation.'))tables=[path.includes('.choices[]')?'sourceChoices':path.includes('.prefixLineIds[]')?'sourcePrefixes':'sourceCreation'];
 else if(path.startsWith('$.source.'))tables=['source'];
 else if(path==='$.speakerNames[]')tables=['projectLists'];
 const specs=authoringWorkbookSpecs(format);for(const table of tables)expect(specs.some(spec=>spec.key===table),`${path} mapped table`).toBe(true);
 return {path,module:ownerModule,implementation:`packages/compatibility/src/authoring-workbook/${ownerModule}.ts`,tables};
}
describe('all current authoring fields using real assets and audio bytes',()=>{
 it('covers every optional scalar/nested current schema path across valid discriminated variants',()=>{
  const formats={knolstory:[...completeStoryVariants(),scoreNarrativeDocument()].map(d=>d.project),shortstory:[completeShortStoryProject()]};
  const report=Object.fromEntries(Object.entries(formats).map(([format,values])=>{
   const expected=[...new Set(schemaPaths(authoringSchema(format as 'knolstory'|'shortstory')))].sort();
   const present=new Set(values.flatMap(v=>paths(v)));const missing=expected.filter(p=>!present.has(p));
   expect(missing,`${format}: uncovered authoring fields`).toEqual([]);
   return [format,{fieldCount:expected.length,covered:expected,missing,fieldMappings:expected.map(path=>fieldMapping(path,format as 'knolstory'|'shortstory'))}];
  }));
  if(process.env.AUTHORING_WRITE_EVIDENCE==='1'||process.env.SCORE_WRITE_FIELD_EVIDENCE==='1'){
   const evidenceDirectory=process.env.SCORE_WRITE_FIELD_EVIDENCE==='1'?'score-narrative':'authoring-format';
   const directory=fileURLToPath(new URL(`../../../docs/architecture/evidence/${evidenceDirectory}/`,import.meta.url));mkdirSync(directory,{recursive:true});writeFileSync(`${directory}all-fields-coverage.json`,JSON.stringify({schemaVersion:1,scope:'Current scalar field paths, all union field structures; not every enum value',formats:report},null,2)+'\n');
  }
 });
 for(const [index,document]of completeStoryVariants().entries())it(`story variant ${index}: exact archive / editable workbook / xlsx / JSONB parity`,async()=>{
  const archive=await createAuthoringArchive({format:'knolstory',document,audioResources:completeAudioResources()});
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
  const bytes=await exportAuthoringExcel(archive);const restored=await importAuthoringExcel(bytes);expect(restored).toEqual(archive);
  expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(restored))))).toEqual(archive);
  if(process.env.AUTHORING_WRITE_EVIDENCE==='1'&&index===0){const directory=fileURLToPath(new URL('../../../docs/architecture/evidence/authoring-format/',import.meta.url));mkdirSync(directory,{recursive:true});writeFileSync(`${directory}all-fields-story.xlsx`,bytes);writeFileSync(`${directory}all-fields-story.knolstory`,await encodeAuthoringArchive(archive));}
 });
 it('shortstory all three cover faces, bound and free text/images, pages survive all forms',async()=>{
  const archive=await createAuthoringArchive({format:'shortstory',project:completeShortStoryProject()});
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
  const bytes=await exportAuthoringExcel(archive);expect(await importAuthoringExcel(bytes)).toEqual(archive);
  expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
  if(process.env.AUTHORING_WRITE_EVIDENCE==='1'){const directory=fileURLToPath(new URL('../../../docs/architecture/evidence/authoring-format/',import.meta.url));mkdirSync(directory,{recursive:true});writeFileSync(`${directory}all-fields-shortstory.xlsx`,bytes);writeFileSync(`${directory}all-fields-shortstory.shortstory`,await encodeAuthoringArchive(archive));}
 });
 it('every cut compiles through Runtime Core with real catalog images and two native endings',()=>{
  const document=completeStoryDocument();
  for(const line of document.project.lines)expect(compileStoryScene(document.project,line.id,1,{mode:'play'})).toBeDefined();
  expect(document.project.lines.filter(l=>l.ending?.endsStory)).toHaveLength(2);
 });
 it('unknown nested data is rejected before normalization or mutation',async()=>{
  const document=completeStoryDocument();const input=structuredClone(document);Object.assign(input.project.lines[0].stageComposition!.leftActors[0].motion!,{futureMotion:42});
  await expect(createAuthoringArchive({format:'knolstory',document:input,audioResources:completeAudioResources()})).rejects.toThrow(/futureMotion/);
  expect(document).toEqual(completeStoryDocument());
 });
 it('a changed nested actor, cover and memo field imports without dropping unrelated data',async()=>{
  const document=completeStoryDocument();const archive=await createAuthoringArchive({format:'knolstory',document,audioResources:completeAudioResources()});
  const workbook=await exportAuthoringWorkbook(archive);const entries=[['stageActors','xAnchor','40'],['coverTextLayers','x','0.12'],['memoFields','value','새 한국어 메모\n🌱']] as const;
  let tables=workbook.tables;
  for(const [key,column,value]of entries){const table=tables[key];expect(table,`${key} editable table`).toBeDefined();expect(table.headers).toContain(column);tables={...tables,[key]:{...table,rows:table.rows.map((row,index)=>index?row:row.map((cell,j)=>table.headers[j]===column?value:cell))}};}
  const edited=await importAuthoringWorkbook({...workbook,tables});expect(edited.format).toBe('knolstory');if(edited.format!=='knolstory')throw Error('wrong format');
  expect(edited.document.project.lines[0].stageComposition!.leftActors[0].xAnchor).toBe(40);
  expect(edited.document.project.cover!.design!.faces.front.elements[0].box.x).toBe(.12);
  expect(edited.document.project.creativeMemos[0].fields[0].value).toBe('새 한국어 메모\n🌱');
  expect(edited.document.project.lines[0].text).toBe(document.project.lines[0].text);
  expect(edited.audioResources).toEqual(archive.format==='knolstory'?archive.audioResources:[]);
 });
});
