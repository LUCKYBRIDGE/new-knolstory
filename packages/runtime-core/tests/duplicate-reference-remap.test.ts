import {it,expect} from 'vitest';
import {createBlankStoryProject,insertStoryCut} from '../src/authoring';
import {duplicateStoryCut} from '../src/editor-authoring';
import {createPlayback,advancePlayback} from '../src/story-runtime';
import {remapClonedCutReferences} from '../src/clone-cut-references';
it('remaps only clone-local self targets, ranges and exact choice references while every original remains unchanged',()=>{
 const base=insertStoryCut(insertStoryCut(createBlankStoryProject({id:'work',chapterId:'c',lineId:'a'}),'a','b'),'b','external');
 const self={sourceLineId:'a',choiceId:'one'},outside={sourceLineId:'external',choiceId:'external-one'};
 const project={...base,lines:base.lines.map(line=>line.id==='a'?{...line,flow:{type:'choice' as const,options:[{id:'one',label:'자기 갈래',targetLineId:'a'},{id:'two',label:'다른 컷',targetLineId:'b'}]},presentation:{effects:[{id:'local',type:'shake' as const,scope:'following' as const,endLineId:'a',branchCondition:self},{id:'outside',type:'flash' as const,scope:'following' as const,endLineId:'b',branchCondition:outside}]},audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:'a',branchCondition:self},ambience:{action:'play' as const,assetId:'audio:music:forest',endLineId:'b',branchCondition:outside},sounds:[{id:'local-sfx',assetId:'audio:sound:chime',branchCondition:self},{id:'outside-sfx',assetId:'audio:sound:chime',branchCondition:outside}]}}:line.id==='external'?{...line,flow:{type:'choice' as const,options:[{id:'external-one',label:'원래 컷',targetLineId:'a'},{id:'external-two',label:'끝',targetLineId:null}]}}:line)};
 const before=structuredClone(project),next=duplicateStoryCut(project,'a','copy'),copy=next.lines.find(line=>line.id==='copy')!;
 expect(project).toEqual(before);for(const original of project.lines)expect(next.lines.find(line=>line.id===original.id)).toEqual({...original,order:next.lines.find(line=>line.id===original.id)!.order});
 expect(copy.flow).toEqual({type:'choice',options:[{id:'copy-choice-1',label:'자기 갈래',targetLineId:'copy'},{id:'copy-choice-2',label:'다른 컷',targetLineId:'b'}]});
 const local={sourceLineId:'copy',choiceId:'copy-choice-1'};
 expect(copy.presentation?.effects?.[0]).toMatchObject({endLineId:'copy',branchCondition:local});expect(copy.presentation?.effects?.[1]).toEqual(project.lines[0].presentation?.effects?.[1]);
 expect(copy.audio?.music).toMatchObject({endLineId:'copy',branchCondition:local});expect(copy.audio?.ambience).toEqual(project.lines[0].audio?.ambience);
 expect(copy.audio?.sounds?.[0]).toMatchObject({branchCondition:local});expect(copy.audio?.sounds?.[1]).toEqual(project.lines[0].audio?.sounds?.[1]);
 expect(advancePlayback(next,createPlayback(next,'copy'),'copy-choice-1').path).toEqual(['copy','copy']);
});
it('retains absent optional fields and rejects incomplete self choice mappings without mutating a clone',()=>{
 const original=createBlankStoryProject({id:'work',chapterId:'c',lineId:'a'}).lines[0],plain={...original,id:'copy'};
 const result=remapClonedCutReferences(plain,'a',new Map());expect(result).toEqual(plain);for(const key of ['flow','audio','presentation'])expect(Object.hasOwn(result,key)).toBe(Object.hasOwn(plain,key));
 const incomplete={...plain,audio:{music:{action:'maintain' as const},ambience:{action:'stop' as const,fadeOutMs:300},sounds:[{id:'sfx',assetId:'audio:sound:chime',branchCondition:{sourceLineId:'a',choiceId:'missing'}}]}};
 const before=structuredClone(incomplete);expect(()=>remapClonedCutReferences(incomplete,'a',new Map())).toThrow('선택 항목');expect(incomplete).toEqual(before);
});
it('self goto and score-route destinations follow the new clone, retaining definitions and conditions',()=>{
 const base=createBlankStoryProject({id:'work',chapterId:'c',lineId:'a'}),condition={mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:0}]};
 const project={...base,scores:[{id:'trust',name:'신뢰',description:'',initial:0}],lines:base.lines.map(line=>({...line,flow:{type:'goto' as const,targetLineId:'a',routes:[{id:'loop',condition,targetLineId:'a'}]}}))};
 const before=structuredClone(project),next=duplicateStoryCut(project,'a','copy');expect(project).toEqual(before);expect(next.scores).toEqual(project.scores);expect(next.lines.find(line=>line.id==='a')).toEqual(project.lines[0]);expect(next.lines.find(line=>line.id==='copy')?.flow).toEqual({type:'goto',targetLineId:'copy',routes:[{id:'loop',condition,targetLineId:'copy'}]});expect(advancePlayback(next,createPlayback(next,'copy')).path).toEqual(['copy','copy']);
});
