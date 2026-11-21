'use client';
import {useEffect,useState} from 'react';
import {assignmentList,type Assignment} from '../lib/classroom-api';

const PREFIX='knolstory-class-task:';
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
 useEffect(()=>{
  let live=true;
  const timer=window.setTimeout(async()=>{
   const id=accountId&&workKey?boundTaskId(accountId,workKey):null;
   if(!id){if(live)setTask(null);return;}
   try{const found=(await assignmentList()).find(item=>item.id===id)??null;if(live)setTask(found);}catch{if(live)setTask(null);}
  },0);
  return()=>{live=false;window.clearTimeout(timer);};
 },[accountId,workKey]);
 return task;
}
