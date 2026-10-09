import { describe,it,expect } from 'vitest';
import { referencedAudioIds, portableAudioResources } from './audio-portability';
import { createBlankStoryProject } from '@knolstory/runtime-core';
describe('portable audio attachment selection',()=>{
 it('collects actual chapter and cut references including branch music without duplicates',()=>{
  const p=createBlankStoryProject({id:'p',chapterId:'c',lineId:'l',title:'t'});
  const project={...p,chapters:p.chapters.map(c=>({...c,audio:{music:{action:'play' as const,assetId:'audio:music:a'},ambience:{action:'play' as const,assetId:'audio:music:rain'}}})),lines:p.lines.map(l=>({...l,audio:{music:{action:'play' as const,assetId:'audio:music:a'},sounds:[{id:'s',assetId:'audio:sound:b'}]}}))};
  expect(referencedAudioIds(project)).toEqual(['audio:music:rain','audio:music:a','audio:sound:b']);
 });
 it('rejects malformed or oversized attachment tables before any import',()=>{
  expect(()=>portableAudioResources({audioResources:[{id:'../../x',data:'bad'}]})).toThrow();
  expect(()=>portableAudioResources({audioResources: Array(51).fill({})})).toThrow();
  expect(portableAudioResources({})).toEqual([]);
 });
});

describe('portable resource boundaries',()=>{
 const item={id:`audio:custom:${'a'.repeat(64)}:wav`,name:'종',mime:'audio/wav',kind:'sound',data:'UklGRg=='};
 it('copies valid attachments and rejects duplicates and excess payload',()=>{
  expect(portableAudioResources({audioResources:[item]})[0]).toMatchObject(item);
  expect(portableAudioResources({audioResources:[item]})[0].provenance?.license).toBe('unknown');
  expect(portableAudioResources({audioResources:[item]})[0]).not.toBe(item);
  expect(()=>portableAudioResources(null)).toThrow();
  expect(()=>portableAudioResources({audioResources:[item,item]})).toThrow();
  const many=[0,1,2,3].map(i=>({...item,id:`audio:custom:${String(i).repeat(64)}:wav`,data:'A'.repeat(6000000)}));
  expect(()=>portableAudioResources({audioResources:many})).toThrow('전체 크기');
 });
});
