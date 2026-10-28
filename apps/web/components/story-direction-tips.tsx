'use client';
import {useEffect,useId,useRef,useState,type RefObject,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './editor-term-guide.module.css';
import surface from './story-dialog-surface.module.css';
import choice from './story-direction-choice.module.css';
type Kind='transition'|'look'|'effects';
type Guide={name:string;description:string;tip:string};
const guides:Record<Kind,Record<string,Guide>>={
 transition:{
  'perspective-blackout':{name:'시점 전환',description:'검은 화면에 누구의 시점인지 안내한 뒤 장면을 보여 줘요.',tip:'1인칭의 ‘나’가 다른 인물로 바뀌어 이야기를 이어갈 때 추천해요. 예: 민아가 새로 ‘나’가 된다면 제목을 ‘민아의 시점’으로 적어요.'},
  'fade-black':{name:'암전',description:'검은 화면을 거쳐 다음 장면을 보여 줘요.',tip:'시간이나 장소가 크게 바뀔 때 쓰기 좋아요.'},
  'dissolve':{name:'부드러운 전환',description:'현재 장면이 서서히 사라지며 다음 장면이 나타나요.',tip:'이야기를 끊지 않고 자연스럽게 장면을 이어 갈 때 써요.'},
  'white-fade':{name:'흰 화면 전환',description:'잠깐 흰 화면을 거쳐 다음 장면을 보여 줘요.',tip:'눈부신 빛과 함께 장면이 바뀔 때 써요.'},
 },
 look:{
  'flashback':{name:'회상',description:'장면의 색감을 바꿔 과거의 기억을 구분해요.',tip:'과거를 떠올리는 컷에 써요. 현재로 돌아오면 분위기를 기본으로 바꿔요.'},
  'fractured-reality':{name:'균열된 현실',description:'화면의 색감을 바꿔 낯선 분위기를 만들어요.',tip:'꿈이나 불안한 장면을 표현할 때 써요.'},
 },
 effects:{
  'shake':{name:'화면 흔들림',description:'선택한 화면이나 그림이 흔들려요.',tip:'문이 쿵 닫히는 충격이나 갑작스러운 놀람을 짧게 강조해요.'},
  'flash-red':{name:'붉은 빛',description:'선택한 대상에 붉은 빛을 보여 줘요.',tip:'위험이나 경고를 강조할 때 써요.'},
  'fade-black':{name:'암전',description:'현재 장면을 잠깐 어둡게 해요.',tip:'불이 꺼지는 순간 등에 써요.'},
  'crack':{name:'화면 갈라짐',description:'선택한 대상에 갈라지는 효과를 보여 줘요.',tip:'마법으로 풍경이 바뀌는 순간 등에 써요.'},
  'screen-crack':{name:'현실 균열',description:'선택한 대상에 균열 효과를 보여 줘요.',tip:'평소의 세계가 달라지는 순간을 강조할 때 써요.'},
  'spotlight':{name:'집중 조명',description:'선택한 대상의 중심에 시선을 모아요.',tip:'중요한 말이나 행동을 강조할 때 써요.'},
  'flash':{name:'하얀 섬광',description:'빛이 짧게 번쩍여요.',tip:'번개가 치는 순간 등에 써요.'},
 },
};
/** Selecting opens a local proposal. Only Use calls the authoring mutation. */
export function DirectionChoice({kind,value,label,onUse,children}:{kind:Kind;value:string;label:string;onUse:(value:string)=>void;children:ReactNode}){
 const [pending,setPending]=useState<string|null>(null),opener=useRef<HTMLElement|null>(null);
 return <><div className={choice.selector}><label>{label}<select aria-label={label} value={value} onChange={event=>{if(event.target.value===value)return;if(!event.target.value){onUse('');return;}opener.current=event.currentTarget;setPending(event.target.value);}}>{children}</select></label>{value&&<button type="button" aria-label={`${label} 설명·팁`} aria-haspopup="dialog" onClick={event=>{opener.current=event.currentTarget;setPending(value);}}>안내</button>}</div>{pending!==null&&createPortal(<ChoiceDialog guide={guides[kind][pending]} onClose={()=>setPending(null)} onUse={()=>{if(pending!==value)onUse(pending);setPending(null);}} opener={opener}/>,document.body)}</>;
}
function ChoiceDialog({guide,onClose,onUse,opener}:{guide:Guide;onClose:()=>void;onUse:()=>void;opener:RefObject<HTMLElement|null>}){
 const ref=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),title=useId(),tipId=useId();const [tip,setTip]=useState(false);
 useEffect(()=>{const dialog=ref.current,origin=opener.current;dialog?.showModal();close.current?.focus();return()=>{dialog?.close();if(origin?.isConnected)origin.focus();};},[opener]);
 return <dialog ref={ref} className={`${styles.dialog} ${surface.surface} ${choice.dialog}`} aria-labelledby={title} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}else trapDialogTab(event,ref.current);}} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}>
  <div className={styles.shell}><header className={styles.header}><h2 id={title}>{guide.name}</h2><button ref={close} type="button" aria-label="연출 선택 닫기" onClick={onClose}>닫기</button></header>
   <div className={styles.body} tabIndex={0} role="region" aria-label="연출 안내"><details><summary>설명</summary><p>{guide.description}</p></details><button type="button" aria-expanded={tip} aria-controls={tipId} onClick={()=>setTip(value=>!value)}>팁</button><p id={tipId} hidden={!tip}>{guide.tip}</p></div>
   <footer className={choice.actions}><button type="button" className={choice.use} onClick={onUse}>사용</button></footer>
  </div>
 </dialog>;
}
