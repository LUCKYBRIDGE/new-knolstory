'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import type {StoryCredits as Credits} from '../lib/story-credits';
import styles from './story-credits.module.css';

/**
 * Closing credits, the way a film ends. The moment the story ends the last scene blurs and darkens behind the
 * ending's name and the title, which already stand in the middle of the screen (nothing is shown before the roll
 * starts); after a short hold the credits roll up until the closing words stop in the middle, then the last card
 * offers what to do next.
 *
 * Pressing and holding (pointer, Space or Enter) fast-forwards the roll while held; a short press or click skips to
 * the last card, as before. Everything is in the page for screen readers from the start; only its motion is
 * decoration. Reduced motion (the system setting or the reader's own) shows the list still.
 */
const SPEED=40; // px per second: slow enough to read a line.
const OPENING_HOLD=2600,CLOSING_HOLD=1400; // ms the title and the closing words stay in the middle.
const HOLD_DELAY=220; // a press held longer than this fast-forwards instead of skipping.
export const CREDITS_FAST_RATE=6;

type Ending=Readonly<{name?:string;description?:string}>;
type Props=Readonly<{credits:Credits;ending?:Ending;onRestart:()=>void;onLibrary:()=>void;branching:boolean;still?:boolean;onFinish?:()=>void}>;

