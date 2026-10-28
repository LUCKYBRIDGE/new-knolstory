import {it,expect} from 'vitest';
import {restoreAudioPart,restoreUnchangedAudioPart} from './audio-part-undo';
it('undoing music preserves later ambience and unique sound IDs',()=>{
 const before={music:{action:'play' as const,assetId:'old',volume:.5}};const current={music:{action:'play' as const,assetId:'new'},ambience:{action:'play' as const,assetId:'rain'},sounds:[{id:'one',assetId:'bell'}]};expect(restoreAudioPart(current,before,'music')).toEqual({...current,music:before.music});expect(current.music.assetId).toBe('new');
});
it('restores absence and explicit empty sounds without clearing unrelated cues',()=>{
 expect(restoreAudioPart(undefined,undefined,'music')).toBeUndefined();expect(restoreAudioPart({sounds:[{id:'one',assetId:'bell'}]},undefined,'sounds')).toBeUndefined();expect(restoreAudioPart({music:{action:'stop'},sounds:[{id:'one',assetId:'bell'}]},{sounds:[]},'sounds')).toEqual({music:{action:'stop'},sounds:[]});
});

it('removing a newly authored part keeps later audio parts',()=>{const ambience={action:'play' as const,assetId:'rain'};expect(restoreAudioPart({music:{action:'play',assetId:'new'},ambience},undefined,'music')).toEqual({music:undefined,ambience});});
it('rejects a later same-channel timing change and preserves other channels on normal undo',()=>{
 const before={sounds:[{id:'sound',assetId:'bell',delayMs:500,volume:1}]},after={sounds:[{id:'sound',assetId:'bell',delayMs:500,volume:.9}]},current={...after,sounds:[{...after.sounds[0],delayMs:1100}]};
 expect(()=>restoreUnchangedAudioPart(current,before,after,'sounds')).toThrow('이후 소리가 바뀌어');
 expect(current.sounds[0].delayMs).toBe(1100);
 const reordered={sounds:[{volume:.9,delayMs:500,assetId:'bell',id:'sound'}],music:{action:'stop' as const}};
 expect(restoreUnchangedAudioPart(reordered,before,after,'sounds')).toEqual({...reordered,sounds:before.sounds});
});
it('rejects later sequence reordering and distinguishes absent and empty channels',()=>{
 const clips=[{id:'a',assetId:'one',sourceEndMs:1000},{id:'b',assetId:'two',sourceEndMs:800}],after={music:{action:'sequence' as const,id:'queue',clips}},current={music:{...after.music,clips:[...clips].reverse()}};
 expect(()=>restoreUnchangedAudioPart(current,undefined,after,'music')).toThrow('이후 소리가 바뀌어');
 expect(()=>restoreUnchangedAudioPart({sounds:[]},undefined,undefined,'sounds')).toThrow();
 expect(restoreUnchangedAudioPart(after,undefined,after,'music')).toBeUndefined();
});
