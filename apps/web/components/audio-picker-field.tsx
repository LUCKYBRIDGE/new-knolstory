"use client";
import { useEffect, useMemo, useState } from 'react';
import { AUDIO_CATALOG, resolveAudioAsset, resolveExcludedAudioAsset, searchAudioAssets, audioAssetCategory, type AudioAsset, type AudioCategory } from '@knolstory/asset-registry';
import { listAudioAssets } from '../lib/audio-resources';
import {AudioAudition} from './audio-audition';
import {AudioMetadataControls,AUDIO_CATEGORY_LABELS} from './audio-metadata-controls';
import {AudioProvenanceControls} from './audio-provenance-controls';
import styles from './audio-controls.module.css';
type Props={sourceStartMs?:number;sourceEndMs?:number;volume?:number;onAssetName?:(id:string,name:string)=>void;interactive?:boolean;active?:boolean;label:string;kind:AudioAsset['kind'];value:string;onChange:(id:string)=>void;workId?:string;purpose?:'background'|'ambience'|'effect'};
export function AudioPickerField({sourceStartMs,sourceEndMs,volume,label,kind,value,onChange,workId,purpose,active=true,interactive=true,onAssetName}:Props) {
  const [assets,setAssets]=useState<readonly AudioAsset[]>(AUDIO_CATALOG);
  const [query,setQuery]=useState('');const [category,setCategory]=useState<AudioCategory|''>(purpose??'');const [tag,setTag]=useState('');const [source,setSource]=useState('');const [error,setError]=useState('');
  useEffect(()=>{
    let alive=true,request=0;
    const refresh=()=>{const sequence=++request;void listAudioAssets(workId).then(items=>{if(alive&&sequence===request)setAssets(items);}).catch(cause=>{if(alive&&sequence===request)setError(cause instanceof Error?cause.message:'소리 목록을 불러오지 못했습니다.');});};
    const changed=(event:Event)=>{if((event as CustomEvent<{workId?:string}>).detail?.workId===workId)refresh();};
    window.addEventListener('knolstory-audio-resources-change',changed);refresh();
    return()=>{alive=false;window.removeEventListener('knolstory-audio-resources-change',changed);};
  },[workId,interactive,active]);
  const refreshResources=()=>window.dispatchEvent(new CustomEvent('knolstory-audio-resources-change',{detail:{workId}}));
  const excluded=resolveExcludedAudioAsset(value);
  const registered=resolveAudioAsset(value);
  const selected=useMemo(()=>excluded?undefined:assets.find(item=>item.id===value)??(registered?{...registered,id:value}:undefined),[excluded,assets,value,registered]);
  useEffect(()=>{if(selected)onAssetName?.(selected.id,selected.name);},[selected,onAssetName]);
  const scenePreview=selected?.usagePolicy?.preview==='scene';
  const catalog=assets.filter(item=>AUDIO_CATALOG.some(registered=>registered.id===item.id));
  const available=searchAudioAssets(catalog,kind,'');
  const facetTags=[...new Set(available.flatMap(item=>item.metadata?.tags??[]))].sort((a,b)=>a.localeCompare(b,'ko'));
  const facetSources=[...new Set(available.map(item=>item.source??item.metadata?.source??'기본 제공 자료'))].sort();
  const matches=searchAudioAssets(catalog.map(item=>({...item,source:item.source??item.metadata?.source??'기본 제공 자료'})),kind,query,category||undefined,{...(tag?{tags:[tag]}:{}),...(source?{source}:{})});
  const retained=selected&&!registered;
  const options=selected&&!retained && !matches.some(item=>item.id===value) ? [selected,...matches.filter(item=>item.id!==registered?.id)] : matches;
  return <div className={styles.picker}>
    <label>{label} 찾기<input aria-label={`${label} 찾기`} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="이름·속성·원래 이름으로 찾기" /></label>
    <details className={styles.filters}><summary>자세히 찾기{(tag||source||category!==(purpose??''))?' · 조건 적용':''}</summary><div className={styles.row}>
    <label>소리 종류 필터<select aria-label={`${label} 종류 필터`} value={category} onChange={event=>setCategory(event.target.value as AudioCategory|'')}><option value="">모든 종류</option>{Object.entries(AUDIO_CATEGORY_LABELS).map(([value,title])=><option value={value} key={value}>{title} ({available.filter(item=>audioAssetCategory(item)===value).length})</option>)}</select></label>
    <label>속성 필터<select aria-label={`${label} 속성 필터`} value={tag} onChange={event=>setTag(event.target.value)}><option value="">모든 속성</option>{facetTags.map(value=><option key={value} value={value}>{value} ({available.filter(item=>item.metadata?.tags.includes(value)).length})</option>)}</select></label>
    <label>출처 필터<select aria-label={`${label} 출처 필터`} value={source} onChange={event=>setSource(event.target.value)}><option value="">모든 출처</option>{facetSources.map(value=><option key={value} value={value}>{value} ({available.filter(item=>(item.source??item.metadata?.source??'기본 제공 자료')===value).length})</option>)}</select></label>
    </div></details><small>검색 결과 {matches.length}개{selected&&!matches.some(item=>item.id===value)?' · 선택한 소리는 필터 밖이지만 유지됩니다.':''}</small>
    <label>{label}<select aria-label={label} value={value} onChange={event=>{if(interactive&&resolveAudioAsset(event.target.value))onChange(event.target.value);}}><option value="" disabled>선택하세요</option>{retained&&<option disabled value={value}>기존 외부 자료 · {selected.name}</option>}{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}{excluded&&<option disabled value={value}>서비스 제공 제외 · {excluded.name}</option>}{value&&!selected&&!excluded&&<option value={value}>보관 자료를 찾을 수 없음 · {value}</option>}</select></label>
    {excluded&&<p role="alert">{excluded.name}: {excluded.reason} 기존 작품의 소리 ID는 유지됩니다. 사용할 소리를 다시 선택해 주세요.</p>}
    {selected?.playbackAdvice&&<p className={styles.hint}>{selected.playbackAdvice.note} 권장 음량: {Math.round(100*Math.pow(10,selected.playbackAdvice.suggestedGainDb/20))}%.</p>}
    {selected&&scenePreview&&<p>이 소리는 이야기 장면에 결합해 사용합니다. 선택한 뒤 ‘이 컷부터 재생’에서 장면과 함께 들어 주세요.</p>}
    {selected&&!scenePreview&&<AudioAudition key={selected.id} src={selected.src} label={label} active={active&&interactive} volume={volume} sourceStartMs={sourceStartMs} sourceEndMs={sourceEndMs}/>}
    {selected&&<AudioMetadataControls key={`${workId}:${selected.id}`} asset={selected} label={label} workId={workId} onSaved={refreshResources}/>}
    {value.startsWith('audio:custom:')&&<AudioProvenanceControls workId={workId} assetId={value} label={label} onSaved={refreshResources}/>}
    <small>놀스토리에 등록된 소리만 선택할 수 있어요.</small>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
