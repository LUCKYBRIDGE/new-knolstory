'use client';
import {useContext} from 'react';
import {StoryBranchEditingContext} from './story-branch-editing-context';
import {cutLabel,type StoryBranchCondition,type StoryProject} from '@knolstory/story-domain';
import {orderedLines} from '@knolstory/runtime-core';
import styles from './story-branch-condition-field.module.css';

type Props={project?:StoryProject;value?:StoryBranchCondition;label:string;onChange:(value:StoryBranchCondition|undefined)=>void;onPreviewFromBranch?:(sourceLineId:string)=>void};
const optionKey=(value:StoryBranchCondition)=>JSON.stringify([value.sourceLineId,value.choiceId]);

/** Values come from exact authored IDs; labels and destinations never determine identity. */
export function StoryBranchConditionField({project,value,label,onChange,onPreviewFromBranch}:Props){
 const enabled=useContext(StoryBranchEditingContext);
 if(!project||!enabled)return null;
 const choices=orderedLines(project).flatMap(line=>line.flow?.type==='choice'?[{line,options:line.flow.options}]:[]);
 if(!choices.length&&!value)return null;
 const known=choices.flatMap(({line,options})=>options.map(choice=>({sourceLineId:line.id,choiceId:choice.id})));
 const selected=value?optionKey(value):'';
 const exists=!value||known.some(condition=>optionKey(condition)===selected);
 return <div className={styles.condition}>
  <label>{label}<select aria-label={label} value={selected} onChange={event=>{if(!event.target.value){onChange(undefined);return;}const condition=known.find(item=>optionKey(item)===event.target.value);if(condition)onChange(condition);}}>
   <option value="">선택 이력 조건 없음</option>
   {value&&!exists&&<option value={selected} disabled>연결된 선택지를 찾을 수 없어요</option>}
   {choices.map(({line,options})=>{const chapter=project.chapters.find(item=>item.id===line.chapterId);return <optgroup key={line.id} label={`${chapter?cutLabel(chapter,line):`${line.order}컷`} · ${line.text.slice(0,24)||'빈 글'}`}>{options.map((choice,index)=><option key={choice.id} value={optionKey({sourceLineId:line.id,choiceId:choice.id})}>{choice.label||`${index+1}번 빈 선택지`}</option>)}</optgroup>;})}
  </select></label>
  {value&&<><p>앞선 컷에서 이 선택지를 고른 경우에만 적용해요. 중간 컷부터 재생하면 이전 선택을 알 수 없으므로 선택지가 있는 컷부터 재생해 확인해 주세요.</p>{exists&&onPreviewFromBranch&&<button type="button" onClick={()=>onPreviewFromBranch(value.sourceLineId)}>선택지가 있는 컷부터 재생</button>}</>}
 </div>;
}
