import { expect, it } from 'vitest';
import { isRuntimeScene, isRuntimeEvent } from '../src/index';
const scene={contractVersion:1,sceneId:'a',revision:0,width:720,height:1280,actors:[],dialogue:{speaker:'나',text:'밤이 깊었다.'}};
it('accepts additive viewport/audio and rejects malformed renderer inputs',()=>{
 const audio={version:1,music:{action:'maintain'},sounds:[]};
 const layout={viewportVersion:1,textboxRect:{x:0,y:950,width:720,height:330},dialogueStyle:{fontSize:36,speakerFontSize:32,padding:24},background:{imagePath:'assets/legacy-18da4fc/forest.webp',rect:{x:-500,y:0,width:2300,height:1280},focal:{x:.25,y:.5}},presentationEntry:'entry-1',audio};
 expect(isRuntimeScene({...scene,...layout})).toBe(true);
 for(const patch of [{viewportVersion:2},{textboxRect:{}},{dialogueStyle:{fontSize:10,speakerFontSize:32,padding:24}},{presentationEntry:''},{audio:{...audio,version:2}},{background:{...layout.background,focal:{x:NaN,y:1}}},{background:{...layout.background,rect:{x:0,y:0,width:-1,height:100}}}])expect(isRuntimeScene({...scene,...layout,...patch})).toBe(false);
});
it('guards optional native audio telemetry without breaking old renderer events',()=>{
 const rect={x:0,y:0,width:720,height:1280};
 const event={protocol:1,type:'sceneRendered',sceneId:'a',revision:0,renderMs:3,rendererRect:rect,textboxRect:rect};
 expect(isRuntimeEvent(event)).toBe(true);
 const audioState={musicPath:'assets/audio/forest.wav',musicPosition:2,musicStartCount:1,soundPlayCount:2};
 expect(isRuntimeEvent({...event,audioState})).toBe(true);
 expect(isRuntimeEvent({...event,audioState:{...audioState,musicPath:null,musicPosition:null}})).toBe(true);
 for(const patch of [{musicPath:'../../file.wav'},{musicPosition:-1},{musicStartCount:1.5},{soundPlayCount:-1}])expect(isRuntimeEvent({...event,audioState:{...audioState,...patch}})).toBe(false);
});
it('accepts validated optional ambience cues and telemetry',()=>{
 const ambience={action:'play',audioPath:'assets/audio/rain.ogg',volume:.4,loop:true,fadeInMs:500,fadeOutMs:600};
 const audio={version:1,music:{action:'maintain'},ambience,sounds:[]};
 expect(isRuntimeScene({...scene,audio})).toBe(true);
 for(const patch of [{audioPath:'../rain.ogg'},{volume:2},{action:'unknown'}])expect(isRuntimeScene({...scene,audio:{...audio,ambience:{...ambience,...patch}}})).toBe(false);
 const rect={x:0,y:0,width:720,height:1280};
 const event={protocol:1,type:'sceneRendered',sceneId:'a',revision:0,renderMs:3,rendererRect:rect,textboxRect:rect,audioState:{musicPath:null,musicPosition:null,musicStartCount:0,soundPlayCount:0,ambiencePath:'assets/audio/rain.ogg',ambienceStartCount:1}};
 expect(isRuntimeEvent(event)).toBe(true);
 for(const patch of [{ambiencePath:'../x.ogg'},{ambienceStartCount:-1}])expect(isRuntimeEvent({...event,audioState:{...event.audioState,...patch}})).toBe(false);
});
it('accepts only the bundled story-score audio subdirectory and safe filenames',()=>{
 const music={action:'play',audioPath:'assets/audio/story-score/ambience-forest.ogg',volume:.4,loop:true,fadeInMs:0,fadeOutMs:0};
 const audio={version:1,music,ambience:music,sounds:[]};
 expect(isRuntimeScene({...scene,audio})).toBe(true);
 for(const audioPath of ['assets/audio/story-score/../forest.ogg','assets/audio/other/forest.ogg','assets/audio/story-score/deep/forest.ogg','assets/audio/story-score/.ogg','assets/audio/story-score/forest.exe'])expect(isRuntimeScene({...scene,audio:{...audio,music:{...music,audioPath}}})).toBe(false);
});
