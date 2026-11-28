import {describe,expect,it} from 'vitest';
import {controlNames,validateSurface} from '@knolstory/ui';
import {newBranchDialogSurface,splitDialogSurface} from './branch-dialog-surfaces';

describe('갈래 dialogs from the A2UI catalog',()=>{
 const split=(over:Partial<Parameters<typeof splitDialogSurface>[0]>={})=>splitDialogSurface({labels:['숲으로 간다','강으로 간다'],mode:'rejoin',nextChapterNumber:4,continuationLabel:'3장 · 2컷',error:'',...over});
 it('여기서 이야기 나누기 keeps every catalog rule, with two or three ways and an error',()=>{
  for(const surface of [split(),split({labels:['','','']}),split({mode:'separate',continuationLabel:null,error:'한글 입력을 마친 뒤 다시 눌러 주세요. 아주 긴 오류 문장도 자료로 들어가요.'})])expect(validateSurface(surface)).toEqual([]);
 });
 it('names the ways’ fields, the ending and one primary step; × is the way out',()=>{
  const names=controlNames(split(),'desktop');
  expect(names).toEqual(expect.arrayContaining(['이야기 나누기 닫기','선택지 A 문구','선택지 B 문구','+ 선택지','갈래가 끝나면','나누고 첫 갈래 쓰기']));
  expect(names).not.toContain('취소');
  expect(controlNames(split({labels:['a','b','c']}),'desktop')).toEqual(expect.arrayContaining(['선택지 C 문구','C 빼기']));
 });
 it('previews the chapters it makes and blocks the step until every way has words',()=>{
  const ways=[...split().components.values()].filter(component=>component.component==='PathChoice');
  expect(ways.map(way=>[way.label,way.where])).toEqual([['A. 숲으로 간다','새 장 4장A · 빈 첫 컷 → 다시 만남'],['B. 강으로 간다','새 장 4장B · 빈 첫 컷 → 다시 만남']]);
  expect(split().data).toMatchObject({blocked:false,mode:'rejoin'});
  expect(split({labels:['숲','']}).data).toMatchObject({blocked:true});
  // 각자 끝나요 with a story after the cut: the story that follows becomes way A.
  const separate=[...split({mode:'separate'}).components.values()].filter(component=>component.component==='PathChoice');
  expect(separate[0]!.where).toBe('지금 이야기 → 3장 · 2컷');expect(separate[1]!.where).toBe('새 장 4장B · 빈 첫 컷 → 끝');
  // 다시 만나요 needs a story after the cut.
  const mode=[...split({mode:'separate',continuationLabel:null}).components.values()].find(component=>component.id==='mode')!;
  expect(mode.options).toEqual([{value:'rejoin',label:'다시 만나요',disabled:true},{value:'separate',label:'각자 끝나요'}]);
 });
 it('새 갈래 작성 keeps every catalog rule and says what stays as it is',()=>{
  for(const closes of [false,true])for(const error of ['','한글 입력을 마친 뒤 다시 눌러 주세요.']){
   const surface=newBranchDialogSurface({label:'친구를 찾아가는 새 갈래',sourceLabel:'1장 · 2컷',closesLinearTail:closes,error});
   expect(validateSurface(surface)).toEqual([]);
   expect(controlNames(surface,'desktop')).toEqual(['새 갈래 작성 닫기','새 갈래 만들고 글쓰기']);
   expect([...surface.components.values()].some(component=>component.id==='tail')).toBe(closes);
  }
 });
});
