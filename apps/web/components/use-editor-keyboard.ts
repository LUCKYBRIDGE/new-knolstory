'use client';
import {useEffect,useRef,useState} from 'react';
import {keyboardOccludesEditor} from './editor-context';
export function useEditorKeyboard(scope='[data-editor-inputs], [data-system-menu=editor]'){
 const [occluded,setOccluded]=useState(false);
 const frozen=useRef(false);
 useEffect(()=>{
  const viewport=window.visualViewport;if(!viewport)return;
  let timer=0,frame=0;
  const revealFocused=()=>{
   const field=document.activeElement;
   if(!(field instanceof HTMLElement)||!field.closest(scope))return;
   const modal=field.closest('dialog');
   if(modal?.hasAttribute('data-keyboard-dialog')&&field.closest(scope)!==modal)return;
   const top=viewport.offsetTop,bottom=top+viewport.height;
   for(let parent=field.parentElement;parent&&parent!==document.body&&(!modal||modal.contains(parent));parent=parent.parentElement){
    if(!/(auto|scroll)/.test(getComputedStyle(parent).overflowY)||parent.scrollHeight<=parent.clientHeight)continue;
    const area=parent.getBoundingClientRect(),rect=field.getBoundingClientRect();
    const start=Math.max(top,area.top),end=Math.min(bottom,area.bottom);
    if(end<=start)continue;
    if(rect.bottom>end)parent.scrollTop+=rect.bottom-end+4;
    if(field.getBoundingClientRect().top<start)parent.scrollTop-=start-field.getBoundingClientRect().top+4;
   }
  };
  const sync=()=>{
   const element=document.activeElement;
   const boundary=element instanceof HTMLElement?element.closest(scope):null;
   const dialogOwner=element instanceof HTMLElement?element.closest('[data-keyboard-dialog]'):null;
   const focused=element instanceof HTMLElement&&boundary!==null&&(!dialogOwner||boundary===dialogOwner)&&(element.matches('input, textarea')||element.isContentEditable);
   const next=keyboardOccludesEditor({layoutHeight:window.innerHeight,visualHeight:viewport.height,offsetTop:viewport.offsetTop,focused,scale:viewport.scale});
   const shell=element instanceof HTMLElement?element.closest<HTMLElement>('main[data-keyboard-occluded], [data-keyboard-dialog]'):null;
   if(next){shell?.style.setProperty('--keyboard-visible-height',`${viewport.height}px`);shell?.style.setProperty('--keyboard-visible-top',`${viewport.offsetTop}px`);}
   frozen.current=next;setOccluded(next);
   cancelAnimationFrame(frame);if(next)frame=requestAnimationFrame(()=>{
    revealFocused();
    // React's keyboard layout may commit after the first frame's measurement.
    frame=requestAnimationFrame(revealFocused);
   });
  };
  const deferred=()=>{window.clearTimeout(timer);timer=window.setTimeout(sync,0);};
  viewport.addEventListener('resize',sync);viewport.addEventListener('scroll',sync);
  document.addEventListener('focusin',deferred);document.addEventListener('focusout',deferred);
  return ()=>{window.clearTimeout(timer);cancelAnimationFrame(frame);viewport.removeEventListener('resize',sync);viewport.removeEventListener('scroll',sync);document.removeEventListener('focusin',deferred);document.removeEventListener('focusout',deferred);};
 },[scope]);
 return {occluded,frozen};
}
