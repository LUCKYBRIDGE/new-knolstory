'use client';
import {useMemo,useState} from 'react';
import {applyMessages,focusEditorCatalog,focusScreenBlueprints,validateSurface,type A2uiComponent,type Device} from '@knolstory/ui';
import {FocusSurface,type FocusSurfaceAction} from './focus-surface';
import styles from './focus-catalog-gallery.module.css';

/** Catalog view: each custom (x-host) component is drawn as a labelled sample of what the editor registers there. */
const sample=(component:A2uiComponent)=>{const schema=(focusEditorCatalog.components as Record<string,{description?:string}>)[component.component];
 return <div className={styles.hostSample} data-host-sample={component.component}><strong>{component.component}</strong><small>{schema?.description?.split('. ')[0]}</small></div>;};
const SAMPLES=Object.fromEntries(Object.entries(focusEditorCatalog.components as Record<string,{['x-host']?:boolean}>).filter(([,schema])=>schema['x-host']).map(([name])=>[name,sample]));
const DEVICES:{device:Device;label:string;width:number}[]=[{device:'phone',label:'폰 360',width:360},{device:'tablet',label:'태블릿 768',width:768}];
type Task=keyof typeof focusScreenBlueprints;

/** Every focus screen blueprint drawn through the catalog renderer, with its validation result. */
export function FocusCatalogGallery(){
 const [task,setTask]=useState<Task>('basic');
 const [last,setLast]=useState<FocusSurfaceAction|null>(null);
 const surface=useMemo(()=>[...applyMessages(focusScreenBlueprints[task]).values()][0]!,[task]);
 const issues=useMemo(()=>validateSurface(surface),[surface]);
 return <main className={styles.page} aria-label="A2UI 집중 편집 카탈로그">
  <header className={styles.head}>
   <h1>A2UI 집중 편집 카탈로그</h1>
   <select aria-label="화면" value={task} onChange={event=>setTask(event.currentTarget.value as Task)}>
    {(Object.keys(focusScreenBlueprints) as Task[]).map(id=><option key={id} value={id}>{id}</option>)}
   </select>
   <output data-a2ui-issues={issues.length}>{issues.length?`규칙 위반 ${issues.length}개`:'규칙 통과'}</output>
   <output>{last?`${last.sourceComponentId} → ${JSON.stringify(last.action)}`:''}</output>
  </header>
  {issues.length>0&&<ul>{issues.map(issue=><li key={`${issue.id}-${issue.rule}-${issue.message}`}>{issue.rule} · {issue.id} · {issue.message}</li>)}</ul>}
  <div className={styles.frames}>
   {DEVICES.map(({device,label,width})=><figure key={device} className={styles.frame} style={{width}}>
    <figcaption>{label}</figcaption>
    <FocusSurface surface={surface} device={device} onAction={setLast} custom={SAMPLES}/>
   </figure>)}
  </div>
 </main>;
}
