import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import type {RuntimeScene} from '@knolstory/runtime-contract';
import {StoryTextAccessibility} from './story-text-accessibility';
const scene:RuntimeScene={contractVersion:1,sceneId:'cue',revision:1,width:1280,height:720,actors:[],
 dialogue:{speaker:'시점 전환',text:'부인의 시점'},mode:'play',
 presentation:{transition:{type:'perspective-blackout',title:'부인의 시점',mode:'confirm'}}};
function render(value:RuntimeScene){return renderToStaticMarkup(createElement(StoryTextAccessibility,{
 scene:value,sceneReady:true,mode:'play',status:'reading',presentationPending:false,readerBusy:false,onAdvance:()=>{},
}));}
it('does not repeat a presentation-only title as dialogue or expose a second next action',()=>{
 const html=render({...scene,transitionOnly:true});
 expect(html).not.toContain('부인의 시점');expect(html).not.toContain('시점 전환');expect(html).not.toContain('다음으로');
});
it('preserves actual scene text and navigation when the transition carries story dialogue',()=>{
 const html=render({...scene,dialogue:{speaker:'부인',text:'마당에는 두 사람이 서 있었다.'}});
 expect(html).toContain('마당에는 두 사람이 서 있었다.');expect(html).toContain('부인');expect(html).toContain('다음으로');
});
