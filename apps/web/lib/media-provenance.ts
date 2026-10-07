/** Record missing evidence explicitly; never turn an upload or provider label into permission. */
export type MediaProvenance=Readonly<{provider:string;source:string;author:string;license:string;commercialUse:'permitted'|'restricted'|'unknown';redistribution:'permitted'|'restricted'|'unknown';attribution:string;generatedAt?:string;generationPlan?:string;providerAssetId?:string;termsUrl?:string;termsCheckedAt?:string;replacementAssetId?:string;sourceSha256:string}>;
export function unknownUploadProvenance(id:string):MediaProvenance{return {provider:'user-supplied',source:'uploaded/imported file; source rights not provided',author:'unknown',license:'unknown',commercialUse:'unknown',redistribution:'unknown',attribution:'unknown',sourceSha256:id.split(':')[2]};}
export function validateMediaProvenance(value:unknown,id:string):MediaProvenance{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('자료 출처 기록 형식을 확인해 주세요.');
 const p=value as Record<string,unknown>;
 for(const key of ['provider','source','author','license','attribution','sourceSha256'])if(typeof p[key]!=='string'||!(p[key] as string).trim()||(p[key] as string).length>2000)throw Error('자료 출처 기록을 확인해 주세요.');
 for(const key of ['generatedAt','generationPlan','providerAssetId','termsUrl','termsCheckedAt','replacementAssetId'])if(p[key]!==undefined&&(typeof p[key]!=='string'||(p[key] as string).length>2000))throw Error('자료 출처 기록을 확인해 주세요.');
 if(!['permitted','restricted','unknown'].includes(String(p.commercialUse))||!['permitted','restricted','unknown'].includes(String(p.redistribution))||p.sourceSha256!==id.split(':')[2])throw Error('자료 출처와 원본 해시를 확인해 주세요.');
 return {...p} as MediaProvenance;
}
export function mediaReleaseDecision(provenance:MediaProvenance,target:'free'|'commercial',attributionIncluded:boolean){
 if(provenance.redistribution!=='permitted'||provenance.license==='unknown')return {allowed:false,replacementRequired:true,reason:'무료 배포 권리부터 확인하거나 자료를 교체해야 합니다.'};
 if(provenance.attribution==='unknown'||provenance.attribution!=='not-required'&&!attributionIncluded)return {allowed:false,replacementRequired:false,reason:'필요한 출처 표기를 함께 제공해야 합니다.'};
 if(target==='commercial'&&provenance.commercialUse!=='permitted')return {allowed:false,replacementRequired:true,reason:'상업적 이용 조건을 확인하거나 출시 전 교체해야 합니다.'};
 return {allowed:true,replacementRequired:false,reason:'기록된 배포 조건과 출처 표시를 충족했습니다.'};
}
