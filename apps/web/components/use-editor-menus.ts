'use client';
import {useEffect,useRef} from 'react';
/** Disclosures keep drafts intact and dismiss without covering unrelated actions indefinitely. */
export function useEditorMenus(manageOpen:boolean,onManage:(open:boolean)=>void,composing:boolean){
 const viewTools=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const pointer=(event:PointerEvent)=>{
   const target=event.target;if(!(target instanceof Element))return;
   const workMenu=document.querySelector<HTMLDetailsElement>('[data-work-menu]');
   if(workMenu?.open&&!target.closest('[data-work-menu]')){workMenu.open=false;onManage(false);}
   if(viewTools.current?.open&&!viewTools.current.contains(target))viewTools.current.open=false;
  };
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||composing||event.isComposing||event.keyCode===229||document.querySelector('dialog[open]'))return;
   const workMenu=document.querySelector<HTMLDetailsElement>('[data-work-menu]');
   if(workMenu?.open){workMenu.open=false;onManage(false);if(viewTools.current?.open)viewTools.current.open=false;workMenu.querySelector<HTMLElement>('summary')?.focus();return;}
   if(viewTools.current?.open){viewTools.current.open=false;viewTools.current.querySelector<HTMLElement>('summary')?.focus();}
  };
  document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',escape);};
 },[manageOpen,onManage,composing]);
 return viewTools;
}
