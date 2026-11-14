import {describe,expect,it} from 'vitest';
import {classicStories,representativeStories} from '@knolstory/compatibility';
import {createStoryDocument,orderedStoryFlowLines,parseStoryDocument} from '@knolstory/story-domain';
import {branchScopeOptions,startPointLabel,startPointOptions,trimToStartPoint} from './story-start-point';
let next=0;const newId=()=>`start-test-${++next}`;
const valid=(project:Parameters<typeof createStoryDocument>[0]['project'])=>parseStoryDocument(createStoryDocument({project,savedAt:'2026-11-14T00:00:00.000Z',appVersion:'test'})).ok;
describe('task start point',()=>{
 it('original editions start at a chapter: earlier chapters stay, the chosen chapter is blank, later ones go',()=>{
  for(const story of classicStories){
   const options=startPointOptions(story.project,'original');expect(options.length).toBe(story.project.chapters.length-1);
   for(const option of options){
    const {project:trimmed,startLineId}=trimToStartPoint(structuredClone(story.project),option.value,newId);expect(trimmed.lines.find(line=>line.id===startLineId)?.text).toBe('');
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
    const {project:trimmed,startLineId}=trimToStartPoint(structuredClone(story.project),option.value,newId);expect(trimmed.lines.find(line=>line.id===startLineId)?.text).toBe('');
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
  const story=classicStories[0]!;expect(trimToStartPoint(story.project,null,newId)).toEqual({project:story.project,startLineId:null});
  const option=startPointOptions(story.project,'original')[0]!;expect(startPointLabel(story.project,option.value)).toBe(option.label);
  expect(()=>trimToStartPoint(story.project,'chapter:missing',newId)).toThrow();
 });

 it('one path: the chosen option leads to a blank cut, the other options keep their whole original story',()=>{
  for(const story of representativeStories)for(const point of startPointOptions(story.project,'knolstory').slice(0,4)){
   const scopes=branchScopeOptions(story.project,point.value);
   expect(scopes[0]!.value).toBe(point.value);
   for(const scope of scopes.filter(item=>item.value.includes(':option:'))){
    const {project:trimmed,startLineId}=trimToStartPoint(structuredClone(story.project),scope.value,newId);
    expect(valid(trimmed)).toBe(true);
    const optionId=scope.value.slice(scope.value.indexOf(':option:')+8),lineId=point.value.slice(7);
    const choice=trimmed.lines.find(line=>line.id===lineId)!;if(choice.flow?.type!=='choice')throw Error('choice');
    const original=story.project.lines.find(line=>line.id===lineId)!;if(original.flow?.type!=='choice')throw Error('choice');
    for(const option of choice.flow.options){
     const before=original.flow.options.find(item=>item.id===option.id)!;
     if(option.id===optionId)expect(option.targetLineId).toBe(startLineId);
     else{expect(option.targetLineId).toBe(before.targetLineId);if(before.targetLineId)expect(trimmed.lines.find(line=>line.id===before.targetLineId)?.text).toBe(story.project.lines.find(line=>line.id===before.targetLineId)?.text);}
    }
    // The new chapter sits right after the choice's chapter.
    const sorted=[...trimmed.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id);
    expect(sorted.indexOf(trimmed.lines.find(line=>line.id===startLineId)!.chapterId)).toBe(sorted.indexOf(choice.chapterId)+1);
    expect(startPointLabel(story.project,scope.value)).toMatch(/[A-D] 갈래만$/);
    expect(scope.value).toMatch(/^(chapter|choice):[A-Za-z0-9_.:-]{1,200}$/);
   }
  }
 });
 it('new choice: the original options stay and one more option leads to a blank cut',()=>{
  const story=representativeStories[0]!,point=startPointOptions(story.project,'knolstory')[0]!;
  const scope=branchScopeOptions(story.project,point.value).find(item=>item.value.endsWith(':new'));
  if(!scope)return;
  const {project:trimmed,startLineId}=trimToStartPoint(structuredClone(story.project),scope.value,newId);
  expect(valid(trimmed)).toBe(true);
  const original=story.project.lines.find(line=>`choice:${line.id}`===point.value)!,choice=trimmed.lines.find(line=>line.id===original.id)!;
  if(original.flow?.type!=='choice'||choice.flow?.type!=='choice')throw Error('choice');
  expect(choice.flow.options.slice(0,-1)).toEqual(original.flow.options);
  expect(choice.flow.options.at(-1)).toMatchObject({label:'새 선택지',targetLineId:startLineId});
  expect(startPointLabel(story.project,scope.value)).toMatch(/새 선택지 더하기$/);
 });
});
