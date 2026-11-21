'use client';
import {useId} from 'react';
import {EDIT_SCOPE_PRESETS,editScopeLabel,type EditScope} from '../../lib/classroom-api';
import styles from './classroom.module.css';

const TOOLS:readonly {key:keyof EditScope;label:string}[]=[
 {key:'images',label:'그림 고르기 (배경·인물)'},{key:'characters',label:'인물 배치'},{key:'audio',label:'음향'},{key:'direction',label:'연출'},{key:'choices',label:'선택지·점수'},
];
type Mode='class'|'textOnly'|'textAndImages'|'all'|'custom';
/** ‘글만’ already says “only”; other labels get 만 once (‘글과 그림’만), never ‘글만’만. */
const onlyLabel=(label:string)=>label.endsWith('만')?`‘${label}’`:`‘${label}’만`;
const sameScope=(a:EditScope,b:EditScope)=>TOOLS.every(tool=>a[tool.key]===b[tool.key]);
const modeOf=(value:EditScope|null):Mode=>value===null?'class':EDIT_SCOPE_PRESETS.find(item=>sameScope(item.scope,value))?.key??'custom';

/** What students may edit in one writing task. Text is always allowed; null follows the class setting. */
export function EditScopePicker({value,onChange,format,legend='학생이 고칠 수 있는 것'}:{value:EditScope|null;onChange:(next:EditScope|null)=>void;format:'knolstory'|'shortstory';legend?:string}){
 const name=useId(),mode=modeOf(value);
 const tools=format==='shortstory'?TOOLS.filter(tool=>tool.key==='images'||tool.key==='characters'):TOOLS;
 const custom=value??EDIT_SCOPE_PRESETS.find(item=>item.key==='all')!.scope;
 return <fieldset className={styles.editScope} data-edit-scope>
  <legend>{legend}</legend>
  <div className={styles.scopeChoices} role="radiogroup" aria-label={legend}>
   <label><input type="radio" name={name} checked={mode==='class'} onChange={()=>onChange(null)}/>학급 설정대로</label>
   {EDIT_SCOPE_PRESETS.map(item=><label key={item.key}><input type="radio" name={name} checked={mode===item.key} onChange={()=>onChange(item.scope)}/>{item.label}</label>)}
   <label><input type="radio" name={name} checked={mode==='custom'} onChange={()=>onChange({...custom,audio:false})}/>직접 고르기</label>
  </div>
  {mode==='custom'&&<div className={styles.scopeTools} role="group" aria-label="이 과제에서 쓸 수 있는 편집">
   <label><input type="checkbox" checked disabled/>글 (늘 쓸 수 있어요)</label>
   {tools.map(tool=><label key={tool.key}><input type="checkbox" checked={custom[tool.key]&&(tool.key!=='characters'||custom.images)} disabled={tool.key==='characters'&&!custom.images}
    onChange={event=>onChange({...custom,[tool.key]:event.target.checked,...(tool.key==='images'&&!event.target.checked?{characters:false}:{})})}/>{tool.label}</label>)}
  </div>}
  <p className={styles.hint}>{mode==='class'?'학급 설정·학생별 설정을 그대로 따라요.':`이 과제의 작품에서는 ${onlyLabel(editScopeLabel(value))} 고칠 수 있어요. 막힌 편집 화면은 학생에게 보이지 않아요.`}</p>
 </fieldset>;
}
