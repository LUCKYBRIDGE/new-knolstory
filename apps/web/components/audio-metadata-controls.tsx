'use client';
import {useEffect,useState} from 'react';
import {audioAssetCategory,validateAudioMetadata,type AudioAsset,type AudioCategory} from '@knolstory/asset-registry';
import {importAudioResources,listAudioResources,type AudioResource} from '../lib/audio-resources';
import {reconcileAudioMetadataDraft,acknowledgeAudioMetadataSave,type AudioMetadataDraft,type AudioMetadataDraftState} from '../lib/audio-metadata-draft';
import styles from './audio-metadata-controls.module.css';
export const AUDIO_CATEGORY_LABELS:Record<AudioCategory,string>={background:'배경음',ambience:'주변 소리(환경음)',effect:'효과음'};
const suggestedTags=['학교 종','피아노','남성','여성','아이','실내','부엌','교실','시장','자연','밤','웃음','울음','달리기'];
export function AudioMetadataControls({asset,label,workId,onSaved}:{asset:AudioAsset;label:string;workId?:string;onSaved:()=>void}){
 const [resource,setResource]=useState<AudioResource|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const incoming:AudioMetadataDraft={name:asset.name,category:audioAssetCategory(asset),tags:asset.metadata?.tags.join(', ')??'',originalName:asset.metadata?.originalName??'',source:asset.metadata?.source??asset.source??''};
 const [state,setState]=useState<AudioMetadataDraftState>({baseline:incoming,draft:incoming});
 const [acknowledged,setAcknowledged]=useState(incoming);
 if(JSON.stringify(state.baseline)!==JSON.stringify(incoming)){setState(reconcileAudioMetadataDraft(state,incoming));setAcknowledged(incoming);}
 const {name,category,tags,originalName,source}=state.draft;
 const change=<K extends keyof AudioMetadataDraft>(key:K,value:AudioMetadataDraft[K])=>setState(current=>({...current,draft:{...current.draft,[key]:value}}));
 const setName=(value:string)=>change('name',value),setCategory=(value:AudioCategory)=>change('category',value),setTags=(value:string)=>change('tags',value),setOriginalName=(value:string)=>change('originalName',value),setSource=(value:string)=>change('source',value);
 const custom=asset.id.startsWith('audio:custom:');
 useEffect(()=>{let active=true;
 if(custom)listAudioResources([asset.id],workId).then(items=>{if(active)setResource(items[0]??null);}).catch(()=>{if(active)setNotice('소리 속성을 불러오지 못했습니다. 다시 선택해 주세요.');});return()=>{active=false;};},[asset.id,workId,custom]);
 async function save(){
  if(!resource||busy)return;
  const submitted=state.draft;setBusy(true);setNotice('');
  try{
   const parsedTags=submitted.tags.split(/[,，\n]/).map(tag=>tag.trim()).filter(Boolean);
   const metadata=validateAudioMetadata({category:submitted.category,tags:[...new Set(parsedTags)],...(submitted.originalName.trim()?{originalName:submitted.originalName.trim()}:{}),...(submitted.source.trim()?{source:submitted.source.trim()}:{} )});
   if(!metadata)throw new Error('소리 속성을 확인해 주세요.');
   const [latest]=await listAudioResources([asset.id],workId);if(!latest)throw Error('소리 원본을 찾지 못했습니다.');
   const saved={...latest,name:submitted.name.trim(),metadata};await importAudioResources([saved],workId);
   const canonical:AudioMetadataDraft={name:saved.name,category:metadata.category,tags:metadata.tags.join(', '),originalName:metadata.originalName??'',source:metadata.source??asset.source??''};
   // Keep the current prop baseline until the resource refresh acknowledges the save.
   setState(current=>({...acknowledgeAudioMetadataSave(current,submitted,canonical),baseline:current.baseline}));
   setAcknowledged(canonical);window.dispatchEvent(new CustomEvent('knolstory-authored-resource-change',{detail:{workId}}));
   setNotice('소리 이름과 속성을 저장했습니다. 작품 파일에도 포함됩니다.');onSaved();
  }catch(cause){setNotice(cause instanceof Error?cause.message:'속성 저장에 실패했습니다. 입력을 확인하고 다시 저장해 주세요.');}
  finally{setBusy(false);}
 }

 function addTag(tag:string){const current=tags.split(',').map(value=>value.trim()).filter(Boolean);setTags([...new Set([...current,tag])].join(', '));}
 return <details className={styles.metadata} data-unsaved-draft={String(custom&&JSON.stringify(state.draft)!==JSON.stringify(acknowledged))}><summary>{label} 이름·속성·원래 이름</summary>{custom?<>
 <label>한글 표시 이름<input aria-label={`${label} 표시 이름`} maxLength={200} value={name} onChange={event=>setName(event.target.value)}/></label>
 <label>소리 종류<select aria-label={`${label} 소리 종류`} value={category} onChange={event=>setCategory(event.target.value as AudioCategory)}>{Object.entries(AUDIO_CATEGORY_LABELS).map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
 <label>속성 태그<input aria-label={`${label} 속성 태그`} value={tags} onChange={event=>setTags(event.target.value)} placeholder="피아노, 여성, 교실처럼 쉼표로 구분"/></label>
 <div className={styles.tags} aria-label="추천 속성">{suggestedTags.map(tag=><button type="button" key={tag} onClick={()=>addTag(tag)}>{tag}</button>)}</div>
 <label>원래 이름<input aria-label={`${label} 원래 이름`} maxLength={200} value={originalName} onChange={event=>setOriginalName(event.target.value)}/></label>
 <label>출처 제공처<input aria-label={`${label} 출처 제공처`} maxLength={200} value={source} onChange={event=>setSource(event.target.value)} placeholder="Pixabay, 직접 녹음 등"/></label>
 <small>출처·이용 조건 기록의 제공처가 있으면 해당 제공처로 필터링합니다. 제공처 이름만으로 이용 허용 여부가 정해지지 않습니다.</small>
 <button type="button" disabled={busy||!resource} onClick={()=>void save()}>소리 속성 저장</button></>:<dl><dt>소리 종류</dt><dd>{AUDIO_CATEGORY_LABELS[category]}</dd><dt>속성</dt><dd>{tags||'등록된 속성 없음'}</dd><dt>원래 이름</dt><dd>{originalName||asset.name}</dd><dt>출처 제공처</dt><dd>{source||'기본 제공 자료'}</dd>{asset.origin&&<><dt>제작자</dt><dd>{asset.origin.author}</dd><dt>출처 페이지</dt><dd><a href={asset.origin.url} target="_blank" rel="noopener noreferrer">원래 소리와 출처 확인</a></dd>{asset.usagePolicy?.usage==='scene-integrated'&&<><dt>사용 범위</dt><dd>이야기 장면에 결합해 사용</dd><dt>원음 사용 제한</dt><dd>원음 별도 다운로드/재배포 제한</dd><dt>작품 파일 내보내기</dt><dd>작품 파일에는 장면의 소리 참조가 저장됩니다. 기본 소리 원음은 첨부되지 않습니다.</dd></>}<dt>상업 작품 사용</dt><dd>{asset.origin.commercialUse==='permitted'?'라이선스 조건 아래 허용':'조건 확인 필요'}</dd><dt>이용 조건</dt><dd><a href={asset.origin.termsUrl} target="_blank" rel="noopener noreferrer">{asset.origin.license}</a> · {asset.origin.usageNote}{asset.origin.contentIdRegistered&&' · Content ID 등록 표시 있음'}</dd></>}</dl>}
 {notice&&<p role="status">{notice}</p>}
 </details>;
}
