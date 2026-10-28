'use client';
import {useId,useState} from 'react';
import {resolveAudioAsset} from '@knolstory/asset-registry';
import {SecondsInput} from './seconds-input';
import {millisecondsToSeconds,secondsToMilliseconds} from '../lib/authoring-time';
type Range={sourceStartMs?:number;sourceEndMs?:number};
type Props={label:string;assetId:string;value:Range;onChange:(patch:Range)=>void};
export function AudioSourceRangeControls(p:Props){return <details data-audio-source-range><summary>{p.label} 원본 사용 구간</summary><RangeDraft key={p.assetId} {...p}/></details>;}
function RangeDraft({label,assetId,value,onChange}:Props){
 const duration=resolveAudioAsset(assetId)?.durationSeconds,maximum=duration===undefined?86400000:Math.round(duration*1000);
 const [end,setEnd]=useState(value.sourceEndMs===undefined?'':millisecondsToSeconds(value.sourceEndMs)),[error,setError]=useState('');const errorId=useId();
 const [source,setSource]=useState({start:value.sourceStartMs,end:value.sourceEndMs});
 if(source.start!==value.sourceStartMs||source.end!==value.sourceEndMs){setSource({start:value.sourceStartMs,end:value.sourceEndMs});setEnd(value.sourceEndMs===undefined?'':millisecondsToSeconds(value.sourceEndMs));setError('');}
 function commit(){if(!end.trim()){setError('');if(value.sourceEndMs!==undefined)onChange({sourceEndMs:undefined});return;}const time=secondsToMilliseconds(end,0,maximum,value.sourceEndMs??0);if(time===null||time<=(value.sourceStartMs??0)){setError('사용 끝은 시작보다 뒤의 시간을 입력해 주세요. 소수점 셋째 자리까지 지정할 수 있어요.');return;}setError('');if(time!==value.sourceEndMs)onChange({sourceEndMs:time});}
 return <div><SecondsInput label={`${label} 원본 사용 시작`} maxMs={Math.max(0,Math.min(maximum,value.sourceEndMs??maximum)-1)} valueMs={value.sourceStartMs??0} onChange={sourceStartMs=>{if(value.sourceEndMs!==undefined&&sourceStartMs>=value.sourceEndMs){setError('사용 시작은 사용 끝보다 앞이어야 해요.');return;}setError('');onChange({sourceStartMs});}}/><label>원본 사용 끝 (초)<input type="number" aria-label={`${label} 원본 사용 끝 (초)`} aria-invalid={error?true:undefined} aria-describedby={error?errorId:undefined} value={end} min="0" max={maximum/1000} step="0.001" inputMode="decimal" onChange={event=>{setEnd(event.target.value);setError('');}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/></label><small>{duration!==undefined?`원본 길이 ${duration}초. `:''}끝을 비워 두면 원본 끝까지 사용해요. 반복할 때도 이 구간을 사용하며 원본 파일은 바뀌지 않아요.</small><button type="button" disabled={value.sourceStartMs===undefined&&value.sourceEndMs===undefined} onClick={()=>onChange({sourceStartMs:undefined,sourceEndMs:undefined})}>원본 전체 사용</button>{error&&<p id={errorId} role="alert">{error}</p>}</div>;
}
