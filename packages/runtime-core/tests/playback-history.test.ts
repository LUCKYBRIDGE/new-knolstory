import {describe,it,expect} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {advancePlayback,backPlayback,createPlayback,restorePlayback} from '../src/story-runtime';
import {playbackLog,jumpPlayback} from '../src/playback-history';
const story=():StoryProject=>{const p=insertStoryCut(insertStoryCut(createBlankStoryProject({id:'history',chapterId:'c',lineId:'a'}),'a','b'),'b','z');return {...p,lines:p.lines.map(l=>({...l,text:l.id,flow:l.id==='a'?{type:'choice' as const,options:[{id:'first',label:'첫 길',targetLineId:'b'},{id:'second',label:'둘째 길',targetLineId:'b'}]}:{type:'goto' as const,targetLineId:l.id==='b'?'z':null}}))};};
describe('actual playback history',()=>{
 it('remembers exact option even when two choices have same destination and survives restore',()=>{const p=story();const s=advancePlayback(p,createPlayback(p),'second');expect(playbackLog(p,s)[0].choiceLabel).toBe('둘째 길');expect(playbackLog(p,restorePlayback(p,JSON.parse(JSON.stringify(s))))[0].choiceLabel).toBe('둘째 길');});
 it('shows only encountered cuts and truncates choice decisions on backlog jump',()=>{const p=story();const s=advancePlayback(p,advancePlayback(p,createPlayback(p),'first'));expect(playbackLog(p,s).map(x=>x.lineId)).toEqual(['a','b','z']);const back=jumpPlayback(p,s,0);expect(back.path).toEqual(['a']);expect(playbackLog(p,back)[0].choiceLabel).toBeUndefined();expect(playbackLog(p,advancePlayback(p,back,'second'))[0].choiceLabel).toBe('둘째 길');expect(backPlayback(p,s).path).toEqual(['a','b']);expect(()=>jumpPlayback(p,s,3)).toThrow();});
 it('keeps end-choice label and does not invent ambiguous legacy labels',()=>{const p=story();p.lines[0]={...p.lines[0],flow:{type:'choice',options:[{id:'end',label:'여기서 끝',targetLineId:null}]}};const end=advancePlayback(p,createPlayback(p),'end');expect(playbackLog(p,end)[0].choiceLabel).toBe('여기서 끝');expect(restorePlayback(p,end).status).toBe('ended');const legacy=story();expect(playbackLog(legacy,{lineId:'b',path:['a','b'],status:'reading'})[0].choiceLabel).toBe('선택한 길 (이전 저장)');});
 it('rejects tampered stored decision and stale choice labels',()=>{const p=story();const s=advancePlayback(p,createPlayback(p),'first');expect(()=>restorePlayback(p,{...s,choiceHistory:[{pathIndex:0,choiceId:'missing'}]})).toThrow();expect(()=>restorePlayback(p,{...s,choiceHistory:[{pathIndex:1,choiceId:'first'}]})).toThrow();});
});

describe('history uses actual visible text boundaries',()=>{
 it('caps the current occurrence by Unicode code points without altering the manuscript',()=>{
  const base=story();const p={...base,lines:base.lines.map(l=>l.id==='a'?{...l,text:'첫🐇문장\n비밀'}:l)};const state=createPlayback(p),before=JSON.stringify(p);
  expect(playbackLog(p,state,{lineId:'a',endOffset:3})[0].text).toBe('첫🐇문');expect(JSON.stringify(p)).toBe(before);
 });
 it('does not reveal current text before valid renderer evidence is available',()=>{
  const p=story(),state=createPlayback(p);
  for(const evidence of [undefined,null,{lineId:'other',endOffset:10},{lineId:'a',endOffset:-1},{lineId:'a',endOffset:Infinity},{lineId:'a',endOffset:.5}]){expect(playbackLog(p,state,evidence)[0].text).toBe('');expect(playbackLog(p,state,evidence)[0].textPending).toBe(true);}
 });
 it('caps only the latest occurrence on a repeated visit and preserves older decisions',()=>{
  const base=story(),p={...base,lines:base.lines.map(l=>l.id==='a'?{...l,text:'앞🐇뒤'}:l.id==='b'?{...l,flow:{type:'goto' as const,targetLineId:'a'}}:l)};
  const state=advancePlayback(p,advancePlayback(p,createPlayback(p),'second'));
  const log=playbackLog(p,state,{lineId:'a',endOffset:2});expect(log.map(row=>row.text)).toEqual(['앞🐇뒤','b','앞🐇']);expect(log[0].choiceLabel).toBe('둘째 길');
 });
 it('clamps valid oversized bounds and preserves completed history after the end',()=>{
  const base=story(),p={...base,lines:base.lines.map(l=>l.id==='a'?{...l,flow:{type:'goto' as const,targetLineId:null}}:l)};
  const state=createPlayback(p);expect(playbackLog(p,state,{lineId:'a',endOffset:Number.MAX_SAFE_INTEGER})[0].text).toBe('a');
  expect(playbackLog(p,advancePlayback(p,state))[0].text).toBe('a');
 });
});
