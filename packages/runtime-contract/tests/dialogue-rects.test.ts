import {describe,it,expect} from 'vitest';
import {isRuntimeEvent} from '../src/index';
describe('measured native dialogue geometry reports',()=>{
 const rect={x:20,y:500,width:680,height:180};const base={protocol:1,type:'sceneRendered',sceneId:'measured',revision:2,renderMs:1,rendererRect:{x:0,y:0,width:720,height:1280},textboxRect:rect};
 it('accepts legacy reports and optional measured speaker/body bounds',()=>{
  expect(isRuntimeEvent(base)).toBe(true);expect(isRuntimeEvent({...base,dialogueRects:{speaker:{...rect,y:470,height:30},body:{...rect,y:520,height:140}}})).toBe(true);
 });
 it('rejects incomplete, negative or nonfinite geometry',()=>{
  for(const value of [{speaker:rect},{speaker:rect,body:{...rect,height:0}},{speaker:{...rect,x:NaN},body:rect},null])expect(isRuntimeEvent({...base,dialogueRects:value})).toBe(false);
 });
});
