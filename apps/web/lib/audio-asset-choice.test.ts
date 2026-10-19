import {it,expect} from 'vitest';
import {audioAssetChoice} from './audio-asset-choice';
it('does not silently repeat unauditioned staged music and does not change existing authored selections',()=>{
 const incoming='audio.cc0.oga-tension.komiku-it-s-time-for-adventure-vol-2-12-tension-0';expect(audioAssetChoice('audio:music:forest',incoming)).toEqual({assetId:incoming,loop:false});expect(audioAssetChoice(incoming,incoming)).toEqual({assetId:incoming});expect(audioAssetChoice(incoming,'audio:music:forest')).toEqual({assetId:'audio:music:forest'});
});
