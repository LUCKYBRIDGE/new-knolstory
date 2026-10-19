import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {StoryChapterSettings,changeChapterDefaultImage,changeChapterNumber,changeChapterBranchLabel,getDisplayedChapterNumber} from './story-chapter-settings';
const source=()=>JSON.parse(readFileSync('tests/fixtures/stories/presentation-polish.json','utf8')) as StoryProject;
describe('chapter settings',()=>{
 it('keeps advanced tools closed even when authored settings already exist',()=>{
  const original=source(); const project={...original,chapters:original.chapters.map((chapter,index)=>index===0?{...chapter,audio:{music:{action:'stop' as const}}}:chapter)};
  const html=renderToStaticMarkup(createElement(StoryChapterSettings,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:false,audioEnabled:false}));
  expect(html).toContain('장 제목'); expect(html).toContain('기본 배경');
  expect(html).not.toContain('기본 왼쪽 인물');expect(html).not.toContain('장 소리 설정');
 });
 it('shows only explicitly enabled character and audio tools',()=>{
  const project=source();
  const html=renderToStaticMarkup(createElement(StoryChapterSettings,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:true,audioEnabled:true}));
  expect(html).toContain('기본 왼쪽 인물');expect(html).toContain('장 소리 설정');expect(html).not.toContain(' open=""');
 });
 it('changes one chapter image immutably and preserves every cut and other chapter fields',()=>{
  const project=source(),before=structuredClone(project),id=project.chapters[0].id;
  const next=changeChapterDefaultImage(project,id,'backgroundId','background:forest');
  expect(project).toEqual(before);expect(next.lines).toBe(project.lines);
  expect(next.chapters[0]).toEqual({...before.chapters[0],backgroundId:'background:forest',backgroundAssetIds:[...new Set([...before.chapters[0].backgroundAssetIds,'background:forest'])]});
  expect(next.chapters.slice(1)).toEqual(before.chapters.slice(1));
 });
 it('clears only the chapter default without removing registered resources',()=>{
  const project=source(),id=project.chapters[0].id;
  const next=changeChapterDefaultImage(project,id,'backgroundId','');
  expect(next.chapters[0]).toEqual({...project.chapters[0],backgroundId:''});
 });
 it('registers character defaults only once and leaves background resources unchanged',()=>{
  const project=source(),id=project.chapters[0].id;
  const next=changeChapterDefaultImage(project,id,'leftAssetId','character:friend');
  const repeated=changeChapterDefaultImage(next,id,'rightAssetId','character:friend');
  expect(repeated.chapters[0].characterAssetIds.filter(id=>id==='character:friend')).toHaveLength(1);
  expect(repeated.chapters[0].backgroundAssetIds).toEqual(project.chapters[0].backgroundAssetIds);
  expect(changeChapterDefaultImage(repeated,id,'leftAssetId','__none').chapters[0].leftAssetId).toBe('');
 });
 it('keeps active metadata editable during composition while blocking picker controls',()=>{
  const project=source();
  const html=renderToStaticMarkup(createElement(StoryChapterSettings,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:false,audioEnabled:false,composing:true}));
  expect(html).toContain('<fieldset disabled=');
  expect(html.match(/<input[^>]*aria-label="[^"]*장 제목"[^>]*disabled/)).toBeNull();
  expect(html).toMatch(/<input[^>]*aria-label="장 번호"[^>]*disabled/);
  expect(html.match(/<textarea[^>]*disabled/)).toBeNull();
 });
 it('offers a closed display identity disclosure without claiming to change story routes',()=>{
  const project=source();
  const html=renderToStaticMarkup(createElement(StoryChapterSettings,{project,chapterId:project.chapters[0].id,onProjectChange:()=>{},charactersEnabled:false,audioEnabled:false}));
  expect(html).toContain('<details><summary>장 번호·갈래 표시</summary>');
  expect(html).toContain('aria-label="장 번호"');expect(html).toContain('aria-label="장 갈래 표시"');
  expect(html).toContain('장 순서나 컷 연결은 바뀌지 않아요');
  expect(html).not.toContain(' open=""');
 });
 it('changes only the displayed number and preserves routes, authored identity and order',()=>{
  const project=source(),before=structuredClone(project),id=project.chapters[0].id;
  const next=changeChapterNumber(project,id,'12');
  expect(project).toEqual(before);expect(next.lines).toBe(project.lines);
  expect(next.chapters[0]).toEqual({...before.chapters[0],chapterNumber:12});
  expect(next.chapters.slice(1)).toEqual(before.chapters.slice(1));
 });
 it('edits a legacy title branch without replacing its displayed number with list order',()=>{
  const original=source();
  const project={...original,chapters:original.chapters.map((chapter,index)=>index===0?{...chapter,title:'3장 · 이전 제목',order:1,chapterNumber:undefined}:chapter)};
  const before=structuredClone(project),chapter=project.chapters[0];
  expect(getDisplayedChapterNumber(chapter)).toBe(3);
  const next=changeChapterBranchLabel(project,chapter.id,'A');
  expect(project).toEqual(before);expect(next.lines).toBe(project.lines);
  expect(next.chapters[0]).toEqual({...chapter,chapterNumber:3,branchLabel:'A'});
  expect(chapterLabel(next.chapters[0])).toBe('3장A · 이전 제목');
  const cleared=changeChapterBranchLabel(next,chapter.id,'');
  expect(chapterLabel(cleared.chapters[0])).toBe('3장 · 이전 제목');
  expect(cleared.chapters[0].title).toBe(chapter.title);
 });
 it('uses explicit chapter numbers before historical title prefixes',()=>{
  const chapter={...source().chapters[0],title:'3장 · 이전 제목',chapterNumber:7};
  expect(getDisplayedChapterNumber(chapter)).toBe(7);
 });
 it.each(['',' ','0','-1','1.5','2e3','9007199254740992'])('rejects invalid number draft %j without coercing or changing the document',value=>{
  const project=source(),before=structuredClone(project);
  expect(()=>changeChapterNumber(project,project.chapters[0].id,value)).toThrow('장 번호');
  expect(project).toEqual(before);
 });
 it('rejects missing chapters without changing the document',()=>{
  const project=source(),before=structuredClone(project);
  expect(()=>changeChapterDefaultImage(project,'absent','backgroundId','')).toThrow('장을 찾을');
  expect(project).toEqual(before);
 });
 it('does not mount controls for an unavailable chapter',()=>{
  expect(renderToStaticMarkup(createElement(StoryChapterSettings,{project:source(),chapterId:'absent',onProjectChange:()=>{},charactersEnabled:true,audioEnabled:true}))).toBe('');
 });
});

it('keeps a historical visible branch on number-only edits without reviving an explicitly cleared branch',()=>{
 const original=source(),chapter={...original.chapters[0],title:'3장B · 이전 제목',order:1,chapterNumber:undefined,branchLabel:undefined};
 const project={...original,chapters:[chapter,...original.chapters.slice(1)]};
 const renumbered=changeChapterNumber(project,chapter.id,'4');
 expect(chapterLabel(renumbered.chapters[0])).toBe('4장B · 이전 제목');
 const cleared=changeChapterBranchLabel(project,chapter.id,'');
 expect(chapterLabel(changeChapterNumber(cleared,chapter.id,'4').chapters[0])).toBe('4장 · 이전 제목');
 expect(project.lines).toBe(renumbered.lines);expect(chapter.title).toBe('3장B · 이전 제목');
});

it('does not reveal a hidden conflicting legacy branch when only the visible number is edited',()=>{
 const original=source(),chapter={...original.chapters[0],title:'3장 · 이전 제목',order:1,chapterNumber:undefined,branchLabel:'A'};
 const project={...original,chapters:[chapter,...original.chapters.slice(1)]};
 expect(chapterLabel(changeChapterNumber(project,chapter.id,'4').chapters[0])).toBe('4장 · 이전 제목');
});
