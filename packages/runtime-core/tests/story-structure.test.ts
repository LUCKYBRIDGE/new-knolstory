import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '../../compatibility/src/shortstory-originals';
import {branchChapterNumbering,chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {convertPicturebookToChapters,type PicturebookBook} from '../src/picturebook-chapters';
import {splitStoryHere} from '../src/branch-authoring';
import {insertStoryCut} from '../src/authoring';
import {advancePlayback,createPlayback} from '../src/story-runtime';
import {chapterInsertPlaces,chapterMovePlaces,insertStoryChapters,moveStoryChapter,moveStoryCutTo} from '../src/story-structure';

const NOW='2026-11-20T09:00:00.000Z';
function ids(prefix:string){let n=0;return ()=>`${prefix}-${String(++n).padStart(3,'0')}`;}
function book(pages=4):PicturebookBook{const original=getShortStoryOriginal('rabbit');return {...original,id:'book',pages:original.pages.slice(0,pages).map((page,index)=>({...page,order:index+1}))};}
const story=(pages=4):StoryProject=>convertPicturebookToChapters({book:book(pages),stages:{},workId:'work',createId:ids('a'),updatedAt:NOW}).project;
const titles=(project:StoryProject)=>[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapterLabel(chapter));
function reading(project:StoryProject){let state=createPlayback(project);const seen:string[]=[];for(let i=0;i<50&&state.lineId!==null;i++){seen.push(state.lineId);state=advancePlayback(project,state);}return seen;}
const first=(project:StoryProject,order:number)=>{const chapter=project.chapters.find(item=>item.order===order)!;return project.lines.find(line=>line.chapterId===chapter.id&&line.order===1)!;};

describe('moving chapters',()=>{
 it('reads in the new order and numbers follow the place',()=>{
  const project=story(),last=project.chapters.find(chapter=>chapter.order===4)!;
  const moved=moveStoryChapter(project,last.id,null);
  expect(titles(moved)[0]).toBe(`1장 · ${last.title}`);
  expect(reading(moved)[0]).toBe(project.lines.find(line=>line.chapterId===last.id)!.id);
  expect(reading(moved)).toHaveLength(4);
  // Back to where it was: same story as before.
  expect(reading(moveStoryChapter(moved,last.id,project.chapters.find(chapter=>chapter.order===3)!.id))).toEqual(reading(project));
 });
 it('lists the places a chapter can go, without its own place',()=>{
  const project=story(),second=project.chapters.find(chapter=>chapter.order===2)!;
  const places=chapterMovePlaces(project,second.id);
  expect(places.map(place=>place.afterChapterId)).not.toContain(project.chapters.find(chapter=>chapter.order===1)!.id);
  expect(places.every(place=>place.ok)).toBe(true);
 });
 it('refuses a move that leaves a cut nobody can reach',()=>{
  // 1장 → 선택지로 2장 또는 3장, 두 장 모두 이야기 끝. 3장을 맨 앞으로 옮기면 1·2장에 닿을 수 없다.
  const project=story(3),[a,b,c]=[first(project,1),first(project,2),first(project,3)];
  const forked={...project,lines:project.lines.map(line=>line.id===a.id?{...line,flow:{type:'choice' as const,options:[{id:'go-b',label:'가',targetLineId:b.id},{id:'go-c',label:'나',targetLineId:c.id}]}}
   :line.id===b.id||line.id===c.id?{...line,ending:{name:'',description:'',endsStory:true}}:line)} as StoryProject;
  expect(()=>moveStoryChapter(forked,c.chapterId,null)).toThrow('1장 1컷, 2장 1컷에 닿을 수 없게 돼요');
  const places=chapterMovePlaces(forked,c.chapterId);
  expect(places.find(place=>place.afterChapterId===null)).toMatchObject({ok:false});
  // Behind 1장 is fine: the choice still leads to it.
  expect(places.find(place=>place.afterChapterId===a.chapterId)).toMatchObject({ok:true});
 });
 it('keeps a branching story on its branch numbers after moving a chapter, with no two chapters on one name',()=>{
  const project=story(3),cut=first(project,2);
  const split=splitStoryHere(project,cut.id,{labels:['가','나'],mode:'rejoin'},ids('b')).project;
  const ok=split.chapters.find(chapter=>chapterMovePlaces(split,chapter.id).some(place=>place.ok))!;
  const place=chapterMovePlaces(split,ok.id).find(item=>item.ok)!;
  const moved=moveStoryChapter(split,ok.id,place.afterChapterId);
  const reachable=branchChapterNumbering(moved);
  for(const chapter of moved.chapters){const identity=reachable.identities.get(chapter.id);if(identity)expect({chapterNumber:chapter.chapterNumber,branchLabel:chapter.branchLabel}).toEqual({chapterNumber:identity.chapterNumber,branchLabel:identity.branchLabel});}
  expect(new Set(titles(moved).map(label=>label.split(' · ')[0])).size).toBe(moved.chapters.length);
 });
 it('keeps numbers a writer set by hand',()=>{
  const project=story(3),custom={...project,chapters:project.chapters.map(chapter=>({...chapter,chapterNumber:chapter.order+10}))};
  const last=custom.chapters.find(chapter=>chapter.order===3)!;
  const moved=moveStoryChapter(custom,last.id,null);
  expect(moved.chapters.find(chapter=>chapter.id===last.id)!.chapterNumber).toBe(13);
 });
});

describe('putting picture-book chapters into a branching story',()=>{
 it('gives the new chapters and the chapters after them names no other chapter has',()=>{
  const project=story(3),cut=first(project,2);
  const split=splitStoryHere(project,cut.id,{labels:['가','나'],mode:'rejoin'},ids('b')).project;
  const pages=convertPicturebookToChapters({book:book(2),stages:{},workId:'work',createId:ids('c'),updatedAt:NOW}).project;
  const opening=[...split.chapters].sort((a,b)=>a.order-b.order)[0]!;
  const next=insertStoryChapters(split,{chapters:pages.chapters,lines:pages.lines},opening.id);
  const names=titles(next).map(label=>label.split(' · ')[0]);
  expect(new Set(names).size).toBe(names.length);
  // 1장 → two new chapters → the old 2장 (now 4장) → its two ways → where they meet.
  expect(names).toEqual(['1장','2장','3장','4장','5장A','5장B','6장']);
 });
});

describe('moving a cut to any place',()=>{
 it('moves a cut after a chosen cut of another chapter and keeps how it looked',()=>{
  let project=story();
  const a=first(project,1);
  project=insertStoryCut(project,a.id,'extra');
  const target=first(project,3);
  const moved=moveStoryCutTo(project,'extra',target.chapterId,target.id);
  const line=moved.lines.find(item=>item.id==='extra')!;
  expect(line).toMatchObject({chapterId:target.chapterId,order:2,inheritActors:false});
  expect(moved.lines.filter(item=>item.chapterId===a.chapterId).map(item=>item.order)).toEqual([1]);
  expect(moveStoryCutTo(moved,'extra',target.chapterId,null).lines.find(item=>item.id==='extra')!.order).toBe(1);
 });
 it('refuses to empty a chapter',()=>{
  const project=story(),only=first(project,1),target=first(project,2);
  expect(()=>moveStoryCutTo(project,only.id,target.chapterId,target.id)).toThrow('컷이 하나뿐');
 });
});

describe('putting new chapters between chapters',()=>{
 const addition=()=>{const made=convertPicturebookToChapters({book:book(2),stages:{},workId:'other',createId:ids('n'),updatedAt:NOW}).project;return {chapters:made.chapters,lines:made.lines};};
 it('puts chapters after a chosen chapter and reads through them',()=>{
  const project=story(),second=project.chapters.find(chapter=>chapter.order===2)!;
  const result=insertStoryChapters(project,addition(),second.id);
  expect(result.chapters).toHaveLength(6);
  const order=[...result.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id);
  expect(order.slice(2,4)).toEqual(['n-001','n-003']);
  expect(reading(result)).toHaveLength(6);
  // Numbers follow the place: what was 3장 is now 5장.
  expect(chapterLabel(result.chapters.find(chapter=>chapter.id===project.chapters.find(item=>item.order===3)!.id)!)).toMatch(/^5장/);
 });
 it('puts chapters first or last',()=>{
  const project=story();
  expect([...insertStoryChapters(project,addition(),null).chapters].sort((a,b)=>a.order-b.order)[0]!.id).toBe('n-001');
  const last=project.chapters.find(chapter=>chapter.order===4)!;
  expect(reading(insertStoryChapters(project,addition(),last.id)).slice(-2)).toEqual(['n-002','n-004']);
 });
 it('lists places and refuses one after a story ending',()=>{
  const project=story(3),last=first(project,3);
  const ended={...project,lines:project.lines.map(line=>line.id===last.id?{...line,ending:{endsStory:true}}:line)} as StoryProject;
  const places=chapterInsertPlaces(ended);
  expect(places).toHaveLength(4);
  expect(places.at(-1)).toMatchObject({ok:false});
  expect(places.slice(0,3).every(place=>place.ok)).toBe(true);
 });
 it('never reuses an ID already in the work',()=>{
  const project=story();
  expect(()=>insertStoryChapters(project,{chapters:project.chapters.slice(0,1),lines:project.lines.slice(0,1)},null)).toThrow('겹쳤어요');
 });
});
