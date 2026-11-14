import {describe,expect,it} from 'vitest';
import {chapterLabel,orderedStoryFlowLines,type StoryProject} from '@knolstory/story-domain';
import {addStoryChapter,createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {checkStorySplit,reorderStoryChapters,separatePathCut,splitStoryHere} from '../src/branch-authoring';

const ids=()=>{let i=0;return ()=>`new-${++i}`;};
/** Three chapters, two cuts each: a1 a2 | b1 b2 | c1 c2. */
function story(){
 let project=createBlankStoryProject({id:'p',chapterId:'a',lineId:'a1'});
 project=insertStoryCut(project,'a1','a2');
 project=addStoryChapter(project,{chapterId:'b',lineId:'b1'});project=insertStoryCut(project,'b1','b2');
 project=addStoryChapter(project,{chapterId:'c',lineId:'c1'});project=insertStoryCut(project,'c1','c2');
 return {...project,chapters:project.chapters.map(chapter=>({...chapter,title:chapter.id.toUpperCase()}))};
}
/** Read the story taking the given choice at each fork. */
function read(project:StoryProject,picks:number[]=[]){
 const ordered=orderedStoryFlowLines(project),seen:string[]=[];let at:string|null=ordered[0]?.id??null,pick=0;
 while(at&&seen.length<50){
  seen.push(at);const index=ordered.findIndex(line=>line.id===at),line=ordered[index]!;
  if(line.ending?.endsStory)break;
  at=line.flow?.type==='choice'?line.flow.options[picks[pick++]??0]!.targetLineId:line.flow?.type==='goto'?line.flow.targetLineId:ordered[index+1]?.id??null;
 }
 return seen;
}
const chapterOrder=(project:StoryProject)=>[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id);

describe('split the story here',()=>{
 it('rejoin: each choice gets its own chapter right after the source chapter, then returns to the story that followed',()=>{
  const before=story();
  const {project,newLineIds}=splitStoryHere(before,'a2',{labels:['숲으로 간다','강으로 간다'],mode:'rejoin'},ids());
  expect(newLineIds).toHaveLength(2);
  const [left,right]=newLineIds as [string,string];
  const forest=project.chapters.find(chapter=>chapter.title==='숲으로 간다')!;
  expect(chapterOrder(project)).toEqual(['a',forest.id,project.lines.find(line=>line.id===right)!.chapterId,'b','c']);
  expect(chapterLabel(forest)).toBe('2장A · 숲으로 간다');
  expect(read(project,[0])).toEqual(['a1','a2',left,'b1','b2','c1','c2']);
  expect(read(project,[1])).toEqual(['a1','a2',right,'b1','b2','c1','c2']);
  // Existing chapters keep their names although their stored position moved.
  expect(chapterLabel(project.chapters.find(chapter=>chapter.id==='b')!)).toBe('2장 · B');
 });
 it('separate: the existing story stays the first path and new paths end on their own',()=>{
  const {project,newLineIds}=splitStoryHere(story(),'b1',{labels:['문을 연다','돌아선다','기다린다'],mode:'separate'},ids());
  expect(newLineIds).toHaveLength(2);
  expect(read(project,[0])).toEqual(['a1','a2','b1','b2','c1','c2']);
  expect(read(project,[1])).toEqual(['a1','a2','b1',newLineIds[0]]);
  expect(read(project,[2])).toEqual(['a1','a2','b1',newLineIds[1]]);
  const labels=project.chapters.filter(chapter=>chapter.branchLabel).map(chapterLabel);
  expect(labels).toEqual(['3장A · 문을 연다','3장B · 돌아선다','3장C · 기다린다']);
 });
 it('a cut that writers add after a new path cut keeps the path ending at the last cut',()=>{
  const {project,newLineIds}=splitStoryHere(story(),'c2',{labels:['웃는다','운다'],mode:'separate'},ids());
  const grown=insertStoryCut(project,newLineIds[0]!,'extra');
  expect(read(grown,[0])).toEqual(['a1','a2','b1','b2','c1','c2',newLineIds[0],'extra']);
 });
 it('explains why a cut cannot be split and refuses rejoin without a following story',()=>{
  const base=story(),{project}=splitStoryHere(base,'a1',{labels:['가','나'],mode:'rejoin'},ids());
  expect(checkStorySplit(project,'a1')).toEqual({ok:false,reason:expect.stringContaining('이미 선택지')});
  expect(checkStorySplit(base,'c2')).toEqual({ok:true,continuationLineId:null});
  expect(()=>splitStoryHere(base,'c2',{labels:['가','나'],mode:'rejoin'},ids())).toThrow('각자 끝나요');
  expect(()=>splitStoryHere(base,'a1',{labels:['가',' '],mode:'rejoin'},ids())).toThrow('2~3개');
 });
});

describe('arrange chapters',()=>{
 it('moves chapters without changing where any cut leads, and renumbers only when asked',()=>{
  const before=story(),moved=reorderStoryChapters(before,['a','c','b']);
  expect(chapterOrder(moved)).toEqual(['a','c','b']);
  expect(read(moved)).toEqual(read(before));
  expect(moved.chapters.map(chapterLabel).sort()).toEqual(['1장 · A','2장 · B','3장 · C']);
  const renamed=reorderStoryChapters(moved,['a','c','b'],new Map([['a',{chapterNumber:1}],['c',{chapterNumber:2,branchLabel:'A'}],['b',{chapterNumber:2,branchLabel:'B'}]]));
  expect(renamed.chapters.map(chapterLabel).sort()).toEqual(['1장 · A','2장A · C','2장B · B']);
 });
});

describe('write this path on its own',()=>{
 it('copies a shared cut for one incoming path; other paths and the following story stay the same',()=>{
  const {project,newLineIds}=splitStoryHere(story(),'a2',{labels:['숲','강'],mode:'rejoin'},ids());
  const separated=separatePathCut(project,'b1',newLineIds[1]!,'b1-river');
  expect(read(separated,[0])).toEqual(['a1','a2',newLineIds[0],'b1','b2','c1','c2']);
  expect(read(separated,[1])).toEqual(['a1','a2',newLineIds[1],'b1-river','b2','c1','c2']);
  expect(separated.lines.find(line=>line.id==='b1-river')!.text).toBe(separated.lines.find(line=>line.id==='b1')!.text);
 });
 it('works for an implicit predecessor and refuses cuts with one path',()=>{
  const {project,newLineIds}=splitStoryHere(story(),'a1',{labels:['가','나'],mode:'rejoin'},ids());
  // a2 is reached from both new paths' cuts (explicit) — and b1 only from a2.
  expect(()=>separatePathCut(project,'b1','a2','x')).toThrow('한 길에서만');
  const separated=separatePathCut(project,'a2',newLineIds[0]!,'a2-copy');
  expect(read(separated,[0])).toEqual(['a1',newLineIds[0],'a2-copy','b1','b2','c1','c2']);
  expect(read(separated,[1])).toEqual(['a1',newLineIds[1],'a2','b1','b2','c1','c2']);
 });
});

describe('splitting in the middle of a chapter',()=>{
 const middle=()=>{let project=story();project=insertStoryCut(project,'a2','a3');return project;};
 it('rejoin: the cuts after the fork become the chapter where the paths meet again',()=>{
  const {project,newLineIds}=splitStoryHere(middle(),'a2',{labels:['숲','강'],mode:'rejoin'},ids());
  const meet=project.lines.find(line=>line.id==='a3')!;
  const chapter=project.chapters.find(item=>item.id===meet.chapterId)!;
  expect(chapterLabel(chapter)).toBe('3장 · 다시 만나는 이야기');
  expect(chapterOrder(project).indexOf(chapter.id)).toBe(3);
  expect(read(project,[0])).toEqual(['a1','a2',newLineIds[0],'a3','b1','b2','c1','c2']);
  expect(read(project,[1])).toEqual(['a1','a2',newLineIds[1],'a3','b1','b2','c1','c2']);
 });
 it('separate: the cuts after the fork become path A',()=>{
  const {project,newLineIds}=splitStoryHere(middle(),'a2',{labels:['숲','강'],mode:'separate'},ids());
  const chapter=project.chapters.find(item=>item.id===project.lines.find(line=>line.id==='a3')!.chapterId)!;
  expect(chapterLabel(chapter)).toBe('2장A · 숲');
  expect(chapterOrder(project).slice(0,3)).toEqual(['a',chapter.id,project.lines.find(line=>line.id===newLineIds[0])!.chapterId]);
  expect(read(project,[0])).toEqual(['a1','a2','a3','b1','b2','c1','c2']);
  expect(read(project,[1])).toEqual(['a1','a2',newLineIds[0]]);
 });
});
