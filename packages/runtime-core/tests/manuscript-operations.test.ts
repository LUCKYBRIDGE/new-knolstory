import {describe,expect,it} from 'vitest';
import {createBlankStoryProject,addStoryChapter} from '../src/authoring';
import {addTypedStoryCut} from '../src/editor-authoring';
import {splitStoryCut,mergeStoryCuts} from '../src/manuscript-operations';
import type {StoryProject} from '@knolstory/story-domain';
const blank=()=>createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
const manuscript=()=>{const p=blank();return {...p,lines:[{...p.lines[0],text:' 첫 문장.\n\n다음 한글👩‍🏫 이야기. '}]};};
describe('safe manuscript operations',()=>{
 it('splits exact Korean/newline text, preserving identity, stage and incoming links; moves outgoing/ending',()=>{
  const p=addTypedStoryCut(manuscript(),'a','incoming','narration');
  const source:StoryProject={...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'goto',targetLineId:null},ending:{name:'끝',description:'원래 끝',endsStory:true}}:{...l,flow:{type:'goto',targetLineId:'a'}})};
  const n=splitStoryCut(source,'a','b',7);const a=n.lines.find(l=>l.id==='a')!,b=n.lines.find(l=>l.id==='b')!;
  expect(a.text+b.text).toBe(source.lines[0].text);expect(a.flow).toBeUndefined();expect(a.ending).toBeUndefined();expect(b.flow).toEqual(source.lines[0].flow);expect(b.ending).toEqual(source.lines[0].ending);
  expect(b.stageComposition).toEqual(a.stageComposition);expect(n.lines.find(l=>l.id==='incoming')?.flow).toEqual({type:'goto',targetLineId:'a'});expect(source.lines).toHaveLength(2);
 });
 it.each([0,-1,100,.5,NaN])('rejects invalid position %s',position=>expect(()=>splitStoryCut(manuscript(),'a','b',position)).toThrow());
 it('rejects duplicate or empty ids and unknown cuts',()=>{
  for(const id of ['a',''])expect(()=>splitStoryCut(manuscript(),'a',id,2)).toThrow();
  expect(()=>splitStoryCut(manuscript(),'unknown','b',2)).toThrow();
 });
 it('does not cut inside a Korean combining or emoji grapheme',()=>{
  const p=blank();for(const text of ['가👩‍🏫나','가가나'])expect(()=>splitStoryCut({...p,lines:[{...p.lines[0],text}]},'a','b',2)).toThrow();
 });
 it('merges adjacent split cuts exactly and preserves the later ending',()=>{
  const p=manuscript();const split=splitStoryCut(p,'a','b',7);const withEnding={...split,lines:split.lines.map(l=>l.id==='b'?{...l,flow:{type:'goto' as const,targetLineId:null}}:l)};
  const n=mergeStoryCuts(withEnding,'a','b');expect(n.lines).toHaveLength(1);expect(n.lines[0].text).toBe(p.lines[0].text);expect(n.lines[0].flow).toEqual({type:'goto',targetLineId:null});
 });
 it('keeps incoming links to retained first cut but rejects targets to removed cut and continuation',()=>{
  const p=addTypedStoryCut(splitStoryCut(manuscript(),'a','b',7),'b','z','narration');
  const incoming=(id:string)=>({...p,lines:p.lines.map(l=>l.id==='z'?{...l,flow:{type:'goto' as const,targetLineId:id}}:l)});
  expect(mergeStoryCuts(incoming('a'),'a','b').lines).toHaveLength(2);expect(()=>mergeStoryCuts(incoming('b'),'a','b')).toThrow(/연결/);
  expect(()=>mergeStoryCuts({...p,continuation:{chapterId:'c',lineId:'b',label:'계속'}},'a','b')).toThrow(/이어/);
 });
 it('rejects branching/ending first cut, nonadjacent and cross chapter merges',()=>{
  const p=addTypedStoryCut(splitStoryCut(manuscript(),'a','b',7),'b','z','narration');
  for(const flow of [{type:'goto' as const,targetLineId:'z'},{type:'choice' as const,options:[{id:'x',label:'가',targetLineId:'b'},{id:'y',label:'나',targetLineId:null}]}])expect(()=>mergeStoryCuts({...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow}:l)},'a','b')).toThrow();
  expect(()=>mergeStoryCuts(p,'a','z')).toThrow();expect(()=>mergeStoryCuts(addStoryChapter(p,{chapterId:'d',lineId:'other'}),'z','other')).toThrow();
 });
 it('rejects loss of speaker, stage, notes, or timed presentation/audio differences',()=>{
  const p=splitStoryCut(manuscript(),'a','b',7);
  for(const patch of [{speakerName:'다른 사람'},{backgroundId:'different'},{purposeNote:'메모'},{presentation:{look:'sepia'}},{audio:{}}])expect(()=>mergeStoryCuts({...p,lines:p.lines.map(l=>l.id==='b'?{...l,...patch}:l)} as StoryProject,'a','b')).toThrow();
 });
 it('accepts the sole explicit goto to next cut and retains remaining order',()=>{
  const p=addTypedStoryCut(splitStoryCut(manuscript(),'a','b',7),'b','z','narration');
  const n=mergeStoryCuts({...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:{type:'goto',targetLineId:'b'}}:l)},'a','b');expect(n.lines.map(l=>l.order)).toEqual([1,2]);
 });
 it('rejects merged text over schema limit',()=>{
  const p=splitStoryCut(manuscript(),'a','b',7);expect(()=>mergeStoryCuts({...p,lines:p.lines.map(l=>({...l,text:'한'.repeat(11000)}))},'a','b')).toThrow();
 });
 it('rejects removal of memo links, a self-loop and original creation references',()=>{
  const p=splitStoryCut(manuscript(),'a','b',7);
  const memo={id:'memo',kind:'free' as const,title:'연결 메모',fields:[],order:1,createdAt:p.updatedAt,updatedAt:p.updatedAt};
  for(const link of [{linkedLineId:'b'},{linkedLineIds:['a','b']}])expect(()=>mergeStoryCuts({...p,creativeMemos:[{...memo,...link}]},'a','b')).toThrow(/메모/);
  expect(()=>mergeStoryCuts({...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'goto',targetLineId:'b'}}:l)},'a','b')).toThrow(/연결/);
  const source={kind:'baseEdition' as const,baseStoryId:'base',baseEditionId:'original',linearCreation:{mode:'continue' as const,sourceStartChoiceLineId:'a',writingStartLineId:'b',prefixLineIds:['a'],choices:[{lineId:'a',optionId:'x',label:'계속'}],sourceRevision:'1'}};
  expect(()=>mergeStoryCuts({...p,source},'a','b')).toThrow(/원작/);
 });
 it('rejects malformed candidate data instead of canonicalizing away content',()=>{
  const p=manuscript();expect(()=>splitStoryCut({...p,lines:[{...p.lines[0],type:'invalid'}]} as unknown as StoryProject,'a','b',7)).toThrow();
 });

});
