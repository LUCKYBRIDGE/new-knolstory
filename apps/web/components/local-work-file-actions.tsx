'use client';
import {useEffect,useRef,useState} from 'react';
import {createLocalWorkFileSaver,createLocalWorkFileSession,localWorkFileErrorMessage,type LocalFileSession,type LocalWorkFilePicker} from '../lib/local-work-file';
import {downloadArtifact} from '../lib/story-archive';
type Props=Readonly<{fileSession?:LocalFileSession;workKey:string;name:string;extension:'.knolstory'|'.shortstory';serialize:()=>Promise<string>;disabled?:boolean}>;
/** Actual work files and browser recovery storage are separate destinations. */
export function LocalWorkFileActions({fileSession,workKey,name,extension,serialize,disabled=false}:Props){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [messageWork,setMessageWork]=useState(workKey);
 const current=useRef(workKey),saving=useRef(false),lifetime=useRef(0);
 useEffect(()=>{current.current=workKey;const token=lifetime,generation=++token.current;return()=>{if(token.current===generation)token.current++;};},[workKey]);
 const [localSession]=useState(createLocalWorkFileSession),session=fileSession??localSession;
 async function save(saveAs=false){
  if(disabled||saving.current)return;
  const key=workKey,generation=lifetime.current;
  const saver=session.getOrCreate(()=>{
   const browser=window as Window&{showSaveFilePicker?:LocalWorkFilePicker};
   return createLocalWorkFileSaver({pick:browser.showSaveFilePicker?options=>browser.showSaveFilePicker!(options):undefined,download:(text,fileName)=>downloadArtifact(text,fileName,'application/json')});
  });
  saving.current=true;setMessageWork(key);setBusy(true);setError('');setNotice('');
  try{
   const result=await saver.save({workKey:key,name,extension,serialize,saveAs,isCurrent:()=>current.current===key&&lifetime.current===generation});
   if(current.current!==key||lifetime.current!==generation)return;
   setNotice(result.kind==='saved'?`${result.name} 파일에 저장하고 내용을 확인했어요. 저장을 시작한 시점의 원고입니다.`:result.kind==='download-requested'?'작품 파일 다운로드를 요청했어요. 브라우저 다운로드 목록에서 완료와 저장 위치를 확인해 주세요.':'파일 저장을 취소했어요. 원고는 유지됩니다.');
  }catch(issue){if(current.current===key&&lifetime.current===generation)setError(`작품 파일을 저장하지 못했어요. 현재 원고는 유지됩니다. ${localWorkFileErrorMessage(issue)}`);}
  finally{saving.current=false;setBusy(false);}
 }
 return <div data-local-file-actions role="group" aria-label="로컬 작품 파일"><button disabled={disabled||busy} onClick={()=>void save()}>작품 파일 저장</button><button disabled={disabled||busy} onClick={()=>void save(true)}>다른 파일로 저장</button><small>작품은 기기의 작품 파일로 저장해 주세요. 선택한 파일에 직접 저장하며, 지원하지 않는 브라우저에서는 새 파일을 다운로드해요. 브라우저의 복구본과 온라인 업로드는 작품 파일 저장을 대신하지 않아요.</small>{busy&&<p role="status">작품 파일 저장 중이에요.</p>}{notice&&messageWork===workKey&&<p role="status">{notice}</p>}{error&&messageWork===workKey&&<p role="alert">{error}</p>}</div>;
}
