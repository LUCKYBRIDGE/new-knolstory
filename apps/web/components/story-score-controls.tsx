"use client";
import { useState } from 'react';
import { cutLabel, isStoryScoreNumber, STORY_SCORE_MAX_DEFINITIONS, STORY_SCORE_MAX_EFFECTS, STORY_SCORE_MAX_TERMS, STORY_SCORE_MAX_ROUTES, type StoryProject } from '@knolstory/story-domain';
import {orderedLines} from '@knolstory/runtime-core';
import styles from './story-score-controls.module.css';

type Score = { id: string; name: string; description: string; initial: number };
type Term = { scoreId: string; operator: 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'; value: number };
type Condition = { mode: 'all'|'any'; terms: Term[] };
type Effect = { scoreId: string; operation: 'add'|'set'; value: number };
const comparisons: [Term['operator'],string][] = [['gte','이상'],['gt','초과'],['eq','같음'],['ne','다름'],['lte','이하'],['lt','미만']];
const presets = [{name:'신뢰',description:'서로 믿고 도와준 선택의 정도'}, {name:'용기',description:'어려움에 맞선 선택의 정도'}, {name:'욕심',description:'자기 이익을 먼저 챙긴 선택의 정도'}];
function NumberValue({value,onChange,label}:{value:number;onChange:(n:number)=>void;label:string}) {
  const [draft,setDraft]=useState({base:value,text:String(value)});
  const text=draft.base===value?draft.text:String(value);
  const [error,setError]=useState(false);
  return <label>{label}<input aria-label={label} type="number" step="1" min={-1000000} max={1000000} value={text} onChange={e=>{setDraft({base:value,text:e.target.value});setError(false);}} onBlur={()=>{const n=Number(text);if(text.trim()&&isStoryScoreNumber(n)){onChange(n);}else{setError(true);}}}/>{error&&<span role="alert">-1,000,000부터 1,000,000 사이의 정수를 입력해 주세요. 현재 원고에 적용된 값은 {value}입니다.</span>}</label>;
}
function ScoreName({name,label,onChange}:{name:string;label:string;onChange:(name:string)=>void}) {
  const [draft,setDraft]=useState({base:name,text:name});
  const [error,setError]=useState(false);
  const text=draft.base===name?draft.text:name;
  return <label>점수 이름<input aria-label={label} value={text} maxLength={80} onChange={e=>{setDraft({base:name,text:e.target.value});setError(false);}} onBlur={()=>{if(text.trim())onChange(text);else setError(true);}}/>{error&&<span role="alert">점수 이름을 써 주세요. 현재 원고에 적용된 이름은 {name}입니다.</span>}</label>;
}
function ScoreSelect({scores,value,label,onChange}:{scores:Score[];value:string;label:string;onChange:(id:string)=>void}) {
  return <label>{label}<select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{scores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>;
}
export function ProjectScoreEditor({project,onProjectChange}:{project:StoryProject;onProjectChange:(p:StoryProject)=>void}) {
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const scores:Score[]=project.scores??[];
  const update=(next:Score[])=>onProjectChange({...project,scores:next.length?next:undefined});
  const used=(id:string)=>project.lines.flatMap((line)=>{
    const flow=line.flow;
    const conditions=flow?.type==='goto'?(flow.routes??[]).map(r=>r.condition):flow?.type==='choice'?flow.options.map(o=>o.condition).filter((c):c is Condition=>!!c):[];
    const effects=flow?.type==='choice'?flow.options.flatMap(o=>o.effects??[]):[];
    return conditions.some(c=>c.terms.some(t=>t.scoreId===id))||effects.some(e=>e.scoreId===id)?[line.id]:[];
  });
  const add=(scoreName:string,meaning:string)=>{update([...scores,{id:crypto.randomUUID(),name:scoreName.trim(),description:meaning,initial:0}]);setName('');setDescription('');};
  return <section className={styles.editor} aria-label="이야기 점수 설정"><h3>이야기 점수</h3><p>무엇을 기억하고 쌓을지 작가가 정해요. 선택 결과와 조건에 연결하면 나중의 줄거리도 달라집니다. 점수는 독자마다 시작 값에서 출발해요.</p>
    {scores.map((score,index)=>{const refs=used(score.id);return <fieldset key={score.id}><legend>점수 {index+1}</legend><ScoreName name={score.name} label={`점수 ${index+1} 이름`} onChange={name=>update(scores.map(s=>s.id===score.id?{...s,name}:s))}/><label>무엇을 나타내나요?<input aria-label={`점수 ${index+1} 설명`} maxLength={2000} value={score.description} onChange={e=>update(scores.map(s=>s.id===score.id?{...s,description:e.target.value}:s))}/></label><NumberValue label={`점수 ${index+1} 시작 값`} value={score.initial} onChange={initial=>update(scores.map(s=>s.id===score.id?{...s,initial}:s))}/><button type="button" disabled={refs.length>0} onClick={()=>update(scores.filter(s=>s.id!==score.id))}>점수 {index+1} 삭제</button>{refs.length>0&&<small>선택 결과·조건에 연결된 컷 {refs.length}개에서 먼저 이 점수를 해제하면 삭제할 수 있어요. {refs.slice(0,3).map(id=>{const line=project.lines.find(l=>l.id===id);const chapter=project.chapters.find(chapter=>chapter.id===line?.chapterId);return `${line&&chapter?cutLabel(chapter,line):'위치를 확인할 수 없는 컷'}: ${line?.text.slice(0,30)||'빈 컷'}`;}).join(' / ')}</small>}</fieldset>;})}
    <div className={styles.row}><label>새 점수 이름<input aria-label="새 점수 이름" maxLength={80} placeholder="예: 나눔 횟수" value={name} onChange={e=>setName(e.target.value)}/></label><label>새 점수 설명<input aria-label="새 점수 설명" maxLength={2000} placeholder="어떤 선택을 세나요?" value={description} onChange={e=>setDescription(e.target.value)}/></label><button type="button" disabled={!name.trim()||scores.length>=STORY_SCORE_MAX_DEFINITIONS} onClick={()=>add(name,description)}>점수 만들기</button></div>
    <details><summary>예시 점수로 시작하기</summary><p>필요한 예시만 추가하고 이름과 뜻을 바꿀 수 있어요.</p><div className={styles.row}>{presets.map(p=><button key={p.name} type="button" disabled={scores.length>=STORY_SCORE_MAX_DEFINITIONS} onClick={()=>add(p.name,p.description)}>{p.name} 점수 추가</button>)}</div></details>
  </section>;
}
export function ScoreConditionEditor({scores,condition,onChange,label}:{scores:Score[];condition?:Condition;onChange:(c:Condition|undefined)=>void;label:string}) {
  const patch=(index:number,partial:Partial<Term>)=>onChange({...condition!,terms:condition!.terms.map((t,i)=>i===index?{...t,...partial}:t)});
  return <div className={styles.editor} aria-label={label}><strong>{label}</strong>{condition&&<><label>조건을 어떻게 연결할까요?<select aria-label={`${label} 조건 묶음`} value={condition.mode} onChange={e=>onChange({...condition,mode:e.target.value as Condition['mode']})}><option value="all">그리고 · 모든 조건을 만족할 때</option><option value="any">또는 · 하나라도 만족할 때</option></select></label>{condition.terms.map((term,index)=><div className={styles.row} key={index}><ScoreSelect scores={scores} value={term.scoreId} label={`${label} 조건 ${index+1} 점수`} onChange={scoreId=>patch(index,{scoreId})}/><label>비교<select aria-label={`${label} 조건 ${index+1} 비교`} value={term.operator} onChange={e=>patch(index,{operator:e.target.value as Term['operator']})}>{comparisons.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><NumberValue label={`${label} 조건 ${index+1} 값`} value={term.value} onChange={value=>patch(index,{value})}/><button type="button" onClick={()=>onChange(condition.terms.length===1?undefined:{...condition,terms:condition.terms.filter((_,i)=>i!==index)})}>조건 {index+1} 삭제</button></div>)}</>}
    <button type="button" disabled={!scores.length||(condition?.terms.length??0)>=STORY_SCORE_MAX_TERMS} onClick={()=>onChange({mode:condition?.mode??'all',terms:[...(condition?.terms??[]),{scoreId:scores[0].id,operator:'gte',value:1}]})}>조건 추가</button>{!condition&&<small>설정한 점수 조건이 없어요.</small>}
  </div>;
}
export function ChoiceScoreEditor({scores,effects,condition,onChange,label,conditionsEnabled=true}:{conditionsEnabled?:boolean;scores:Score[];effects?:Effect[];condition?:Condition;onChange:(patch:{effects?:Effect[];condition?:Condition})=>void;label:string}) {
  const patch=(index:number,partial:Partial<Effect>)=>onChange({effects:effects!.map((e,i)=>i===index?{...e,...partial}:e)});
  return <section className={styles.editor} aria-label={`${label} 점수 변화${conditionsEnabled?'·표시 조건':''}`}><p>이 선택지를 고르면 아래에 정한 점수 변화가 적용돼요.{conditionsEnabled&&' 표시 조건을 만족하지 않는 선택지는 읽기 화면에 나타나지 않아요.'}</p>{(effects??[]).map((effect,index)=><div className={styles.row} key={index}><ScoreSelect scores={scores} value={effect.scoreId} label={`${label} 결과 ${index+1} 점수`} onChange={scoreId=>patch(index,{scoreId})}/><label>바꾸는 방법<select aria-label={`${label} 결과 ${index+1} 방법`} value={effect.operation} onChange={e=>patch(index,{operation:e.target.value as Effect['operation']})}><option value="add">더하기 (음수는 빼기)</option><option value="set">이 값으로 바꾸기</option></select></label><NumberValue label={`${label} 결과 ${index+1} 값`} value={effect.value} onChange={value=>patch(index,{value})}/><button type="button" onClick={()=>onChange({effects:effects!.length===1?undefined:effects!.filter((_,i)=>i!==index)})}>결과 {index+1} 삭제</button></div>)}<button type="button" disabled={!scores.length||(effects?.length??0)>=STORY_SCORE_MAX_EFFECTS} onClick={()=>onChange({effects:[...(effects??[]),{scoreId:scores[0].id,operation:'add',value:1}]})}>점수 변화 추가</button>{conditionsEnabled&&<ScoreConditionEditor scores={scores} condition={condition} label={`${label} 표시 조건`} onChange={next=>onChange({condition:next})}/>}</section>;
}

type Route = { id:string; condition:Condition; targetLineId:string|null };
export function ScoreRouteEditor({project,routes,onChange}:{project:StoryProject;routes?:Route[];onChange:(routes:Route[]|undefined)=>void}) {
  const scores=project.scores??[];
  if(!scores.length&&!routes?.length)return null;
  const patch=(id:string,partial:Partial<Route>)=>onChange(routes!.map(r=>r.id===id?{...r,...partial}:r));
  const targets=orderedLines(project).map(line=>({id:line.id,label:`${cutLabel(project.chapters.find(chapter=>chapter.id===line.chapterId)!,line)} · ${line.text.slice(0,24)||'빈 컷'}`}));
  const move=(from:number,to:number)=>onChange(routes!.map((route,index)=>index===from?routes![to]:index===to?routes![from]:route));
  return <details className={styles.editor}>
    <summary>점수 조건에 따른 진행</summary>
    <p>위에서부터 처음 만족한 조건으로 이동해요. 맞는 조건이 없으면 기본 도착 컷으로 진행합니다.</p>
    {(routes??[]).map((route,index)=><fieldset key={route.id}>
      <legend>진행 조건 {index+1}</legend>
      <ScoreConditionEditor scores={scores} condition={route.condition} label={`진행 ${index+1}`} onChange={condition=>condition?patch(route.id,{condition}):onChange(routes!.filter(r=>r.id!==route.id))}/>
      <label>조건을 만족하면<select aria-label={`진행 ${index+1} 도착 컷`} value={route.targetLineId??'__end__'} onChange={e=>patch(route.id,{targetLineId:e.target.value==='__end__'?null:e.target.value})}>
        <option value="">다음 컷 미지정</option><option value="__end__">이야기 끝</option>
        {targets.map(target=><option key={target.id} value={target.id}>{target.label}</option>)}
      </select></label>
      <div className={styles.row}>
        {index>0&&<button type="button" onClick={()=>move(index,index-1)}>조건 {index+1} 위로</button>}
        {index<(routes?.length??0)-1&&<button type="button" onClick={()=>move(index,index+1)}>조건 {index+1} 아래로</button>}
        <button type="button" onClick={()=>onChange(routes!.length===1?undefined:routes!.filter(r=>r.id!==route.id))}>진행 조건 {index+1} 삭제</button>
      </div>
    </fieldset>)}
    <button type="button" disabled={!scores.length||(routes?.length??0)>=STORY_SCORE_MAX_ROUTES} onClick={()=>onChange([...(routes??[]),{id:crypto.randomUUID(),condition:{mode:'all',terms:[{scoreId:scores[0].id,operator:'gte',value:1}]},targetLineId:''}])}>점수 진행 조건 추가</button>
  </details>;
}
