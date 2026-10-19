import exclusions from './audio-service-exclusions.json';
/** Historical IDs stay in authored files. Tombstones never carry playable asset URLs. */
export type ExcludedAudioAsset = Readonly<{id:string;name:string;source:string;reason:string}>;
export const EXCLUDED_AUDIO_ASSETS:readonly ExcludedAudioAsset[]=Object.freeze((exclusions as ExcludedAudioAsset[]).map(item=>Object.freeze({...item})));
export function resolveExcludedAudioAsset(id:string):ExcludedAudioAsset|undefined {
 return EXCLUDED_AUDIO_ASSETS.find(item=>item.id===id);
}

/** Capabilities approved for this exact audio item, separate from provider metadata. */
export type AudioUsagePolicy = Readonly<{
 usage:'unrestricted'|'scene-integrated';
 license:'CC0-1.0'|'Pixabay Content License';
 commercialUse:'permitted';
 redistribution:'permitted'|'restricted';
 editorProvision:'permitted'|'scene-integrated';
 standaloneDownload:'permitted'|'prohibited';
 preview:'asset'|'scene';
 exportMode:'reference';
 sourceUrl:string;
 sha256:string;
 evidence:readonly string[];
}>;
/** Reject incomplete or contradictory rights rather than infer them from a provider name. */
export function resolveApprovedAudioUsagePolicy(approval:unknown):AudioUsagePolicy|undefined {
 if(!approval||typeof approval!=='object') return undefined;
 const row=approval as Record<string,unknown>;
 if(typeof row.id!=='string'||! /^(?:audio:(?:music|sound):[a-zA-Z0-9_-]+|audio\.cc0\.[a-z0-9_-]+\.[a-z0-9_-]+)$/.test(row.id)||typeof row.src!=='string'||!row.src.startsWith('/assets/audio/')) return undefined;
 if(typeof row.sha256!=='string'||! /^[a-f0-9]{64}$/.test(row.sha256)||typeof row.sourceUrl!=='string'||!row.sourceUrl.trim()) return undefined;
 if(!Array.isArray(row.evidence)||!row.evidence.length||!row.evidence.every(item=>typeof item==='string'&&item.trim())) return undefined;
 if(row.commercialUse!=='permitted'||row.exportMode!=='reference') return undefined;
 const unrestricted=row.license==='CC0-1.0'&&row.usage==='unrestricted'&&row.redistribution==='permitted'&&row.editorProvision==='permitted'&&row.standaloneDownload==='permitted'&&row.preview==='asset';
 const sceneIntegrated=row.license==='Pixabay Content License'&&row.usage==='scene-integrated'&&row.redistribution==='restricted'&&row.editorProvision==='scene-integrated'&&row.standaloneDownload==='prohibited'&&row.preview==='scene';
 if(!unrestricted&&!sceneIntegrated) return undefined;
 return Object.freeze({usage:row.usage,license:row.license,commercialUse:row.commercialUse,redistribution:row.redistribution,editorProvision:row.editorProvision,standaloneDownload:row.standaloneDownload,preview:row.preview,exportMode:row.exportMode,sourceUrl:row.sourceUrl,sha256:row.sha256,evidence:Object.freeze([...row.evidence])}) as AudioUsagePolicy;
}
