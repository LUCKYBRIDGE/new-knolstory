import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {ASSET_CATALOG} from '@knolstory/asset-registry';
import type {StoryProject} from '@knolstory/story-domain';
import {changeChapterResource,StoryChapterResources} from './story-chapter-resources';
const source=()=>JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
const background=ASSET_CATALOG.find(asset=>asset.type==='background')!;
const character=ASSET_CATALOG.find(asset=>asset.type==='character')!;
describe('chapter resource shortcuts',()=>{
 it.each(['background','character'] as const)('adds a %s once immutably without touching cuts or defaults',type=>{
  const project=source(),before=structuredClone(project),chapter=project.chapters[0],asset=type==='background'?background:character,key=type==='background'?'backgroundAssetIds':'characterAssetIds';
  const next=changeChapterResource(project,chapter.id,type,asset.id,'add');
  expect(project).toEqual(before);expect(next.lines).toBe(project.lines);
  expect(next.chapters[0]).toEqual({...chapter,[key]:[...new Set([...chapter[key],asset.id])]});
  expect(changeChapterResource(next,chapter.id,type,asset.id,'add').chapters[0][key].filter(id=>id===asset.id)).toHaveLength(1);
  expect(next.chapters.slice(1)).toEqual(project.chapters.slice(1));
 });
 it('removes a shortcut while preserving its chapter default and all cut uses',()=>{
  const original=source(),first=original.chapters[0];
  const project={...original,chapters:[{...first,backgroundId:background.id,backgroundAssetIds:[background.id]},...original.chapters.slice(1)],lines:original.lines.map((line,index)=>index===0?{...line,backgroundId:background.id}:line)};
  const before=structuredClone(project),next=changeChapterResource(project,first.id,'background',background.id,'remove');
  expect(project).toEqual(before);expect(next.lines).toBe(project.lines);
  expect(next.chapters[0]).toEqual({...project.chapters[0],backgroundAssetIds:[]});
 });
 it.each([character.id,'missing:old',''])('rejects an invalid background addition %s without changing authored content',id=>{
  const project=source(),before=structuredClone(project);
  expect(()=>changeChapterResource(project,project.chapters[0].id,'background',id,'add')).toThrow('배경');expect(project).toEqual(before);
 });
 it('preserves unavailable old IDs on additions and permits explicit removal',()=>{
  const original=source(),chapter={...original.chapters[0],characterAssetIds:['missing:old']};
  const project={...original,chapters:[chapter,...original.chapters.slice(1)]};
  const next=changeChapterResource(project,chapter.id,'character',character.id,'add');
  expect(next.chapters[0].characterAssetIds).toEqual(['missing:old',character.id]);
  expect(changeChapterResource(next,chapter.id,'character','missing:old','remove').chapters[0].characterAssetIds).toEqual([character.id]);
 });
 it('rejects missing chapters',()=>expect(()=>changeChapterResource(source(),'absent','background',background.id,'add')).toThrow('장을 찾을'));
 it('keeps character tools opt-in and the disclosure closed',()=>{
  const project=source();
  const html=renderToStaticMarkup(createElement(StoryChapterResources,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:false}));
  expect(html).toContain('장 자료 목록');expect(html).toContain('장 자료에 배경 추가');expect(html).not.toContain('장 자료에 인물 추가');expect(html).not.toContain(' open=""');
  expect(html).toContain('컷에 사용한 그림과 장 기본 설정은 그대로');
 });
 it('shows unavailable entries without silently dropping them and disables all editing during composition',()=>{
  const original=source(),project={...original,chapters:[{...original.chapters[0],characterAssetIds:['missing:old']},...original.chapters.slice(1)]};
  const html=renderToStaticMarkup(createElement(StoryChapterResources,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:true,composing:true}));
  expect(html).toContain('이름 확인 필요');expect(html).toContain('장 자료에 인물 추가');expect(html).toContain('<fieldset disabled=');
 });
 it('renders nothing for a missing chapter',()=>expect(renderToStaticMarkup(createElement(StoryChapterResources,{project:source(),chapterId:'absent',onProjectChange:()=>{},charactersEnabled:true}))).toBe(''));
});