export function StoryCreditsRoll({credits,ending,onRestart,onLibrary,branching,still:stillSetting=false,onFinish}:Props){
 const frame=useRef<HTMLDivElement>(null),roll=useRef<HTMLDivElement>(null),opening=useRef<HTMLElement>(null),closing=useRef<HTMLDivElement>(null);
 const restart=useRef<HTMLButtonElement>(null),skipButton=useRef<HTMLButtonElement>(null);
 const animation=useRef<Animation|null>(null),finishTimer=useRef(0),holdTimer=useRef(0);
 const press=useRef<{source:'pointer'|'key';id:number|string;held:boolean}|null>(null);
 const [done,setDone]=useState(false),[still,setStill]=useState(stillSetting),[fast,setFast]=useState(false);
 const finished=useRef(onFinish);useEffect(()=>{finished.current=onFinish;},[onFinish]);
 const finish=useCallback(()=>{
  window.clearTimeout(finishTimer.current);window.clearTimeout(holdTimer.current);press.current=null;
  animation.current?.cancel();animation.current=null;setFast(false);setDone(true);finished.current?.();
 },[]);
 useLayoutEffect(()=>{
  const box=frame.current,content=roll.current,first=opening.current,last=closing.current;
  const reduced=stillSetting||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reduced||!box||!content||!first||!last||!content.animate){setStill(true);setDone(true);return;}
  // The roll starts where the title card stands in the middle and ends with the closing words in the middle.
  const middle=box.clientHeight/2;
  const from=middle-(first.offsetTop+first.offsetHeight/2),to=middle-(last.offsetTop+last.offsetHeight/2);
  const travel=Math.max(0,from-to),rolling=Math.min(60000,Math.max(8000,travel/SPEED*1000)),duration=OPENING_HOLD+rolling;
  const run=content.animate([{transform:`translateY(${from}px)`,offset:0},{transform:`translateY(${from}px)`,offset:OPENING_HOLD/duration},{transform:`translateY(${to}px)`,offset:1}],{duration,easing:'linear',fill:'both'});
  animation.current=run;
  void run.finished.then(()=>{finishTimer.current=window.setTimeout(finish,CLOSING_HOLD/(run.playbackRate||1));},()=>undefined);
  return()=>{run.cancel();window.clearTimeout(finishTimer.current);window.clearTimeout(holdTimer.current);};
 // The roll is laid out once per ending; switching motion off midway is handled below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[finish]);
 // ‘움직임 줄이기’ turned on from the reading menu while the credits roll: stop and show them still.
 useEffect(()=>{if(stillSetting&&animation.current){animation.current.cancel();animation.current=null;window.clearTimeout(holdTimer.current);press.current=null;setFast(false);setStill(true);setDone(true);}},[stillSetting]);
 // The reader keeps the keyboard: during the roll the skip button holds focus, afterwards the first next step.
 useEffect(()=>{if(!still&&!done)skipButton.current?.focus({preventScroll:true});},[still,done]);
 const section=useRef<HTMLElement>(null);
 // Still credits are read from the top: focus stays there and Tab reaches the next steps after the list.
 useEffect(()=>{if(!done)return;if(still)section.current?.focus({preventScroll:true});else restart.current?.focus({preventScroll:true});},[done,still]);
 // Still credits are read at the reader's pace; the music still comes to an end on its own.
 useEffect(()=>{if(!still)return;const timer=window.setTimeout(()=>finished.current?.(),8000);return()=>clearTimeout(timer);},[still]);

 const setRate=(rate:number)=>{const run=animation.current;if(!run)return;run.updatePlaybackRate?run.updatePlaybackRate(rate):run.playbackRate=rate;setFast(rate>1);};
 function begin(source:'pointer'|'key',id:number|string){
  if(done||still||press.current)return;
  press.current={source,id,held:false};
  window.clearTimeout(holdTimer.current);
  holdTimer.current=window.setTimeout(()=>{if(press.current?.id!==id)return;press.current.held=true;setRate(CREDITS_FAST_RATE);},HOLD_DELAY);
 }
 function end(id:number|string,cancelled=false){
  const current=press.current;if(!current||current.id!==id)return;
  press.current=null;window.clearTimeout(holdTimer.current);
  if(current.held){setRate(1);return;}
  if(!cancelled)finish();
 }
 const onPointerDown=(event:PointerEvent<HTMLElement>)=>{
  if(event.button!==0||done||still)return;
  if((event.target as HTMLElement).closest('[data-credits-last]'))return;
  event.currentTarget.setPointerCapture?.(event.pointerId);begin('pointer',event.pointerId);
 };
 const onKeyDown=(event:KeyboardEvent<HTMLElement>)=>{
  if(done||still)return;
  if(event.key==='Escape'){event.preventDefault();finish();return;}
  if(event.key!==' '&&event.key!=='Enter')return;
  event.preventDefault();
  // A key still held from the press that ended the story repeats here; only a fresh press counts.
  if(event.repeat)return;
  begin('key',event.key);
 };
 const onKeyUp=(event:KeyboardEvent<HTMLElement>)=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();end(event.key);}};
 const endingName=ending?.name?.trim();
 const ended=endingName?`결말 · ${endingName}`:'이야기 끝',description=endingName?ending?.description?.trim():undefined;
 return <section ref={section} tabIndex={-1} className={styles.credits} aria-label="엔딩 크레딧" data-story-credits data-done={done||undefined} data-still={still||undefined} data-fast={fast||undefined}
  onPointerDown={onPointerDown} onPointerUp={event=>end(event.pointerId)} onPointerCancel={event=>end(event.pointerId,true)} onLostPointerCapture={event=>end(event.pointerId,true)}
  onKeyDown={onKeyDown} onKeyUp={onKeyUp} onContextMenu={event=>{if(!done)event.preventDefault();}}>
  <div className={styles.backdrop} aria-hidden="true"/>
  <div ref={frame} className={styles.frame} aria-hidden={done&&!still?true:undefined}>
   <div ref={roll} className={styles.roll} data-credits-roll>
    <header ref={opening} className={styles.opening} data-credits-opening>
     <p className={styles.ending}>{ended}</p>
     <h2 className={styles.title}>{credits.title}</h2>
     {credits.author&&<p className={styles.byline}><span>글</span>{credits.author}</p>}
     {description&&<p className={styles.description}>{description}</p>}
    </header>
    {credits.sections.map(section=><dl key={section.heading} className={styles.block} data-credits-section>
     <dt>{section.heading}</dt>
     {section.lines.map((line,index)=><dd key={`${index}:${line.text}`}><span>{line.text}</span>{line.detail&&<small>{line.detail}</small>}</dd>)}
    </dl>)}
    {credits.note&&<figure className={styles.note} data-credits-section><figcaption>작가의 말</figcaption><blockquote>{credits.note}</blockquote>{credits.author&&<p>— {credits.author}</p>}</figure>}
    <div ref={closing} className={styles.closing} data-credits-closing>
     <p className={styles.thanks}>읽어 주셔서 고맙습니다</p>
     <p className={styles.made}>놀스토리로 만든 이야기</p>
    </div>
   </div>
  </div>
  {!done&&!still&&<div className={styles.controls}>
   <p className={styles.hint} aria-hidden="true">{fast?'빨리 감는 중':'길게 누르면 빨리 감기 · 짧게 누르면 건너뛰기'}</p>
   <button ref={skipButton} type="button" className={styles.skip} data-credits-skip aria-keyshortcuts="Escape" onClick={event=>{if(event.detail===0)finish();}}>건너뛰기</button>
  </div>}
  {done&&<div className={styles.last} data-credits-last role="group" aria-label="이야기를 마쳤어요">
   <p className={styles.ending}>{ended}</p>
   <h2 className={styles.title}>{credits.title}</h2>
   {credits.author&&<p className={styles.by}>{credits.author}</p>}
   {branching&&credits.endingCount>1&&<p className={styles.count}>이 이야기에는 결말이 {credits.endingCount}가지 있어요.</p>}
   <div className={styles.actions}>
    <button ref={restart} type="button" className={styles.primary} onClick={onRestart}>{branching?'다른 결말 찾아보기':'처음부터 다시 읽기'}</button>
    <button type="button" onClick={onLibrary}>서재로 돌아가기</button>
   </div>
  </div>}
 </section>;
}
