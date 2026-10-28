import {it,expect} from 'vitest';
import {createBlankStoryProject} from './authoring';
import {createPlayback,advancePlayback,backPlayback,restorePlayback} from './story-runtime';
import {playbackScores} from './story-scores';
it('retains hidden structural visits, ignores hidden endings and choices, restores and backs over them',()=>{
 const base=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=base.lines[0];
 const project={...base,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[line,{...line,id:'b',order:2,visibility:{scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:0}]}},ending:{endsStory:true,name:'end',description:''},flow:{type:'choice' as const,options:[{id:'bad',label:'bad',targetLineId:'a',effects:[{scoreId:'x',operation:'add' as const,value:100}]}]}},{...line,id:'c',order:3}]};
 const initial=createPlayback(project),next=advancePlayback(project,initial);
 expect(next).toMatchObject({lineId:'c',path:['a','b','c']});expect(playbackScores(project,next)).toEqual({x:0});expect(restorePlayback(project,next)).toEqual(next);expect(backPlayback(project,next)).toEqual(initial);
});
it('an entirely hidden story ends without exposing its last authored frame',async()=>{
 const {compileStoryScene}=await import('./story-runtime');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:p.lines.map(line=>({...line,text:'SECRET',visibility:{scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:1}]}}}))};
 const state=createPlayback(project);expect(state).toMatchObject({lineId:null,path:['a'],status:'ended'});expect(restorePlayback(project,state)).toEqual(state);
 expect(compileStoryScene(project,'a',1,{mode:'play',playbackState:state})).toMatchObject({actors:[],dialogue:{text:''},choices:[]});
});
it('rejects forged hidden decisions and extra trailing structural visits',()=>{
 const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=p.lines[0];
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[line,{...line,id:'b',order:2,visibility:{scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:1}]}}}]};
 const end=advancePlayback(project,createPlayback(project));expect(end).toMatchObject({lineId:null,path:['a','b']});expect(restorePlayback(project,end)).toEqual(end);
 expect(()=>restorePlayback(project,{...end,path:['a','b','b']})).toThrow();expect(()=>restorePlayback(project,{...end,choiceHistory:[{pathIndex:1,choiceId:'bad'}]})).toThrow();
});
it('allows editing the authored contents of a hidden cut',async()=>{
 const {compileStoryScene}=await import('./story-runtime');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:p.lines.map(line=>({...line,text:'편집할 글',visibility:{scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:1}]}}}))};
 expect(compileStoryScene(project,'a',1,{mode:'edit'}).dialogue.text).toBe('편집할 글');
});
it('validates persisted visibility strictly in schema8, with exact score and choice references',async()=>{
 const {createStoryDocument,parseStoryDocument}=await import('@knolstory/story-domain');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
 const document=(visibility:unknown)=>createStoryDocument({project:{...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[{...p.lines[0],visibility}]} as typeof p,savedAt:p.updatedAt,appVersion:'test'});
 const condition={scores:{mode:'all',terms:[{scoreId:'x',operator:'gte',value:1}]}};
 expect(parseStoryDocument(document(condition))).toMatchObject({ok:true,document:{project:{lines:[{visibility:condition}]}}});
 for(const visibility of [{},null,{unknown:true},{scores:undefined},{scores:{mode:'all',terms:[]}},{...condition,choices:{sourceLineId:'missing',choiceId:'a'}},{scores:{mode:'all',terms:[{scoreId:'missing',operator:'gte',value:1}]}}])expect(parseStoryDocument(document(visibility)).ok).toBe(false);
 for(let schemaVersion=1;schemaVersion<=7;schemaVersion++)expect(parseStoryDocument({...document(condition),schemaVersion}).ok).toBe(false);
});
it('does not execute hidden stop, clear effects, sound, or range ends',async()=>{
 const {resolveStoryAudioPath}=await import('./audio'),{resolveStoryPresentationPath}=await import('./presentation-scopes');
 const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=p.lines[0],visibility={scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:0}]}};
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[{...line,audio:{music:{action:'play' as const,assetId:'a',endLineId:'hidden'}},presentation:{effects:[{id:'fx',type:'shake' as const,scope:'following' as const,endLineId:'hidden'}]}},{...line,id:'hidden',order:2,visibility,audio:{music:{action:'stop' as const},sounds:[{id:'sound',assetId:'b'}]},presentation:{clearFollowingEffects:true}},{...line,id:'c',order:3},{...line,id:'d',order:4}]};
 const state=advancePlayback(project,createPlayback(project)),later=advancePlayback(project,state);
 expect(resolveStoryAudioPath(project,later.path).map(e=>e.lineId)).toEqual(['a','c','d']);expect(resolveStoryAudioPath(project,later.path).at(-1)?.music.cue).toMatchObject({action:'play',assetId:'a'});
 expect(resolveStoryPresentationPath(project,later.path).at(-1)?.presentation?.effects).toHaveLength(1);
});
it('authoring audio inspection accepts hypothetical scored paths without inventing decisions',async()=>{
 const {compileStoryAudio}=await import('./audio');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=p.lines[0];
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[{...line,flow:{type:'choice' as const,options:[{id:'yes',label:'yes',targetLineId:'b',effects:[{scoreId:'x',operation:'add' as const,value:2}]}]}},{...line,id:'b',order:2,visibility:{scores:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:1}]}}}]};
 expect(compileStoryAudio(project,'b',()=>undefined,['a','b']).sounds).toEqual([]);
 expect(()=>playbackScores(project,{lineId:'b',path:['a','b'],status:'reading'})).toThrow();
});
it('replays exact recorded choices and rejects corrupt decision boundaries and targets',async()=>{
 const {replayStoryVisits}=await import('./scene-visits');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=p.lines[0];
 const project={...p,scores:[{id:'x',name:'점수',description:'',initial:0}],lines:[{...line,flow:{type:'choice' as const,options:[{id:'yes',label:'예',targetLineId:'b',effects:[{scoreId:'x',operation:'add' as const,value:2}]},{id:'impossible',label:'불가',targetLineId:'b',condition:{mode:'all' as const,terms:[{scoreId:'x',operator:'gt' as const,value:4}]}},{id:'elsewhere',label:'다른 곳',targetLineId:'a'}]}},{...line,id:'b',order:2}]};
 const state={lineId:'b',path:['a','b'],status:'reading' as const,choiceHistory:[{pathIndex:0,choiceId:'yes'}]};
 expect(replayStoryVisits(project,state).scores).toEqual({x:2});
 for(const choiceHistory of [[{pathIndex:-1,choiceId:'yes'}],[{pathIndex:.5,choiceId:'yes'}],[{pathIndex:2,choiceId:'yes'}],[state.choiceHistory[0],state.choiceHistory[0]],[{pathIndex:1,choiceId:'yes'}],[{pathIndex:0,choiceId:'missing'}],[{pathIndex:0,choiceId:'impossible'}],[{pathIndex:0,choiceId:'elsewhere'}]])expect(()=>replayStoryVisits(project,{...state,choiceHistory})).toThrow();
 expect(()=>replayStoryVisits(project,{...state,path:['missing','b']})).toThrow();
 expect(()=>replayStoryVisits({...project,lines:[line,project.lines[1]]},state)).toThrow();
 expect(()=>replayStoryVisits({...project,lines:[{...project.lines[0],ending:{endsStory:true,name:'끝',description:''}},project.lines[1]]},state)).toThrow();
 expect(()=>replayStoryVisits(project,{...state,choiceHistory:[]})).toThrow();
 expect(replayStoryVisits(project,{...state,choiceHistory:[]},false).scores).toEqual({x:0});
});
it('combines exact all/any visible choice visits and excludes hidden sources from the latest decision',async()=>{
 const {replayStoryVisits,visibleStoryPathIndices}=await import('./scene-visits');const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),line=p.lines[0];
 const choice={sourceLineId:'a',choiceId:'yes'},other={sourceLineId:'a',choiceId:'no'};
 const project={...p,lines:[{...line,flow:{type:'choice' as const,options:[{id:'yes',label:'예',targetLineId:'b'}]}},{...line,id:'b',order:2,visibility:{choices:{mode:'all' as const,terms:[choice]}}},{...line,id:'c',order:3,visibility:{choices:{mode:'any' as const,terms:[other,choice]}}},{...line,id:'d',order:4,visibility:{choices:other}}]};
 const state={lineId:'d',path:['a','b','c','d'],status:'reading' as const,choiceHistory:[{pathIndex:0,choiceId:'yes'}]};
 const replay=replayStoryVisits(project,state);expect(replay.visits.map(v=>[v.pathIndex,v.visible])).toEqual([[0,true],[1,true],[2,true],[3,false]]);expect(visibleStoryPathIndices(project,state)).toEqual([0,1,2]);
 expect(replay.matchesChoices(choice)).toBe(true);expect(replay.matchesChoices(other)).toBe(false);expect(replay.matchesChoices({mode:'all',terms:[choice,other]})).toBe(false);expect(replay.matchesChoices({mode:'any',terms:[other,choice]})).toBe(true);
 expect(()=>replayStoryVisits(project,{...state,choiceHistory:[...state.choiceHistory,{pathIndex:3,choiceId:'bad'}]})).toThrow(/표시하지 않은/);
});
it('accepts a recorded terminal choice only for an ended visit and validates raw visibility categories',async()=>{
 const {replayStoryVisits}=await import('./scene-visits');const {isStorySceneVisibility}=await import('@knolstory/story-domain');
 const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'}),project={...p,lines:[{...p.lines[0],flow:{type:'choice' as const,options:[{id:'end',label:'끝',targetLineId:null}]}}]};
 expect(replayStoryVisits(project,{lineId:null,path:['a'],status:'ended',choiceHistory:[{pathIndex:0,choiceId:'end'}]}).visits).toHaveLength(1);
 const choice={sourceLineId:'a',choiceId:'end'};expect(isStorySceneVisibility({choices:choice})).toBe(true);expect(isStorySceneVisibility({choices:choice,scores:{mode:'all',terms:[{scoreId:'x',operator:'eq',value:0}]}})).toBe(true);
 for(const value of [undefined,[],1,'x',{},null,{choices:undefined},{choices:{}},{choices:choice,extra:1}])expect(isStorySceneVisibility(value)).toBe(false);
});
