"use client";
import { useEffect, useRef, useState } from 'react';
import { AUDIO_CATALOG, searchAudioAssets, type AudioAsset } from '@knolstory/asset-registry';
import { listAudioAssets, registerAudioFile } from '../lib/audio-resources';
import {AudioProvenanceControls} from './audio-provenance-controls';
import styles from './audio-controls.module.css';
type Props={label:string;kind:AudioAsset['kind'];value:string;onChange:(id:string)=>void};
export function AudioPickerField({label,kind,value,onChange}:Props) {
  const [assets,setAssets]=useState<readonly AudioAsset[]>(AUDIO_CATALOG);
  const [query,setQuery]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const preview=useRef<HTMLAudioElement>(null);
  const playingPreview=useRef<HTMLAudioElement|null>(null);
  useEffect(()=>()=>{playingPreview.current?.pause();},[]);
  useEffect(()=>{ let active=true;listAudioAssets().then(items=>{if(active)setAssets(items);}).catch(cause=>{if(active)setError(String(cause instanceof Error ? cause.message : cause));});return()=>{active=false;};},[]);
  const selected=assets.find(item=>item.id===value);
  const matches=searchAudioAssets(assets,kind,query);
  const options=selected && !matches.some(item=>item.id===value) ? [selected,...matches] : matches;
  async function upload(file:File) {
    setBusy(true);setError('');
    try { const asset=await registerAudioFile(file,kind);setAssets(await listAudioAssets());onChange(asset.id);setQuery(''); }
    catch(cause){setError(cause instanceof Error ? cause.message : '오디오 등록에 실패했습니다.');}
    finally{setBusy(false);}
  }
  return <div className={styles.picker}>
    <label>{label} 찾기<input aria-label={`${label} 찾기`} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="이름으로 찾기" /></label>
    <label>{label}<select aria-label={label} value={value} onChange={event=>{preview.current?.pause();onChange(event.target.value);}}><option value="" disabled>선택하세요</option>{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}{value&&!selected&&<option value={value}>보관 자료를 찾을 수 없음 · {value}</option>}</select></label>
    {selected&&<audio ref={preview} onPlay={event=>{playingPreview.current=event.currentTarget;document.querySelectorAll("audio").forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}} aria-label={`${label} 미리 듣기`} controls preload="none" src={selected.src}/>}
    <label className={styles.upload}>내 오디오 등록<input aria-label={`${label} 파일 등록`} type="file" accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value='';}}/></label>
    {value.startsWith('audio:custom:')&&<AudioProvenanceControls assetId={value} label={label}/>}
    <small>WAV·MP3·OGG, 파일당 5MB · 등록한 자료는 작품 파일에 함께 보관됩니다.</small>
    {busy&&<p role="status">오디오를 보관하고 있습니다.</p>}{error&&<p role="alert">{error}</p>}
  </div>;
}
