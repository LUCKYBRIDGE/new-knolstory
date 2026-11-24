'use client';
/* eslint-disable @next/next/no-img-element -- Chip shows small linked material thumbnails; the scene itself is Ren'Py. */
// Renders an A2UI surface built from the focus editor catalog (@knolstory/ui).
// Only catalog components can be drawn: each has exactly one renderer below, and sizes/spacing
// come from this file's CSS, never from the surface.
import {Fragment,type ReactNode} from 'react';
import {effectiveDevices,readPointer,type A2uiAction,type A2uiComponent,type Device,type FocusComponentName,type Surface} from '@knolstory/ui';
import styles from './focus-surface.module.css';

export type FocusSurfaceAction={surfaceId:string;sourceComponentId:string;action:A2uiAction};
type Props={surface:Surface;device:Device;onAction?:(action:FocusSurfaceAction)=>void};
type Ctx={surface:Surface;device:Device;fire:(id:string,action:unknown)=>void;render:(id:unknown)=>ReactNode};
type Renderer=(component:A2uiComponent,ctx:Ctx)=>ReactNode;

const TASK_LABELS={basic:'쓰기',text:'원고',background:'배경',characters:'인물',audio:'음향',direction:'연출'} as const;
const ICONS={close:'×',fullscreen:'⛶',library:'⌂',play:'▶',help:'?'} as const;

function value(ctx:Ctx,raw:unknown):unknown{
 if(raw&&typeof raw==='object'&&'path' in raw)return readPointer(ctx.surface.data,String((raw as {path:unknown}).path));
 return raw;
}
const text=(ctx:Ctx,raw:unknown)=>{const resolved=value(ctx,raw);return resolved===undefined||resolved===null?'':String(resolved);};
const list=(raw:unknown)=>Array.isArray(raw)?raw:[];
const gapClass=(gap:unknown)=>styles[`gap${typeof gap==='number'?gap:8}`];

