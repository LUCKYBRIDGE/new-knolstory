'use client';
import type {EditingScreen} from '../lib/editor-preferences';
import {FocusSurface} from './a2ui/focus-surface';
import {workTabsSurface,WORK_TAB_EVENT,type WorkTask} from './a2ui/editor-surfaces';
import styles from './editor-work-tabs.module.css';

const HINTS:Record<WorkTask,string>={
 basic:'지금 컷의 글과 장면을 한 화면에서',
 text:'이 장의 컷 글을 이어서 보고 고치기',
 background:'컷마다 배경 고르기',
 characters:'인물 배치·표정',
 audio:'배경음·효과음',
 direction:'효과·전환',
};
/**
 * The kinds of work in the editor, always in view. Only the screens this writer may use are shown.
 * Drawn from the A2UI focus editor catalog (WorkTabs); the tab sizes stay in editor-work-tabs.module.css.
 */
export function EditorWorkTabs({current,tabs,disabled,onChange}:{current:EditingScreen;tabs:readonly Exclude<EditingScreen,'audio-direction'>[];disabled?:boolean;onChange:(screen:EditingScreen)=>boolean}){
 if(tabs.length<2)return null;
 const surface=workTabsSurface({tabs,current,titles:HINTS,disabled:!!disabled});
 return <FocusSurface inline surface={surface} rootId="work-tabs" device="tablet" skin={{workTabs:styles.tabs}} attrs={()=>({'data-editor-work-tabs':''})}
  onAction={({action})=>{const event='event' in action?action.event:undefined;if(event?.name===WORK_TAB_EVENT&&typeof event.context?.task==='string')onChange(event.context.task as EditingScreen);}}/>;
}
