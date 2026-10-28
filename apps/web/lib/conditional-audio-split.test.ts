import {it,expect} from 'vitest';
import {createBlankStoryProject,compileStoryAudio} from '@knolstory/runtime-core';
import {splitContinuousAudioRange} from './continuous-audio-split';
import {splitChapterAudioRange} from './chapter-audio-split';
import {undoCombinedRange} from './combined-range-edit';
export function conditionalSplitProject(owner:'chapter'|'cut',channel:'music'|'ambience'){
 const p=createBlankStoryProject({id:'conditional-split',chapterId:'intro',lineId:'decision'}),chapter={...p.chapters[0],id:'body',order:2,chapterNumber:2,title:'다음 장'},cue={action:'play' as const,assetId:'audio:music:forest',sourceStartMs:200,sourceEndMs:1800,volume:.6,loop:true,endLineId:'d',branchCondition:{sourceLineId:'decision',choiceId:'yes'}};
 return {...p,chapters:[p.chapters[0],{...chapter,...(owner==='chapter'?{audio:{[channel]:cue}}:{})}],lines:[{...p.lines[0],text:'같은 도착 컷에서도 선택한 항목은 다릅니다.',audio:{[channel]:{action:'play' as const,assetId:'audio:music:night',loop:true}},flow:{type:'choice' as const,options:[{id:'yes',label:'첫 번째 선택',targetLineId:'a'},{id:'no',label:'두 번째 선택',targetLineId:'a'}]}},...['a','b','c','d','e'].map((id,i)=>({...p.lines[0],id,chapterId:'body',order:i+2,text:`보존${id}`,...(i===0&&owner==='cut'?{audio:{[channel]:cue}}:{} )}))]};
}
for(const owner of ['cut','chapter'] as const)for(const channel of ['music','ambience'] as const)it(`preserves exact true/false/missing choice history for ${owner} ${channel} split`,()=>{
 const p=conditionalSplitProject(owner,channel),before=structuredClone(p),result=owner==='cut'?splitContinuousAudioRange(p,'a',channel,'c'):splitChapterAudioRange(p,'body',channel,'c'),resolver=(id:string)=>({runtimePath:id.endsWith('night')?'assets/audio/night.wav':'assets/audio/forest.wav'});
 expect(result.project.lines.find(l=>l.id==='c')!.audio?.[channel]).toEqual(owner==='cut'?p.lines.find(l=>l.id==='a')!.audio![channel]:p.chapters[1].audio![channel]);
 for(const choiceId of ['yes','no',undefined])for(const end of ['a','b','c','d','e']){const full=['decision','a','b','c','d','e'],path=full.slice(0,full.indexOf(end)+1),history=choiceId?[{pathIndex:0,choiceId}]:[];expect(compileStoryAudio(result.project,end,resolver,path,history)).toEqual(compileStoryAudio(p,end,resolver,path,history));}
 for(const end of ['a','c','d'])expect(compileStoryAudio(result.project,end,resolver,[end],[])).toEqual(compileStoryAudio(p,end,resolver,[end],[]));
 expect(p).toEqual(before);const restored=undoCombinedRange(result.project,result.undo);expect(restored.chapters).toEqual(p.chapters);expect(restored.lines).toEqual(p.lines);
});
it('continues to refuse merges or a choice inside the split span and future choice sources',()=>{
 const p=conditionalSplitProject('cut','music');const merge={...p,lines:[...p.lines,{...p.lines[0],id:'outside',order:20,flow:{type:'goto' as const,targetLineId:'c'}}]};expect(()=>splitContinuousAudioRange(merge,'a','music','c')).toThrow(/합류/);
 const inside={...p,lines:p.lines.map(l=>l.id==='b'?{...l,flow:{type:'choice' as const,options:[{id:'first',label:'하나',targetLineId:'c'},{id:'second',label:'둘',targetLineId:'d'}]}}:l)};expect(()=>splitContinuousAudioRange(inside,'a','music','c')).toThrow();
 const future={...p,lines:p.lines.map(l=>l.id==='a'?{...l,audio:{music:{action:'play' as const,assetId:'audio:music:forest',branchCondition:{sourceLineId:'e',choiceId:'later'}}}}:l)};expect(()=>splitContinuousAudioRange(future,'a','music','c')).toThrow();
});
it('preserves exact selected-choice IDs across all current work adapters after splitting',async()=>{
 const {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot}=await import('../../../packages/compatibility/src/authoring-archive');const {exportAuthoringWorkbook,importAuthoringWorkbook}=await import('../../../packages/compatibility/src/authoring-workbook');const {exportAuthoringExcel,importAuthoringExcel}=await import('../../../packages/compatibility/src/authoring-workbook/excel');const {createStoryDocument}=await import('@knolstory/story-domain');
 for(const owner of ['cut','chapter'] as const){const p=conditionalSplitProject(owner,'music'),project=(owner==='cut'?splitContinuousAudioRange(p,'a','music','c'):splitChapterAudioRange(p,'body','music','c')).project,archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test'})});expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);}
});

it('keeps every exact AND/OR choice when splitting and refuses a later term source',()=>{
 const base=conditionalSplitProject('cut','music'),start={...base.lines[0],id:'earlier',order:1,flow:{type:'choice' as const,options:[{id:'yes',label:'앞선 예',targetLineId:'decision'},{id:'no',label:'앞선 아니요',targetLineId:'decision'}]}};
 for(const mode of ['all','any'] as const){
  const condition={mode,terms:[{sourceLineId:'earlier',choiceId:'yes'},{sourceLineId:'decision',choiceId:'yes'}]},p={...base,lines:[start,...base.lines.map(line=>({...line,order:(line.order??0)+1,...(line.id==='a'?{audio:{music:{...line.audio!.music!,branchCondition:condition}}}:{})}))]};
  const result=splitContinuousAudioRange(p,'a','music','c');expect(result.project.lines.find(l=>l.id==='c')!.audio!.music).toMatchObject({branchCondition:condition});
  for(const firstChoice of ['yes','no'])for(const secondChoice of ['yes','no'])for(const end of ['b','c','d']){const full=['earlier','decision','a','b','c','d'],path=full.slice(0,full.indexOf(end)+1),history=[{pathIndex:0,choiceId:firstChoice},{pathIndex:1,choiceId:secondChoice}],resolver=(id:string)=>({runtimePath:id.endsWith('night')?'assets/audio/night.wav':'assets/audio/forest.wav'});expect(compileStoryAudio(result.project,end,resolver,path,history)).toEqual(compileStoryAudio(p,end,resolver,path,history));}
  expect(undoCombinedRange(result.project,result.undo).lines).toEqual(p.lines);
  const future={...p,lines:p.lines.map(line=>line.id==='a'?{...line,audio:{music:{...line.audio!.music!,branchCondition:{mode,terms:[condition.terms[0],{sourceLineId:'e',choiceId:'yes'}]}}}}:line.id==='e'?{...line,flow:{type:'choice' as const,options:[{id:'yes',label:'나중 예',targetLineId:'a'},{id:'no',label:'나중 아니요',targetLineId:'a'}]}}:line)};expect(()=>splitContinuousAudioRange(future,'a','music','c')).toThrow(/앞에서 선택/);
 }
});

it('refuses to split across conditionally hidden cuts rather than losing the continuation',()=>{
 for(const owner of ['cut','chapter'] as const){
  const base=conditionalSplitProject(owner,'music'),condition={scores:{mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:1}]}};
  for(const hidden of ['a','b','c','d']){const p={...base,scores:[{id:'trust',name:'신뢰',description:'선택의 신뢰',initial:0}],lines:base.lines.map(line=>line.id===hidden?{...line,visibility:condition}:line)},before=structuredClone(p);expect(()=>owner==='cut'?splitContinuousAudioRange(p,'a','music','c'):splitChapterAudioRange(p,'body','music','c')).toThrow(/표시 조건/);expect(p).toEqual(before);}
 }
});
