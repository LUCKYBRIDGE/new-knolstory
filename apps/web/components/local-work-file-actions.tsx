'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {hasUnappliedAuthoringInput,UNAPPLIED_AUTHORING_NOTICE} from '../lib/unapplied-authoring-input';
import {flushSync} from 'react-dom';
import {createLocalWorkFileSaver,createLocalWorkFileSession,localWorkFileErrorMessage,type LocalFileSession,type LocalWorkFilePicker} from '../lib/local-work-file';
import {downloadArtifact} from '../lib/story-archive';
type Props=Readonly<{fileSession?:LocalFileSession;workKey:string;name:string;extension:'.knolstory'|'.shortstory';serialize:()=>Promise<string>;disabled?:boolean;shortcutsEnabled?:boolean;onVerifiedSave?:(text:string)=>void;onSavingChange?:(busy:boolean)=>void;registerSave?:(save:()=>Promise<string>)=>()=>void}>;
/** Actual work files and browser recovery storage are separate destinations. */
export function LocalWorkFileActions({fileSession,workKey,name,extension,serialize,disabled=false,shortcutsEnabled=false,onVerifiedSave,onSavingChange,registerSave}:Props){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [messageWork,setMessageWork]=useState(workKey);
 const current=useRef(workKey),saving=useRef(false),lifetime=useRef(0);
 const group=useRef<HTMLDivElement>(null);
 const latestSerialize=useRef(serialize);
 useLayoutEffect(()=>{latestSerialize.current=serialize;},[serialize]);
 useEffect(()=>{current.current=workKey;const token=lifetime,generation=++token.current;return()=>{if(token.current===generation)token.current++;};},[workKey]);
 const [localSession]=useState(createLocalWorkFileSession),session=fileSession??localSession;
 async function save(saveAs=false){
  if(disabled||saving.current)return 'unavailable';
  if(hasUnappliedAuthoringInput(group.current?.closest('main')??document)){setMessageWork(workKey);setNotice('');setError(UNAPPLIED_AUTHORING_NOTICE);return 'failed';}
  const key=workKey,generation=lifetime.current;
  const saver=session.getOrCreate(()=>{
   const browser=window as Window&{showSaveFilePicker?:LocalWorkFilePicker};
   return createLocalWorkFileSaver({pick:browser.showSaveFilePicker?options=>browser.showSaveFilePicker!(options):undefined,download:(text,fileName)=>downloadArtifact(text,fileName,'application/octet-stream')});
  });
  saving.current=true;onSavingChange?.(true);setMessageWork(key);setBusy(true);setError('');setNotice('');
  try{
   const snapshot=latestSerialize.current;let savedText:string|undefined;
   const result=await saver.save({workKey:key,name,extension,serialize:async()=>{savedText=await snapshot();return savedText;},saveAs,isCurrent:()=>current.current===key&&lifetime.current===generation});
   if(current.current!==key||lifetime.current!==generation)return 'cancelled';
   if(result.kind==='saved'&&savedText!==undefined)onVerifiedSave?.(savedText);
   setNotice(result.kind==='saved'?`${result.name} 파일에 저장하고 내용을 확인했어요. 저장을 시작한 시점의 원고입니다.`:result.kind==='download-requested'?'작품 파일 다운로드를 요청했어요. 브라우저 다운로드 목록에서 완료와 저장 위치를 확인해 주세요.':'파일 저장을 취소했어요. 원고는 유지됩니다.');
     return result.kind;
  }catch(issue){if(current.current===key&&lifetime.current===generation)setError(`작품 파일을 저장하지 못했어요. 현재 원고는 유지됩니다. ${localWorkFileErrorMessage(issue)}`);return 'failed';}
  finally{saving.current=false;onSavingChange?.(false);setBusy(false);}
 }
 const latestSave=useRef(()=>save());
 useLayoutEffect(()=>{latestSave.current=()=>save();});
 useEffect(()=>registerSave?.(()=>latestSave.current()),[registerSave]);
 useEffect(()=>{
  const shortcut=(event:KeyboardEvent)=>{
   if(!shortcutsEnabled||event.defaultPrevented||event.isComposing||event.repeat||event.altKey||!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='s')return;
   // The file menu can be folded; its owning workspace must still be active.
   const workspace=group.current?.closest('main');
   if(!workspace||!workspace.checkVisibility()||workspace.closest('[inert]')||document.querySelector('dialog[open]'))return;
   event.preventDefault();if(disabled||saving.current)return;
   const field=document.activeElement;
   if(field instanceof HTMLElement&&workspace.contains(field)){
    flushSync(()=>field.blur());
    field.focus({preventScroll:true});
    if(field.getAttribute('aria-invalid')==='true')return;
   }
   void save(event.shiftKey);
  };
  document.addEventListener('keydown',shortcut);return()=>document.removeEventListener('keydown',shortcut);
 });
 return <div ref={group} data-local-file-actions role="group" aria-label="로컬 작품 파일"><button aria-keyshortcuts="Control+s Meta+s" disabled={disabled||busy} onClick={()=>void save()}>작품 파일 저장</button><button aria-keyshortcuts="Control+Shift+s Meta+Shift+s" disabled={disabled||busy} onClick={()=>void save(true)}>다른 파일로 저장</button><small>작품 파일을 기기에 저장해 이어 쓰세요.</small><details data-file-save-help><summary>파일 저장 안내</summary><p>파일에 직접 저장하거나 브라우저에서 다운로드해요. 임시 보관한 원고는 이 브라우저에서 이어 쓸 수 있어요.</p><p>저장: Ctrl+S / ⌘S<br/>다른 파일로 저장: Ctrl+Shift+S / ⌘Shift+S</p></details>{busy&&<p role="status">작품 파일 저장 중이에요.</p>}{notice&&messageWork===workKey&&<p role="status">{notice}</p>}{error&&messageWork===workKey&&<p role="alert">{error}</p>}</div>;
}
