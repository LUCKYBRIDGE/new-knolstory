import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createAuthoringArchive,newShortStory,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {representativeStories} from '@knolstory/compatibility';
import {createStoryDocument} from '@knolstory/story-domain';
import {submissionScript} from './submission-script';
describe('reading a handed-in work as a script',()=>{
 it('lists chapters in order with speakers, narration unlabeled',async()=>{
  const raw=JSON.parse(readFileSync(new URL('../../../tests/fixtures/stories/rabbit-classic.json',import.meta.url),'utf8'));
  const parsed=parseStoryDocument(raw,{savedAt:'2026-11-18T00:00:00.000Z',appVersion:'test'});if(!parsed.ok)throw Error('fixture');
  const script=submissionScript(await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:parsed.document})));
  expect(script.title).toBe(raw.title);expect(script.empty).toBe(false);
  expect(script.sections.length).toBe(raw.chapters.length);
  const all=script.sections.flatMap(section=>section.lines);
  expect(all.some(line=>line.speaker==='')).toBe(true);
  expect(all.find(line=>line.text.includes('용왕이 큰 병'))?.speaker).toBe('');
 });
 it('lists picture-book pages and says when nothing is written',async()=>{
  const blank=submissionScript(await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:newShortStory()})));
  expect(blank.empty).toBe(true);
  const book=newShortStory();book.pages[0]!.text='토끼가 달려요.';
  const script=submissionScript(await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:book})));
  expect(script.sections[0]).toEqual({title:'1쪽',lines:[{speaker:'',text:'토끼가 달려요.'}]});
 });
 it('keeps each picture-book page’s picture so the teacher sees it with the words',async()=>{
  const book=newShortStory();book.pages[0]!.backgroundId='shortstory.background.creative-moon-pond-promise-v1';
  const script=submissionScript(await prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:book})));
  expect(script.format).toBe('shortstory');expect(script.empty).toBe(false);
  expect(script.sections[0]).toEqual({title:'1쪽',lines:[],art:{backgroundId:'shortstory.background.creative-moon-pond-promise-v1',leftAssetId:'',rightAssetId:''}});
 });
 it('shows each choice with its ways and where they go, and a way’s chapter says which choice it came from',async()=>{
  // Seen 2026-11-28: a branched work read as a flat list of chapters; the choices and their ways were missing.
  const project=representativeStories.find(story=>story.id==='rabbit')!.project as StoryProject;
  const script=submissionScript(await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project,savedAt:'2026-11-28T00:00:00.000Z',appVersion:'test'})})));
  const choices=script.sections.flatMap(section=>section.lines).filter(line=>line.choices);
  expect(choices.length).toBe(project.lines.filter(line=>line.flow?.type==='choice').length);
  for(const line of choices){
   expect(line.choices!.length).toBeGreaterThan(1);
   line.choices!.forEach((choice,index)=>{expect(choice.mark.startsWith(`${String.fromCharCode(65+index)}. `)).toBe(true);expect(choice.to).toMatch(/^\d+장/);});
  }
  const branched=script.sections.filter(section=>section.from);
  expect(branched.length).toBeGreaterThan(0);
  for(const section of branched)expect(section.from).toMatch(/^\d+장 선택지 [A-Z]/);
  expect(script.sections.every(section=>/^\d+장/.test(section.title))).toBe(true);
 });
 it('a way with no cut yet says it is empty',async()=>{
  const project=representativeStories.find(story=>story.id==='rabbit')!.project as StoryProject;
  const choice=project.lines.find(line=>line.flow?.type==='choice')!;
  const flow=choice.flow;if(flow?.type!=='choice')throw Error('choice');
  const broken={...project,lines:project.lines.map(line=>line.id===choice.id?{...line,flow:{...flow,options:flow.options.map((option,index)=>index===1?{...option,targetLineId:''}:option)}}:line)} as StoryProject;
  const snapshot=await prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document:createStoryDocument({project:broken,savedAt:'2026-11-28T00:00:00.000Z',appVersion:'test'})})).catch(()=>null);
  // The archive may refuse an empty way; the reader still has to cope with one in an old file.
  const raw=snapshot??{content:{format:'knolstory',document:{project:broken}}} as never;
  const line=submissionScript(raw).sections.flatMap(section=>section.lines).find(item=>item.choices&&item.text===choice.text)!;
  expect(line.choices![1]!.to).toBe('아직 비어 있어요');
 });
});
