import {describe,it,expect} from 'vitest';
import {advancePlayback,createBlankStoryProject,createPlayback,insertStoryCut,playbackScores} from '@knolstory/runtime-core';
import {rewindReader} from './reader-rewind';
const work=()=>insertStoryCut(createBlankStoryProject({id:'rewind',chapterId:'chapter',lineId:'first'}),'first','second');
describe('reader rewind event boundary',()=>{
 it('rewinds a valid read path without changing the manuscript or previous state',()=>{
  const project=work(),state=advancePlayback(project,createPlayback(project)),before=structuredClone({project,state});
  const result=rewindReader(project,state,4);expect(result.ok).toBe(true);
  if(result.ok)expect(result.playback).toMatchObject({lineId:'first',path:['first'],status:'reading'});
  expect({project,state}).toEqual(before);
 });
 it('reports a missing previous cut without throwing or silently resetting the path',()=>{
  const project=work(),state={lineId:'second',path:['missing-cut','second'],status:'reading' as const};
  const before=structuredClone({project,state});
  expect(()=>rewindReader(project,state,5)).not.toThrow();
  expect(rewindReader(project,state,5)).toMatchObject({ok:false,message:expect.stringContaining('현재 컷은 유지')});
  expect({project,state}).toEqual(before);
 });
 it('returns to the choice and discards only the decision being rewound',()=>{
  const source=work(),project={...source,scores:[{id:'trust',name:'신뢰',description:'선택 결과',initial:0}],lines:source.lines.map(line=>line.id==='first'?{...line,flow:{type:'choice' as const,options:[{id:'left',label:'왼쪽',targetLineId:'second'},{id:'right',label:'오른쪽',targetLineId:'second',effects:[{scoreId:'trust',operation:'add' as const,value:2}]}]}}:line)};
  const state=advancePlayback(project,createPlayback(project),'right'),before=structuredClone(state);
  const result=rewindReader(project,state,6);expect(result.ok).toBe(true);
  if(result.ok){expect(result.playback.lineId).toBe('first');expect(result.playback.status).toBe('choice');expect(result.playback.choiceHistory??[]).toHaveLength(0);expect(playbackScores(project,result.playback)).toEqual({trust:0});}
  expect(playbackScores(project,state)).toEqual({trust:2});
  expect(state).toEqual(before);
 });
 it('rejects an unavailable previous scene before committing its playback',()=>{
  const source=work(),project={...source,lines:source.lines.map(line=>line.id==='first'?{...line,backgroundId:'missing-background'}:line)};
  const state=advancePlayback(project,createPlayback(project));
  expect(rewindReader(project,state,7)).toMatchObject({ok:false});
  expect(state.lineId).toBe('second');
 });
 it('reports an empty read path instead of inventing a first-cut fallback',()=>{
  const state={lineId:null,path:[],status:'ended' as const};
  expect(rewindReader(work(),state,8)).toMatchObject({ok:false,message:expect.stringContaining('현재 컷은 유지')});
 });
 it('reopens the last cut of a completed reading without discarding the route',()=>{
  const project=work(),state=advancePlayback(project,advancePlayback(project,createPlayback(project)));
  expect(state.status).toBe('ended');const before=structuredClone(state);
  const result=rewindReader(project,state,9);expect(result.ok).toBe(true);
  if(result.ok)expect(result.playback).toMatchObject({lineId:'second',path:['first','second'],status:'reading'});
  expect(state).toEqual(before);
 });
});
