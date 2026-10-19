'use client';
import {useEffect,useRef,useState} from 'react';
import {keyboardOccludesEditor} from './editor-context';
export function useEditorKeyboard(){
 const [occluded,setOccluded]=useState(false);
 const frozen=useRef(false);
 useEffect(()=>{
  const viewport=window.visualViewport;if(!viewport)return;
  let timer=0;
  const sync=()=>{
   const element=document.activeElement;
   const focused=element instanceof HTMLElement&&element.closest('[data-editor-inputs]')!==null&&(element.matches('input, textarea')||element.isContentEditable);
   const next=keyboardOccludesEditor({layoutHeight:window.innerHeight,visualHeight:viewport.height,offsetTop:viewport.offsetTop,focused,scale:viewport.scale});
   frozen.current=next;setOccluded(next);
  };
  const deferred=()=>{window.clearTimeout(timer);timer=window.setTimeout(sync,0);};
  viewport.addEventListener('resize',sync);viewport.addEventListener('scroll',sync);
  document.addEventListener('focusin',deferred);document.addEventListener('focusout',deferred);
  return ()=>{window.clearTimeout(timer);viewport.removeEventListener('resize',sync);viewport.removeEventListener('scroll',sync);document.removeEventListener('focusin',deferred);document.removeEventListener('focusout',deferred);};
 },[]);
 return {occluded,frozen};
}
