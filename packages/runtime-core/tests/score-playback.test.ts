import {describe,it,expect} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {advancePlayback,backPlayback,createPlayback,restorePlayback,compileStoryScene} from '../src/story-runtime';
import {jumpPlayback} from '../src/playback-history';
import {playbackScores} from '../src/story-scores';
const condition={mode:'all' as const,terms:[{scoreId:'kind',operator:'gte' as const,value:2}]};
function story():StoryProject{let p=createBlankStoryProject({id:'scores',chapterId:'c',lineId:'a'});p=insertStoryCut(insertStoryCut(insertStoryCut(p,'a','b'),'b','good'),'good','other');return {...p,scores:[{id:'kind',name:'친절',description:'도와준 횟수',initial:0}],lines:p.lines.map(l=>({...l,flow:l.id==='a'?{type:'choice' as const,options:[{id:'help',label:'돕는다',targetLineId:'b',effects:[{scoreId:'kind',operation:'add' as const,value:2}]},{id:'leave',label:'지나간다',targetLineId:'b'}]}:l.id==='b'?{type:'goto' as const,targetLineId:'other',routes:[{id:'high',condition,targetLineId:'good'}]}:{type:'goto' as const,targetLineId:null}}))};}
describe('score-driven playback',()=>{
 it('recomputes exact same-target choice effects after merge and selects first matching route',()=>{const p=story(),s=advancePlayback(p,createPlayback(p),'help');expect(playbackScores(p,s)).toEqual({kind:2});expect(advancePlayback(p,s).lineId).toBe('good');expect(advancePlayback(p,advancePlayback(p,createPlayback(p),'leave')).lineId).toBe('other');expect(restorePlayback(p,s)).toEqual(s);});
 it('back, restart and backlog jump discard future effects, including final choices',()=>{const p=story(),s=advancePlayback(p,createPlayback(p),'help');expect(playbackScores(p,backPlayback(p,s))).toEqual({kind:0});expect(playbackScores(p,jumpPlayback(p,s,0))).toEqual({kind:0});expect(playbackScores(p,createPlayback(p,'b'))).toEqual({kind:0});expect(playbackScores(p,createPlayback(p))).toEqual({kind:0});});
 it('rejects unavailable choices and presents only eligible choices in play mode',()=>{const p=story();const q={...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'choice' as const,options:[{id:'locked',label:'친절한 길',targetLineId:'b',condition}]}}:l)};const s=createPlayback(q);expect(s.status).toBe('pending');expect(()=>advancePlayback(q,s,'locked')).toThrow(/조건/);expect(compileStoryScene(q,'a',1,{mode:'play',playbackState:s}).choices).toEqual([]);expect(compileStoryScene(q,'a',1,{mode:'edit'}).choices).toHaveLength(1);const edited={...q,scores:[{...q.scores![0],initial:3}]};expect(advancePlayback(edited,s,'locked').lineId).toBe('b');});
 it('rejects forged paths, choices, ambiguous scored legacy paths and overflow',()=>{const p=story(),s=advancePlayback(p,createPlayback(p),'help');expect(()=>restorePlayback(p,{...s,choiceHistory:undefined})).toThrow(/선택/);expect(()=>restorePlayback(p,{...s,path:['a','b','other'],lineId:'other'})).toThrow();expect(()=>restorePlayback(p,{...s,choiceHistory:[{pathIndex:0,choiceId:'bad'}]})).toThrow();const overflow={...p,scores:[{...p.scores![0],initial:1000000}]};expect(()=>advancePlayback(overflow,createPlayback(overflow),'help')).toThrow(/점수/);expect(playbackScores(p,s)).toEqual({kind:2});});
});

