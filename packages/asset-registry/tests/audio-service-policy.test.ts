import {describe,expect,it,vi} from 'vitest';
import {resolveApprovedAudioUsagePolicy} from '../src/audio-service-policy';
const unrestricted={id:'audio:music:test',src:'/assets/audio/test.wav',sha256:'a'.repeat(64),license:'CC0-1.0',commercialUse:'permitted',redistribution:'permitted',usage:'unrestricted',editorProvision:'permitted',standaloneDownload:'permitted',preview:'asset',exportMode:'reference',sourceUrl:'project-authored',evidence:['docs/evidence.json']};
const conditional={...unrestricted,license:'Pixabay Content License',redistribution:'restricted',usage:'scene-integrated',editorProvision:'scene-integrated',standaloneDownload:'prohibited',preview:'scene',sourceUrl:'https://pixabay.com/sound-effects/example-123/'};
describe('explicit service audio permissions',()=>{
 it('preserves unrestricted CC0 and conditional scene permissions separately',()=>{
  expect(resolveApprovedAudioUsagePolicy(unrestricted)).toMatchObject({usage:'unrestricted',redistribution:'permitted',standaloneDownload:'permitted',preview:'asset'});
  expect(resolveApprovedAudioUsagePolicy(conditional)).toMatchObject({usage:'scene-integrated',redistribution:'restricted',editorProvision:'scene-integrated',standaloneDownload:'prohibited',preview:'scene',exportMode:'reference',sourceUrl:conditional.sourceUrl});
 });
 it('fails closed for incomplete, inconsistent or unsupported approvals',()=>{
  for(const row of [null,{}, {...unrestricted,usage:undefined},{...conditional,preview:'asset'},{...conditional,standaloneDownload:'permitted'},{...conditional,redistribution:'permitted'},{...unrestricted,license:'Pixabay Content License'},{...conditional,license:'unknown'},{...conditional,commercialUse:'unknown'},{...conditional,evidence:[]},{...conditional,sha256:'invalid'},{...conditional,sourceUrl:''},{...conditional,exportMode:'embed'}]) expect(resolveApprovedAudioUsagePolicy(row)).toBeUndefined();
 });
 it('returns immutable facts independent of the approval object',()=>{
  const row={...conditional,evidence:[...conditional.evidence]};
  const policy=resolveApprovedAudioUsagePolicy(row)!;
  row.evidence.push('later');
  expect(policy.evidence).toEqual(['docs/evidence.json']);expect(Object.isFrozen(policy)).toBe(true);expect(Object.isFrozen(policy.evidence)).toBe(true);
 });
 it('only provisions catalogue entries with matching IDs and source paths',async()=>{
  vi.resetModules();
  vi.doMock('../src/audio-service-approvals.json',()=>({default:{version:2,assets:[{...unrestricted,id:'audio:music:forest',src:'/assets/audio/forest.wav'},{...unrestricted,id:'audio:music:night',src:'/assets/audio/wrong.wav'},{...unrestricted,id:'audio:sound:wrong',src:'/assets/audio/chime.wav'},{...unrestricted,id:'audio:sound:step',src:'/assets/audio/step.wav',standaloneDownload:'prohibited'}]}}));
  try {
   const {AUDIO_CATALOG}=await import('../src/audio');
   expect(AUDIO_CATALOG.map(asset=>asset.id)).toEqual(['audio:music:forest']);
  } finally {vi.doUnmock('../src/audio-service-approvals.json');vi.resetModules();}
 });
 it('keeps actual excluded historical IDs as immutable explanations',async()=>{
  const item={id:'audio:sound:retired',name:'이전 소리',source:'provider',reason:'no approval'};
  vi.resetModules();vi.doMock('../src/audio-service-exclusions.json',()=>({default:[item]}));
  try {
   const {EXCLUDED_AUDIO_ASSETS,resolveExcludedAudioAsset}=await import('../src/audio-service-policy');
   expect(resolveExcludedAudioAsset(item.id)).toEqual(item);expect(resolveExcludedAudioAsset('missing')).toBeUndefined();
   expect(Object.isFrozen(EXCLUDED_AUDIO_ASSETS)).toBe(true);expect(Object.isFrozen(EXCLUDED_AUDIO_ASSETS[0])).toBe(true);
  } finally {vi.doUnmock('../src/audio-service-exclusions.json');vi.resetModules();}
 });
});
