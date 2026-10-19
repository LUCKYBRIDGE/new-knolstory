'use client';
import {useLayoutEffect,useRef,type FocusEvent} from 'react';
type Field=HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
type Snapshot={scope:string;field:Field;label:string|null;start:number|null;end:number|null;fieldScroll:number;panelScroll:number;pageScroll:number};
/** Temporary editing context stays outside StoryDocument and reader playback state. */
export function usePreviewEditorContext(mode:'edit'|'play',scope:string,enabled=true){
 const panel=useRef<HTMLDivElement>(null),saved=useRef<Snapshot|null>(null),previous=useRef(mode);
 function remember(field:EventTarget|null){
  if(mode!=='edit'||!panel.current||!(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement||field instanceof HTMLSelectElement)||!panel.current.contains(field))return;
  const text=field instanceof HTMLSelectElement?null:field;
  saved.current={scope,field,label:field.getAttribute('aria-label'),start:text?.selectionStart??null,end:text?.selectionEnd??null,fieldScroll:field.scrollTop,panelScroll:panel.current.scrollTop,pageScroll:window.scrollY};
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
   const matches=snapshot?.scope===scope;
   const field=matches?(root.contains(snapshot.field)?snapshot.field:[...root.querySelectorAll<Field>('input,textarea,select')].find(node=>node.getAttribute('aria-label')===snapshot.label)):root.querySelector<HTMLTextAreaElement>('[data-writer-current="true"] textarea, #story-line-text');
   if(!field||field.closest('[hidden]'))return;
   field.focus({preventScroll:true});
   if(matches){if(snapshot.start!==null&&snapshot.end!==null&&(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement))field.setSelectionRange(snapshot.start,snapshot.end);field.scrollTop=snapshot.fieldScroll;root.scrollTop=snapshot.panelScroll;window.scrollTo({top:snapshot.pageScroll,behavior:'instant'});}
  });
  return()=>cancelAnimationFrame(frame);
 },[mode,scope,enabled]);
 return {panel,beforePreview,onBlurCapture};
}
