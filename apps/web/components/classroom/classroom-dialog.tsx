'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {trapDialogTab} from '../../lib/dialog-keyboard';
import styles from './classroom.module.css';
/** System dialog in the story-menu palette. The parent mounts it only while open. */
export function ClassroomDialog({title,onClose,children,label}:{title:string;onClose:()=>void;children:ReactNode;label?:string}){
 const ref=useRef<HTMLDialogElement>(null),opener=useRef<Element|null>(null);
 useEffect(()=>{
  const dialog=ref.current;opener.current=document.activeElement;
  if(dialog&&!dialog.open)dialog.showModal();
  return()=>{if(opener.current instanceof HTMLElement&&opener.current.isConnected)opener.current.focus();};
 },[]);
 return <dialog ref={ref} className={styles.dialog} aria-label={label??title} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>trapDialogTab(event.nativeEvent,ref.current)}>
  <h2>{title}</h2>{children}
 </dialog>;
}
