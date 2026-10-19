import {describe,it,expect} from 'vitest';
import {getRepresentativeStory} from '../src';
import {newShortStory} from '../src/shortstory';
import {assertAuthoringFields} from '../src/authoring-fields';
describe('complete typed authoring fields',()=>{
 it('accepts complete current documents without modifying a scalar, nested structure or ordering',()=>{const project=getRepresentativeStory('heungbu').project,copy=structuredClone(project);assertAuthoringFields('knolstory',project);expect(project).toEqual(copy);assertAuthoringFields('shortstory',newShortStory());});
 it('rejects unknown authored fields that normalization might otherwise silently discard',()=>{const project=getRepresentativeStory('rabbit').project;expect(()=>assertAuthoringFields('knolstory',{...project,newAuthoredValue:'보존해야 할 글'})).toThrow(/newAuthoredValue/);expect(()=>assertAuthoringFields('knolstory',{...project,lines:project.lines.map((line,i)=>i?line:{...line,unknownNote:'새 메모'})})).toThrow(/unknownNote/);});
 it('rejects wrong scalar and discriminated object types including nonfinite numbers',()=>{const project=getRepresentativeStory('rabbit').project;expect(()=>assertAuthoringFields('knolstory',{...project,title:123})).toThrow();expect(()=>assertAuthoringFields('knolstory',{...project,chapters:project.chapters.map(ch=>({...ch,order:NaN}))})).toThrow();expect(()=>assertAuthoringFields('knolstory',{...project,cover:{...project.cover,theme:'unsupported'}})).toThrow();});
});
