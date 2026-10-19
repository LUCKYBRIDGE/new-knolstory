import {it,expect} from 'vitest';
import {isRuntimeScene,isRuntimeEvent} from '../src';
it('accepts only the pinned CC0 directory in both playback commands and returned audio state',()=>{
 const path='assets/audio/cc0/kenney-bookFlip1.ogg',rect={x:0,y:0,width:1280,height:720};
 const scene={contractVersion:1,sceneId:'a',revision:0,width:1280,height:720,actors:[],dialogue:{speaker:'나',text:'책을 펼쳤다.'},audio:{version:1,music:{action:'play',audioPath:path,volume:.3,loop:true,fadeInMs:0,fadeOutMs:0},sounds:[]}};
 const event={protocol:1,type:'sceneRendered',sceneId:'a',revision:0,renderMs:2,rendererRect:rect,textboxRect:rect,audioState:{unlocked:true,musicPath:path,musicPosition:.2,musicStartCount:1,soundPlayCount:0,soundPaths:[]}};
 expect(isRuntimeScene(scene)).toBe(true);expect(isRuntimeEvent(event)).toBe(true);
 for(const p of ['assets/audio/cc0/../../bad.ogg','assets/audio/other/a.ogg','https://example.com/a.mp3']){expect(isRuntimeScene({...scene,audio:{...scene.audio,music:{...scene.audio.music,audioPath:p}}})).toBe(false);expect(isRuntimeEvent({...event,audioState:{...event.audioState,musicPath:p}})).toBe(false);}
});
