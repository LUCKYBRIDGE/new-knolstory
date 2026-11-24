'use client';
import type {ReactNode} from 'react';
import type {AuthoringArchive} from '@knolstory/compatibility';
import type {StoryProject} from '@knolstory/story-domain';
import type {WorkSection} from '../lib/memo-navigation';
import {AppInstallButton} from './app-install-button';
import {StoryTransferPanel} from './story-transfer-panel';
import styles from './story-workspace.module.css';
import type {A2uiComponent} from '@knolstory/ui';
import {FocusSurface,type FocusSurfaceAction} from './a2ui/focus-surface';
import {topBarSurface,TOP_BAR_EVENTS} from './a2ui/editor-surfaces';
type Props={onlineAction?:ReactNode;exitActions?:ReactNode;fullscreen?:boolean;onFullscreen?:()=>void;unifiedSettings?:boolean;settingsExtras?:ReactNode;scoresEnabled?:boolean;disabled?:boolean;children?:ReactNode;localFileActions?:ReactNode;recovery?:ReactNode;project:StoryProject;compact:boolean;manageOpen:boolean;hydrated:boolean;loadComplete:boolean;onManage:(open:boolean)=>void;onExport:()=>void;onSave:()=>void;onImportFile:(file?:File)=>void;onImportArchive:(archive:AuthoringArchive)=>void;onError:(message:string)=>void;onLibrary:()=>void;onPrepare:(section:WorkSection)=>void};
export function WorkspaceManagement(p:Props){
 // A2UI: the drawer, its group heads and buttons, and the 전체 화면·서재 shortcuts come from the focus editor catalog
 // (editor-surfaces.ts → topBarSurface); file tools, the current-cut settings and leaving actions fill its Slots.
 const unified=!!p.unifiedSettings,open=!p.compact||p.manageOpen;
 const surface=topBarSurface({unified,title:p.project.title,open,disabled:!!p.disabled,scores:p.scoresEnabled!==false,fullscreen:!!p.fullscreen,fullscreenAvailable:unified&&!!p.onFullscreen,loadComplete:p.loadComplete});
 const onAction=({action}:FocusSurfaceAction)=>{
  const event='event' in action?action.event:undefined;
  if(event?.name===TOP_BAR_EVENTS.toggle){const now=event.context?.open===true;const menu=document.querySelector<HTMLElement>('[data-work-menu]');if(now&&menu)menu.style.setProperty('--work-menu-top',`${menu.getBoundingClientRect().bottom+4}px`);if(p.compact&&now!==p.manageOpen)p.onManage(now);}
  if(event?.name===TOP_BAR_EVENTS.close)p.onManage(false);
  if(event?.name===TOP_BAR_EVENTS.prepare&&typeof event.context?.section==='string')p.onPrepare(event.context.section as WorkSection);
  if(event?.name===TOP_BAR_EVENTS.library)p.onLibrary();
  if(event?.name===TOP_BAR_EVENTS.fullscreen)p.onFullscreen?.();
 };
 const attrs=(component:A2uiComponent)=>{
  if(component.id==='drawer')return {className:styles.management,'data-work-menu':''};
  if(component.component==='ToolGroup')return {className:styles.workMenuGroup};
  if(component.component==='Button')return {className:''};
  if(component.id==='fullscreen')return {className:styles.fullscreenShortcut,'data-fullscreen-shortcut':''};
  if(component.id==='library')return {className:styles.libraryHome};
  return undefined;
 };
 const draw=(rootId:string)=><FocusSurface inline surface={surface} rootId={rootId} device="tablet" attrs={attrs} onAction={onAction}
  skin={{drawerPanel:styles.controls,drawerHead:styles.systemMenuHeader,groupLabel:styles.workMenuHeading}}
  slots={{
   settings:<div role="group" aria-label="현재 컷과 편집 설정" className={styles.systemMenuSettings}>{p.settingsExtras}</div>,
   files:<>{p.localFileActions??<button onClick={p.onExport}>작품 파일 내보내기</button>}
    <label className={styles.import}>작품 파일 가져오기<input aria-label="작품 파일 가져오기" disabled={!p.loadComplete||p.disabled} type="file" accept=".knolstory,.knolsotry,.nolstory,.json,.xlsx,.tsv,.csv" onChange={event=>{p.onImportFile(event.target.files?.[0]);event.target.value='';}}/></label>
    <small className={styles.workMenuHint}>가져온 파일은 확인 후 내 사본으로 열어요.</small><details data-file-exchange><summary>파일 교환·보관 도구</summary>{p.localFileActions&&<button onClick={p.onExport}>작품 파일 내보내기</button>}<button disabled={!p.hydrated} onClick={p.onSave}>임시 보관 다시 시도</button><StoryTransferPanel key={p.project.id} project={p.project} onError={p.onError} onImport={p.onImportArchive}/></details>{p.recovery&&<div data-storage-recovery>{p.recovery}</div>}</>,
   leave:<>{p.exitActions}<AppInstallButton noteClassName={styles.workMenuHint}/></>,
  }}/>;
 return <header className={styles.header}>
  {!unified&&<><div className={styles.brand}>놀스토리</div><button disabled={p.disabled} onClick={p.onLibrary}>서재로</button></>}
  {draw('drawer')}{p.children}
  {unified&&p.onlineAction}
  {unified&&p.onFullscreen&&draw('fullscreen')}
  {unified&&draw('library')}
 </header>;
}
