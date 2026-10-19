import {describe,expect,it} from 'vitest';
import {estimateDialogueCapacity,LANDSCAPE_DIALOGUE_REFERENCE,PORTRAIT_DIALOGUE_REFERENCE} from './dialogue-capacity';
const reference={bodyWidthPx:100,fontPx:10,lineHeightPx:20,bodyHeightPx:40};
describe('dialogue capacity guidance',()=>{
 it('uses separate approximate references for the approved three and five row formats',()=>{
  expect(estimateDialogueCapacity('가'.repeat(108),LANDSCAPE_DIALOGUE_REFERENCE)).toMatchObject({columnsPerLine:36,lineBudget:3,lineCount:3,overflow:false});
  expect(estimateDialogueCapacity('가'.repeat(109),LANDSCAPE_DIALOGUE_REFERENCE)).toMatchObject({lineCount:4,overflow:true});
  expect(estimateDialogueCapacity('가'.repeat(100),PORTRAIT_DIALOGUE_REFERENCE)).toMatchObject({columnsPerLine:20,lineBudget:5,lineCount:5,overflow:false});
  expect(estimateDialogueCapacity('가'.repeat(101),PORTRAIT_DIALOGUE_REFERENCE)).toMatchObject({lineCount:6,overflow:true});
 });
 it('can fit the landscape reference while needing continuation in portrait',()=>{
  const text='가'.repeat(105);
  expect(estimateDialogueCapacity(text,LANDSCAPE_DIALOGUE_REFERENCE).overflow).toBe(false);
  expect(estimateDialogueCapacity(text,PORTRAIT_DIALOGUE_REFERENCE).overflow).toBe(true);
 });
 it('uses Enter and empty lines in each format budget even with short words',()=>{
  const text='가\n나\n\n다\n마';
  expect(estimateDialogueCapacity(text,LANDSCAPE_DIALOGUE_REFERENCE)).toMatchObject({manualBreaks:4,lineCount:5,overflow:true});
  expect(estimateDialogueCapacity(text,PORTRAIT_DIALOGUE_REFERENCE)).toMatchObject({manualBreaks:4,lineCount:5,overflow:false});
 });
 it('estimates full-width Korean against rows and screen budget',()=>{
  expect(estimateDialogueCapacity('가'.repeat(21),reference)).toMatchObject({characterCount:21,columnsPerLine:10,lineCount:3,lineBudget:2,estimatedPages:2,overflow:true});
 });
 it('uses approximate half-width Latin and spaces without editing text',()=>{
  expect(estimateDialogueCapacity('abc def ghi jkl mno',reference)).toMatchObject({characterCount:19,lineCount:1});
 });
 it('counts an early Enter and empty rows rather than pretending each row is full',()=>{
  expect(estimateDialogueCapacity('가\n나\n\n다\n',reference)).toMatchObject({characterCount:7,manualBreaks:4,lineCount:5,estimatedPages:3});
 });
 it('treats CRLF as a single manual break',()=>{
  expect(estimateDialogueCapacity('가\r\n나',reference)).toMatchObject({manualBreaks:1,lineCount:2});
 });
 it('counts emoji clusters and combined Hangul as one visible character each',()=>{
  expect(estimateDialogueCapacity('👨‍👩‍👧‍👦🇰🇷가',reference)).toMatchObject({characterCount:3,lineCount:1});
 });
 it('has one editable empty row for empty text',()=>{
  expect(estimateDialogueCapacity('',reference)).toMatchObject({characterCount:0,lineCount:1,estimatedPages:1,overflow:false});
 });
 it('wraps uninterrupted words and expands tabs to the next stop',()=>{
  expect(estimateDialogueCapacity('a'.repeat(41),reference).lineCount).toBe(3);
  expect(estimateDialogueCapacity('가\t가',{...reference,bodyWidthPx:20}).lineCount).toBe(2);
 });
 it('does not allocate an extra line when a manual break follows a full row',()=>{
  expect(estimateDialogueCapacity('가'.repeat(10)+'\n나',reference).lineCount).toBe(2);
 });
 it('rejects unusable geometry instead of presenting false capacity',()=>{
  for(const key of Object.keys(reference))for(const invalid of [0,-1,NaN,Infinity]){
   expect(()=>estimateDialogueCapacity('가',{...reference,[key]:invalid})).toThrow(RangeError);
  }
 });
 it('keeps a usable lower bound for tiny valid body geometry',()=>{
  expect(estimateDialogueCapacity('가가',{...reference,bodyWidthPx:1,bodyHeightPx:1})).toMatchObject({columnsPerLine:1,lineBudget:1,lineCount:2,estimatedPages:2});
 });
});
