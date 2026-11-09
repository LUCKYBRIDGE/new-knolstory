import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import type {StoryProject} from '@knolstory/story-domain';
import {WorkspaceManagement} from './workspace-management';
const project=JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
function render(patch:Partial<Parameters<typeof WorkspaceManagement>[0]>={}){
 return renderToStaticMarkup(createElement(WorkspaceManagement,{project,compact:true,manageOpen:false,hydrated:true,loadComplete:true,unifiedSettings:true,onManage:vi.fn(),onExport:vi.fn(),onSave:vi.fn(),onImportFile:vi.fn(),onImportArchive:vi.fn(),onError:vi.fn(),onLibrary:vi.fn(),onPrepare:vi.fn(),localFileActions:createElement('div',{'data-test-primary-file':true},'작품 파일 저장'),recovery:createElement('details',{'data-test-recovery':true},createElement('summary',null,'이전 원고')),...patch}));
}
describe('editor file and recovery menu hierarchy',()=>{
 it('keeps primary file saving and importing outside collapsed alternative tools',()=>{
  const html=render(),advanced=html.indexOf('data-file-exchange');
  expect(advanced).toBeGreaterThan(0);
  expect(html.indexOf('data-test-primary-file')).toBeLessThan(advanced);
  expect(html.indexOf('aria-label="작품 파일 가져오기"')).toBeLessThan(advanced);
  expect(html).toMatch(/<details[^>]*data-file-exchange[^>]*><summary>파일 교환·보관 도구<\/summary>/);
  expect(html.match(/<details[^>]*data-file-exchange[^>]*>/)?.[0]).not.toContain(' open');
 });
 it('retains alternate export, browser retry and table tools inside the secondary group',()=>{
  const html=render(),start=html.indexOf('data-file-exchange'),end=html.indexOf('data-storage-recovery');
  const secondary=html.slice(start,end);
  expect(secondary).toContain('작품 파일 내보내기');
  expect(secondary).toContain('임시 보관 다시 시도');
  expect(secondary).toContain('Excel · Google 시트');
  expect(secondary).toContain('Google 시트용 TSV 내보내기');
 });
 it('keeps previous manuscripts separately discoverable after alternative file tools',()=>{
  const html=render();
  expect(html.indexOf('data-storage-recovery')).toBeGreaterThan(html.indexOf('data-file-exchange'));
  expect(html.slice(html.indexOf('data-storage-recovery'))).toContain('data-test-recovery');
 });
 it('preserves unavailable browser storage protection and provides export without a primary saver',()=>{
  const html=render({hydrated:false,localFileActions:undefined});
  expect(html).toContain('disabled="">임시 보관 다시 시도');
  expect(html.match(/작품 파일 내보내기/g)).toHaveLength(1);
  expect(html.indexOf('작품 파일 내보내기')).toBeLessThan(html.indexOf('data-file-exchange'));
 });
});
