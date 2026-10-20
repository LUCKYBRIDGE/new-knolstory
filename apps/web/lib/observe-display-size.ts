import {isReaderDisplaySize,type ReaderDisplayViewport} from './reader-display-viewport';
type Size=Pick<ReaderDisplayViewport,'width'|'height'>;
type Observer={observe:(node:Element)=>void;disconnect:()=>void};
type Factory=(notify:(size:Size)=>void)=>Observer;
/** Measure an attached display immediately and ignore collapsed or stale observations. */
export function observeDisplaySize(node:Element,onSize:(size:Size)=>void,create:Factory=notify=>new ResizeObserver(entries=>{const size=entries[0]?.contentRect;if(size)notify(size);})){
 let active=true,previous:Size|undefined;
 const update=(size:Size)=>{
  if(!active||!isReaderDisplaySize(size)||previous?.width===size.width&&previous?.height===size.height)return;
  previous={width:size.width,height:size.height};onSize(previous);
 };
 const observer=create(update);
 update(node.getBoundingClientRect());observer.observe(node);
 return ()=>{active=false;observer.disconnect();};
}