describe('score histories across loops, terminal choices and conditional routes',()=>{
 it('uses both visits to a shared choice independently and truncates the second decision on rollback',()=>{
  const p=story(),loop={...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'choice' as const,options:[{id:'again',label:'다시',targetLineId:'a',effects:[{scoreId:'kind',operation:'add' as const,value:1}]},{id:'finish',label:'끝',targetLineId:null,effects:[{scoreId:'kind',operation:'set' as const,value:9}]}]}}:l)};
  let s=advancePlayback(loop,createPlayback(loop),'help');s=advancePlayback(loop,s,'again');s=advancePlayback(loop,s,'help');expect(playbackScores(loop,s)).toEqual({kind:5});
  const end=advancePlayback(loop,s,'finish');expect(playbackScores(loop,end)).toEqual({kind:9});expect(restorePlayback(loop,JSON.parse(JSON.stringify(end)))).toEqual(end);
  expect(playbackScores(loop,backPlayback(loop,end))).toEqual({kind:5});expect(playbackScores(loop,jumpPlayback(loop,end,2))).toEqual({kind:3});expect(playbackScores(loop,backPlayback(loop,s))).toEqual({kind:3});
 });
 it('evaluates all/any and ordered routes with null endings distinct from fallback',()=>{
  const p=story(),routes={...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'goto' as const,targetLineId:'other',routes:[{id:'end',condition,targetLineId:null},{id:'later',condition,targetLineId:'good'}]}}:l)};
  const s=advancePlayback(routes,createPlayback(routes),'help');expect(advancePlayback(routes,s).status).toBe('ended');expect(restorePlayback(routes,advancePlayback(routes,s)).status).toBe('ended');
 });
 it('rejects stored condition changes, route changes, duplicate effects history and live overflow',()=>{
  const p=story(),s=advancePlayback(p,createPlayback(p),'help'),finished=advancePlayback(p,s);
  const changed={...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'goto' as const,targetLineId:'other'}}:l)};
  expect(()=>restorePlayback(changed,finished)).toThrow();
  expect(()=>playbackScores(p,{...s,choiceHistory:[{pathIndex:0,choiceId:'help'},{pathIndex:0,choiceId:'help'}]})).toThrow();
  expect(()=>playbackScores(p,{...s,choiceHistory:[{pathIndex:1,choiceId:'help'}]})).toThrow();
  const changedChoice={...p,lines:p.lines.map(l=>l.id==='a'&&l.flow?.type==='choice'?{...l,flow:{...l.flow,options:l.flow.options.map(option=>({...option,condition}))}}:l)};
  expect(()=>restorePlayback(changedChoice,s)).toThrow(/조건/);
 });
 it('allows locked-choice pending save and recovers if author changes score defaults',()=>{
  const p=story(),q={...p,lines:p.lines.map(l=>l.id==='a'&&l.flow?.type==='choice'?{...l,flow:{...l.flow,options:l.flow.options.map(option=>({...option,condition}))}}:l)};
  const s=createPlayback(q);expect(restorePlayback(q,s)).toEqual(s);
  const unblocked={...q,scores:[{...q.scores![0],initial:2}]};expect(restorePlayback(unblocked,s).status).toBe('choice');
  expect(compileStoryScene(p,'a',0,{mode:'play',playbackState:createPlayback(p)}).choices).toHaveLength(2);
 });
});

describe('score-dependent choice menus after a merge',()=>{
 it('filters using the encountered history rather than initial defaults and restores locked state safely',()=>{
  const p=story(),q={...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'choice' as const,options:[{id:'high',label:'친절한 결말',targetLineId:'good',condition},{id:'low',label:'다른 결말',targetLineId:'other',condition:{mode:'all' as const,terms:[{scoreId:'kind',operator:'lt' as const,value:2}]}}]}}:l)};
  const high=advancePlayback(q,createPlayback(q),'help'),low=advancePlayback(q,createPlayback(q),'leave');
  expect(compileStoryScene(q,'b',1,{mode:'play',playbackState:high}).choices?.map(item=>item.id)).toEqual(['high']);expect(compileStoryScene(q,'b',2,{mode:'play',playbackState:low}).choices?.map(item=>item.id)).toEqual(['low']);
  expect(()=>advancePlayback(q,high,'low')).toThrow();expect(advancePlayback(q,high,'high').lineId).toBe('good');
 });
});
