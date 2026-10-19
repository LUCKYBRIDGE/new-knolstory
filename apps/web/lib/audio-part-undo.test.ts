import {it,expect} from 'vitest';
import {restoreAudioPart} from './audio-part-undo';
it('undoing music preserves later ambience and unique sound IDs',()=>{
 const before={music:{action:'play' as const,assetId:'old',volume:.5}};const current={music:{action:'play' as const,assetId:'new'},ambience:{action:'play' as const,assetId:'rain'},sounds:[{id:'one',assetId:'bell'}]};expect(restoreAudioPart(current,before,'music')).toEqual({...current,music:before.music});expect(current.music.assetId).toBe('new');
});
it('restores absence and explicit empty sounds without clearing unrelated cues',()=>{
 expect(restoreAudioPart(undefined,undefined,'music')).toBeUndefined();expect(restoreAudioPart({sounds:[{id:'one',assetId:'bell'}]},undefined,'sounds')).toBeUndefined();expect(restoreAudioPart({music:{action:'stop'},sounds:[{id:'one',assetId:'bell'}]},{sounds:[]},'sounds')).toEqual({music:{action:'stop'},sounds:[]});
});

it('removing a newly authored part keeps later audio parts',()=>{const ambience={action:'play' as const,assetId:'rain'};expect(restoreAudioPart({music:{action:'play',assetId:'new'},ambience},undefined,'music')).toEqual({music:undefined,ambience});});
