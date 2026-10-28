import {resolveAudioAsset} from '@knolstory/asset-registry';
/** Recommendations apply only when the author deliberately selects a different registered asset. */
export function audioAssetChoice(currentId:string,nextId:string):Readonly<{assetId:string;loop?:boolean;sourceStartMs?:number;sourceEndMs?:number}>{
 const advice=resolveAudioAsset(nextId)?.playbackAdvice;
 return {assetId:nextId,...(nextId!==currentId?{sourceStartMs:undefined,sourceEndMs:undefined}:{}),...(nextId!==currentId&&advice?{loop:advice.loopDefault}:{})};
}
