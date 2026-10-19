'use client';
import {useEffect,type RefObject} from 'react';
import {floatingPanelPosition,PANEL_VIEWPORT_MARGIN} from '../lib/floating-panel-position';
/** Account and online menus share the same anchored viewport positioning. */
export function useBoundedAccountPanel(menu:RefObject<HTMLDetailsElement|null>){
 useEffect(()=>{
  const details=menu.current,summary=details?.querySelector('summary'),panel=details?.querySelector<HTMLElement>('section');
  if(!details||!summary||!panel)return;
  let frame=0;
  const position=()=>{
   if(!details.open)return;
   const visual=window.visualViewport;
   // Fixed CSS coordinates and getBoundingClientRect both use the layout viewport;
   // visual offsets describe the visible portion after keyboard resize/panning.
   const viewport=visual?{width:visual.width,height:visual.height,left:visual.offsetLeft,top:visual.offsetTop}:{width:window.innerWidth,height:window.innerHeight};
   panel.style.maxWidth=`${Math.max(0,viewport.width-PANEL_VIEWPORT_MARGIN*2)}px`;
   const next=floatingPanelPosition(summary.getBoundingClientRect(),panel.getBoundingClientRect(),viewport);
   panel.style.position='fixed';panel.style.right='auto';panel.style.left=`${next.left}px`;panel.style.top=`${next.top}px`;panel.style.maxHeight=`${next.maxHeight}px`;
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(position);};
  const hasModal=()=>Boolean(document.querySelector('dialog[open]'));
  const close=()=>{details.open=false;};
  const onToggle=()=>{
   if(details.open)document.querySelectorAll<HTMLDetailsElement>('[data-account-menu][open],[data-online-works][open]').forEach(other=>{if(other!==details)other.open=false;});
   schedule();
  };
  const onPointer=(event:PointerEvent)=>{
   if(details.open&&!hasModal()&&event.target instanceof Node&&!details.contains(event.target))close();
  };
  const onFocus=(event:FocusEvent)=>{
   if(details.open&&!hasModal()&&event.target instanceof Node&&!details.contains(event.target))close();
  };
  const onKey=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented||!details.open||hasModal())return;
   // Leave the first Escape to native controls (for example an expanded select).
   if(event.target instanceof Element&&event.target.closest('select'))return;
   event.preventDefault();close();summary.focus();
  };
  document.addEventListener('pointerdown',onPointer);
  document.addEventListener('focusin',onFocus);
  document.addEventListener('keydown',onKey);
  const observer=new ResizeObserver(schedule);observer.observe(panel);observer.observe(summary);
  details.addEventListener('toggle',onToggle);window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('pointerdown',onPointer);document.removeEventListener('focusin',onFocus);document.removeEventListener('keydown',onKey);details.removeEventListener('toggle',onToggle);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);};
 },[menu]);
}
