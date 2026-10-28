import {describe,expect,it} from 'vitest';
import {appendTextVariant,updateTextVariant,moveTextVariant,deleteTextVariant,createTextVariantUndo,undoTextVariants} from './text-variant-edit';
const condition={mode:'all' as const,terms:[{scoreId:'trust',operator:'gte' as const,value:1}]};
const first={id:'one',text:'달라진 글',condition};
describe('conditional text editing',()=>{
 it('adds independent variants without altering base text or existing conditions',()=>{
  const original=[first],next=appendTextVariant(original,'two','기본 글','trust');
  expect(next).toHaveLength(2);expect(next[1]).toEqual({id:'two',text:'기본 글',condition});
  next[1].condition.terms[0].value=5;expect(first.condition.terms[0].value).toBe(1);expect(original).toHaveLength(1);
 });
 it('updates exact text including blank text, and validates required conditions',()=>{
  expect(updateTextVariant([first],'one',{text:''})[0].text).toBe('');
  expect(()=>updateTextVariant([first],'missing',{text:'x'})).toThrow();
  expect(()=>updateTextVariant([first],'one',{condition:undefined})).toThrow();
  expect(()=>updateTextVariant([first],'one',{condition:{mode:'all',terms:[]}})).toThrow();
  expect(()=>updateTextVariant([first],'one',{text:'x'.repeat(20001)})).toThrow();
 });
 it('guards capacity, ids and score selection',()=>{
  expect(()=>appendTextVariant([first],'one','','trust')).toThrow();
  expect(()=>appendTextVariant(undefined,'','','trust')).toThrow();
  expect(()=>appendTextVariant(undefined,'new','','')).toThrow();
  const full=Array.from({length:16},(_,i)=>({...first,id:String(i)}));expect(()=>appendTextVariant(full,'new','','trust')).toThrow();
 });
 it('moves priority immutably and deletion removes only selected variant',()=>{
  const list=appendTextVariant([first],'two','','trust');
  expect(moveTextVariant(list,'two',-1).map(v=>v.id)).toEqual(['two','one']);expect(list[0]).toBe(first);
  expect(()=>moveTextVariant(list,'one',-1)).toThrow();expect(()=>moveTextVariant(list,'two',1)).toThrow();
  expect(deleteTextVariant(list,'two')).toEqual([first]);expect(deleteTextVariant([first],'one')).toBeUndefined();expect(()=>deleteTextVariant(list,'bad')).toThrow();
 });
 it('undo guards work, cut and newer same-field changes and clones snapshots',()=>{
  const next=updateTextVariant([first],'one',{text:'수정'}),undo=createTextVariantUndo('work','cut',[first],next);
  expect(undoTextVariants('work','cut',next,undo)).toEqual([first]);
  next[0].text='나중 수정';expect(()=>undoTextVariants('work','cut',next,undo)).toThrow();
  expect(()=>undoTextVariants('other','cut',undo.after,undo)).toThrow();expect(()=>undoTextVariants('work','other',undo.after,undo)).toThrow();
  const added=appendTextVariant(undefined,'new','','trust');expect(undoTextVariants('work','cut',added,createTextVariantUndo('work','cut',undefined,added))).toBeUndefined();
 });
});
