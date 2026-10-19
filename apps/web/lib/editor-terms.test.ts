import {describe,it,expect} from 'vitest';
import {editorTerms,findEditorTerms} from './editor-terms';
describe('editing terminology guide',()=>{
 it('finds canonical names through old aliases without losing category boundaries',()=>{
  expect(findEditorTerms('  환경음  ','전체').map(term=>term.name)).toEqual(['주변 소리']);
  expect(findEditorTerms('화자','원고').map(term=>term.name)).toEqual(['말하는 인물','말하는 인물의 역할']);
  expect(findEditorTerms('환경음','원고')).toEqual([]);
 });
 it('offers examples for all categories and an honest empty result',()=>{
  expect(findEditorTerms('','전체')).toHaveLength(editorTerms.length);
  expect(findEditorTerms('없는_용어_123','전체')).toEqual([]);
  expect(editorTerms.every(term=>term.description&&term.example)).toBe(true);
 });
});
it('explains current file actions and catalog-only sounds using actual names',()=>{
 expect(findEditorTerms('지금 저장','파일·표지').map(term=>term.name)).toContain('임시 보관');
 expect(findEditorTerms('파일로 보관','파일·표지').map(term=>term.name)).toContain('작품 파일 저장');
 expect(findEditorTerms('소리 파일','소리')[0].example).toContain('등록된');expect(findEditorTerms('소리 파일','소리')[0].example).toContain('외부 파일은 업로드할 수 없어요');expect(findEditorTerms('기록 파일로 보관','파일·표지').map(term=>term.name)).toContain('이전 원고 파일로 저장');
 expect(findEditorTerms('이 컷부터 재생','그림·연출')[0].description).toContain('읽고 있던 컷');
});

describe('current product vocabulary',()=>{
 const term=(name:string)=>editorTerms.find(item=>item.name===name)!;
 it('keeps superseded editor names searchable and describes all six actual screens',()=>{
  expect(findEditorTerms('현재 컷 쓰기','원고').map(item=>item.name)).toContain('기본편집');
  expect(findEditorTerms('장 전체 글 고치기','원고').map(item=>item.name)).toContain('글 편집');
  for(const name of ['기본편집','글 편집','배경 편집','인물 편집','음향 편집','연출 편집'])expect(term(name)).toBeDefined();
  expect(term('글 편집').description).toContain('여러 컷');
  expect(term('연출 편집').description).toContain('화면·배경·인물');
 });
 it('distinguishes companion viewing, optional editing, and session settings from manuscript content',()=>{
  expect(term('함께 보기').description).toContain('읽기 전용');
  expect(term('편집 사용').description).toContain('원고를 삭제하지');
  expect(term('편집 설정').description).toContain('작품 파일에는 포함되지');
 });
 it('distinguishes actual local files, independent imports, browser recovery, and online upload',()=>{
  expect(term('작품 파일 저장').description).toContain('.knolstory');
  expect(term('작품 파일 저장').description).toContain('.shortstory');
  expect(term('작품 파일 가져오기').description).toContain('별도 작품');
  expect(term('임시 보관').description).toContain('작품 파일을 만들지는');
  expect(term('온라인 업로드').description).toContain('작품 파일 저장과 별개');
 });
 it('explains precise branch semantics without promising conditional dialogue replacement',()=>{
  expect(term('선택 이력 조건').description).toContain('어느 컷');
  expect(term('점수 조건에 따른 진행').description).toContain('처음 만족한');
  expect(term('그리고').description).toContain('모든 조건');
  expect(term('또는').description).toContain('하나라도');
  expect(term('도착 컷')).toBeDefined();
  expect(new Set(editorTerms.map(item=>item.name)).size).toBe(editorTerms.length);
 });
});

it('uses one name for editable files and separates reader progress, dialogue history and earlier manuscripts',()=>{
 const get=(name:string)=>editorTerms.find(term=>term.name===name)!;
 expect(get('작품 파일 저장')).toBeDefined();
 expect(editorTerms.some(term=>term.name.includes('작업파일'))).toBe(false);
 expect(get('임시 보관').description).toContain('브라우저');
 expect(get('진행 저장').description).toContain('독자');
 expect(get('지난기록').description).toContain('대사');
 expect(get('이전 원고').description).toContain('사본');
 expect(editorTerms.some(term=>term.name==='읽기 기록 / 원고 기록')).toBe(false);
});

it('keeps distinct meanings for reader autosave, temporary authoring retention and speaker role',()=>{
 const term=(name:string)=>editorTerms.find(item=>item.name===name)!;
 expect(term('자동 저장').description).toContain('읽기 화면');
 expect(term('자동 저장').description).toContain('임시 보관');
 expect(term('말하는 인물의 역할').description).toContain('배치 위치와는 다릅니다');
 expect(term('사본으로 열기').description).toContain('덮어쓰지');
});
