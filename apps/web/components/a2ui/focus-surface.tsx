'use client';
/* eslint-disable @next/next/no-img-element -- Chip shows small linked material thumbnails; the scene itself is Ren'Py. */
// Renders an A2UI surface built from the focus editor catalog (@knolstory/ui).
// Only catalog components can be drawn: each has exactly one renderer below, and sizes/spacing
// come from this file's CSS, never from the surface.
import {Fragment,type ReactNode} from 'react';
import {effectiveDevices,readPointer,type A2uiAction,type A2uiComponent,type Device,type FocusComponentName,type Surface} from '@knolstory/ui';
import styles from './focus-surface.module.css';

export type FocusSurfaceAction={surfaceId:string;sourceComponentId:string;action:A2uiAction};
/** rootId draws one sub-tree (a real screen embeds catalog parts); inline lets the parts sit in the host's own layout. */
/** A host screen keeps its tuned CSS (skin: class per part) and adds its own attributes (attrs); custom components are registered with `custom`. */
export type FocusSkin=Partial<Record<'pickerLabel'|'pickerButton'|'srOnly'|'workTabs'|'cutItem'|'cutSelect'|'cutPlay'|'cutText'|'cutPosition'|'cutPositionLabel'|'cutShort'|'drawerPanel'|'drawerHead'|'groupLabel'|'cardAdd'|'excerpt'|'pathChoice'|'pathFrom'|'pathSeparate',string>>;
type Props={surface:Surface;device:Device;onAction?:(action:FocusSurfaceAction)=>void;rootId?:string;inline?:boolean;skin?:FocusSkin;attrs?:(component:A2uiComponent)=>Record<string,string|undefined>|undefined;
 /** Korean IME composition in a TextField: the host must know at once (it guards navigation and saving). */
 onComposing?:(composing:boolean)=>void;
 /** Implementations of the catalog's custom (x-host) components, by component name. */
 custom?:Partial<Record<string,(component:A2uiComponent)=>ReactNode>>};
type Ctx={surface:Surface;device:Device;fire:(id:string,action:unknown)=>void;render:(id:unknown)=>ReactNode;skin:FocusSkin;attrs:(component:A2uiComponent)=>Record<string,string|undefined>;composing:(on:boolean)=>void;custom:Partial<Record<string,(component:A2uiComponent)=>ReactNode>>};
type Renderer=(component:A2uiComponent,ctx:Ctx)=>ReactNode;

const TASK_LABELS={basic:'쓰기',text:'원고',background:'배경',characters:'인물',audio:'음향',direction:'연출'} as const;
const ICONS={close:'×',fullscreen:'⛶',library:'⌂',play:'▶',help:'?'} as const;
/** Line icons shared with the editor chrome (20px grid, currentColor). */
function iconSvg(icon:string){
 const line={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 if(icon==='previous'||icon==='next')return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d={icon==='previous'?'M10 3.5 5.5 8l4.5 4.5':'M6 3.5 10.5 8 6 12.5'} {...line}/></svg>;
 if(icon==='fullscreen')return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...line}><path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/></svg>;
 if(icon==='fullscreen-exit')return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...line}><path d="M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6"/></svg>;
 if(icon==='library')return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...line}><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/></svg>;
 if(icon==='close')return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" {...line}/></svg>;
 return undefined;
}

function value(ctx:Ctx,raw:unknown):unknown{
 if(raw&&typeof raw==='object'&&'path' in raw)return readPointer(ctx.surface.data,String((raw as {path:unknown}).path));
 return raw;
}
const text=(ctx:Ctx,raw:unknown)=>{const resolved=value(ctx,raw);return resolved===undefined||resolved===null?'':String(resolved);};
const list=(raw:unknown)=>Array.isArray(raw)?raw:[];
const gapClass=(gap:unknown)=>styles[`gap${typeof gap==='number'?gap:8}`];
/** A host may give a part its own class (attrs → className) to keep the screen's tuned CSS; other attrs pass through. */
const host=(ctx:Ctx,c:A2uiComponent,fallback:string|undefined)=>{const {className,...rest}=ctx.attrs(c);return {className:className??fallback,...rest};};
const changeWith=(ctx:Ctx,c:A2uiComponent,value:unknown)=>{const change=c.change as {event?:{context?:object}}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{...(change.event.context??{}),value}}});};

