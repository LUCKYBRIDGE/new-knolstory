import {describe,expect,it} from 'vitest';
import {representativeStories,classicStories} from '@knolstory/compatibility';
import {analyzeStoryFlow} from '@knolstory/runtime-core';
import {chapterFlow} from './chapter-flow';
import {hasBranches,storyPaths} from './story-path';
describe('chapter flow',()=>{
 it('lays every built-in work out by reading depth with forks, rejoins and endings',()=>{
  for(const story of representativeStories){
   const flow=chapterFlow(story.project,analyzeStoryFlow(story.project));
   expect(flow.nodes.length).toBe(story.project.chapters.filter(chapter=>story.project.lines.some(line=>line.chapterId===chapter.id)).length);
   expect(flow.nodes.filter(node=>node.start)).toHaveLength(1);
   expect(flow.nodes.some(node=>node.fork)).toBe(true);
   expect(flow.nodes.some(node=>node.ending)).toBe(true);
   const byId=new Map(flow.nodes.map(node=>[node.id,node]));
   for(const edge of flow.edges.filter(edge=>!edge.back&&byId.get(edge.source)!.reachable))expect(byId.get(edge.target)!.depth).toBeGreaterThan(byId.get(edge.source)!.depth);
   const cells=new Set(flow.nodes.map(node=>`${node.depth}:${node.row}`));expect(cells.size).toBe(flow.nodes.length);
   expect(flow.edges.filter(edge=>edge.choice).every(edge=>edge.labels.length>0)).toBe(true);
  }
 });
 it('an original edition is one straight line of chapters',()=>{
  for(const story of classicStories){
   const flow=chapterFlow(story.project,analyzeStoryFlow(story.project));
   expect(flow.rows).toBe(1);expect(flow.columns).toBe(flow.nodes.length);
  }
 });
});
describe('story path',()=>{
 it('follows choices and jumps instead of stored order',()=>{
  const story=representativeStories.find(item=>item.id==='rabbit')!;const paths=storyPaths(story.project);
  const choice=story.project.lines.find(line=>line.flow?.type==='choice')!;
  const next=paths.next(choice.id);expect(next.kind).toBe('choice');
  if(next.kind!=='choice')return;
  for(const option of next.options){expect(option.lineId).toBeTruthy();expect(paths.previous(option.lineId!)).toContain(choice.id);}
  expect(hasBranches(story.project)).toBe(true);
 });
 it('a straight story goes to the next cut and ends at the last one',()=>{
  const story=classicStories[0]!;const paths=storyPaths(story.project);const lines=[...story.project.lines];
  expect(paths.next(lines[0]!.id)).toEqual({kind:'next',lineId:expect.any(String)});
  const ends=lines.filter(line=>paths.next(line.id).kind==='end');expect(ends).toHaveLength(1);
 });
});
