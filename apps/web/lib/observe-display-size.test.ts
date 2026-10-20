import {it,expect,vi} from 'vitest';
import {observeDisplaySize} from './observe-display-size';
it('measures newly attached reading geometry immediately instead of retaining an editing size',()=>{
 const changed=vi.fn(),observe=vi.fn(),disconnect=vi.fn();let update!:(size:{width:number;height:number})=>void;
 const node={getBoundingClientRect:()=>({width:704.5,height:645.5})} as Element;
 const stop=observeDisplaySize(node,changed,notify=>{update=notify;return {observe,disconnect};});
 expect(changed).toHaveBeenLastCalledWith({width:704.5,height:645.5});expect(observe).toHaveBeenCalledWith(node);
 update({width:704.5,height:645.5});update({width:0,height:0});update({width:NaN,height:20});
 expect(changed).toHaveBeenCalledTimes(1);
 update({width:390,height:844});expect(changed).toHaveBeenLastCalledWith({width:390,height:844});
 stop();update({width:1280,height:720});expect(changed).toHaveBeenCalledTimes(2);expect(disconnect).toHaveBeenCalledOnce();
});

it('a replacement container has its own dimensions and the detached observer cannot overwrite them',()=>{
 const changed=vi.fn();let oldUpdate!:(size:{width:number;height:number})=>void;
 const oldNode={getBoundingClientRect:()=>({width:338,height:216})} as Element;
 const detach=observeDisplaySize(oldNode,changed,notify=>{oldUpdate=notify;return {observe:()=>{},disconnect:()=>{}};});
 detach();
 const newNode={getBoundingClientRect:()=>({width:704,height:645})} as Element;
 const stop=observeDisplaySize(newNode,changed,()=>({observe:()=>{},disconnect:()=>{}}));
 oldUpdate({width:338,height:216});
 expect(changed).toHaveBeenLastCalledWith({width:704,height:645});
 expect(changed).toHaveBeenCalledTimes(2);stop();
});
