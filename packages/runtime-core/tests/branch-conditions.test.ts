import {it,expect} from 'vitest';
import {getRepresentativeStory} from '@knolstory/compatibility';
import type {StoryProject} from '@knolstory/story-domain';
import {compileStoryAudio,compileStoryPresentation,compileStoryScene,restorePlayback,getStoryCutDeletionImpact,deleteStoryCut,backPlayback,jumpPlayback} from '../src';
const condition={sourceLineId:'source',choiceId:'yes'};
const resolve=()=>({runtimePath:'assets/audio/forest.ogg'});
function fixture():StoryProject {
 const base=getRepresentativeStory('rabbit').project,template=base.lines[0];
 return {...base,chapters:[{...base.chapters[0],id:'chapter',audio:undefined}],lines:['source','owner','end','after'].map((id,index)=>({...template,id,chapterId:'chapter',order:index+1,audio:undefined,presentation:undefined,ending:undefined,flow:index===0?{type:'choice' as const,options:[{id:'yes',label:'Yes',targetLineId:'owner'},{id:'no',label:'No',targetLineId:'owner'}]}:index===3?{type:'goto' as const,targetLineId:'source'}:undefined}))};
}
function cues():StoryProject { const p=fixture();return {...p,lines:p.lines.map(l=>l.id==='owner'?{...l,presentation:{effects:[{id:'effect',type:'shake',scope:'following',endLineId:'end',branchCondition:condition}]},audio:{music:{action:'play',assetId:'forest',branchCondition:condition,endLineId:'end'},sounds:[{id:'sfx',assetId:'forest',branchCondition:condition}]}}:l)}; }
const yes=[{pathIndex:0,choiceId:'yes'}],no=[{pathIndex:0,choiceId:'no'}];
it('uses exact completed option identities and strips authored conditions from scenes',()=>{
 const p=cues(),path=['source','owner'];
 expect(compileStoryPresentation(p,'owner',path,yes)?.effects).toHaveLength(1);
 expect(compileStoryPresentation(p,'owner',path,no)?.effects).toEqual([]);
 expect(compileStoryPresentation(p,'owner',path)?.effects).toEqual([]);
 expect(compileStoryAudio(p,'owner',resolve,path,yes).music.action).toBe('play');
 expect(compileStoryAudio(p,'owner',resolve,path,no).sounds).toEqual([]);
 const scene=compileStoryScene(p,'owner',1,{mode:'play',playbackState:{lineId:'owner',path,status:'reading',choiceHistory:yes},audioResolver:resolve});
 expect(scene.presentation?.effects).toHaveLength(1);expect(JSON.stringify(scene)).not.toContain('branchCondition');
});
it('expires inclusively, invalidates at source reentry awaiting, and can activate again on reselection',()=>{
 const p=cues();
 expect(compileStoryPresentation(p,'end',['source','owner','end'],yes)?.effects).toHaveLength(1);
 expect(compileStoryAudio(p,'end',resolve,['source','owner','end'],yes).music.action).toBe('play');
 expect(compileStoryPresentation(p,'after',['source','owner','end','after'],yes)?.effects??[]).toEqual([]);
 const loop=['source','owner','source'];
 expect(compileStoryPresentation(p,'source',loop,yes)?.effects??[]).toEqual([]);
 expect(compileStoryAudio(p,'source',resolve,loop,yes).music.action).toBe('stop');
 expect(compileStoryPresentation(p,'owner',[...loop,'owner'],[...yes,{pathIndex:2,choiceId:'no'}])?.effects).toEqual([]);
 expect(compileStoryPresentation(p,'owner',[...loop,'owner'],[...yes,{pathIndex:2,choiceId:'yes'}])?.effects).toHaveLength(1);
});
it('does not retrospectively activate or clear unrelated music at an inactive owner',()=>{
 const p=cues();p.lines=p.lines.map(l=>l.id==='source'?{...l,audio:{music:{action:'play',assetId:'other'}}}:l);
 expect(compileStoryAudio(p,'owner',resolve,['source','owner'],no).music.action).toBe('play');
 expect(compileStoryPresentation(p,'after',['owner','source','after'],[{pathIndex:1,choiceId:'yes'}])?.effects??[]).toEqual([]);
});
it('filters chapter cues at actual chapter entry and preserves unconditional sounds',()=>{
 const p=fixture();p.chapters=p.chapters.map(c=>({...c,id:'second',audio:{music:{action:'play',assetId:'forest',branchCondition:condition},sounds:[{id:'conditional',assetId:'forest',branchCondition:condition},{id:'plain',assetId:'forest'}]}}));p.lines=p.lines.map(l=>({...l,chapterId:l.id==='source'?'first':'second'}));p.chapters=[{...p.chapters[0],id:'first',audio:undefined},...p.chapters];
 expect(compileStoryAudio(p,'owner',resolve,['source','owner'],yes).sounds).toHaveLength(2);
 expect(compileStoryAudio(p,'owner',resolve,['source','owner'],no).sounds).toHaveLength(1);
 expect(compileStoryAudio(p,'end',resolve,['source','owner','end'],yes).sounds).toEqual([]);
});
it('requires exact history for branch referenced sources while preserving older unconditioned inference',()=>{
 const p=cues(),state={lineId:'owner',path:['source','owner'],status:'reading'};
 expect(()=>restorePlayback(p,state)).toThrow('선택 기록');
 expect(()=>restorePlayback(p,{...state,choiceHistory:[]})).toThrow('선택 기록');
 expect(restorePlayback(p,{...state,choiceHistory:yes}).choiceHistory).toEqual(yes);
 expect(()=>restorePlayback(p,{...state,choiceHistory:[{pathIndex:0,choiceId:'invalid'}]})).toThrow();
 expect(()=>restorePlayback(p,{...state,choiceHistory:[...yes,...yes]})).toThrow();
 expect(restorePlayback(fixture(),state).choiceHistory).toBeUndefined();
});
it('guards surviving branch references and excludes cues removed with their owner',()=>{
 const p=cues(),impact=getStoryCutDeletionImpact(p,'source');
 expect(impact.branchConditions.map(r=>r.kind).sort()).toEqual(['effect','music','sound']);
 expect(()=>deleteStoryCut(p,'source')).toThrow('선택');
 expect(getStoryCutDeletionImpact(p,'owner').branchConditions).toEqual([]);
 expect(deleteStoryCut(p,'owner').lines.some(l=>l.id==='owner')).toBe(false);
});

