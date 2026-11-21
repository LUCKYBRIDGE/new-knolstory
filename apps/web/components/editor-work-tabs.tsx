'use client';
import type {EditingScreen} from '../lib/editor-preferences';
import styles from './editor-work-tabs.module.css';

const LABELS:Record<Exclude<EditingScreen,'audio-direction'>,{label:string;hint:string}>={
 basic:{label:'기본',hint:'글·장면을 한 화면에서'},
 text:{label:'글',hint:'글만 크게 쓰기'},
 background:{label:'배경',hint:'컷마다 배경 고르기'},
 characters:{label:'인물',hint:'인물 배치·표정'},
 audio:{label:'음향',hint:'배경음·효과음'},
 direction:{label:'연출',hint:'효과·전환'},
};
/** The kinds of work in the editor, always in view. Only the screens this writer may use are shown. */
export function EditorWorkTabs({current,tabs,disabled,onChange}:{current:EditingScreen;tabs:readonly Exclude<EditingScreen,'audio-direction'>[];disabled?:boolean;onChange:(screen:EditingScreen)=>boolean}){
 if(tabs.length<2)return null;
 return <nav className={styles.tabs} aria-label="편집 작업" data-editor-work-tabs>
  {tabs.map(id=><button key={id} type="button" aria-current={current===id?'page':undefined} title={LABELS[id].hint} disabled={disabled} onClick={()=>{if(current!==id)onChange(id);}}>{LABELS[id].label}</button>)}
 </nav>;
}
