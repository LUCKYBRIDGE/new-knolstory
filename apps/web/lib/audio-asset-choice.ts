import {resolveAudioAsset} from '@knolstory/asset-registry';
/** Recommendations apply only when the author deliberately selects a different registered asset. */
export function audioAssetChoice(currentId:string,nextId:string):Readonly<{assetId:string;loop?:boolean}>{
 const advice=resolveAudioAsset(nextId)?.playbackAdvice;
 return {assetId:nextId,...(nextId!==currentId&&advice?{loop:advice.loopDefault}:{})};
}
