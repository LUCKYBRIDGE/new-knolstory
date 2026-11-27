import {describe,expect,it} from 'vitest';
import {validateSurface} from '@knolstory/ui';
import {doubleBreak} from './focus-surface';
import {cutSpeakerSurface,textBoxSurface,MANUSCRIPT_EVENTS} from './editor-surfaces';

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
