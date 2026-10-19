import type {AudioMetadata} from './audio-metadata';
import storyScore from './story-score.json';
import cc0Audio from './external-cc0-audio.json';
import approvals from './audio-service-approvals.json';
import pixabayAudio from './pixabay-audio.json';
import stagedAudio from './staged-cc0-audio.json';
import stagedAliases from './staged-cc0-audio-aliases.json';
import aliasSearch from './staged-cc0-alias-search.json';
import {resolveApprovedAudioUsagePolicy,type AudioUsagePolicy} from './audio-service-policy';
const approvedAudioSources=new Map(approvals.version===2 ? approvals.assets.flatMap(asset=>{
 const policy=resolveApprovedAudioUsagePolicy(asset);
 return policy ? [[asset.id,{src:asset.src,policy}] as const] : [];
}) : []);
/** Audio is separate from the image catalogue; both use stable asset IDs. */
export type AudioAsset = Readonly<{ delivery?:'on-demand';runtimeBytes?:number;revision?:number;playbackAdvice?:Readonly<{loopDefault:boolean;note:string;suggestedGainDb:number}>; id: string; name: string; kind: 'music' | 'sound'; src: string; runtimePath: string; mime: string; durationSeconds?: number; metadata?:AudioMetadata; usagePolicy?:AudioUsagePolicy; source?:string;origin?:Readonly<{url:string;author:string;license:string;termsUrl:string;commercialUse:'permitted'|'restricted'|'unknown';usageNote:string;contentIdRegistered?:boolean}> }>;
export const AUDIO_CATALOG: readonly AudioAsset[] = Object.freeze([
  { id: 'audio:music:forest', name: '숲의 아침 · 잔잔한 배경음', kind: 'music', src: '/assets/audio/forest.wav', runtimePath: 'assets/audio/forest.wav', mime: 'audio/wav', durationSeconds: 8 },
  { id: 'audio:music:night', name: '밤의 길 · 차분한 배경음', kind: 'music', src: '/assets/audio/night.wav', runtimePath: 'assets/audio/night.wav', mime: 'audio/wav', durationSeconds: 8 },
  { id: 'audio:sound:chime', name: '맑은 종소리', kind: 'sound', src: '/assets/audio/chime.wav', runtimePath: 'assets/audio/chime.wav', mime: 'audio/wav', durationSeconds: 1.2 },
  { id: 'audio:sound:step', name: '가벼운 발걸음', kind: 'sound', src: '/assets/audio/step.wav', runtimePath: 'assets/audio/step.wav', mime: 'audio/wav', durationSeconds: .5 },
...(storyScore as AudioAsset[]),
...(cc0Audio as AudioAsset[]),
...(pixabayAudio as AudioAsset[]),
...(stagedAudio as AudioAsset[]),
].filter(asset=>approvedAudioSources.get(asset.id)?.src===asset.src).map(asset => Object.freeze({...asset,usagePolicy:approvedAudioSources.get(asset.id)!.policy,origin:(asset as AudioAsset).origin??{url:asset.src.startsWith('/assets/audio/story-score/')?'/assets/audio/story-score/README.md':'/assets/audio/README.md',author:'놀스토리',license:'CC0-1.0',termsUrl:'https://creativecommons.org/publicdomain/zero/1.0/',commercialUse:'permitted',usageNote:'직접 합성 제작한 소리. 상업적 사용·수정·공용 편집 제공 허용.'},metadata:(asset as AudioAsset).metadata??{category:asset.kind==='sound'?'effect':asset.id.startsWith('audio:music:ambience-')?'ambience':'background',tags:asset.kind==='sound'?['기본 효과음']:['기본 제공'],source:'놀스토리 직접 제작',originalName:asset.name}} as AudioAsset)));
const audioById=new Map(AUDIO_CATALOG.map(asset=>[asset.id,asset]));
const aliases:Readonly<Record<string,string>>=stagedAliases;
const searchAliases=new Map<string,string>();
for(const [alias,canonical] of Object.entries(aliases)){const details=(aliasSearch as Record<string,{name:string;description:string;tags:string[];originalName:string}>)[alias];searchAliases.set(canonical,`${searchAliases.get(canonical)??''} ${alias} ${details?`${details.name} ${details.description} ${details.tags.join(' ')} ${details.originalName}`:''}`);}
export function resolveAudioAsset(id: string): AudioAsset | undefined { return audioById.get(id)??audioById.get(aliases[id]); }
export type AudioCategory = 'background' | 'ambience' | 'effect';
/** Author-visible role; storage kinds and existing IDs keep their meaning. */
export function audioAssetCategory(asset: AudioAsset): AudioCategory {
  return asset.metadata?.category ?? (asset.kind === 'sound' ? 'effect' : asset.id.startsWith('audio:music:ambience-') ? 'ambience' : 'background');
}
export function searchAudioAssets(assets: readonly AudioAsset[], kind: AudioAsset['kind'], query: string, category?: AudioCategory, filters?:Readonly<{tags?:readonly string[];source?:string}>): AudioAsset[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return assets.filter(asset => {
   const source=asset.source??asset.metadata?.source??'';
   const custom=Boolean(customAudioRuntimePath(asset.id));
   const text=`${asset.name} ${asset.id} ${searchAliases.get(asset.id)??''} ${asset.metadata?.originalName??''} ${source} ${(asset.metadata?.tags??[]).join(' ')}`.toLocaleLowerCase();
   return (asset.kind===kind||custom)&&(!category||(custom&&!asset.metadata)||audioAssetCategory(asset)===category)&&(!filters?.source||source===filters.source)&&(filters?.tags??[]).every(tag=>asset.metadata?.tags.includes(tag))&&terms.every(term=>text.includes(term));
  });
}
/** Custom IDs encode a content digest and safe extension for synchronous scene compilation. */
export function customAudioRuntimePath(id: string): string | undefined {
  const match = /^audio:custom:([a-f0-9]{64}):(wav|mp3|ogg)$/.exec(id);
  return match ? `assets/audio/${match[1]}.${match[2]}` : undefined;
}
