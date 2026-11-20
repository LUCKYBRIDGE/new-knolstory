import {describe,expect,it} from 'vitest';
import {createStoryDocument,createStoryBranches,createStoryChoiceChapter,parseStoryDocument,type StoryDocumentEnvelope} from '@knolstory/story-domain';
import {assertCatalogOnlyMedia} from '../../asset-registry/src/catalog-media-policy';
import {convertPicturebookToChapters,type PicturebookPageStage} from '../../runtime-core/src/picturebook-chapters';
import {createAuthoringArchive,decodeAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,validateAuthoringArchive} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';
import {getShortStoryOriginal} from '../src/shortstory-originals';

const NOW='2026-11-20T09:00:00.000Z';
/** 별주부전 8쪽을 학생 사본으로 바꿔 만든 놀스토리 (4쪽만 추천 무대). */
function convertedDocument():StoryDocumentEnvelope{
 const book={...getShortStoryOriginal('rabbit'),id:'student-book'};
 let n=0;
 const stage:PicturebookPageStage={kind:'stage',origin:'approved',recipeVersion:1,backgroundId:'rabbit-turtle.background.classic-sea',left:[{assetId:'rabbit-turtle.character.classic-riding'}],right:[]};
 const {project}=convertPicturebookToChapters({book,stages:{[book.pages[3]!.id]:stage},workId:'work-1',createId:()=>`id-${++n}`,updatedAt:NOW});
 return createStoryDocument({project,savedAt:NOW,appVersion:'picturebook-format-test'});
}

describe('chapter picture-book sketch (document v9)',()=>{
 it('survives file, editable workbook, real xlsx and online snapshot unchanged',async()=>{
  const document=convertedDocument();
  expect(document.schemaVersion).toBe(9);
  expect(document.project.chapters.every(chapter=>chapter.picturebookSketch)).toBe(true);
  const archive=await createAuthoringArchive({format:'knolstory',document});
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
  expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
  expect(await restoreJsonbSnapshot(JSON.parse(JSON.stringify(await prepareJsonbSnapshot(archive))))).toEqual(archive);
 });
 it('reads a document v8 file unchanged, with no sketch, as the current version',async()=>{
  const document=convertedDocument();
  const v8={...document,schemaVersion:8,project:{...document.project,chapters:document.project.chapters.map(({picturebookSketch:_sketch,...chapter})=>chapter)}};
  const archive=await decodeAuthoringArchive(JSON.stringify(v8));
  expect(archive.format==='knolstory'&&archive.document.schemaVersion).toBe(9);
  expect(archive.format==='knolstory'&&archive.document.project).toEqual(v8.project);
 });
 it('rejects a sketch declared under an older document version instead of dropping it',async()=>{
  const document=convertedDocument();
  for(const version of [7,8])expect(parseStoryDocument({...document,schemaVersion:version}).ok).toBe(false);
  await expect(decodeAuthoringArchive(JSON.stringify({...document,schemaVersion:8}))).rejects.toThrow('버전9');
 });
 it('rejects unknown, empty or malformed sketches without changing the source',async()=>{
  const document=convertedDocument();
  const withSketch=(sketch:unknown)=>({format:'knolstory',formatVersion:2,audioResources:[],document:{...document,project:{...document.project,chapters:document.project.chapters.map((chapter,index)=>index===0?{...chapter,picturebookSketch:sketch}:chapter)}}});
  for(const sketch of [{backgroundId:'',leftAssetId:'',rightAssetId:''},{backgroundId:'a',leftAssetId:'',rightAssetId:'',caption:'메모'},{backgroundId:'a',leftAssetId:'',rightAssetId:'',recipeVersion:0},{backgroundId:'a'}]){
   const value=withSketch(sketch),before=structuredClone(value);
   await expect(validateAuthoringArchive(value)).rejects.toThrow();
   expect(value).toEqual(before);
  }
 });
 it('treats sketch IDs as asset references: unregistered pictures are refused',()=>{
  const document=convertedDocument();
  expect(()=>assertCatalogOnlyMedia(document)).not.toThrow();
  const outside={...document,project:{...document.project,chapters:document.project.chapters.map((chapter,index)=>index===0?{...chapter,picturebookSketch:{backgroundId:'https://example.invalid/picture.png',leftAssetId:'',rightAssetId:''}}:chapter)}};
  expect(()=>assertCatalogOnlyMedia(outside)).toThrow('외부 그림');
 });
 it('keeps the sketch on the chapter it was made from when branches or choice chapters are added',()=>{
  const {project}=convertedDocument();
  const source=project.lines[1]!;let n=0;const next=()=>`branch-${++n}`;
  const branched=createStoryBranches(project,source.id,2,next);
  const added=branched.chapters.filter(chapter=>!project.chapters.some(old=>old.id===chapter.id));
  expect(added.length).toBeGreaterThan(0);
  for(const chapter of added)expect(chapter.picturebookSketch).toBeUndefined();
  expect(branched.chapters.find(chapter=>chapter.id===source.chapterId)!.picturebookSketch).toEqual(project.chapters[1]!.picturebookSketch);
  const choice={...project,lines:project.lines.map(line=>line.id===source.id?{...line,flow:{type:'choice' as const,options:[{id:'option-a',label:'따라간다',targetLineId:''}]}}:line)};
  const made=createStoryChoiceChapter(choice,source.id,'option-a',next).project;
  const fresh=made.chapters.filter(chapter=>!choice.chapters.some(old=>old.id===chapter.id));
  expect(fresh).toHaveLength(1);expect((fresh[0] as {picturebookSketch?:unknown}).picturebookSketch).toBeUndefined();
 });
});
