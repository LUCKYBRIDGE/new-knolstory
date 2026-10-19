import {it,expect} from 'vitest';
import {AUDIO_CATALOG,resolveAudioAsset,searchAudioAssets} from '../src/audio';
it('adds the unique staged library while retaining old IDs and resolving byte-identical aliases',()=>{
 expect(AUDIO_CATALOG).toHaveLength(530);
 expect(resolveAudioAsset('audio.cc0.kenney-rpg.bookclose')).toBe(resolveAudioAsset('audio:sound:cc0-kenney-bookClose'));
 expect(resolveAudioAsset('audio.cc0.kenney-impact.footstep-carpet-002')).toBe(resolveAudioAsset('audio.cc0.kenney-impact.footstep-carpet-001'));
 const newMusic=resolveAudioAsset('audio.cc0.oga-aquaria.tylersong3-normal');expect(newMusic).toMatchObject({kind:'music',delivery:'on-demand',runtimePath:'assets/audio/cc0/oga-aquaria/v1/tylersong3-normal.ogg',usagePolicy:{license:'CC0-1.0'}});
 expect(searchAudioAssets(AUDIO_CATALOG,'music','Aquaria','background')).toContain(newMusic);
 expect(resolveAudioAsset('audio:music:forest')).toMatchObject({runtimePath:'assets/audio/forest.wav'});
});
