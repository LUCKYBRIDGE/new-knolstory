import {it,expect} from 'vitest';
import {isRuntimeAudioPath,isRuntimeAudio,isRuntimeEvent} from '../src';
it('accepts reviewed scene-audio paths in commands and telemetry; rejects arbitrary paths',()=>{
 const rect={x:0,y:0,width:1280,height:720};
 const event={protocol:1,type:'sceneRendered',sceneId:'a',revision:1,renderMs:2,rendererRect:rect,textboxRect:rect,audioState:{unlocked:true,musicPath:'assets/audio/pixabay/501446.mp3',ambiencePath:'assets/audio/pixabay/22484.mp3',musicPosition:.2,musicStartCount:1,ambienceStartCount:1,soundPlayCount:1,soundPaths:[]}};
 expect(isRuntimeEvent(event)).toBe(true);expect(isRuntimeAudioPath('assets/audio/pixabay/199584.mp3')).toBe(true);
 for(const audioPath of ['assets/audio/pixabay/../../evil.mp3','assets/audio/other/file.mp3','assets/audio/'+('a'.repeat(600))+'.mp3']){
  expect(isRuntimeAudioPath(audioPath)).toBe(false);
  expect(isRuntimeAudio({version:1,music:{action:'play',audioPath,volume:.5,loop:true,fadeInMs:0,fadeOutMs:0},sounds:[]})).toBe(false);
  expect(isRuntimeEvent({...event,audioState:{...event.audioState,musicPath:audioPath}})).toBe(false);
  expect(isRuntimeEvent({...event,audioState:{...event.audioState,ambiencePath:audioPath}})).toBe(false);
  expect(isRuntimeEvent({...event,audioState:{...event.audioState,soundPaths:[audioPath]}})).toBe(false);
 }
});
