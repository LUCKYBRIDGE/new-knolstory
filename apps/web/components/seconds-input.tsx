'use client';
import {useState} from 'react';
import {millisecondsToSeconds,secondsToMilliseconds} from '../lib/authoring-time';
type Props={label:string;valueMs:number;onChange:(milliseconds:number)=>void;minMs?:number;maxMs?:number};
export function SecondsInput(props:Props){
  return <SecondsDraft key={`${props.label}:${props.valueMs}`} {...props}/>;
}
function SecondsDraft({label,valueMs,onChange,minMs=0,maxMs=10000}:Props){
  const [draft,setDraft]=useState(millisecondsToSeconds(valueMs));
  const [error,setError]=useState('');
  function commit(){
    const value=secondsToMilliseconds(draft,minMs,maxMs,valueMs);
    if(value===null){setDraft(millisecondsToSeconds(valueMs));setError(`${minMs/1000}~${maxMs/1000}초 사이에서 소수점 셋째 자리까지 입력해 주세요. 기존 값은 유지됩니다.`);return;}
    setDraft(millisecondsToSeconds(value));setError('');if(value!==valueMs)onChange(value);
  }
  return <label>{label} (초)<input type="number" inputMode="decimal" aria-label={`${label} (초)`} min={minMs/1000} max={maxMs/1000} step="0.001" value={draft} onChange={event=>{setDraft(event.target.value);setError('');}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/>{error&&<small role="alert">{error}</small>}</label>;
}
