import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createAuthoringArchive,newShortStory,prepareJsonbSnapshot} from '@knolstory/compatibility';
import {parseStoryDocument} from '@knolstory/story-domain';
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
});
