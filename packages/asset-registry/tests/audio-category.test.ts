import {describe,it,expect} from 'vitest';
import {AUDIO_CATALOG,audioAssetCategory,searchAudioAssets} from '../src/audio';
describe('author-visible sound categories',()=>{
 it('separates surrounding sounds from background music without changing stable IDs',()=>{
  expect(AUDIO_CATALOG).toHaveLength(530);
  expect(AUDIO_CATALOG.filter(a=>audioAssetCategory(a)==='background')).toHaveLength(78);
  expect(AUDIO_CATALOG.filter(a=>audioAssetCategory(a)==='ambience')).toHaveLength(28);
  expect(AUDIO_CATALOG.filter(a=>audioAssetCategory(a)==='effect')).toHaveLength(424);
  expect(searchAudioAssets(AUDIO_CATALOG,'music','숲','background').map(a=>a.id)).toEqual(['audio:music:forest','audio:music:cc0-oga-forest']);
  expect(searchAudioAssets(AUDIO_CATALOG,'music','숲','ambience').map(a=>a.id)).toEqual(expect.arrayContaining(['audio:music:ambience-forest']));
 });
 it('keeps user sound files selectable in either continuous sound channel',()=>{
  const custom={...AUDIO_CATALOG[0],metadata:undefined,id:`audio:custom:${'a'.repeat(64)}:wav`,name:'내 소리'};
  expect(searchAudioAssets([custom],'music','','background')).toEqual([custom]);
  expect(searchAudioAssets([custom],'music','','ambience')).toEqual([custom]);
  expect(searchAudioAssets(AUDIO_CATALOG,'sound','','effect')).toHaveLength(424);
 });
});
