import {it,expect} from 'vitest';
import {presentationPhase} from './presentation-phase';
it('confirmation belongs to scene entrance rather than revision or viewport',()=>{
 const scene={sceneId:'p/c',presentationEntry:'1',mode:'play' as const};
 expect(presentationPhase(scene)).toBe(presentationPhase({...scene,revision:2,width:720,height:1600}));
 expect(presentationPhase(scene)).not.toBe(presentationPhase({...scene,presentationEntry:'2'}));
 expect(presentationPhase(scene)).not.toBe(presentationPhase({...scene,mode:'edit'}));
});
