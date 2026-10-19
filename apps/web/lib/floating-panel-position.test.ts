import {describe,it,expect} from 'vitest';
import {floatingPanelPosition} from './floating-panel-position';
describe('viewport bounded anchored panel',()=>{
 it('keeps the right anchored default when it fits',()=>{expect(floatingPanelPosition({left:200,right:300,top:20,bottom:64},{width:200,height:100},{width:600,height:400})).toEqual({left:100,top:70,maxHeight:368});});
 it('clamps a narrow left anchor and flips above when necessary',()=>{expect(floatingPanelPosition({left:20,right:80,top:200,bottom:244},{width:288,height:180},{width:320,height:390})).toEqual({left:16,top:16,maxHeight:358});});
 it('bounds a tall panel to viewport padding and preserves scrolling height',()=>{expect(floatingPanelPosition({left:100,right:200,top:30,bottom:74},{width:288,height:600},{width:320,height:390})).toEqual({left:16,top:16,maxHeight:358});});
 it('flips above an anchor near the bottom when room exists',()=>{expect(floatingPanelPosition({left:400,right:500,top:300,bottom:344},{width:200,height:100},{width:600,height:400})).toEqual({left:300,top:194,maxHeight:368});});
 it('uses visual viewport offsets and reduced keyboard height in layout coordinates',()=>{expect(floatingPanelPosition({left:50,right:150,top:100,bottom:144},{width:200,height:300},{width:240,height:220,left:40,top:80})).toEqual({left:56,top:96,maxHeight:188});});
 it('fits the visible horizontal bounds after pinch panning',()=>{expect(floatingPanelPosition({left:400,right:500,top:300,bottom:344},{width:200,height:100},{width:240,height:220,left:120,top:200})).toEqual({left:144,top:216,maxHeight:188});});

});
