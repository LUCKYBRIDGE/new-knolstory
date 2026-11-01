import {expect,it} from 'vitest';
import {createStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {patchStoryLine} from '../../runtime-core/src/story-runtime';
import {addStoryChapter} from '../../runtime-core/src/authoring';
import {addTypedStoryCut,assignStorySpeaker,duplicateStoryCut} from '../../runtime-core/src/editor-authoring';
import {splitStoryCut,mergeStoryCuts} from '../../runtime-core/src/manuscript-operations';
import {convertMusicToSequence} from '../../../apps/web/lib/music-sequence-edit';
import {splitSequenceAtTime,trimSequenceEdge,moveSequenceAtTime} from '../../../apps/web/lib/sequence-time-edit';
import {editCombinedRange} from '../../../apps/web/lib/combined-range-edit';
import {alignEffectToGuide} from '../../../apps/web/lib/effect-authoring';
import {completeAudioResources,completeStoryDocument} from './fixtures/authoring-complete';
import {createAuthoringArchive,encodeAuthoringArchive,decodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '../src/authoring-archive';
import {exportAuthoringWorkbook,importAuthoringWorkbook} from '../src/authoring-workbook';
import {exportAuthoringExcel,importAuthoringExcel} from '../src/authoring-workbook/excel';

async function roundtrip(project:StoryProject){
 const document=createStoryDocument({project,savedAt:'2026-11-01T00:00:00.000Z',appVersion:'editor-operations-test'});
 const archive=await createAuthoringArchive({format:'knolstory',document,audioResources:completeAudioResources()});
 expect(await decodeAuthoringArchive(await encodeAuthoringArchive(archive))).toEqual(archive);
 expect(await importAuthoringWorkbook(await exportAuthoringWorkbook(archive))).toEqual(archive);
 const reopened=await importAuthoringExcel(await exportAuthoringExcel(archive));
 expect(reopened).toEqual(archive);
 expect(await restoreJsonbSnapshot(await prepareJsonbSnapshot(archive))).toEqual(archive);
 if(reopened.format!=='knolstory')throw Error('Expected the same work format after reopening.');
 return reopened.document.project;
}

it('preserves connected manuscript, image, actor, audio and effect edits across work files and XLSX',{timeout:30000},async()=>{
 const original=completeStoryDocument(),before=structuredClone(original);
 const condition={sourceLineId:'cut-001',choiceId:'choice-001'};
 // A plain choice cut can be split and merged; independent audio/effect owners follow its choice.
 let project:StoryProject={...original.project,chapters:original.project.chapters.map(chapter=>({...chapter,audio:{...chapter.audio,music:{action:'play',assetId:'audio:music:forest',branchCondition:condition}}})),lines:original.project.lines.map((line,index)=>{
  if(index===0){const {audio:_audio,presentation:_presentation,...plain}=line;return plain;}
  return index===1?{...line,presentation:{...line.presentation,effects:[{id:'edit-scope',type:'shake',scope:'following',repeat:'once',durationMs:600,branchCondition:condition}]}}:line;
 })};
 const seed=project,initial=structuredClone(project);
 const split=splitStoryCut(project,'cut-001','split-choice',4);
 expect(split.chapters[0].audio?.music).toMatchObject({branchCondition:{sourceLineId:'split-choice',choiceId:'choice-001'}});
 expect(split.lines.find(line=>line.id==='cut-002')?.presentation?.effects?.[0].branchCondition).toEqual({...condition,sourceLineId:'split-choice'});
 project=mergeStoryCuts(await roundtrip(split),'cut-001','split-choice');
 expect(project.lines.find(line=>line.id==='cut-001')?.text).toBe(initial.lines[0].text);
 expect(project.chapters[0].audio?.music).toMatchObject({branchCondition:condition});
 expect(project.lines.find(line=>line.id==='cut-002')?.presentation?.effects?.[0].branchCondition).toEqual(condition);
 project=duplicateStoryCut(project,'cut-001','choice-copy');
 const copy=project.lines.find(line=>line.id==='choice-copy')!;
 expect(copy.flow).toMatchObject({type:'choice',options:[{id:'choice-copy-choice-1',targetLineId:'cut-002'},{id:'choice-copy-choice-2',targetLineId:'cut-003'}]});
 project=addTypedStoryCut(project,'cut-002','new-dialogue','dialogue');
 project=assignStorySpeaker(project,'new-dialogue','새 화자');
 project=patchStoryLine(project,'new-dialogue',{text:'새 컷의 한국어 글\n이모지 🌱 =1+1'});
 const owner=project.lines.find(line=>line.id==='cut-003')!,music=owner.audio!.music!;
 if(music.action!=='play')throw Error('The complete fixture must supply an editable music cue.');
 const sequence=convertMusicToSequence({...music,sourceStartMs:200,sourceEndMs:2200,branchCondition:condition},'edited-sequence','first-clip',3000);
 project=patchStoryLine(project,owner.id,{audio:{...owner.audio,music:sequence}});
 project=splitSequenceAtTime(project,owner.id,'music','first-clip',800,'second-clip').project;
 project=trimSequenceEdge(project,owner.id,'music','second-clip','end',2000).project;
 project=moveSequenceAtTime(project,owner.id,'music','second-clip',0).project;
 const editedMusic=project.lines.find(line=>line.id===owner.id)!.audio!.music!;
 expect(editedMusic).toMatchObject({action:'sequence',branchCondition:condition,clips:[{id:'second-clip',sourceStartMs:1000,sourceEndMs:2000,fadeOutMs:300},{id:'first-clip',sourceStartMs:200,sourceEndMs:1000,fadeInMs:120}]});
 const effectOwner=project.lines.find(line=>line.id==='cut-002')!,effects=alignEffectToGuide(effectOwner.presentation!.effects!,0,900,'end');
 expect(effects).not.toBeNull();
 project=patchStoryLine(project,effectOwner.id,{presentation:{...effectOwner.presentation,effects:effects!}});
 project=editCombinedRange(project,{sourceLineId:effectOwner.id,target:'effects',cueIndex:0},effectOwner.id,'cut-003').project;
 expect(project.lines.find(line=>line.id===effectOwner.id)?.presentation?.effects?.[0]).toMatchObject({delayMs:300,durationMs:600,endLineId:'cut-003',branchCondition:condition});
 project=addStoryChapter(project,{chapterId:'new-chapter',lineId:'new-chapter-cut',title:'편집 뒤 새 장'});
 expect(copy.stageComposition).toEqual(initial.lines[0].stageComposition);
 expect(project.cover).toEqual(original.project.cover);
 expect(project.creativeMemos).toEqual(original.project.creativeMemos);
 expect(project.source).toEqual(original.project.source);
 await roundtrip(project);
 expect(original).toEqual(before);
 expect(seed).toEqual(initial);
});
