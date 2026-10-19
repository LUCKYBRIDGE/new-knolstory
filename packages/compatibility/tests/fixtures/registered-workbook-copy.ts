import {readFileSync} from 'node:fs';
import {expect} from 'vitest';
import {importAuthoringExcel,exportAuthoringExcel} from '../../src/authoring-workbook/excel';
import type {StoryAudio} from '../../../story-domain/src';

/** An explicit test copy; never overwrite a historical external-app artifact. */
export async function registeredWorkbookCopy(path:string){
 const original=await importAuthoringExcel(readFileSync(path));
 if(original.format!=='knolstory')throw Error('놀스토리 검사 파일이 필요합니다.');
 const before=structuredClone(original);
 const replacements=new Map(original.audioResources.map(resource=>[resource.id,resource.kind==='music'?'audio:music:forest':'audio:sound:chime']));
 const id=(value:string)=>replacements.get(value)??value;
 const audio=(value:StoryAudio|undefined)=>value===undefined?undefined:{...value,
  ...(value.music?.action==='play'?{music:{...value.music,assetId:id(value.music.assetId)}}:{}),
  ...(value.ambience?.action==='play'?{ambience:{...value.ambience,assetId:id(value.ambience.assetId)}}:{}),
  ...(value.sounds!==undefined?{sounds:value.sounds.map(cue=>({...cue,assetId:id(cue.assetId)}))}:{}),
 };
 const project={...original.document.project,
  chapters:original.document.project.chapters.map(chapter=>chapter.audio?{...chapter,audio:audio(chapter.audio)}:chapter),
  lines:original.document.project.lines.map(line=>line.audio?{...line,audio:audio(line.audio)}:line),
 };
 const archive={...original,document:{...original.document,project},audioResources:[]};
 const buffer=Buffer.from(await exportAuthoringExcel(archive));
 expect(await importAuthoringExcel(buffer)).toEqual(archive);expect(original).toEqual(before);
 return {original,archive,buffer,replacements};
}
