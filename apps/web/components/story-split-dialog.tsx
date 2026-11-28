'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {StorySplitMode} from '@knolstory/runtime-core';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {FocusSurface,type FocusSkin} from './a2ui/focus-surface';
import {BRANCH_DIALOG_EVENTS,splitDialogSurface} from './a2ui/branch-dialog-surfaces';
import base from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
import styles from './story-split-dialog.module.css';

/** The 갈래 dialogs' preview ways keep the dialog's own type. */
export const branchDialogSkin:FocusSkin={pathChoice:styles.way};
type Props={sourceLabel:string;nextChapterNumber:number;continuationLabel:string|null;error:string;onCancel:()=>void;onSplit:(input:{labels:string[];mode:StorySplitMode})=>void};
type Event={name?:string;context?:{way?:number;value?:unknown}};
/** One step from a plain cut to a fork: choices, where each path goes, and a preview of the new chapters. Drawn from the A2UI catalog (Dialog). */
export function StorySplitDialog(p:Props){
 const ref=useRef<HTMLDialogElement>(null),composing=useRef(false);
 const [labels,setLabels]=useState(['','']);
 const [mode,setMode]=useState<StorySplitMode>(p.continuationLabel?'rejoin':'separate');
 useEffect(()=>{const dialog=ref.current,opener=document.activeElement as HTMLElement|null;dialog?.showModal();dialog?.querySelector<HTMLInputElement>('input')?.focus();return()=>{dialog?.close();if(opener?.isConnected)opener.focus();};},[]);
 const filled=labels.every(label=>label.trim());
 const view=useMemo(()=>splitDialogSurface({labels,mode,nextChapterNumber:p.nextChapterNumber,continuationLabel:p.continuationLabel,error:p.error}),[labels,mode,p.nextChapterNumber,p.continuationLabel,p.error]);
 const split=()=>{if(filled)p.onSplit({labels,mode});};
 const focusWay=(index:number)=>ref.current?.querySelectorAll<HTMLInputElement>('input')[index]?.focus();
 const act=(event:Event)=>{
  if(event.name===BRANCH_DIALOG_EVENTS.close)p.onCancel();
  else if(event.name===BRANCH_DIALOG_EVENTS.confirm)split();
  else if(event.name===BRANCH_DIALOG_EVENTS.label){const at=event.context?.way,value=String(event.context?.value??'');setLabels(current=>current.map((item,index)=>index===at?value:item));}
  else if(event.name===BRANCH_DIALOG_EVENTS.addWay){setLabels(current=>[...current,'']);window.setTimeout(()=>focusWay(2),0);}
  else if(event.name===BRANCH_DIALOG_EVENTS.removeWay){setLabels(current=>current.slice(0,2));window.setTimeout(()=>focusWay(1),0);}
  else if(event.name===BRANCH_DIALOG_EVENTS.mode){const value=event.context?.value;if(value==='rejoin'||value==='separate')setMode(value);}
  else if(event.name===BRANCH_DIALOG_EVENTS.way&&typeof event.context?.way==='number')focusWay(event.context.way);
 };
 return <dialog ref={ref} className={`${base.dialog} ${surface.surface} ${styles.dialog}`} aria-label="여기서 이야기 나누기" onCancel={event=>{event.preventDefault();event.stopPropagation();p.onCancel();}}
  onKeyDown={event=>{trapDialogTab(event,ref.current);
   // Enter in a way's words splits once every way has words (the old form's submit), never mid-composition.
   if(event.key==='Enter'&&!event.nativeEvent.isComposing&&!composing.current&&(event.target as HTMLElement).tagName==='INPUT'){event.preventDefault();split();}}}>
  <FocusSurface surface={view} device="desktop" inline skin={branchDialogSkin} attrs={component=>component.id==='preview'?{'aria-label':'만들어질 갈래 미리보기',role:'group'}:undefined}
   onComposing={on=>{composing.current=on;}} onAction={({action})=>act((action as {event?:Event}).event??{})}/>
 </dialog>;
}
