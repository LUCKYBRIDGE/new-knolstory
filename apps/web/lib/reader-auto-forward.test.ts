import {describe,expect,it} from 'vitest';
import {canAutoForward,autoForwardDelay} from './reader-auto-forward';
describe('reader auto forward',()=>{
 const ready={enabled:true,visible:true,blocked:false,ready:true,status:'reading',presentationKey:'scene:1'};
 it('requires native presentation readiness, reading state and visible document without menus',()=>{
  expect(canAutoForward(ready)).toBe(true);
  for(const change of [{enabled:false},{visible:false},{blocked:true},{ready:false},{status:'choice'},{status:'ended'},{status:'pending'},{presentationKey:''}])expect(canAutoForward({...ready,...change})).toBe(false);
 });
 it('rejects invalid delay and bounds user seconds to 1–30',()=>{
  expect(autoForwardDelay(3)).toBe(3000);expect(autoForwardDelay(0)).toBe(1000);expect(autoForwardDelay(90)).toBe(30000);expect(autoForwardDelay(NaN)).toBe(3000);
 });
});