/** Default drawing of a custom (x-host) component when the screen has not registered one: a named placeholder. */
const hostPart:Renderer=(c)=><span className={styles.hostPart} data-host-part={c.component}>{c.component}</span>;

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
 CutNavigator:(c,ctx)=>{
  if(!Array.isArray(c.groups))return <div className={styles.cutNavigator} role="group" aria-label="장·컷 이동">
   <button type="button" className={styles.step} aria-label="이전 컷 편집" onClick={()=>ctx.fire(c.id,c.previous)}>‹</button>
   <button type="button" className={styles.cutPlace} aria-haspopup="listbox" onClick={()=>ctx.fire(c.id,c.openList)}>{text(ctx,c.chapter)}장 · {text(ctx,c.cut)}컷 ▾</button>
   <button type="button" className={styles.step} aria-label="다음 컷 편집" onClick={()=>ctx.fire(c.id,c.next)}>›</button>
  </div>;
  // Real editor: the short position with the full list as a native select laid over it; arrows come through `steps`.
  return <div {...host(ctx,c,styles.cutNavigator)}>
   {c.previousButton!==undefined&&ctx.render(c.previousButton)}{c.nextButton!==undefined&&ctx.render(c.nextButton)}
   <label className={ctx.skin.cutPosition}><span className={ctx.skin.cutPositionLabel}>현재 장 · 컷</span>
    <span className={ctx.skin.cutShort} aria-hidden="true">{text(ctx,c.short)}<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
    <select aria-label={text(ctx,c.name)||'현재 장과 컷 이동'} value={text(ctx,c.value)} disabled={value(ctx,c.disabled)===true} onChange={event=>changeWith(ctx,c,event.currentTarget.value)}>
     {(c.groups as {label:string;options:{value:string;label:string}[]}[]).map(group=><optgroup key={group.label} label={group.label}>{group.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>)}
    </select>
   </label>
  </div>;
 },
 WorkTabs:(c,ctx)=><nav className={ctx.skin.workTabs??styles.tabs} aria-label="편집 작업" {...ctx.attrs(c)}>
  {list(c.tabs).map(task=><button key={String(task)} type="button" aria-current={task===c.selected?'page':undefined}
   title={c.titles&&typeof c.titles==='object'?(c.titles as Record<string,string>)[String(task)]:undefined} disabled={value(ctx,c.disabled)===true}
   onClick={()=>{if(task!==c.selected&&c.change&&typeof c.change==='object'&&'event' in c.change)ctx.fire(c.id,{event:{...(c.change as {event:object}).event,context:{task}}});}}>
   {TASK_LABELS[task as keyof typeof TASK_LABELS]}</button>)}
 </nav>,
 Stage:(c,ctx)=>{
  const strip=c.phoneStrip===true&&ctx.device==='phone';
  return <div className={styles.stageWrap} data-stage-strip={strip?'strip':undefined}>
   <div className={styles.stage} data-orientation={String(c.orientation)} role="img" aria-label={text(ctx,c.name)}/>
   {strip&&<button type="button" className={styles.stageToggle} aria-expanded={false} aria-label="무대 펼치기" title="무대 펼치기" onClick={()=>ctx.fire(c.id,c.toggle)}><span aria-hidden="true">▾</span></button>}
  </div>;
 },
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
 CutCard:(c,ctx)=>{
  const kind=String(c.kind??'cut'),excerpt=ctx.skin.excerpt??styles.cutText;
  if(kind==='none')return <p {...host(ctx,c,styles.notice)}>{text(ctx,c.text)}</p>;
  if(kind==='add')return <button type="button" disabled={value(ctx,c.disabled)===true} onClick={()=>ctx.fire(c.id,c.select)} {...host(ctx,c,`${styles.cutCard} ${ctx.skin.cardAdd??''}`)}>
   <strong>{text(ctx,c.label)}</strong><span className={excerpt}>{text(ctx,c.text)}</span></button>;
  if(c.label!==undefined)return <button type="button" disabled={value(ctx,c.disabled)===true} onClick={()=>ctx.fire(c.id,c.select)} {...host(ctx,c,styles.cutCard)}>
   <strong>{text(ctx,c.label)}<small>{text(ctx,c.order)}</small></strong>{c.preview!==undefined?ctx.render(c.preview):<span className={styles.cardPreview} aria-hidden="true"/>}
   <span className={excerpt}>{text(ctx,c.text)}</span></button>;
  return <button type="button" className={styles.cutCard} data-side={String(c.side)} onClick={()=>ctx.fire(c.id,c.select)}
   aria-label={`${c.side==='previous'?'이전':'다음'} 컷 ${text(ctx,c.cut)}컷으로`}>
   <span className={styles.cardPreview} aria-hidden="true"/>
   <span className={styles.cutText} data-lines="2">{text(ctx,c.text)}</span>
  </button>;
 },
 Fork:(c,ctx)=><div {...host(ctx,c,styles.notice)}>
  <strong>{text(ctx,c.title)}</strong>{c.note!==undefined&&<small>{text(ctx,c.note)}</small>}
  {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
 PathChoice:(c,ctx)=>{
  const choice=<button type="button" className={ctx.skin.pathChoice} disabled={value(ctx,c.disabled)===true} onClick={()=>ctx.fire(c.id,c.select)}><b>{text(ctx,c.label)}</b><span>{text(ctx,c.where)}</span></button>;
  if(c.separate===undefined)return choice;
  return <div className={ctx.skin.pathFrom}>{choice}<button type="button" className={ctx.skin.pathSeparate} disabled={value(ctx,c.separateDisabled)===true} onClick={()=>ctx.fire(c.id,c.separate)}
   aria-label={text(ctx,c.separateName)} title="이 컷을 복사해 이 길에서만 보이게 해요. 다음 컷부터는 다시 같은 이야기예요.">이 길만 따로 쓰기</button></div>;
 },
 Column:(c,ctx)=>{const Tag=c.element==='section'?'section':c.element==='span'?'span':c.element==='aside'?'aside':'div';const named=c.name===undefined?{}:c.element==='aside'?{'aria-label':text(ctx,c.name)}:{role:'group','aria-label':text(ctx,c.name),title:text(ctx,c.name)};return <Tag {...named} {...host(ctx,c,`${styles.column} ${gapClass(c.gap)}`)}>{c.title!==undefined&&<strong>{text(ctx,c.title)}</strong>}{list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</Tag>;},
 ToolGroup:(c,ctx)=><div role="group" aria-label={text(ctx,c.name)} {...host(ctx,c,`${styles.toolGroup} ${gapClass(c.gap)}`)}>
  {c.labelVisible===true&&<span className={ctx.skin.groupLabel??styles.groupLabel} aria-hidden="true">{text(ctx,c.name)}</span>}
  {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
 Button:(c,ctx)=><button type="button" data-variant={String(c.variant??'secondary')} title={typeof c.title==='string'?c.title:undefined}
  aria-label={c.name!==undefined?text(ctx,c.name):undefined} disabled={value(ctx,c.disabled)===true} onClick={()=>ctx.fire(c.id,c.action)} {...host(ctx,c,styles.button)}>
  {c.icon==='play'&&<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2 L13 8 L4 14 Z" fill="currentColor"/></svg>}{text(ctx,c.label)}</button>,
 IconButton:(c,ctx)=><button type="button" aria-label={text(ctx,c.name)} title={typeof c.title==='string'?c.title:text(ctx,c.name)} disabled={value(ctx,c.disabled)===true}
  aria-pressed={c.pressed!==undefined?value(ctx,c.pressed)===true:undefined} onPointerDown={c.keepFocus===true?event=>event.preventDefault():undefined} onClick={()=>ctx.fire(c.id,c.action)} {...host(ctx,c,styles.icon)}>
  {iconSvg(String(c.icon))??<span aria-hidden="true">{ICONS[c.icon as keyof typeof ICONS]}</span>}{c.label!==undefined&&<span>{text(ctx,c.label)}</span>}
 </button>,
 Choice:(c,ctx)=><label {...host(ctx,c,styles.choice)}>
  <span>{text(ctx,c.label)}</span>
  <select aria-label={c.name!==undefined?text(ctx,c.name):undefined} title={typeof c.title==='string'?c.title:undefined} value={text(ctx,c.value)} disabled={value(ctx,c.disabled)===true} onChange={event=>changeWith(ctx,c,event.currentTarget.value)}>
   {list(c.options).map(option=>{const {value:optionValue,label,disabled}=option as {value:string;label:string;disabled?:boolean};return <option key={optionValue} value={optionValue} disabled={disabled===true}>{label}</option>;})}
  </select>
 </label>,
 Chip:(c,ctx)=>{const icon=c.icon!==undefined?ctx.render(c.icon):c.image!==undefined?<img src={text(ctx,c.image)} alt=""/>:null;const label=text(ctx,c.label);
  return <span {...host(ctx,c,styles.chip)}>{c.iconSide!=='end'&&icon}{label&&(c.iconSide==='end'?<small>{label}</small>:<span>{label}</span>)}{c.iconSide==='end'&&icon}</span>;},
 More:(c,ctx)=>{const controlled=c.open!==undefined,open=value(ctx,c.open)===true,gated=c.contentShown!==undefined,shown=value(ctx,c.contentShown)===true;
  return <details data-a2ui-more {...(controlled?{open}:{})} onToggle={controlled||gated?event=>{const now=event.currentTarget.open;if((gated||now!==open)&&c.toggle&&typeof c.toggle==='object'&&'event' in c.toggle)ctx.fire(c.id,{event:{...(c.toggle as {event:{context?:object}}).event,context:{...((c.toggle as {event:{context?:object}}).event.context??{}),open:now}}});}:undefined} {...host(ctx,c,styles.more)}>
  <summary title={typeof c.title==='string'?c.title:undefined}>{c.lead!==undefined&&<span className={ctx.skin.srOnly??styles.srOnly}>{text(ctx,c.lead)} </span>}{text(ctx,c.summary)}</summary>
  {(gated?shown:(!controlled||open))&&(c.wrap===false?list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>):<div className={styles.moreBody}>{list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</div>)}
 </details>;},
 TextField:(c,ctx)=><label {...host(ctx,c,styles.choice)}>
  <span>{text(ctx,c.label)}</span>
  <input className={styles.textField} aria-label={c.name!==undefined?text(ctx,c.name):undefined} value={text(ctx,c.value)} maxLength={typeof c.maxChars==='number'?c.maxChars:undefined} disabled={value(ctx,c.disabled)===true}
   onCompositionStart={()=>ctx.composing(true)} onCompositionEnd={()=>ctx.composing(false)} onChange={event=>changeWith(ctx,c,event.currentTarget.value)}/>
 </label>,
 CutList:(c,ctx)=><div className={styles.cutList} data-a2ui-cut-list>
  {list(c.children).filter(id=>ctx.device!=='phone'||c.phoneShows==='all'||value(ctx,ctx.surface.components.get(String(id))?.current)===true).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
 </div>,
 CutItem:(c,ctx)=>{
  const label=`${text(ctx,c.cut)}컷${text(ctx,c.speaker)?` · ${text(ctx,c.speaker)}`:''}`;
  const current=value(ctx,c.current)===true,disabled=value(ctx,c.disabled)===true;
  const all=[...ctx.surface.components.values()].some(list=>list.component==='CutList'&&list.phoneShows==='all'&&list.children!==undefined&&(list.children as unknown[]).includes(c.id));
  const single=ctx.device==='phone'&&!all;
  return <article className={ctx.skin.cutItem??styles.cutItem} aria-current={current?'step':undefined} aria-label={`${text(ctx,c.cut)}컷 편집`} {...ctx.attrs(c)}>
   <header className={ctx.skin.cutItem?undefined:styles.cutItemHead}>
    {single?<strong>{label}</strong>:<button type="button" className={ctx.skin.cutSelect??styles.cutSelect} disabled={disabled} aria-pressed={current} aria-label={`${label} · 이 컷 선택`} onClick={()=>ctx.fire(c.id,c.select)}>{label}</button>}
    <button type="button" className={ctx.skin.cutPlay??styles.icon} disabled={disabled} aria-label="이 컷부터 재생" title="이 컷부터 재생" onClick={()=>ctx.fire(c.id,c.play)}><span aria-hidden="true">{ICONS.play}</span></button>
   </header>
   {c.showText!==false&&<p className={ctx.skin.cutText??styles.cutText} data-cut-text data-lines="3">{text(ctx,c.text)}</p>}
   {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
  </article>;
 },
 AssetPicker:(c,ctx)=>{
  const field=text(ctx,c.label),name=`${field.endsWith('이미지')?`${field} 찾기`:`${field} 이미지 찾기`} · ${text(ctx,c.value)}`,hint=text(ctx,c.hint),hintId=`${ctx.surface.surfaceId}-${c.id}-hint`;
  return <div {...host(ctx,c,styles.assetPicker)}>
   <span className={c.labelVisible===true?(ctx.skin.pickerLabel??styles.fieldLabel):(ctx.skin.srOnly??styles.srOnly)}>{text(ctx,c.label)}</span>
   <button type="button" className={ctx.skin.pickerButton} aria-label={name} aria-describedby={hint?hintId:undefined} disabled={value(ctx,c.disabled)===true}
    data-asset-value={typeof c.assetValue==='string'?c.assetValue:undefined} data-asset-inherited={c.inherited===true?true:undefined} onClick={()=>ctx.fire(c.id,c.action)}>
    {c.preview!==undefined?ctx.render(c.preview):null}
    <span><strong>{text(ctx,c.value)}</strong>{hint&&<small id={hintId}>{hint}</small>}</span>
   </button>
  </div>;
 },
 Slider:(c,ctx)=>{const current=Number(value(ctx,c.value)??c.min);const shown=c.valueText!==undefined?text(ctx,c.valueText):`${current}${typeof c.unit==='string'?c.unit:''}`;
  return <label {...host(ctx,c,styles.slider)}>
  <span>{text(ctx,c.label)} · {shown}</span>
  <input type="range" min={Number(c.min)} max={Number(c.max)} step={typeof c.step==='number'?c.step:undefined} value={current} aria-label={c.name!==undefined?text(ctx,c.name):text(ctx,c.label)}
   onChange={event=>changeWith(ctx,c,Number(event.currentTarget.value))}/>
 </label>;},
 Toggle:(c,ctx)=><label className={styles.toggle}>
  <input type="checkbox" className={styles.toggleInput} checked={value(ctx,c.value)===true} disabled={value(ctx,c.disabled)===true} aria-label={c.name!==undefined?text(ctx,c.name):undefined}
   onChange={event=>{const change=c.change as {event?:object}|undefined;if(change?.event)ctx.fire(c.id,{event:{...change.event,context:{...((change.event as {context?:object}).context??{}),value:event.currentTarget.checked}}});}}/>
  {text(ctx,c.label)}
 </label>,
 TextArea:(c,ctx)=><textarea aria-label={text(ctx,c.label)} value={text(ctx,c.value)} maxLength={typeof c.maxChars==='number'?c.maxChars:undefined} readOnly={value(ctx,c.readOnly)===true} disabled={value(ctx,c.disabled)===true}
  onCompositionStart={()=>ctx.composing(true)} onCompositionEnd={()=>ctx.composing(false)} onChange={event=>changeWith(ctx,c,event.currentTarget.value)} {...host(ctx,c,styles.editor)}/>,
 Drawer:(c,ctx)=>{
  const open=value(ctx,c.open)===true;
  return <details open={open} {...host(ctx,c,styles.more)} onToggle={event=>{const now=event.currentTarget.open;if(now!==open&&c.toggle&&typeof c.toggle==='object'&&'event' in c.toggle)ctx.fire(c.id,{event:{...(c.toggle as {event:{context?:object}}).event,context:{...((c.toggle as {event:{context?:object}}).event.context??{}),open:now}}});}}>
   <summary aria-label={c.summaryName!==undefined?text(ctx,c.summaryName):undefined}>{c.icon===true&&<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}{c.icon===true?<span>{text(ctx,c.summary)}</span>:text(ctx,c.summary)}</summary>
   <div className={ctx.skin.drawerPanel??styles.moreBody} data-system-menu={c.close!==undefined?'editor':undefined}>
    {c.close!==undefined&&<div className={ctx.skin.drawerHead}><div><span>{text(ctx,c.subtitle)}</span><strong>{text(ctx,c.title)}</strong></div>
     <button type="button" aria-label={text(ctx,c.closeName)||'닫기'} title="닫기" data-close-icon onClick={event=>{const details=event.currentTarget.closest('details');if(details)details.open=false;details?.querySelector<HTMLElement>(':scope>summary')?.focus();ctx.fire(c.id,c.close);}}>{iconSvg('close')}</button></div>}
    {list(c.children).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
   </div>
  </details>;
 },
 AssetThumbnail:hostPart,CutTools:hostPart,StoryStructure:hostPart,ScenePreview:hostPart,SoundEditor:hostPart,DirectionEditor:hostPart,TextVariants:hostPart,StagingImport:hostPart,CutSettings:hostPart,FileTools:hostPart,LeaveActions:hostPart,HostPanel:hostPart,
 Notice:(c,ctx)=>{const {className,...rest}=ctx.attrs(c);
  // Inside a screen a Notice is one line of the host's own type (className given); in the catalog view it is a boxed notice.
  // A host line with actions keeps them beside its text (e.g. 이야기 연결: ‘… · 도착 컷을 정해 주세요’ + 연결 정하기).
  if(className!==undefined&&list(c.actions).length)return <div className={className} data-kind={String(c.kind)} role={c.kind==='error'?'alert':'status'} {...rest}><p>{text(ctx,c.text)}</p>{list(c.actions).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}</div>;
  if(className!==undefined)return c.kind==='warning'?<div className={className} role="status" {...rest}>{text(ctx,c.text)}</div>:<p className={className} role={c.kind==='error'?'alert':undefined} {...rest}>{text(ctx,c.text)}</p>;
  return <div className={styles.notice} data-kind={String(c.kind)} role={c.kind==='error'?'alert':'status'}>
   <p>{text(ctx,c.text)}</p>
   {list(c.actions).map(id=><Fragment key={String(id)}>{ctx.render(id)}</Fragment>)}
  </div>;},
};

/** Draws the surface's root for one device. Components hidden on that device are left out. */
export function FocusSurface({surface,device,onAction,rootId='root',inline=false,skin={},attrs,onComposing,custom}:Props){
 const ctx:Ctx={
  surface,device,skin,attrs:component=>attrs?.(component)??{},composing:on=>onComposing?.(on),custom:custom??{},
  fire:(id,action)=>{if(action)onAction?.({surfaceId:surface.surfaceId,sourceComponentId:id,action:action as A2uiAction});},
  render:id=>{
   if(typeof id!=='string')return null;
   const component=surface.components.get(id);
   if(!component||!effectiveDevices(surface,id).includes(device))return null;
   const registered=custom?.[component.component];
   if(registered)return <Fragment key={id}>{registered(component)}</Fragment>;
   const renderer=focusRenderers[component.component as FocusComponentName];
   return renderer?<Fragment key={id}>{renderer(component,ctx)}</Fragment>:null;
  },
 };
 // Embedded parts are drawn bare, so the host's child selectors (.nextSide>.adjacent, :first-child …) still hold.
 if(inline)return <>{ctx.render(rootId)}</>;
 return <div className={styles.surface} data-a2ui-surface={surface.surfaceId} data-a2ui-root={rootId} data-device={device}>{ctx.render(rootId)}</div>;
}

