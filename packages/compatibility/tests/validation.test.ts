import { describe, expect, it } from 'vitest';
import { parseStoryDocument } from '@knolstory/story-domain';
import { getRepresentativeStory } from '../src/index';
import { cloneCoverDesign, coverDesignAssetReferences, coverDesignBytes, isCoverDesign, type CoverDesign } from '../../story-domain/src/legacy/cover-design';
import { DEFAULT_COVER, isStoryCover, isStoryCoverComposition } from '../../story-domain/src/legacy/story-cover';
import { normalizeAndValidateStoryProject } from '../../story-domain/src/legacy/story-project-validation';
const fixture = () => getRepresentativeStory('rabbit');
function validDesign(): CoverDesign {
 return {version:1,trim:'trade-300-435',finish:{stock:'cream',color:'#ffffff',ink:'#000000',accent:'#123456',texture:'none'},band:{enabled:true,designId:'classic'},faces:{front:{preset:'picturebook',elements:[{id:'title',type:'text',role:'title',region:'face',content:{bind:'project.title'},box:{x:.1,y:.1,w:.8,h:.1},style:{fontId:'serif',fontSize:.05,color:'#000000',align:'center',writing:'horizontal'}},{id:'hero',type:'image',role:'actor',assetId:'rabbit-turtle.character.rabbit-white-unified-720x900',assetType:'character',box:{x:.1,y:.3,w:.5,h:.6},frame:'arch',crop:{fit:'contain',zoom:1,x:50,y:50}}]},spine:{preset:'cloth',elements:[]},back:{preset:'literary',elements:[{id:'description',type:'text',role:'description',region:'band',content:{text:'줄바꿈\n독자 안내'},box:{x:0,y:0,w:1,h:.5},style:{fontId:'sans',fontSize:.04,color:'#123456',align:'left',writing:'vertical'}}]}}};
}
describe('cover recipe compatibility is validated independently of rendering',()=>{
 it('keeps text bindings, explicit text, crops and known image types in document roundtrip',()=>{
  const design=validDesign();
  expect(isCoverDesign(design)).toBe(true);
  const clone=cloneCoverDesign(design);
  expect(clone).toEqual(design);expect(clone).not.toBe(design);
  expect(coverDesignAssetReferences(design)).toEqual([{id:'rabbit-turtle.character.rabbit-white-unified-720x900',type:'character'}]);
  expect(coverDesignAssetReferences()).toEqual([]);
  const cover={...DEFAULT_COVER,design};
  expect(isStoryCover(cover)).toBe(true);
  const doc=fixture(), candidate={...doc,project:{...doc.project,cover}};
  const loaded=parseStoryDocument(candidate);
  expect(loaded.ok).toBe(true);
  if(loaded.ok)expect(loaded.document.project.cover?.design).toEqual(design);
  const image=design.faces.front.elements[1];
  expect(isStoryCover({...cover,design:{...design,faces:{...design.faces,front:{...design.faces.front,elements:[{...image,assetType:'background'}]}}}})).toBe(false);
 });
 it('rejects future recipes, malformed boxes, duplicate IDs, excessive text and image lists',()=>{
  const design=validDesign();
  for(const value of [null,[],new Date(),undefined,{...design,unknown:1},{...design,version:2},{...design,finish:{...design.finish,color:'red'}},{...design,band:{...design.band,enabled:'yes'}}])expect(isCoverDesign(value)).toBe(false);
  const title=design.faces.front.elements[0];
  for(const item of [{...title,id:'<script>'},{...title,box:{x:.9,y:.1,w:.5,h:.5}},{...title,content:{text:'x'.repeat(501)}},{...title,style:{fontId:'bad'}},{...title,type:'bad'},null])expect(isCoverDesign({...design,faces:{...design.faces,front:{preset:'picturebook',elements:[item]}}})).toBe(false);
  expect(isCoverDesign({...design,faces:{...design.faces,front:{preset:'picturebook',elements:[title,title]}}})).toBe(false);
  expect(isCoverDesign({...design,faces:{...design.faces,front:{preset:'picturebook',elements:Array.from({length:13},(_,i)=>({...title,id:`title-${i}`}))}}})).toBe(false);
  const image=design.faces.front.elements[1];
  expect(isCoverDesign({...design,faces:{...design.faces,front:{preset:'picturebook',elements:Array.from({length:5},(_,i)=>({...image,id:`image-${i}`}))}}})).toBe(false);
  expect(isCoverDesign({...design,faces:{...design.faces,front:{preset:'picturebook',elements:[{...image,crop:{fit:'cover',zoom:.8,x:50,y:50}}]}}})).toBe(false);
  expect(()=>cloneCoverDesign({})).toThrow();
  expect(coverDesignBytes(undefined)).toBe(Infinity);
  const cycle:Record<string,unknown>={};cycle.self=cycle;
  expect(coverDesignBytes(cycle)).toBe(Infinity);
 });
 it('accepts valid composition bounds and rejects future fields and unsupported colors',()=>{
  const composition={version:1,backgroundFit:'complete',backgroundX:50,backgroundY:50,backgroundZoom:1,characterX:50,characterBottom:0,characterScale:1,titleX:50,titleY:10,titleWidth:80,showEdition:false,textPanel:'none'};
  expect(isStoryCoverComposition(composition)).toBe(true);
  for(const candidate of [null,[],{...composition,unknown:1},{...composition,titleX:95},{...composition,backgroundZoom:NaN}])expect(isStoryCoverComposition(candidate)).toBe(false);
  expect(isStoryCover({...DEFAULT_COVER,composition,presetId:'poster',titleColor:'#123456'})).toBe(true);
  expect(isStoryCover({...DEFAULT_COVER,presetId:'unknown'})).toBe(false);
  expect(isStoryCover({...DEFAULT_COVER,titleColor:'red'})).toBe(false);
  expect(isStoryCover(null)).toBe(false);
 });
});
describe('all document boundaries fail visibly instead of dropping authored content',()=>{
 it('reports malformed primitive fields and missing arrays',()=>{
  const doc=fixture(), project=doc.project;
  for(const patch of [{id:undefined},{title:42},{sheetEditable:undefined},{sheetEditable:'yes'},{chapters:undefined},{chapters:42},{chapters:[null]},{lines:undefined},{lines:42},{lines:[null]},{planning:42},{planning:{premise:42}},{planning:{structureMode:'other'}},{speakerNames:[1]},{creativeMemos:42},{stageDefaults:42},{source:{kind:'unknown'}},{cover:{}},{choiceMode:'unknown'},{continuation:42}])expect(normalizeAndValidateStoryProject({...project,...patch}).issues.length).toBeGreaterThan(0);
  expect(normalizeAndValidateStoryProject(null).issues.length).toBeGreaterThan(0);
  expect(normalizeAndValidateStoryProject({...project,planning:undefined}).project?.planning.freeNotes).toBe('');
 });
 it('validates authored chapter fields, arc marks and ordering',()=>{
  const project=fixture().project,chapter=project.chapters[0];
  for(const patch of [{order:undefined},{order:NaN},{mood:42},{storyStageKeys:42},{storyStageKeys:[42]},{storyStageKeys:['unknown']},{chapterSpeakerNames:42}])expect(normalizeAndValidateStoryProject({...project,chapters:[{...chapter,...patch}]}).issues.length).toBeGreaterThan(0);
  const {purpose:_purpose,mood:_mood,keyEvents:_events,nextChapterIdea:_idea,storyStageKeys:_stages,chapterSpeakerNames:_speakers,characterAssetIds:_characters,backgroundAssetIds:_backgrounds,...legacyChapter}=chapter;
  expect(normalizeAndValidateStoryProject({...project,chapters:[legacyChapter],lines:[]}).project?.chapters[0].storyStageKeys).toEqual([]);
 });
 it('validates authored cuts, presentation, stage, continuation and character references',()=>{
  const project=fixture().project,line=project.lines[0];
  for(const patch of [{order:undefined},{order:NaN},{type:'other'},{speaker:'other'},{workingTitle:42},{coSpeakerNames:42},{inheritActors:42},{backgroundMode:'none'},{stageComposition:{}},{flow:{}},{presentation:{} ,effect:{type:'shake',intensity:'soft',trigger:'scene-enter',delayMs:0}},{effect:{}},{presentation:{bad:true}}])expect(normalizeAndValidateStoryProject({...project,lines:[{...line,...patch}]}).issues.length).toBeGreaterThan(0);
  for(const continuation of [{chapterId:'missing',lineId:line.id,label:''},{chapterId:line.chapterId,lineId:'missing',label:''},{chapterId:project.chapters[1].id,lineId:line.id,label:''}])expect(normalizeAndValidateStoryProject({...project,continuation}).issues.some(issue=>issue.code==='broken-reference')).toBe(true);
  const valid={...project,characters:[{},null,{id:'actor',name:'이름',role:'주인공',description:'인물',defaultImageId:'asset'}],lines:[{...line,workingTitle:'컷',coSpeakerNames:['토끼'],ending:{name:'끝',description:'이야기 끝',endsStory:false}}],continuation:{chapterId:line.chapterId,lineId:line.id,label:'여기서'}};
  const loaded=normalizeAndValidateStoryProject(valid);
  expect(loaded.issues).toEqual([]);
  expect(loaded.project?.characters).toHaveLength(2);
  expect(loaded.project?.lines[0].ending?.endsStory).toBe(false);
 });
});
