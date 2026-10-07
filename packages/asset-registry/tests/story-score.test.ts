import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolveAudioAsset} from '../src/audio';
const manifest=JSON.parse(readFileSync('apps/web/public/assets/audio/story-score/manifest.json','utf8'));
describe('existing story score assets',()=>{
 it('resolves every original sound with rights and a shared runtime path',()=>{
  expect(manifest.thirdPartyAudioSamples).toBe(false);expect(manifest.assets).toHaveLength(22);
  for(const entry of manifest.assets){const asset=resolveAudioAsset(`audio:${entry.kind==='ambience'?'music':entry.kind==='sfx'?'sound':entry.kind}:${entry.id}`);expect(asset).toMatchObject({name:entry.name,runtimePath:`assets/audio/story-score/${entry.file}`});expect(['music','sound']).toContain(asset!.kind);expect(entry.rights).toBe('CC0-1.0');expect(readFileSync(`apps/web/public${asset!.src}`).subarray(0,4).toString()).toBe('OggS');}
 });
});
