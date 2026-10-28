'use client';
import {useLayoutEffect,useRef,type FocusEvent} from 'react';
type Field=HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
type Snapshot={scope:string;field:Field;label:string|null;start:number|null;end:number|null;direction:"forward"|"backward"|"none";fieldLeft:number;fieldScroll:number;panelScroll:number;pageScroll:number};
function canFocus(field:HTMLElement|null|undefined):field is HTMLElement{
 return !!field&&!field.matches(':disabled')&&!field.closest('[hidden],[inert]')&&field.getClientRects().length>0&&getComputedStyle(field).visibility==='visible';
}
/** Temporary editing context stays outside StoryDocument and reader playback state. */
export function usePreviewEditorContext(mode:'edit'|'play',scope:string,enabled=true){
 const panel=useRef<HTMLDivElement>(null),saved=useRef<Snapshot|null>(null),previous=useRef(mode);
 function remember(field:EventTarget|null){
  if(mode!=='edit'||!panel.current||!(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement||field instanceof HTMLSelectElement)||!panel.current.contains(field))return;
  const text=field instanceof HTMLSelectElement?null:field;
  saved.current={scope,field,label:field.getAttribute('aria-label'),start:text?.selectionStart??null,end:text?.selectionEnd??null,direction:text?.selectionDirection??"none",fieldLeft:field.scrollLeft,fieldScroll:field.scrollTop,panelScroll:panel.current.scrollTop,pageScroll:window.scrollY};
 }
 function beforePreview(){
  remember(document.activeElement);
  if(saved.current?.scope===scope&&panel.current)saved.current={...saved.current,panelScroll:panel.current.scrollTop,pageScroll:window.scrollY};
 }
 function onBlurCapture(event:FocusEvent<HTMLDivElement>){remember(event.target);}
 useLayoutEffect(()=>{
  const from=previous.current;previous.current=mode;
  if(!enabled){saved.current=null;return;}
  if(mode==='play'){panel.current?.querySelectorAll('audio').forEach(audio=>audio.pause());return;}
  if(from!=='play')return;
  const snapshot=saved.current;saved.current=null;
  const frame=requestAnimationFrame(()=>{
   const root=panel.current;if(!root)return;
   const savedField=snapshot?.scope===scope?(root.contains(snapshot.field)?snapshot.field:[...root.querySelectorAll<Field>('input,textarea,select')].find(node=>node.getAttribute('aria-label')===snapshot.label)):undefined;
   const matches=canFocus(savedField);
   const currentRow=matches?null:root.querySelector<HTMLElement>('[data-writer-scroll] [aria-current="step"]');
   const field=matches?savedField:
    currentRow?.querySelector<HTMLTextAreaElement>('textarea[data-cut-id]')??currentRow?.querySelector<HTMLButtonElement>('header button[aria-pressed]')??root.querySelector<HTMLSelectElement>('[data-combined-details] select[aria-label="통합 화면 편집할 항목"]')??root.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea[data-cut-id], [data-writer-current="true"] textarea, #story-line-text');
   if(!canFocus(field))return;
   field.focus({preventScroll:true});
   if(matches&&snapshot){if(snapshot.start!==null&&snapshot.end!==null&&(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement))field.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction);field.scrollLeft=snapshot.fieldLeft;field.scrollTop=snapshot.fieldScroll;root.scrollTop=snapshot.panelScroll;window.scrollTo({top:snapshot.pageScroll,behavior:'instant'});}else{
    // A later read cut can be in a different chapter. Its mounted list keeps
    // the previous chapter's scroll offset; focus with preventScroll alone
    // would leave the current manuscript far outside the visible list.
    const list=currentRow?.closest<HTMLElement>('[data-writer-scroll]');
    if(list&&currentRow){
     const item=(currentRow.querySelector('header')??currentRow).getBoundingClientRect(),bounds=list.getBoundingClientRect(),input=field.getBoundingClientRect();
     const visibleInput=Math.min(input.bottom,bounds.bottom)-Math.max(input.top,bounds.top);
     if(item.top<bounds.top||item.bottom>bounds.bottom||visibleInput<Math.min(44,input.height))list.scrollTop+=item.top-bounds.top-2;
    }
   }
  });
  return()=>cancelAnimationFrame(frame);
 },[mode,scope,enabled]);
 return {panel,beforePreview,onBlurCapture};
}
