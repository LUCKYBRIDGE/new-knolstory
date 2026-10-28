"use client";
import {useEffect,useLayoutEffect,useRef,type RefObject,type MouseEvent} from 'react';
import type {RuntimeScene} from '@knolstory/runtime-contract';
import type {PlaybackState} from '@knolstory/runtime-core';
import styles from './story-workspace.module.css';
type Props=Readonly<{scene:RuntimeScene;sceneReady:boolean;hasMoreText?:boolean;mode:'edit'|'play';status:PlaybackState['status'];presentationPending:boolean;readerBusy:boolean;onAdvance:(choiceId?:string)=>void;onBack?:()=>void;canGoBack?:boolean;nativeFrame?:RefObject<HTMLIFrameElement|null>;onNativeBackTab?:()=>void}>;
/** Semantic access to the native scene; never a second visual story renderer. */
export function StoryTextAccessibility({scene,sceneReady,hasMoreText=false,mode,status,presentationPending,readerBusy,onAdvance,onBack,canGoBack=false,nativeFrame,onNativeBackTab}:Props){
 const summary=useRef<HTMLElement>(null),pendingFocus=useRef<{source:HTMLButtonElement;revision:number}|null>(null);
 const backTab=useRef(onNativeBackTab);useLayoutEffect(()=>{backTab.current=onNativeBackTab;});
 useEffect(()=>{
  if(mode!=='play')return;
  const focus=(event:FocusEvent)=>{const pending=pendingFocus.current;if(pending&&event.target!==pending.source&&event.target!==document.body&&event.target!==document.documentElement)pendingFocus.current=null;};
  const pointer=(event:PointerEvent)=>{if(pendingFocus.current&&event.target!==pendingFocus.current.source)pendingFocus.current=null;};
  const blur=()=>{pendingFocus.current=null;};
  document.addEventListener('focusin',focus,true);document.addEventListener('pointerdown',pointer,true);window.addEventListener('blur',blur);
  return()=>{pendingFocus.current=null;document.removeEventListener('focusin',focus,true);document.removeEventListener('pointerdown',pointer,true);window.removeEventListener('blur',blur);};
 },[mode]);
 useEffect(()=>{
  if(mode!=='play'||!nativeFrame?.current)return;
  const frame=nativeFrame.current;let detach=()=>{};
  const attach=()=>{detach();const document=frame.contentDocument;if(!document)return;
   const exit=(event:KeyboardEvent)=>{
    const active=document.activeElement;
    // Pointer/AX audio entry may leave focus on the native document, not canvas.
    const stageFocused=active?.id==='canvas'||active===document.body||active===document.documentElement;
    if(event.key!=='Tab'||!stageFocused)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.shiftKey)backTab.current?.();else summary.current?.focus();
   };
   document.addEventListener('keydown',exit,true);detach=()=>document.removeEventListener('keydown',exit,true);
  };
  attach();frame.addEventListener('load',attach);return()=>{detach();frame.removeEventListener('load',attach);};
 },[mode,nativeFrame]);
 useLayoutEffect(()=>{
  const pending=pendingFocus.current;if(!pending)return;
  if(mode!=='play'){pendingFocus.current=null;return;}
  const active=document.activeElement;
  if(active!==pending.source&&active!==document.body){pendingFocus.current=null;return;}
  if(scene.revision===pending.revision){if(!presentationPending)pendingFocus.current=null;return;}
  if(!sceneReady||presentationPending||readerBusy)return;
  pendingFocus.current=null;
  if(!pending.source.isConnected||pending.source.disabled||active===document.body)summary.current?.focus();
 });
 const navigate=(event:MouseEvent<HTMLButtonElement>,action:()=>void)=>{pendingFocus.current=event.detail===0&&event.currentTarget===document.activeElement?{source:event.currentTarget,revision:scene.revision}:null;action();};
 const manualEffectPending=!!scene.effectSteps&&scene.effectSteps.current<scene.effectSteps.total;
 if(mode==='edit')return null;return <>
          <details className={styles.semantic} open={mode === "play"}>
            <summary ref={summary}>대사·해설 텍스트 보기</summary>
            <p>장면에 표시된 글을 읽거나 복사할 수 있어요.</p>
            {!scene.transitionOnly&&<div aria-live="polite">
              <p>
                <strong>{scene.dialogue.speaker || "해설"}</strong>
              </p>
              <p>{scene.dialogue.text}</p>
            </div>}
            {canGoBack&&onBack&&<button disabled={readerBusy} onClick={event=>navigate(event,onBack)}>이전 읽은 컷</button>}
            {mode === "play" && (!scene.transitionOnly||!!scene.effectSteps) && <button disabled={(status!=="reading"&&!manualEffectPending&&!hasMoreText)||presentationPending||readerBusy||!sceneReady} onClick={event=>navigate(event,()=>onAdvance())}>{manualEffectPending&&!hasMoreText?'다음 효과':'다음으로'}</button>}
            {mode === "play" &&
              status === "choice" && !manualEffectPending && !hasMoreText &&
              scene.choices?.map((option) => (
                <button
                  key={option.id}
                  disabled={presentationPending||readerBusy}
                  onClick={event => navigate(event,()=>onAdvance(option.id))}
                >
                  {option.text}
                </button>
              ))}
          </details>
</>;}
