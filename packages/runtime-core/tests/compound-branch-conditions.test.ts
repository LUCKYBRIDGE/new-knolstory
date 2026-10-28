import {expect,it} from 'vitest';
import {isStoryBranchCondition,createStoryDocument,parseStoryDocument,type StoryBranchCondition} from '@knolstory/story-domain';
import {createBlankStoryProject} from '../src/authoring';
import {branchConditionMatches} from '../src/branch-conditions';
import {storyBranchConditionReferences} from '../src/branch-condition-references';
import {relocateChoiceConditions} from '../src/relocate-choice-conditions';
import {remapClonedCutReferences} from '../src/clone-cut-references';
import {deleteStoryCut} from '../src/editor-authoring';
import {restorePlayback} from '../src/story-runtime';
const first={sourceLineId:'a',choiceId:'yes'},second={sourceLineId:'b',choiceId:'yes'};
const group={mode:'all' as const,terms:[first,second]};
function fixture(){const base=createBlankStoryProject({id:'compound',chapterId:'ch',lineId:'a'}),line=base.lines[0];return {...base,lines:['a','b','c'].map((id,i)=>({...line,id,text:'앞뒤',order:i+1,...(i<2?{flow:{type:'choice' as const,options:[{id:'yes',label:'예',targetLineId:i===0?'b':'c'},{id:'no',label:'아니요',targetLineId:i===0?'b':'c'}]}}:{presentation:{effects:[{id:'fx',type:'shake' as const,branchCondition:group}]}})}))};}
it('accepts strict flat bounded groups and rejects duplicate, nested and extra terms',()=>{
 expect(isStoryBranchCondition(group)).toBe(true);
 for(const invalid of [{...group,terms:Array(1)},{...group,terms:[]},{...group,mode:'and'},{...group,extra:1},{...group,terms:[first,first]},{...group,terms:[group]},{...group,terms:[{...first,extra:1}]},{...group,terms:Array.from({length:9},(_,i)=>({sourceLineId:String(i),choiceId:'yes'}))}])expect(isStoryBranchCondition(invalid)).toBe(false);
 const p=fixture(),document=createStoryDocument({project:p,savedAt:p.updatedAt,appVersion:'test'});expect(parseStoryDocument(document).ok).toBe(true);
 expect(parseStoryDocument({...document,project:{...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:undefined}:l)}}).ok).toBe(false);
});
it('evaluates all/any latest independent exact answers and pending revisits',()=>{
 const path=['a','b','c','a','b','c'],yes=[{pathIndex:0,choiceId:'yes'},{pathIndex:1,choiceId:'yes'},{pathIndex:3,choiceId:'no'},{pathIndex:4,choiceId:'yes'}];
 expect(branchConditionMatches(group as StoryBranchCondition,path,2,yes)).toBe(true);
 expect(branchConditionMatches(group as StoryBranchCondition,path,5,yes)).toBe(false);
 expect(branchConditionMatches({...group,mode:'any'} as StoryBranchCondition,path,5,yes)).toBe(true);
 expect(branchConditionMatches(group as StoryBranchCondition,path,3,yes)).toBe(false);
 expect(branchConditionMatches({...group,mode:'any'} as StoryBranchCondition,path,3,yes)).toBe(true);
 expect(branchConditionMatches(group as StoryBranchCondition,path,2,[yes[0]])).toBe(false);
});
it('guards both sources, remaps each matching term only and keeps exact history required',()=>{
 const p=fixture(),before=structuredClone(p);
 for(const id of ['a','b']){expect(storyBranchConditionReferences(p,id)).toHaveLength(1);expect(()=>deleteStoryCut(p,id)).toThrow();}
 const moved=relocateChoiceConditions(p,'a','new',new Set(['yes']));expect(moved.lines[2].presentation?.effects?.[0].branchCondition).toEqual({...group,terms:[{...first,sourceLineId:'new'},second]});
 const cloned=remapClonedCutReferences({...p.lines[2],id:'clone'},'a',new Map([['yes','new-yes']]));expect(cloned.presentation?.effects?.[0].branchCondition).toEqual({...group,terms:[{sourceLineId:'clone',choiceId:'new-yes'},second]});
 expect(()=>restorePlayback(p,{lineId:'c',path:['a','b','c'],status:'reading',choiceHistory:[{pathIndex:0,choiceId:'yes'}]})).toThrow('선택 기록');expect(p).toEqual(before);
});

import {compileStoryAudio} from '../src/audio';
import {compileStoryPresentation} from '../src/presentation-scopes';
import {splitStoryCut} from '../src/manuscript-operations';
it('filters every cue type by both exact answers and reevaluates continuing cues on a source revisit',()=>{
 for(const mode of ['all','any'] as const){
  const base=fixture(),condition={...group,mode};
  const music={action:'play' as const,assetId:'forest',branchCondition:condition};
  const p={...base,lines:base.lines.map(l=>l.id==='c'?{...l,flow:{type:'goto' as const,targetLineId:'a'},presentation:{effects:[{id:'fx',type:'shake' as const,scope:'following' as const,branchCondition:condition}]},audio:{music,ambience:music,sounds:[{id:'sfx',assetId:'forest',branchCondition:condition}]}}:l)};
  const resolver=()=>({runtimePath:'assets/audio/forest.ogg'}),path=['a','b','c'];
  const both=[{pathIndex:0,choiceId:'yes'},{pathIndex:1,choiceId:'yes'}],one=[{pathIndex:0,choiceId:'yes'},{pathIndex:1,choiceId:'no'}];
  for(const [history,active] of [[both,true],[one,mode==='any']] as const){
   const audio=compileStoryAudio(p,'c',resolver,path,history);expect(audio.music.action).toBe(active?'play':'stop');expect(audio.ambience?.action).toBe(active?'play':'stop');expect(audio.sounds).toHaveLength(active?1:0);expect(compileStoryPresentation(p,'c',path,history)?.effects).toHaveLength(active?1:0);
  }
  const revisit=[...path,'a'];expect(compileStoryAudio(p,'a',resolver,revisit,both).music.action).toBe(mode==='any'?'play':'stop');expect(compileStoryPresentation(p,'a',revisit,both)?.effects??[]).toHaveLength(mode==='any'?1:0);
  expect(JSON.stringify(compileStoryAudio(p,'c',resolver,path,both))).not.toContain('branchCondition');
 }
});
it('relocates the matching source within a group on manuscript split and preserves its other term',()=>{
 const p=fixture(),split=splitStoryCut(p,'a','a-next',1);
 expect(split.lines.find(l=>l.id==='c')?.presentation?.effects?.[0].branchCondition).toEqual({...group,terms:[{...first,sourceLineId:'a-next'},second]});
 expect(p.lines[2].presentation?.effects?.[0].branchCondition).toEqual(group);
});
