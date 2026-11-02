import {it,expect} from 'vitest';
import {sceneSemanticHash} from './scene-semantics';
const scene={sceneId:'work/cut',revision:1,width:1280,height:720,actors:[],dialogue:{speaker:'해설',text:'기본 글'},choices:[],audio:{version:1,sessionId:'first',music:{action:'stop',fadeOutMs:0},sounds:[]}};
it('ignores only host lifecycle and chrome while preserving story content',()=>{
 expect(sceneSemanticHash({...scene,revision:2,presentationEntry:'99',readerCanGoBack:true,controlTargetSize:88,audio:{...scene.audio,sessionId:'second'}})).toBe(sceneSemanticHash(scene));
 for(const patch of [{dialogue:{speaker:'다른 사람',text:'기본 글'}},{dialogue:{speaker:'해설',text:'다른 글'}},{actors:[{id:'actor',imagePath:'other.webp',rect:{x:1,y:2,width:3,height:4}}]},{background:{imagePath:'other.webp'}},{choices:[{id:'a',text:'선택'}]},{presentation:{transition:{mode:'auto',title:'다른 시점'}}},{effectSteps:{current:0,total:1}},{audio:{...scene.audio,music:{action:'play',audioPath:'changed.ogg'}}},{transitionOnly:true}])expect(sceneSemanticHash({...scene,...patch})).not.toBe(sceneSemanticHash(scene));
});
it('preserves sequence entry identity and sound timing',()=>{
 expect(sceneSemanticHash({...scene,audio:{...scene.audio,music:{action:'sequence',id:'a',entryId:'chapter:a:1',clips:[]}}})).not.toBe(sceneSemanticHash({...scene,audio:{...scene.audio,music:{action:'sequence',id:'a',entryId:'chapter:a:2',clips:[]}}}));
});
