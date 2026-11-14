import {describe,expect,it} from 'vitest';
import {classicStories,representativeStories} from '@knolstory/compatibility';
import {createStoryDocument,orderedStoryFlowLines,parseStoryDocument} from '@knolstory/story-domain';
import {startPointLabel,startPointOptions,trimToStartPoint} from './story-start-point';
let next=0;const newId=()=>`start-test-${++next}`;
const valid=(project:Parameters<typeof createStoryDocument>[0]['project'])=>parseStoryDocument(createStoryDocument({project,savedAt:'2026-11-14T00:00:00.000Z',appVersion:'test'})).ok;
describe('task start point',()=>{
 it('original editions start at a chapter: earlier chapters stay, the chosen chapter is blank, later ones go',()=>{
  for(const story of classicStories){
   const options=startPointOptions(story.project,'original');expect(options.length).toBe(story.project.chapters.length-1);
   for(const option of options){
    const trimmed=trimToStartPoint(structuredClone(story.project),option.value,newId);
    expect(valid(trimmed)).toBe(true);
    const start=story.project.chapters.find(chapter=>`chapter:${chapter.id}`===option.value)!;
    expect(trimmed.chapters.every(chapter=>chapter.order<=start.order)).toBe(true);
    const last=orderedStoryFlowLines(trimmed).at(-1)!;expect(last.chapterId).toBe(start.id);expect(last.text).toBe('');
   }
  }
 });
 it('adaptations start at a choice point: every path to it stays and each option leads to a blank cut',()=>{
  for(const story of representativeStories){
   const options=startPointOptions(story.project,'knolstory');expect(options.length).toBeGreaterThan(0);
   for(const option of options){
    const trimmed=trimToStartPoint(structuredClone(story.project),option.value,newId);
    expect(valid(trimmed)).toBe(true);
    const choice=trimmed.lines.find(line=>`choice:${line.id}`===option.value)!;
    expect(choice.flow?.type).toBe('choice');
    if(choice.flow?.type!=='choice')continue;
    for(const target of choice.flow.options){const blank=trimmed.lines.find(line=>line.id===target.targetLineId)!;expect(blank.text).toBe('');}
    expect(trimmed.lines.length).toBeLessThan(story.project.lines.length+choice.flow.options.length);
   }
  }
 });
 it('every start point fits the stored format and label length',()=>{
  for(const story of classicStories)for(const option of startPointOptions(story.project,'original')){expect(option.value).toMatch(/^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$/);expect(option.label.length).toBeLessThanOrEqual(120);}
  for(const story of representativeStories)for(const option of startPointOptions(story.project,'knolstory')){expect(option.value).toMatch(/^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$/);expect(option.label.length).toBeLessThanOrEqual(120);}
 });
 it('keeps the whole work without a start point and labels a chosen one',()=>{
  const story=classicStories[0]!;expect(trimToStartPoint(story.project,null,newId)).toBe(story.project);
  const option=startPointOptions(story.project,'original')[0]!;expect(startPointLabel(story.project,option.value)).toBe(option.label);
  expect(()=>trimToStartPoint(story.project,'chapter:missing',newId)).toThrow();
 });
});