it('rewind and jump remove later decisions and leave a revisited source awaiting selection',()=>{
 const p=cues(),state={lineId:'owner',path:['source','owner'],status:'reading' as const,choiceHistory:yes};
 const back=backPlayback(p,state),jump=jumpPlayback(p,state,0);
 for(const next of [back,jump]){
  expect(next.status).toBe('choice');expect(next.choiceHistory??[]).toEqual([]);
  expect(compileStoryPresentation(p,'source',next.path,next.choiceHistory)?.effects??[]).toEqual([]);
  expect(compileStoryAudio(p,'source',resolve,next.path,next.choiceHistory).music.action).toBe('stop');
 }
 expect(compileStoryPresentation(p,'owner',['source','owner'],[{pathIndex:0,choiceId:'yes'},{pathIndex:0,choiceId:'no'}])?.effects).toEqual([]);
 expect(compileStoryPresentation(p,'source',['source'],[{pathIndex:0,choiceId:'yes'}])?.effects??[]).toEqual([]);
});
it('does not clear an unrelated following effect whose ID matches an inactive directive',()=>{
 const base=cues();const p={...base,lines:base.lines.map(l=>l.id==='source'?{...l,presentation:{effects:[{id:'effect',type:'shake' as const,scope:'following' as const}]}}:l)};
 expect(compileStoryPresentation(p,'owner',['source','owner'],no)?.effects).toHaveLength(1);
});
it('reports chapter music, ambience and sound references while leaving authored data untouched',()=>{
 const base=cues();const p={...base,chapters:base.chapters.map(c=>({...c,audio:{music:{action:'play' as const,assetId:'forest',branchCondition:condition},ambience:{action:'play' as const,assetId:'forest',branchCondition:condition},sounds:[{id:'chapter-sfx',assetId:'forest',branchCondition:condition}]}}))};
 const before=JSON.stringify(p);const refs=getStoryCutDeletionImpact(p,'source').branchConditions;
 expect(refs.filter(ref=>ref.owner==='chapter').map(ref=>ref.kind).sort()).toEqual(['ambience','music','sound']);
 expect(()=>deleteStoryCut(p,'source')).toThrow('선택');expect(JSON.stringify(p)).toBe(before);
});

it('cannot authorize through a fabricated destination or an unknown option in direct compilation',()=>{
 const p=cues(),wrongPath=['source','after','owner'];
 expect(compileStoryPresentation(p,'owner',wrongPath,yes)?.effects).toEqual([]);
 expect(compileStoryAudio(p,'owner',resolve,wrongPath,yes).music.action).toBe('stop');
 const unknown={...p,lines:p.lines.map(l=>l.id==='source'?{...l,flow:{type:'choice' as const,options:[{id:'another',label:'Another',targetLineId:'owner'}]}}:l)};
 expect(compileStoryPresentation(unknown,'owner',['source','owner'],yes)?.effects).toEqual([]);
 expect(compileStoryAudio(unknown,'owner',resolve,['source','owner'],yes).sounds).toEqual([]);
});
