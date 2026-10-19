import {describe,expect,it} from 'vitest';
import {isRuntimeScene} from '../src/index';
const scene={contractVersion:1,sceneId:'extended',revision:1,width:1280,height:960,actors:[],dialogue:{speaker:'',text:'본문'}};
describe('artwork clipping rectangle',()=>{
 it('accepts legacy scenes and an artwork region inside an extended canvas',()=>{
  expect(isRuntimeScene(scene)).toBe(true);
  expect(isRuntimeScene({...scene,artworkRect:{x:0,y:0,width:1280,height:720}})).toBe(true);
  expect(isRuntimeScene({...scene,artworkRect:{x:20,y:30,width:1000,height:600}})).toBe(true);
  expect(isRuntimeScene({...scene,width:640,height:480,artworkRect:{x:0,y:0,width:640,height:360}})).toBe(true);
 });
 it('rejects malformed, negative, empty, nonfinite and out of canvas artwork bounds',()=>{
  for(const artworkRect of [null,[],{}, {x:-1,y:0,width:1280,height:720},{x:0,y:-1,width:1280,height:720},{x:0,y:0,width:0,height:720},{x:0,y:0,width:1280,height:-1},{x:0,y:0,width:1281,height:720},{x:0,y:0,width:1280,height:961},{x:1,y:0,width:1280,height:720},{x:0,y:300,width:1280,height:720},{x:NaN,y:0,width:1280,height:720},{x:0,y:0,width:Infinity,height:720},{x:0,y:0,width:'1280',height:720}])expect(isRuntimeScene({...scene,artworkRect})).toBe(false);
 });
});
