import {describe,expect,it} from 'vitest';
import {validateSurface} from '@knolstory/ui';
import {doubleBreak} from './focus-surface';
import {branchStripSurface,BRANCH_EVENTS,cutSpeakerSurface,textBoxSurface,MANUSCRIPT_EVENTS} from './editor-surfaces';

// Fragments of a screen: no root of their own.
const fragment=(surface:Parameters<typeof validateSurface>[0])=>validateSurface(surface).filter(issue=>issue.rule!=='root'&&issue.rule!=='orphan');

// 원고 이어 쓰기: Enter twice in a cut's text box starts the next cut at the caret.
describe('doubleBreak',()=>{
 it('splits where the second Enter was pressed and drops the blank line',()=>{
  // "가나\n" + Enter → caret after the new line break.
  expect(doubleBreak('가나\n다라','가나\n\n다라',4)).toEqual({value:'가나다라',position:2});
  expect(doubleBreak('끝 문장.\n','끝 문장.\n\n',7)).toEqual({value:'끝 문장.',position:5});
 });
 it('keeps single line breaks inside a cut',()=>{
  expect(doubleBreak('가나','가나\n',3)).toBeNull();
  expect(doubleBreak('가\n나','가\n\n나',3)).toEqual({value:'가나',position:1});
 });
 it('ignores pastes, deletions and Enter at the very start',()=>{
  expect(doubleBreak('가','가\n\n',3)).toBeNull();
  expect(doubleBreak('가\n\n','가\n',2)).toBeNull();
  expect(doubleBreak('\n','\n\n',2)).toBeNull();
  expect(doubleBreak('가\n','가\n\n',null)).toBeNull();
 });
 it('drops extra blank lines at the seam (Android may commit composition with the first Enter)',()=>{
  expect(doubleBreak('가\n\n나','가\n\n\n나',4)).toEqual({value:'가나',position:1});
 });
});

describe('원고 surfaces',()=>{
 it('only the 원고 text box splits and joins',()=>{
  const plain=textBoxSurface({lineId:'a',label:'1컷 글',value:'',readOnly:false,disabled:false});
  const writeOn=textBoxSurface({lineId:'a',label:'1컷 글',value:'',readOnly:false,disabled:false,writeOn:true});
  expect(plain.components.get('text')).not.toHaveProperty('splitHere');
  expect(writeOn.components.get('text')).toMatchObject({splitHere:{event:{name:MANUSCRIPT_EVENTS.split,context:{lineId:'a'}}},joinPrevious:{event:{name:MANUSCRIPT_EVENTS.join}}});
  expect(fragment(writeOn)).toEqual([]);
 });
 it('draws the speaker choice from catalog parts',()=>{
  const surface=cutSpeakerSurface({lineId:'a',cut:3,value:'narration',options:[{value:'narration',label:'해설'},{value:'name:철수',label:'철수'}],disabled:false});
  expect(fragment(surface)).toEqual([]);
  expect(surface.components.get('speaker')).toMatchObject({component:'Choice',name:'3컷 화자'});
 });
});

describe('원고 갈래 줄',()=>{
 const ways=[
  {optionId:'a',mark:'A. 잔치 손님으로',lineId:'a1',where:'2장 · 용궁 잔치 · 3컷',leadsTo:'→ 4장 · 돌아온 토끼',peek:['토끼: 용궁 잔치라니 가 볼까?','해설: 자라가 웃었어요.']},
  {optionId:'b',mark:'B. 병든 이를 도와 달라고 한다',peek:[]},
 ];
 it('lists every way with a peek, and offers to write an empty one',()=>{
  const surface=branchStripSurface({choiceLineId:'c',ways,note:'아직 비어 있는 갈래가 1개 있어요.',disabled:false});
  expect(fragment(surface)).toEqual([]);
  expect(surface.components.get('way-a')).toMatchObject({component:'PathChoice',label:'A. 잔치 손님으로 →',where:'2장 · 용궁 잔치 · 3컷 · → 4장 · 돌아온 토끼',peek:ways[0]!.peek,select:{event:{name:BRANCH_EVENTS.open,context:{lineId:'a1'}}}});
  expect(surface.components.get('way-b')).toMatchObject({component:'Notice',kind:'empty',text:'B. 병든 이를 도와 달라고 한다 · 아직 비어 있어요'});
  expect(surface.components.get('write-b')).toMatchObject({label:'이 갈래 쓰기',action:{event:{name:BRANCH_EVENTS.write,context:{lineId:'c',optionId:'b'}}}});
 });
 it('at the top of a way: where it came from, the way being written and the way back',()=>{
  const surface=branchStripSurface({choiceLineId:'c',ways,origin:{from:'1장 · 4컷',optionId:'a'},disabled:false});
  expect(fragment(surface)).toEqual([]);
  expect(surface.components.get('fork')).toMatchObject({title:'갈래 · 1장 · 4컷 선택지에서 왔어요',children:['way-origin','way-a','way-b']});
  expect(surface.components.get('way-a')).toMatchObject({label:'A. 잔치 손님으로 · 지금 쓰는 갈래',current:true});
  expect(surface.components.get('way-origin')).toMatchObject({label:'← 선택지 컷으로',select:{event:{name:BRANCH_EVENTS.open,context:{lineId:'c'}}}});
 });
});
