import {describe,it,expect} from 'vitest';
import {advancePlayback,createPlayback,createBlankStoryProject,playbackScores,type PlaybackState} from '@knolstory/runtime-core';
import {readerChapterHistory,restartReaderChapter} from './reader-chapter-history';
const work=()=>{
 const base=createBlankStoryProject({id:'chapter-history',chapterId:'a',lineId:'a1'}),chapter=base.chapters[0]!,line=base.lines[0]!;
 return {...base,chapters:[chapter,{...chapter,id:'b',title:'두 번째 장',order:1},{...chapter,id:'c',title:'세 번째 장',order:2}],lines:[
  {...line,id:'a2',chapterId:'a',order:1,text:'이전 장 둘째 글'},
  {...line,id:'a1',chapterId:'a',order:0,text:'이전 장 첫 글',flow:{type:'choice' as const,options:[{id:'left',label:'왼쪽',targetLineId:'a2'},{id:'right',label:'오른쪽',targetLineId:'a2',effects:[{scoreId:'trust',operation:'add' as const,value:2}]}]}},
  {...line,id:'b1',chapterId:'b',order:0,text:'이번 장 첫 글'},
  {...line,id:'b2',chapterId:'b',order:1,text:'지금🐇 보이는 글과 아직 보이지 않은 글'},
  {...line,id:'c1',chapterId:'c',order:0,text:'아직 읽지 않은 장'}
 ],scores:[{id:'trust',name:'신뢰',description:'선택 결과',initial:0}]};
};
const state=(path:readonly string[]):PlaybackState=>({lineId:path.at(-1)!,path,status:'reading',choiceHistory:[{pathIndex:0,choiceId:'right'}]});
function journey(path:readonly string[]){
 const source=work(),project={...source,lines:source.lines.map(line=>{
  if(line.id==='a1')return line;
  const targets=[...new Set(path.flatMap((id,index)=>id===line.id&&index<path.length-1?[path[index+1]!]:[]))];
  return targets.length>1?{...line,flow:{type:'choice' as const,options:targets.map(target=>({id:target,label:target,targetLineId:target}))}}:targets.length?{...line,flow:{type:'goto' as const,targetLineId:targets[0]!}}:line;
 })};
 let playback=createPlayback(project,path[0]);
 for(const target of path.slice(1))playback=advancePlayback(project,playback,playback.lineId==='a1'?'right':project.lines.find(line=>line.id===playback.lineId)?.flow?.type==='choice'?target:undefined);
 return {project,playback};
}
describe('chapter-scoped reader history',()=>{
 it('shows only this chapter script and offers only the encountered first cut of previous chapters',()=>{
  const project=work(),playback=state(['a1','a2','b1','b2']),before=structuredClone({project,playback});
  const history=readerChapterHistory(project,playback,{lineId:'b2',endOffset:3});
  expect(history.chapterId).toBe('b');expect(history.entries.map(row=>row.text)).toEqual(['이번 장 첫 글','지금🐇']);
  expect(history.previousChapters).toEqual([{chapterId:'a',lineId:'a1',pathIndex:0}]);
  expect({project,playback}).toEqual(before);
 });
 it('does not expose current text without renderer evidence or leak unseen chapters',()=>{
  const history=readerChapterHistory(work(),state(['a1','a2','b1','b2']));
  expect(history.entries.at(-1)).toMatchObject({text:'',textPending:true});
  expect(JSON.stringify(history)).not.toContain('아직 읽지 않은 장');
 });
 it('uses only the latest continuous visit and excludes current chapter from restart links',()=>{
  const {project,playback}=journey(['a1','a2','b1','b2','a2']);const history=readerChapterHistory(project,playback,{lineId:'a2',endOffset:2});
  expect(history.entries.map(row=>row.pathIndex)).toEqual([4]);
  expect(history.previousChapters).toEqual([{chapterId:'b',lineId:'b1',pathIndex:2}]);
 });
 it('deduplicates earlier chapter visits to the most recent actual first-cut occurrence',()=>{
  const {project,playback}=journey(['a1','a2','b1','a1','a2','c1']);const history=readerChapterHistory(project,playback);
  expect(history.previousChapters).toEqual([{chapterId:'b',lineId:'b1',pathIndex:2},{chapterId:'a',lineId:'a1',pathIndex:3}]);
 });
 it('never invents an unvisited first cut when a branch entered in the middle of a chapter',()=>{
  const history=readerChapterHistory(work(),{lineId:'b1',path:['a2','b1'],status:'reading'});
  expect(history.previousChapters).toEqual([]);
 });
 it('restarts only an eligible earlier chapter first cut and rewinds exact choices and scores',()=>{
  const project=work(),playback=state(['a1','a2','b1','b2']);
  expect(playbackScores(project,playback)).toEqual({trust:2});
  const restored=restartReaderChapter(project,playback,0);
  expect(restored.path).toEqual(['a1']);expect(restored.choiceHistory).toEqual([]);expect(playbackScores(project,restored)).toEqual({trust:0});
  for(const index of [1,2,3,-1,4,.5])expect(()=>restartReaderChapter(project,playback,index)).toThrow('이전 장');
 });
 it('preserves the actual chosen label and completed script after the story ends',()=>{
  const source=work(),project={...source,lines:source.lines.map(line=>line.id==='a2'?{...line,flow:{type:'goto' as const,targetLineId:null}}:line)};const history=readerChapterHistory(project,advancePlayback(project,state(['a1','a2'])));
  expect(history.entries[0]!.choiceLabel).toBe('오른쪽');expect(history.entries[1]!.text).toBe('이전 장 둘째 글');expect(history.previousChapters).toEqual([]);
 });
});
