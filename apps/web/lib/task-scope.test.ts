import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '@knolstory/compatibility';
import {EDITING_PRESETS,EDIT_SCOPE_PRESETS,editScopeLabel,taskPermissions} from './editing-permissions';
import {picturebookTaskArchive} from './task-continue';

describe('task edit scope',()=>{
 const textOnly=EDIT_SCOPE_PRESETS.find(item=>item.key==='textOnly')!.scope;
 it('follows the class/student setting when the task has no scope',()=>{
  expect(taskPermissions(EDITING_PRESETS.textAndImages,null)).toBe(EDITING_PRESETS.textAndImages);
 });
 it('uses the task scope for tools, but never widens account limits',()=>{
  const base={...EDITING_PRESETS.textOnly,newWorks:false,forcedStoryKey:'rabbit'};
  const all=EDIT_SCOPE_PRESETS.find(item=>item.key==='all')!.scope;
  expect(taskPermissions(base,all)).toEqual({...base,images:true,characters:true,audio:true,direction:true,choices:true});
  expect(taskPermissions(EDITING_PRESETS.all,textOnly)).toEqual({...EDITING_PRESETS.textOnly});
  // Character placement needs picture choosing.
  expect(taskPermissions(EDITING_PRESETS.all,{...all,images:false}).characters).toBe(false);
 });
 it('names presets and lists the tools of a custom scope',()=>{
  expect(editScopeLabel(null)).toBe('학급 설정대로');
  expect(editScopeLabel(textOnly)).toBe('글만');
  expect(editScopeLabel({images:true,characters:false,audio:false,direction:true,choices:false})).toBe('글·그림·연출');
 });
});

describe('stage task start',()=>{
 it('turns a passed picture book into one chapter per page with the page kept as the chapter sketch',()=>{
  const book=getShortStoryOriginal('rabbit')!;
  let n=0;
  const archive=picturebookTaskArchive(book,{images:true,characters:true},()=>`id-${++n}`,'2026-11-21T00:00:00.000Z');
  expect(archive.format).toBe('knolstory');
  if(archive.format!=='knolstory')return;
  const project=archive.document.project;
  expect(project.chapters).toHaveLength(book.pages.length);
  expect(project.chapters.every(chapter=>chapter.picturebookSketch)).toBe(true);
  // A recommended stage puts the reviewed background on the first cut of page 1.
  expect(project.lines[0]!.backgroundId).toBeTruthy();
 });
 it('keeps first cuts empty of pictures when the task allows text only',()=>{
  const book=getShortStoryOriginal('rabbit')!;
  let n=0;
  const archive=picturebookTaskArchive(book,{images:false,characters:false},()=>`id-${++n}`,'2026-11-21T00:00:00.000Z');
  if(archive.format!=='knolstory')throw Error('format');
  expect(archive.document.project.lines.every(line=>!line.backgroundId)).toBe(true);
 });
});
