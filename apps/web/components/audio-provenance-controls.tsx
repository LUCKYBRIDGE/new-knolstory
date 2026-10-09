'use client';
import {useEffect,useState} from 'react';
import {importAudioResources,listAudioResources,type AudioResource} from '../lib/audio-resources';
import {unknownUploadProvenance,type MediaProvenance} from '../lib/media-provenance';
export function AudioProvenanceControls({assetId,label}:{assetId:string;label:string}){
 const [resource,setResource]=useState<AudioResource|null>(null),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;listAudioResources([assetId]).then(items=>{if(active)setResource(items[0]??null);}).catch(()=>{if(active)setNotice('출처 기록을 불러오지 못했어요. 원본 음원은 유지됩니다.');});return()=>{active=false;};},[assetId]);
 if(!resource)return notice?<p role="status">{notice}</p>:null;
 const provenance=resource.provenance??unknownUploadProvenance(assetId);
 function patch(values:Partial<MediaProvenance>){setResource(current=>current?{...current,provenance:{...(current.provenance??unknownUploadProvenance(assetId)),...values}}:current);setNotice('출처 기록을 수정했어요. 출처 기록 저장을 눌러 보관하세요.');}
 async function save(){if(!resource)return;try{await importAudioResources([resource]);setNotice('출처 기록을 음원과 함께 보관했습니다. 작품 파일에도 포함됩니다.');}catch{setNotice('출처 기록 저장에 실패했어요. 다시 저장해 주세요.');}}

 return <details><summary>{label} 출처·이용 조건 기록</summary><p>자료의 권리 근거를 기록하세요. 미확인 자료는 공개 배포 가능으로 취급하지 않습니다.</p>{([['provider','제공처'],['source','원본 출처'],['author','제작자'],['license','라이선스'],['generationPlan','생성 당시 요금제'],['generatedAt','생성 날짜'],['providerAssetId','제공처 자료 번호'],['termsUrl','이용 조건 주소'],['termsCheckedAt','조건 확인 날짜'],['attribution','필요한 출처 표시'],['replacementAssetId','교체할 자료 번호']] as const).map(([field,title])=><label key={field}>{title}<input aria-label={`${label} ${title}`} maxLength={2000} value={provenance[field]??''} onChange={e=>patch({[field]:e.target.value})}/></label>)}{(['redistribution','commercialUse'] as const).map(field=><label key={field}>{field==='redistribution'?'무료 배포·재배포':'상업적 이용'}<select aria-label={`${label} ${field==='redistribution'?'재배포 조건':'상업 이용 조건'}`} value={provenance[field]} onChange={e=>patch({[field]:e.target.value as MediaProvenance[typeof field]})}><option value="unknown">미확인</option><option value="permitted">근거 확인 · 허용</option><option value="restricted">제한 있음 · 출시 전 확인/교체</option></select></label>)}<button type="button" onClick={()=>void save()}>출처 기록 저장</button><p role="status">{notice}</p></details>;
}
