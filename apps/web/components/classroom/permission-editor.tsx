'use client';
import {PERMISSION_FIELDS,PERMISSION_PRESETS,presetLabel,type EditingPermissions} from '../../lib/classroom-api';
import styles from './classroom.module.css';
/** Preset buttons (글만 / 글·이미지 / 전체) plus one checkbox per limit. */
export function PermissionEditor({value,onChange,disabled=false}:{value:EditingPermissions;onChange:(next:EditingPermissions)=>void;disabled?:boolean}){
 const current=presetLabel(value);
 return <div>
  <div className={styles.presets} role="group" aria-label="자주 쓰는 묶음">
   {PERMISSION_PRESETS.map(preset=><button key={preset.id} type="button" className={styles.btn} aria-pressed={current===preset.label} disabled={disabled} onClick={()=>onChange(preset.permissions)}>{preset.label}</button>)}
  </div>
  <div className={styles.perms} role="group" aria-label="편집 허용 항목">
   <label><input type="checkbox" checked disabled aria-label="글 (항상 가능)"/>글 (항상 가능)</label>
   {PERMISSION_FIELDS.map(field=><label key={field.key}><input type="checkbox" checked={value[field.key]} disabled={disabled} onChange={event=>onChange({...value,[field.key]:event.target.checked})}/>{field.label}</label>)}
  </div>
 </div>;
}
