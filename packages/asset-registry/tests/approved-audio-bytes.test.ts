import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import approvals from '../src/audio-service-approvals.json';
import {AUDIO_CATALOG} from '../src';
// Requires the separately restored approved originals; metadata policy is tested independently.
it('all approved original audio bytes match their reviewed hashes',()=>{
 for(const asset of AUDIO_CATALOG){
  const approved=approvals.assets.find(item=>item.id===asset.id)!;
  expect(createHash('sha256').update(readFileSync(`apps/web/public${asset.src}`)).digest('hex')).toBe(approved.sha256);
 }
});
