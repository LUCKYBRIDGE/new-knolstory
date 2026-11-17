'use client';
import {useEffect,useRef,useState} from 'react';
import type {AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import type {StoryProject} from '@knolstory/story-domain';
import {readOnlineShelfBindings} from '../lib/online-work-bindings';
import {OnlineDocumentError} from '../lib/document-api';

type State='checking'|'none'|'latest'|'stale'|'saving'|'unknown';
const LABEL:Record<State,string>={checking:'온라인 확인 중',none:'온라인에 저장',latest:'온라인 최신',stale:'온라인에 저장',saving:'저장하는 중',unknown:'온라인에 저장'};
const DESCRIBE:Record<State,string>={checking:'온라인 사본을 확인하고 있어요',none:'온라인에 아직 없어요. 눌러서 온라인에 저장해요',latest:'온라인 사본도 최신이에요',stale:'온라인 사본이 예전 상태예요. 눌러서 지금 내용으로 저장해요',saving:'온라인에 저장하고 있어요',unknown:'온라인 상태를 확인하지 못했어요. 눌러서 저장해요'};
/** Online saving from the editor's top bar. Saving stays a button (the device keeps saving by itself);
 * the state compares this work with the last uploaded copy, so people see when the online copy is behind. */
export function EditorOnlineSave({className,workKey,project,accountId,disabled,snapshotOf,save,onNotice}:{className?:string;workKey:string;project:StoryProject;accountId:string;disabled:boolean;
 snapshotOf:(project:StoryProject)=>Promise<AuthoringJsonbSnapshot>;save:()=>Promise<unknown>;onNotice:(message:string)=>void}){
 const [state,setState]=useState<State>('checking');
 const sequence=useRef(0),[recheck,setRecheck]=useState(0);
 useEffect(()=>{
  const run=++sequence.current;
  // Wait for a pause in typing: building the comparison copy costs a little.
  const timer=window.setTimeout(async()=>{
   try{
    const binding=readOnlineShelfBindings(localStorage,accountId,[workKey])[workKey];
    if(binding?.error)throw Error();
    if(!binding?.binding){if(run===sequence.current)setState('none');return;}
    const snapshot=await snapshotOf(project);
    if(run===sequence.current)setState(snapshot.contentSha256===binding.binding.contentSha256?'latest':'stale');
   }catch{if(run===sequence.current)setState('unknown');}
  },1200);
  return()=>window.clearTimeout(timer);
 },[workKey,project,accountId,snapshotOf,recheck]);
 async function upload(){
  setState('saving');
  try{await save();}
  catch(issue){onNotice(issue instanceof OnlineDocumentError||issue instanceof Error?issue.message:'온라인에 저장하지 못했어요. 기기의 원고는 그대로 있어요.');}
  finally{setRecheck(value=>value+1);}
 }
 return <button type="button" className={className} data-online-state={state} aria-label={DESCRIBE[state]} title={DESCRIBE[state]}
  disabled={disabled||state==='checking'||state==='saving'||state==='latest'} onClick={()=>void upload()}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18Z"/>{state==='latest'?<path d="m9.5 13.5 2 2 3.5-4"/>:<path d="M12 15.5v-5m-2.2 2.2L12 10.5l2.2 2.2"/>}</svg>
  <span>{LABEL[state]}</span>
 </button>;
}
