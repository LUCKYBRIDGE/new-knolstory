import {expect,it} from 'vitest';
import {representativeStories,resolveProvidedCatalogStory} from '../src';
import {seonnyeoPastTense,seonnyeoPastTensePairs} from '../src/catalog-seonnyeo-tense';

const project=()=>resolveProvidedCatalogStory(representativeStories.find(entry=>entry.id==='seonnyeo')!.project);
it('선녀 narration reads in the past tense: no present-tense narration sentence is left',()=>{
 const left=project().lines.flatMap(line=>line.text.split(/(?<=[.!?…])[ \t]+|\n+/u)).filter(sentence=>seonnyeoPastTensePairs.some(([present])=>present===sentence));
 expect(left).toEqual([]);
});
it('every present sentence the map knows still exists in the provided work, so none is silently unused',()=>{
 const raw=representativeStories.find(entry=>entry.id==='seonnyeo')!.project.lines.flatMap(line=>line.text.split(/(?<=[.!?…])[ \t]+|\n+/u));
 const resolvedBefore=new Set(raw);
 // A sentence may also come from a branch edit; check against the resolved text before the tense step by mapping back.
 const unused=seonnyeoPastTensePairs.filter(([present,pastForm])=>!resolvedBefore.has(present)&&!project().lines.some(line=>line.text.includes(pastForm)));
 expect(unused).toEqual([]);
});
it('changes only whole sentences and keeps dialogue and line breaks',()=>{
 expect(seonnyeoPastTense('선녀가 웃는다. “웃는다.”\n나무꾼이 멈춘다.')).toBe('선녀가 웃었다. “웃는다.”\n나무꾼이 멈췄다.');
 expect(seonnyeoPastTense('선녀가 처음으로 조금 웃는다.')).toBe('선녀가 처음으로 조금 웃었다.');
});
