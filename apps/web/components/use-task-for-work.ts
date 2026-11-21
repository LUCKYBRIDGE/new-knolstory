'use client';
import {useEffect,useState} from 'react';
import {assignmentList,type Assignment} from '../lib/classroom-api';

const PREFIX='knolstory-class-task:';
const BOUND_EVENT='knolstory-task-bound';
/** Records that a device work was started from a class task, and tells open editors at once. */
export function bindTaskWork(accountId:string,taskId:string,workKey:string){
 localStorage.setItem(`${PREFIX}${accountId}:${taskId}`,workKey);
 window.dispatchEvent(new Event(BOUND_EVENT));
}
/** The task this device's work belongs to, if the student started it from a task. */
export function boundTaskId(accountId:string,workKey:string):string|null{
 try{
  for(let i=0;i<localStorage.length;i++){
   const name=localStorage.key(i);
   if(name?.startsWith(`${PREFIX}${accountId}:`)&&localStorage.getItem(name)===workKey)return name.slice(`${PREFIX}${accountId}:`.length);
  }
 }catch{/* No binding without device storage. */}
 return null;
}
/** The class task a student's work was started from (its brief, checklist and edit scope), or null. */
export function useTaskForWork(accountId:string|null,workKey:string|null):Assignment|null{
 const [task,setTask]=useState<Assignment|null>(null);
 const [bound,setBound]=useState(0);
 // The binding is often written just after the editor opens the new copy, so look again when it appears.
 useEffect(()=>{const again=()=>setBound(value=>value+1);window.addEventListener(BOUND_EVENT,again);return()=>window.removeEventListener(BOUND_EVENT,again);},[]);
 useEffect(()=>{
  let live=true;
  const timer=window.setTimeout(async()=>{
   const id=accountId&&workKey?boundTaskId(accountId,workKey):null;
   if(!id){if(live)setTask(null);return;}
   try{const found=(await assignmentList()).find(item=>item.id===id)??null;if(live)setTask(found);}catch{if(live)setTask(null);}
  },0);
  return()=>{live=false;window.clearTimeout(timer);};
 },[accountId,workKey,bound]);
 return task;
}
