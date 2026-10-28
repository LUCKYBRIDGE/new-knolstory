import {expect,it} from 'vitest';
import {createBlankStoryProject} from '../src/authoring';
import {splitStoryCut,mergeStoryCuts} from '../src/manuscript-operations';
import {parseStoryDocument,createStoryDocument,type StoryProject} from '@knolstory/story-domain';
export function choiceManuscript():StoryProject{
 const base=createBlankStoryProject({id:'choice-manuscript',chapterId:'ch',lineId:'a'}),line=base.lines[0],condition={sourceLineId:'a',choiceId:'yes'};
 return {...base,chapters:base.chapters.map(ch=>({...ch,audio:{music:{action:'play',assetId:'audio:music:forest',branchCondition:condition},ambience:{action:'play',assetId:'audio:ambience:night',branchCondition:{...condition,choiceId:'no'}},sounds:[{id:'chapter-sound',assetId:'audio:sound:chime',branchCondition:condition}]}})),lines:[{...line,text:'앞 문장. 뒤 문장.',flow:{type:'choice',options:[{id:'yes',label:'같은 곳 가기 A',targetLineId:'b'},{id:'no',label:'같은 곳 가기 B',targetLineId:'b'}]}},{...line,id:'b',order:2,text:'결과',audio:{music:{action:'play',assetId:'audio:music:forest',branchCondition:condition,endLineId:'b'},ambience:{action:'play',assetId:'audio:ambience:night',branchCondition:condition},sounds:[{id:'sound',assetId:'audio:sound:chime',branchCondition:condition,sourceStartMs:200,sourceEndMs:800}]},presentation:{effects:[{id:'flash',type:'flash',branchCondition:condition},{id:'look',type:'shake',branchCondition:{sourceLineId:'z',choiceId:'other'}}]}},{...line,id:'z',order:3,text:'별도 선택',flow:{type:'choice',options:[{id:'other',label:'다른 선택',targetLineId:null},{id:'done',label:'끝',targetLineId:null}]}}]};
}
const valid=(project:StoryProject)=>parseStoryDocument(createStoryDocument({project,savedAt:project.updatedAt,appVersion:'test'})).ok;
it('moves exact choice ownership after text split and updates all sound/effect conditions without changing targets',()=>{
 const p=choiceManuscript(),before=structuredClone(p);expect(valid(p)).toBe(true);
 const n=splitStoryCut(p,'a','second',6);expect(valid(n)).toBe(true);expect(p).toEqual(before);
 expect(n.lines.find(l=>l.id==='a')?.flow).toBeUndefined();expect(n.lines.find(l=>l.id==='second')?.flow).toEqual(p.lines[0].flow);
 const result=n.lines.find(l=>l.id==='b')!;
 expect(result.audio?.music).toEqual({...p.lines[1].audio!.music,branchCondition:{sourceLineId:'second',choiceId:'yes'}});
 expect(result.audio?.ambience).toEqual({...p.lines[1].audio!.ambience,branchCondition:{sourceLineId:'second',choiceId:'yes'}});
 expect(result.audio?.sounds?.[0]).toEqual({...p.lines[1].audio!.sounds![0],branchCondition:{sourceLineId:'second',choiceId:'yes'}});
 expect(result.presentation?.effects?.[0].branchCondition).toEqual({sourceLineId:'second',choiceId:'yes'});
 expect(result.presentation?.effects?.[1]).toEqual(p.lines[1].presentation!.effects![1]);
 expect(n.chapters[0].audio?.music).toEqual({...p.chapters[0].audio!.music,branchCondition:{sourceLineId:'second',choiceId:'yes'}});
 expect(n.chapters[0].audio?.ambience).toEqual({...p.chapters[0].audio!.ambience,branchCondition:{sourceLineId:'second',choiceId:'no'}});
 expect(n.chapters[0].audio?.sounds?.[0]).toEqual({...p.chapters[0].audio!.sounds![0],branchCondition:{sourceLineId:'second',choiceId:'yes'}});
});
it('merges back to the original choice owner, preserving incoming targets, optional fields and all conditions',()=>{
 const p=choiceManuscript(),split=splitStoryCut(p,'a','second',6),merged=mergeStoryCuts(split,'a','second');
 expect(valid(merged)).toBe(true);expect({...merged,updatedAt:p.updatedAt}).toEqual(p);
});
it('does not repair an invalid choice reference or rewrite a plain-text cut reference',()=>{
 const p=choiceManuscript(),bad={...p,lines:p.lines.map(l=>l.id==='b'?{...l,audio:{sounds:[{id:'bad',assetId:'audio:sound:chime',branchCondition:{sourceLineId:'a',choiceId:'missing'}}]}}:l)};
 expect(()=>splitStoryCut(bad,'a','second',6)).toThrow();
 const plain={...p,lines:p.lines.map(l=>l.id==='a'?{...l,flow:undefined}:l)};
 expect(()=>splitStoryCut(plain,'a','second',6)).toThrow();
});
it('keeps self-owned conditions, literal loop targets and original source provenance on split',()=>{
 const p=choiceManuscript(),source={kind:'baseEdition' as const,baseStoryId:'base',baseEditionId:'original',linearCreation:{mode:'continue' as const,sourceStartChoiceLineId:'a',writingStartLineId:'b',prefixLineIds:['a'],choices:[{lineId:'a',optionId:'yes',label:'원본 선택'}],sourceRevision:'1'}},project={...p,source,lines:p.lines.map(l=>l.id==='a'?{...l,audio:{sounds:[{id:'self',assetId:'audio:sound:chime',branchCondition:{sourceLineId:'a',choiceId:'yes'}}]},flow:{...l.flow!,type:'choice' as const,options:[{id:'yes',label:'처음으로',targetLineId:'a'},{id:'no',label:'다음',targetLineId:'b'}]}}:l)};
 const result=splitStoryCut(project,'a','second',6);expect(result.source).toEqual(source);
 for(const id of ['a','second'])expect(result.lines.find(l=>l.id===id)?.audio?.sounds?.[0].branchCondition).toEqual({sourceLineId:'second',choiceId:'yes'});
 expect(result.lines.find(l=>l.id==='second')?.flow).toEqual(project.lines[0].flow);
});
it('explains external audio/effect range endpoints before removing a merged cut',()=>{
 const split=splitStoryCut(choiceManuscript(),'a','second',6);
 const chapter={...split,chapters:split.chapters.map(ch=>({...ch,audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:'second'}}}))};
 expect(()=>mergeStoryCuts(chapter,'a','second')).toThrow(/이 컷에서 끝나는/);
 const cut={...split,lines:split.lines.map(l=>l.id==='b'?{...l,presentation:{effects:[{type:'flash' as const,scope:'following' as const,endLineId:'second'}]}}:l)};
 expect(()=>mergeStoryCuts(cut,'a','second')).toThrow(/이 컷에서 끝나는/);
});
it('preserves true/false/missing decision playback after ownership moves and after merge',async()=>{
 const {compileStoryAudio,compileStoryPresentation}=await import('../src/index');
 const p=choiceManuscript(),split=splitStoryCut(p,'a','second',6),merged=mergeStoryCuts(split,'a','second'),resolve=(id:string)=>({runtimePath:id.includes('forest')?'assets/audio/forest.wav':'assets/audio/chime.wav'});
 for(const choiceId of ['yes','no',undefined]){
  const beforeHistory=choiceId?[{pathIndex:0,choiceId}]:[],afterHistory=choiceId?[{pathIndex:1,choiceId}]:[];
  expect(compileStoryAudio(split,'b',resolve,['a','second','b'],afterHistory)).toEqual(compileStoryAudio(p,'b',resolve,['a','b'],beforeHistory));
  const visible=(value:ReturnType<typeof compileStoryPresentation>)=>value?{...value,effects:value.effects?.map(({originEntry:_origin,...effect})=>effect)}:value;
  // A new cut adds one actual path visit, so runtime originEntry intentionally changes.
  expect(visible(compileStoryPresentation(split,'b',['a','second','b'],afterHistory))).toEqual(visible(compileStoryPresentation(p,'b',['a','b'],beforeHistory)));
  expect(compileStoryAudio(merged,'b',resolve,['a','b'],beforeHistory)).toEqual(compileStoryAudio(p,'b',resolve,['a','b'],beforeHistory));
 }
});
it('roundtrips moved conditions through current archive, workbook, actual XLSX and JSONB',async()=>{
 const {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot}=await import('../../compatibility/src/authoring-archive');
 const {exportAuthoringWorkbook,importAuthoringWorkbook}=await import('../../compatibility/src/authoring-workbook');
 const {exportAuthoringExcel,importAuthoringExcel}=await import('../../compatibility/src/authoring-workbook/excel');
 const split=splitStoryCut(choiceManuscript(),'a','second',6);
 for(const project of [split,mergeStoryCuts(split,'a','second')]){
  const archive=await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2026-10-21T00:00:00.000Z',appVersion:'test'})});
  expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
  expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
  expect(await importAuthoringExcel(await exportAuthoringExcel(archive))).toEqual(archive);
  expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 }
});
