'use client';
import {useContext,useState} from 'react';
import {StoryBranchEditingContext} from './story-branch-editing-context';
import {cutLabel,storyBranchConditionTerms,type StoryBranchChoice,type StoryBranchCondition,type StoryProject} from '@knolstory/story-domain';
import {orderedLines} from '@knolstory/runtime-core';
import {addBranchConditionChoice,changeBranchConditionChoice,removeBranchConditionChoice,changeBranchConditionMode} from '../lib/branch-condition-edit';
import styles from './story-branch-condition-field.module.css';

type Props={project?:StoryProject;value?:StoryBranchCondition;label:string;onChange:(value:StoryBranchCondition|undefined)=>void;onPreviewFromBranch?:(sourceLineId:string)=>void};
const optionKey=(value:StoryBranchChoice)=>JSON.stringify([value.sourceLineId,value.choiceId]);

/** Conditions always retain exact authored identities, never inferred destinations. */
export function StoryBranchConditionField({project,value,label,onChange,onPreviewFromBranch}:Props){
 const enabled=useContext(StoryBranchEditingContext);
 const [addingFor,setAddingFor]=useState<string|null>(null);
 const [error,setError]=useState('');
 if(!project||!enabled)return null;
 const ordered=orderedLines(project);
 const choices=ordered.flatMap(line=>line.flow?.type==='choice'?[{line,options:line.flow.options}]:[]);
 if(!choices.length&&!value)return null;
 const known=choices.flatMap(({line,options})=>options.map(choice=>({sourceLineId:line.id,choiceId:choice.id})));
 const terms=value?storyBranchConditionTerms(value):[];
 const grouped=value&&'mode' in value;
 const snapshot=JSON.stringify([project.id,label,value]);
 const adding=addingFor===snapshot;
 const used=new Set(terms.map(optionKey));
 const exists=terms.every(term=>known.some(choice=>optionKey(choice)===optionKey(term)));
 const apply=(action:()=>StoryBranchCondition|undefined)=>{try{onChange(action());setAddingFor(null);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'선택 조건을 바꾸지 못했어요. 다시 선택해 주세요.');}};
 const options=(current?:StoryBranchChoice)=>choices.map(({line,options})=>{const chapter=project.chapters.find(item=>item.id===line.chapterId);return <optgroup key={line.id} label={`${chapter?cutLabel(chapter,line):`${line.order}컷`} · ${line.text.slice(0,24)||'빈 글'}`}>{options.map((choice,index)=>{const key=optionKey({sourceLineId:line.id,choiceId:choice.id});return <option key={choice.id} value={key} disabled={used.has(key)&&(!current||key!==optionKey(current))}>{choice.label||`${index+1}번 빈 선택지`}</option>;})}</optgroup>;});
 const select=(term:StoryBranchChoice|undefined,index:number)=>{
  const selected=term?optionKey(term):'';
  const missing=term&&!known.some(choice=>optionKey(choice)===selected);
  const name=grouped?`${label} ${index+1}번 선택`:label;
  return <div key={index} className={grouped?styles.term:undefined}><label>{grouped?`${index+1}번 선택`:label}<select aria-label={name} value={selected} onChange={event=>{if(!event.target.value){apply(()=>undefined);return;}const choice=known.find(item=>optionKey(item)===event.target.value);if(choice)apply(()=>value?changeBranchConditionChoice(value,index,choice):addBranchConditionChoice(undefined,choice));}}>
   {!grouped&&<option value="">선택 이력 조건 없음</option>}
   {missing&&<option value={selected} disabled>연결된 선택지를 찾을 수 없어요</option>}
   {options(term)}
  </select></label>{grouped&&<button type="button" aria-label={`${label} ${index+1}번 선택 · 이 조건 삭제`} onClick={()=>apply(()=>removeBranchConditionChoice(value!,index))}>이 조건 삭제</button>}</div>;
 };
 return <div className={styles.condition} data-branch-condition={label} role="group" aria-label={`${label} 편집`}>
  {grouped&&<label>{label}<select aria-label={`${label} 결합 방식`} value={value.mode} onChange={event=>apply(()=>changeBranchConditionMode(value,event.target.value as 'all'|'any'))}><option value="all">모두 고른 경우 · 그리고</option><option value="any">하나라도 고른 경우 · 또는</option></select></label>}
  {value?terms.map(select):select(undefined,0)}
  {value&&terms.length<8&&known.some(choice=>!used.has(optionKey(choice)))&&<button type="button" onClick={()=>{setAddingFor(adding?null:snapshot);setError('');}}>{adding?'선택 조건 추가 취소':'선택 조건 추가'}</button>}
  {adding&&<label>추가할 선택<select aria-label={`${label} 추가할 선택`} value="" onChange={event=>{const choice=known.find(item=>optionKey(item)===event.target.value);if(choice)apply(()=>addBranchConditionChoice(value,choice));}}><option value="" disabled>선택지를 골라 주세요</option>{options()}</select></label>}
  {error&&<p role="alert">{error}</p>}
  {value&&<><p>{grouped?'앞선 선택들이 위 조건에 맞을 때만 적용해요. 선택 이력을 확인하려면 처음부터 재생해 주세요.':'앞선 컷에서 이 선택지를 고른 경우에만 적용해요. 중간 컷부터 재생하면 이전 선택을 알 수 없으므로 선택지가 있는 컷부터 재생해 확인해 주세요.'}</p>{exists&&onPreviewFromBranch&&ordered[0]&&<button type="button" onClick={()=>onPreviewFromBranch(grouped?ordered[0].id:terms[0].sourceLineId)}>{grouped?'처음부터 선택 확인':'선택지가 있는 컷부터 재생'}</button>}</>}
 </div>;
}
