'use client';
import {useEffect,useMemo,useRef} from 'react';
import {trapDialogTab} from '../lib/dialog-keyboard';
import {FocusSurface} from './a2ui/focus-surface';
import {BRANCH_DIALOG_EVENTS,newBranchDialogSurface} from './a2ui/branch-dialog-surfaces';
import {branchDialogSkin} from './story-split-dialog';
import base from './authoring-import-dialog.module.css';
import surface from './story-dialog-surface.module.css';
import styles from './story-split-dialog.module.css';
type Props={label:string;sourceLabel:string;closesLinearTail:boolean;error:string;onCancel:()=>void;onCreate:()=>void};
/** Optional branch creation is previewed without touching the current manuscript. Drawn from the A2UI catalog (Dialog). */
export function StoryChoiceWritingDialog(p:Props){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=ref.current,opener=document.activeElement as HTMLElement|null;element?.showModal();element?.querySelector<HTMLElement>('[data-close-icon]')?.focus();return()=>{element?.close();if(opener?.isConnected)opener.focus();};},[]);
 const view=useMemo(()=>newBranchDialogSurface({label:p.label,sourceLabel:p.sourceLabel,closesLinearTail:p.closesLinearTail,error:p.error}),[p.label,p.sourceLabel,p.closesLinearTail,p.error]);
 return <dialog ref={ref} className={`${base.dialog} ${surface.surface} ${styles.dialog}`} aria-label="새 갈래 작성" onCancel={event=>{event.preventDefault();event.stopPropagation();p.onCancel();}} onKeyDown={event=>trapDialogTab(event,ref.current)}>
  <FocusSurface surface={view} device="desktop" inline skin={branchDialogSkin} onAction={({action})=>{const name=(action as {event?:{name?:string}}).event?.name;if(name===BRANCH_DIALOG_EVENTS.close)p.onCancel();if(name===BRANCH_DIALOG_EVENTS.confirm)p.onCreate();}}/>
 </dialog>;
}
