import {it,expect} from 'vitest';
import type {StoryLine} from '@knolstory/story-domain';
import {createBlankStoryProject,addStoryChapter,insertStoryCut} from '../src/authoring';
import {duplicateStoryCut,moveStoryCutToChapter} from '../src/editor-authoring';
import {createPlayback,advancePlayback} from '../src/story-runtime';

const flows:StoryLine['flow'][]=[{type:'goto',targetLineId:'b'},{type:'goto',targetLineId:null},{type:'goto',targetLineId:'b',routes:[{id:'route',condition:{mode:'all',terms:[{scoreId:'trust',operator:'gte',value:0}]},targetLineId:'b'}]}];
it.each(flows)('duplication preserves the full source goto and copy through a later move: %j',flow=>{
 const base=addStoryChapter(insertStoryCut(createBlankStoryProject({id:'work',chapterId:'first',lineId:'a'}),'a','b'),{chapterId:'other',lineId:'other-first'});
 const project={...base,...(flow?.type==='goto'&&flow.routes?.length?{scores:[{id:'trust',name:'trust',description:'',initial:0}]}:{}),lines:base.lines.map(line=>line.id==='a'?{...line,text:'원고 그대로\n한글과 🌳',workingTitle:'작업 제목',purposeNote:'목적',flow,audio:{music:{action:'play' as const,assetId:'audio:music:forest',endLineId:'b'}},presentation:{effects:[{id:'source-effect',type:'shake' as const,scope:'following' as const,endLineId:'b'}]}}:line)};
 const before=structuredClone(project),original=project.lines[0];const duplicated=duplicateStoryCut(project,'a','copy');
 expect(duplicated.lines.find(line=>line.id==='a')).toEqual(original);
 expect(duplicated.lines.find(line=>line.id==='copy')).toEqual({...original,id:'copy',order:2});
 expect({...duplicated,updatedAt:project.updatedAt,lines:project.lines.map(old=>({...duplicated.lines.find(line=>line.id===old.id)!,order:old.order}))}).toEqual(project);
 const moved=moveStoryCutToChapter(duplicated,'copy','other');expect(moved.lines.find(line=>line.id==='a')).toEqual(original);expect(project).toEqual(before);
 const next=advancePlayback(moved,createPlayback(moved,'a'));expect(next.lineId).toBe(flow?.type==='goto'?flow.targetLineId:null);expect(next.path).not.toContain('copy');
});
it('duplication preserves terminal ending metadata independently of Flow and still ends after moving the copy',()=>{
 const base=addStoryChapter(createBlankStoryProject({id:'work',chapterId:'first',lineId:'a'}),{chapterId:'other',lineId:'b'});
 const project={...base,lines:base.lines.map(line=>line.id==='a'?{...line,text:'원래 엔딩',ending:{name:'따뜻한 끝',description:'마지막 해설',endsStory:true}}:line)};
 const original=structuredClone(project.lines[0]),next=duplicateStoryCut(project,'a','copy');expect(next.lines.find(line=>line.id==='a')).toEqual(original);expect(next.lines.find(line=>line.id==='copy')).toEqual({...original,id:'copy',order:2});
 const moved=moveStoryCutToChapter(next,'copy','other');expect(moved.lines.find(line=>line.id==='a')).toEqual(original);expect(advancePlayback(moved,createPlayback(moved,'a')).status).toBe('ended');
});