export const focusRenderers:Record<FocusComponentName,Renderer>={
 FocusScreen:(c,ctx)=><section className={styles.screen} data-a2ui-screen={String(c.task)} aria-label={`${TASK_LABELS[c.task as keyof typeof TASK_LABELS]} 편집`}>
  {ctx.render(c.topBar)}
  {c.stage!==undefined&&ctx.render(c.stage)}
  {c.current!==undefined&&ctx.render(c.current)}
  {list(c.context).length>0&&<div className={styles.context}>{list(c.context).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</div>}
  <div className={styles.work}>{ctx.render(c.work)}</div>
  {c.more!==undefined&&ctx.render(c.more)}
 </section>,
 TopBar:(c,ctx)=><header className={styles.topBar} data-a2ui-top-bar>
  <button type="button" className={styles.icon} aria-label="설정" title="설정" onClick={()=>ctx.fire(c.id,c.settings)}>☰</button>
  {ctx.render(c.navigator)}
  {ctx.render(c.tabs)}
  {list(c.actions).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </header>,
 CutNavigator:(c,ctx)=><div className={styles.cutNavigator} role="group" aria-label="장·컷 이동">
  <button type="button" className={styles.step} aria-label="이전 컷" onClick={()=>ctx.fire(c.id,c.previous)}>‹</button>
  <button type="button" className={styles.cutPlace} aria-haspopup="listbox" onClick={()=>ctx.fire(c.id,c.openList)}>{text(ctx,c.chapter)}장 · {text(ctx,c.cut)}컷 ▾</button>
  <button type="button" className={styles.step} aria-label="다음 컷" onClick={()=>ctx.fire(c.id,c.next)}>›</button>
 </div>,
 WorkTabs:(c,ctx)=><nav className={styles.tabs} aria-label="편집 작업">
  {list(c.tabs).map(task=><button key={String(task)} type="button" aria-current={task===c.selected?'page':undefined}
   onClick={()=>{if(task!==c.selected&&c.change&&typeof c.change==='object'&&'event' in c.change)ctx.fire(c.id,{event:{...(c.change as {event:object}).event,context:{task}}});}}>
   {TASK_LABELS[task as keyof typeof TASK_LABELS]}</button>)}
 </nav>,
 Stage:(c,ctx)=><div className={styles.stage} data-orientation={String(c.orientation)} role="img" aria-label={text(ctx,c.name)}/>,
 CurrentCut:(c,ctx)=><div className={styles.current} data-a2ui-current-cut>
  <div className={styles.currentHead}>
   <span className={styles.cutNumber}>{text(ctx,c.cut)}컷</span>
   {list(c.tools).length?list(c.tools).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>):<span className={styles.speaker}>{text(ctx,c.speaker)}</span>}
   {list(c.linkedImages).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
   {c.play!==undefined&&<button type="button" className={styles.icon} aria-label="이 컷부터 재생" title="이 컷부터 재생" onClick={()=>ctx.fire(c.id,c.play)}>{ICONS.play}</button>}
  </div>
  {c.editable===true
   ?<textarea className={styles.editor} aria-label={`${text(ctx,c.cut)}컷 글`} defaultValue={text(ctx,c.text)}/>
   :<p className={styles.cutText} data-lines="3">{text(ctx,c.text)}</p>}
 </div>,
 CutCard:(c,ctx)=><button type="button" className={styles.cutCard} data-side={String(c.side)} onClick={()=>ctx.fire(c.id,c.select)}
  aria-label={`${c.side==='previous'?'이전':'다음'} 컷 ${text(ctx,c.cut)}컷으로`}>
  <span className={styles.cardPreview} aria-hidden="true"/>
  <span className={styles.cutText} data-lines="2">{text(ctx,c.text)}</span>
 </button>,
 Column:(c,ctx)=><div className={`${styles.column} ${gapClass(c.gap)}`}>{list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</div>,
 ToolGroup:(c,ctx)=><div className={`${styles.toolGroup} ${gapClass(c.gap)}`} role="group" aria-label={text(ctx,c.name)}>
  {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
 Button:(c,ctx)=><button type="button" className={styles.button} data-variant={String(c.variant??'secondary')} title={typeof c.title==='string'?c.title:undefined}
  disabled={value(ctx,c.disabled)===true} onClick={()=>ctx.fire(c.id,c.action)}>{text(ctx,c.label)}</button>,
 IconButton:(c,ctx)=><button type="button" className={styles.icon} aria-label={text(ctx,c.name)} title={text(ctx,c.name)} onClick={()=>ctx.fire(c.id,c.action)}>
  <span aria-hidden="true">{ICONS[c.icon as keyof typeof ICONS]}</span>
 </button>,
 Choice:(c,ctx)=><label className={styles.choice}>
  <span>{text(ctx,c.label)}</span>
  <select aria-label={c.name!==undefined?text(ctx,c.name):undefined} defaultValue={text(ctx,c.value)} onChange={event=>{if(c.change&&typeof c.change==='object'&&'event' in c.change)ctx.fire(c.id,{event:{...(c.change as {event:object}).event,context:{value:event.currentTarget.value}}});}}>
   {list(c.options).map(option=>{const {value:optionValue,label}=option as {value:string;label:string};return <option key={optionValue} value={optionValue}>{label}</option>;})}
  </select>
 </label>,
 Chip:(c,ctx)=><span className={styles.chip}>{c.image!==undefined&&<img src={text(ctx,c.image)} alt=""/>}{text(ctx,c.label)}</span>,
 More:(c,ctx)=><details className={styles.more} data-a2ui-more>
  <summary>{text(ctx,c.summary)}</summary>
  <div className={styles.moreBody}>{list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</div>
 </details>,
 TextField:(c,ctx)=><label className={styles.choice}>
  <span>{text(ctx,c.label)}</span>
  <input className={styles.textField} aria-label={c.name!==undefined?text(ctx,c.name):undefined} defaultValue={text(ctx,c.value)}
   onChange={event=>{const change=c.change as {event?:object}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{value:event.currentTarget.value}}});}}/>
 </label>,
 CutList:(c,ctx)=><div className={styles.cutList} data-a2ui-cut-list>
  {list(c.children).filter(id=>ctx.device!=='phone'||c.phoneShows==='all'||value(ctx,ctx.surface.components.get(String(id))?.current)===true).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
 CutItem:(c,ctx)=>{
  const label=`${text(ctx,c.cut)}컷 · ${text(ctx,c.speaker)}`;
  const current=value(ctx,c.current)===true;
  const all=[...ctx.surface.components.values()].some(list=>list.component==='CutList'&&list.phoneShows==='all'&&list.children!==undefined&&(list.children as unknown[]).includes(c.id));
  return <article className={styles.cutItem} aria-current={current?'step':undefined} aria-label={`${text(ctx,c.cut)}컷 편집`}>
   <header className={styles.cutItemHead}>
    {ctx.device==='phone'&&!all?<strong>{label}</strong>:<button type="button" className={styles.cutSelect} aria-pressed={current} aria-label={`${label} · 이 컷 선택`} onClick={()=>ctx.fire(c.id,c.select)}>{label}</button>}
    <button type="button" className={styles.icon} aria-label="이 컷부터 재생" title="이 컷부터 재생" onClick={()=>ctx.fire(c.id,c.play)}>{ICONS.play}</button>
   </header>
   <p className={styles.cutText} data-lines="3">{text(ctx,c.text)}</p>
   {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
  </article>;
 },
 AssetPicker:(c,ctx)=><div className={styles.assetPicker}>
  {c.labelVisible===true&&<span className={styles.fieldLabel}>{text(ctx,c.label)}</span>}
  <button type="button" aria-label={`${text(ctx,c.label)} 이미지 찾기 · ${text(ctx,c.value)}`} onClick={()=>ctx.fire(c.id,c.action)}>
   <span className={styles.thumb} data-kind={String(c.kind)} aria-hidden="true"/><strong>{text(ctx,c.value)}</strong>
  </button>
 </div>,
 Slider:(c,ctx)=>{const current=Number(value(ctx,c.value)??c.min);return <label className={styles.slider}>
  <span>{text(ctx,c.label)} · {current}{typeof c.unit==='string'?c.unit:''}</span>
  <input type="range" min={Number(c.min)} max={Number(c.max)} defaultValue={current} aria-label={text(ctx,c.label)}
   onChange={event=>{const change=c.change as {event?:object}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{value:Number(event.currentTarget.value)}}});}}/>
 </label>;},
 Toggle:(c,ctx)=><label className={styles.toggle}>
  <input type="checkbox" defaultChecked={value(ctx,c.value)===true} aria-label={c.name!==undefined?text(ctx,c.name):undefined}
   onChange={event=>{const change=c.change as {event?:object}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{value:event.currentTarget.checked}}});}}/>
  {text(ctx,c.label)}
 </label>,
 TextArea:(c,ctx)=><textarea className={styles.editor} aria-label={text(ctx,c.label)} defaultValue={text(ctx,c.value)}
  onChange={event=>{const change=c.change as {event?:object}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{value:event.currentTarget.value}}});}}/>,
 Notice:(c,ctx)=><div className={styles.notice} data-kind={String(c.kind)} role={c.kind==='error'?'alert':'status'}>
  <p>{text(ctx,c.text)}</p>
  {list(c.actions).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
};

/** Draws the surface's root for one device. Components hidden on that device are left out. */
export function FocusSurface({surface,device,onAction}:Props){
 const ctx:Ctx={
  surface,device,
  fire:(id,action)=>{if(action)onAction?.({surfaceId:surface.surfaceId,sourceComponentId:id,action:action as A2uiAction});},
  render:id=>{
   if(typeof id!=='string')return null;
   const component=surface.components.get(id);
   if(!component||!effectiveDevices(surface,id).includes(device))return null;
   const renderer=focusRenderers[component.component as FocusComponentName];
   return renderer?<Fragment key={id}>{renderer(component,ctx)}</Fragment>:null;
  },
 };
 return <div className={styles.surface} data-a2ui-surface={surface.surfaceId} data-device={device}>{ctx.render('root')}</div>;
}

