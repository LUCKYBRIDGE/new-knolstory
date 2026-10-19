import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {createPlayback,advancePlayback,restorePlayback} from '../src/story-runtime';
import {playbackScores} from '../src/story-scores';
import {analyzeStoryFlow} from '../src/flow-analysis';
import type {StoryProject} from '@knolstory/story-domain';
function fixture(mode:'all'|'any'):StoryProject{
 let p=createBlankStoryProject({id:'joined',chapterId:'c',lineId:'start'});for(const id of ['left','right','join','reward','normal'])p=insertStoryCut(p,p.lines.at(-1)!.id,id);
 return {...p,scores:[{id:'trust',name:'신뢰',description:'',initial:0},{id:'courage',name:'용기',description:'',initial:0}],lines:p.lines.map(line=>({...line,flow:line.id==='start'?{type:'choice',options:[{id:'help',label:'돕는다',targetLineId:'left',effects:[{scoreId:'trust',operation:'add',value:3}]},{id:'none',label:'지켜본다',targetLineId:'right'},{id:'brave',label:'용기 낸다',targetLineId:'right',effects:[{scoreId:'courage',operation:'add',value:2}]}]}:line.id==='left'||line.id==='right'?{type:'goto',targetLineId:'join'}:line.id==='join'?{type:'goto',targetLineId:'normal',routes:[{id:'reward-route',targetLineId:'reward',condition:{mode,terms:[{scoreId:'trust',operator:'gte',value:3},{scoreId:'courage',operator:'gte',value:2}]}}]}:{type:'goto',targetLineId:null}}))};
}
describe('paths rejoin while all/any conditions retain the actual selection scores',()=>{
 it.each(['all','any'] as const)('merges distinct paths and resolves %s without inventing the unchosen path',mode=>{
  const p=fixture(mode),original=structuredClone(p);expect(analyzeStoryFlow(p).nodes.find(node=>node.lineId==='join')?.shared).toBe(true);
  for(const choice of ['help','brave','none']){const first=advancePlayback(p,createPlayback(p),choice),joined=advancePlayback(p,first);expect(joined.lineId).toBe('join');expect(playbackScores(p,joined)).toEqual(choice==='help'?{trust:3,courage:0}:choice==='brave'?{trust:0,courage:2}:{trust:0,courage:0});expect(advancePlayback(p,joined).lineId).toBe(mode==='any'&&choice!=='none'?'reward':'normal');expect(restorePlayback(p,JSON.parse(JSON.stringify(joined)))).toEqual(joined);}
  expect(p).toEqual(original);
 });
 it('all succeeds when both named scores qualify, and route priority stays authored',()=>{const p=fixture('all'),q={...p,scores:p.scores!.map(score=>({...score,initial:5}))};const joined=advancePlayback(q,advancePlayback(q,createPlayback(q),'help'));expect(advancePlayback(q,joined).lineId).toBe('reward');});
});
