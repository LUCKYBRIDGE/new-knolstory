import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {EDITING_PRESETS,EDIT_SCOPE_PRESETS,editScopeLabel,taskPermissions} from './editing-permissions';
import type {Assignment} from './classroom-api';
import {picturebookTaskArchive,taskStartArchive,taskStartSource} from './task-continue';

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

 it('continues on another device from the draft shared with the teacher, not a fresh conversion',async()=>{
  expect(taskStartSource(new URL('https://story.test/?classTask=t&from=draft'))).toBe('draft');
  expect(taskStartSource(new URL('https://story.test/?classTask=t&from=elsewhere'))).toBeNull();
  let n=0;
  const written=picturebookTaskArchive(getShortStoryOriginal('rabbit')!,{images:true,characters:true},()=>`id-${++n}`,'2026-11-21T00:00:00.000Z');
  if(written.format!=='knolstory')throw Error('format');
  written.document.project.lines[0]!.text='다른 기기에서 쓴 첫 대사';
  const document=await prepareJsonbSnapshot(written);
  const requested:string[]=[];
  const fetcher=(async(input:RequestInfo|URL)=>{requested.push(String(input));return new Response(JSON.stringify({success:true,data:{document,savedAt:1,comment:'',commentedAt:null}}),{status:200,headers:{'content-type':'application/json'}});}) as typeof fetch;
  const task={id:'4c1f0a52-2d43-4a55-9b3e-6a4e0f1f0c11',format:'knolstory',title:'그림책을 놀스토리로',description:'',storyKey:null,open:true,createdAt:1,after:{id:'p1',title:'나의 그림책',passed:true}} as unknown as Assignment;
  const archive=await taskStartArchive(task,'draft',fetcher);
  expect(requested).toEqual([expect.stringMatching(/\/classroom\/assignments\/4c1f0a52-2d43-4a55-9b3e-6a4e0f1f0c11\/draft$/u)]);
  if(archive?.format!=='knolstory')throw Error('format');
  expect(archive.document.project.lines[0]!.text).toBe('다른 기기에서 쓴 첫 대사');
 });
 it('says plainly when there is no draft to continue from',async()=>{
  const fetcher=(async()=>new Response(JSON.stringify({error:{code:'DRAFT_NOT_FOUND'}}),{status:404,headers:{'content-type':'application/json'}})) as typeof fetch;
  const task={id:'4c1f0a52-2d43-4a55-9b3e-6a4e0f1f0c11',format:'knolstory',title:'t',description:'',storyKey:null,open:true,createdAt:1} as unknown as Assignment;
  await expect(taskStartArchive(task,'draft',fetcher)).rejects.toThrow('중간 저장한 작품을 찾지 못했어요');
 });
});
