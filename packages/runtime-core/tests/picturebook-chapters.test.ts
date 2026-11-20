import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '../../compatibility/src/shortstory-originals';
import {chapterLabel,createStoryDocument,parseStoryDocument} from '@knolstory/story-domain';
import {convertPicturebookToChapters,PicturebookConversionError,type PicturebookBook,type PicturebookPageStage} from '../src/picturebook-chapters';
import {advancePlayback,compileStoryScene,createPlayback,orderedLines} from '../src/story-runtime';
import {splitStoryHere} from '../src/branch-authoring';

/** The student's own copy of 별주부전 (8 pages), as the picture-book screen keeps it. */
function studentRabbit():PicturebookBook{
 const original=getShortStoryOriginal('rabbit');
 return {...original,id:'student-book',title:'나의 별주부전',pages:original.pages.map(page=>({...page}))};
}
function ids(){let n=0;return ()=>`id-${String(++n).padStart(3,'0')}`;}
const NOW='2026-11-20T09:00:00.000Z';
const convert=(book:PicturebookBook,stages:Record<string,PicturebookPageStage>={})=>convertPicturebookToChapters({book,stages,workId:'work-1',createId:ids(),updatedAt:NOW});

describe('picture book page → KnolStory chapter',()=>{
 it('makes 8 independent chapters with one blank first cut each, in page order',()=>{
  const book=studentRabbit();
  expect(book.pages).toHaveLength(8);
  const {project,chapters}=convert(book);
  expect(project.chapters).toHaveLength(8);expect(project.lines).toHaveLength(8);
  expect(chapters.map(link=>link.pageId)).toEqual(book.pages.map(page=>page.id));
  project.chapters.forEach((chapter,index)=>{
   const page=book.pages[index]!,cut=project.lines.find(line=>line.chapterId===chapter.id)!;
   expect(chapter).toMatchObject({order:index+1,chapterNumber:index+1,title:page.title,summary:page.text});
   expect(chapter.picturebookSketch).toEqual({backgroundId:page.backgroundId,leftAssetId:'',rightAssetId:''});
   // Nothing is written for the student: blank narration, no speaker, no choice, no ending.
   expect(cut).toMatchObject({order:1,type:'narration',speaker:'narration',speakerName:'',text:''});
   expect(cut.flow).toBeUndefined();expect(cut.ending).toBeUndefined();
   // Reference only: an explicit empty stage, never the previous chapter's picture.
   expect(cut).toMatchObject({backgroundId:'',backgroundMode:'none',stageComposition:{leftActors:[],rightActors:[]}});
  });
  expect(chapterLabel(project.chapters[3]!)).toBe(`4장 · ${book.pages[3]!.title}`);
  expect(project.title).toBe('나의 별주부전');expect(project.description).toBe(book.description);
 });
 it('reads first to last in page order and ends after the last chapter (Runtime Core)',()=>{
  const {project,chapters}=convert(studentRabbit());
  let state=createPlayback(project);const visited:string[]=[];
  while(state.lineId!==null){visited.push(state.lineId);compileStoryScene(project,state.lineId,visited.length,{mode:'play',playbackPath:state.path,playbackState:state});state=advancePlayback(project,state);}
  expect(visited).toEqual(chapters.map(link=>link.lineId));expect(state.status).toBe('ended');
  expect(orderedLines(project).map(line=>line.id)).toEqual(visited);
 });
 it('follows the student’s edited text and rearranged page order, keeping the source unchanged',()=>{
  const book=studentRabbit();
  const pages=[book.pages[3]!,...book.pages.filter((_,index)=>index!==3)].map((page,index)=>({...page,order:index+1,text:index===0?'토끼가 직접 고쳐 쓴 문장이에요.':page.text}));
  const edited={...book,pages};const before=structuredClone(edited);
  const {project}=convert(edited);
  expect(project.chapters.map(chapter=>chapter.title)).toEqual(pages.map(page=>page.title));
  expect(project.chapters[0]!.summary).toBe('토끼가 직접 고쳐 쓴 문장이에요.');
  expect(edited).toEqual(before);
 });
 it('keeps the same picture on two pages as two independent chapters',()=>{
  const book=studentRabbit();
  const twin={...book.pages[2]!,id:'twin-page',order:9,title:'다시 만난 물가',text:'두 번째로 쓴 같은 그림'};
  const {project,chapters}=convert({...book,pages:[...book.pages,twin]});
  const [first,second]=[chapters[2]!,chapters[8]!];
  expect(first.chapterId).not.toBe(second.chapterId);expect(first.lineId).not.toBe(second.lineId);
  expect(project.chapters[2]!.picturebookSketch).toEqual(project.chapters[8]!.picturebookSketch);
  expect(project.chapters[8]!.summary).toBe('두 번째로 쓴 같은 그림');
 });
 it('places an approved stage on the first cut only, with the reviewed recipe version kept in the sketch',()=>{
  const book=studentRabbit(),page=book.pages[3]!;
  const stage:PicturebookPageStage={kind:'stage',origin:'approved',recipeVersion:3,backgroundId:'rabbit-turtle.background.classic-sea',left:[{assetId:'rabbit-turtle.character.classic-riding'}],right:[]};
  const {project,chapters}=convert(book,{[page.id]:stage});
  const cut=project.lines.find(line=>line.id===chapters[3]!.lineId)!;
  expect(cut).toMatchObject({backgroundId:'rabbit-turtle.background.classic-sea',leftAssetId:'rabbit-turtle.character.classic-riding',rightAssetId:'',stageComposition:{leftActors:[{key:'L1',assetId:'rabbit-turtle.character.classic-riding'}],rightActors:[]}});
  expect(cut.backgroundMode).toBeUndefined();
  expect(project.chapters[3]!.picturebookSketch).toEqual({backgroundId:page.backgroundId,leftAssetId:'',rightAssetId:'',recipeVersion:3});
  // The neighbouring chapters still start empty.
  expect(project.lines.find(line=>line.id===chapters[4]!.lineId)!.backgroundMode).toBe('none');
  expect(compileStoryScene(project,cut.id,1,{mode:'edit'}).actors).toHaveLength(1);
 });
 it('keeps the page text of a page without a picture and adds no sketch',()=>{
  const book=studentRabbit();
  const pages=book.pages.map((page,index)=>index===1?{...page,backgroundId:''}:page);
  const {project}=convert({...book,pages});
  expect(project.chapters[1]!.picturebookSketch).toBeUndefined();expect(project.chapters[1]!.summary).toBe(book.pages[1]!.text);
 });
 it('reports each page that does not fit instead of cutting it, and makes nothing',()=>{
  const book=studentRabbit();
  const pages=book.pages.map((page,index)=>index===5?{...page,title:'가'.repeat(201)}:page);
  let error:unknown;try{convert({...book,pages});}catch(issue){error=issue;}
  expect(error).toBeInstanceOf(PicturebookConversionError);
  expect((error as PicturebookConversionError).issues).toEqual([expect.objectContaining({pageNumber:6})]);
  expect(()=>convert(book,{'not-a-page':{kind:'reference'}})).toThrow(PicturebookConversionError);
 });
 it('uses only the injected IDs and refuses a repeated one',()=>{
  const a=convert(studentRabbit()),b=convert(studentRabbit());
  expect(a).toEqual(b);
  expect(()=>convertPicturebookToChapters({book:studentRabbit(),stages:{},workId:'work-1',createId:()=>'same',updatedAt:NOW})).toThrow('겹쳤어요');
 });
 it('produces a valid current document whose sketch stays with the original chapter after a split',()=>{
  const {project,chapters}=convert(studentRabbit());
  const loaded=parseStoryDocument(createStoryDocument({project,savedAt:NOW,appVersion:'test'}));
  expect(loaded.ok).toBe(true);
  let n=0;const split=splitStoryHere(project,chapters[2]!.lineId,{labels:['간다','안 간다'],mode:'separate'},()=>`split-${++n}`).project;
  const original=split.chapters.find(chapter=>chapter.id===chapters[2]!.chapterId)!;
  expect(original.picturebookSketch).toBeDefined();
  for(const chapter of split.chapters.filter(item=>!project.chapters.some(old=>old.id===item.id)))expect(chapter.picturebookSketch).toBeUndefined();
 });

 it('names the page’s subject so portrait reading shows who the event is about, not just the left actor',()=>{
  const book=studentRabbit(),page=book.pages[2]!;
  const stage:PicturebookPageStage={kind:'stage',origin:'approved',backgroundId:'rabbit-turtle.background.rabbit-turtle-bg-shore-discussion',left:[{assetId:'rabbit-turtle.character.rabbit-suspicious'}],right:[{assetId:'rabbit-turtle.character.turtle-offer',subject:true}]};
  const {project,chapters}=convert(book,{[page.id]:stage});
  const cut=project.lines.find(line=>line.id===chapters[2]!.lineId)!;
  expect(cut.stageComposition).toMatchObject({speakerActorKey:'R1'});
  expect(cut).toMatchObject({type:'narration',speaker:'narration',text:''});
  const portrait=compileStoryScene(project,cut.id,1,{mode:'play',viewport:{width:720,height:1280},displaySize:{width:720,height:1280}});
  expect(portrait.actors.map(actor=>actor.id)).toEqual(['R1']);
  expect(compileStoryScene(project,cut.id,2,{mode:'edit'}).actors).toHaveLength(2);
  const two:PicturebookPageStage={...stage,left:[{assetId:'rabbit-turtle.character.rabbit-suspicious',subject:true}]};
  expect(()=>convert(book,{[page.id]:two})).toThrow(PicturebookConversionError);
 });
});
