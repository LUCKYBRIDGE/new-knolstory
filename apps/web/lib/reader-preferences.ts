import type {ImagePreloadMode} from '@knolstory/runtime-core';
export const READER_PREFERENCES_KEY='knolstory-reader-preferences-v1';
export const READER_TEXT_SCALES=Object.freeze([.9,1,1.15,1.3]);
export type ReaderTapMode='next'|'halves';
export type ReaderFormat='auto'|'landscape'|'portrait';
const FORMATS:readonly ReaderFormat[]=['auto','landscape','portrait'];
const IMAGE_PRELOAD_MODES:readonly ImagePreloadMode[]=['upcoming','chapter','work','none'];
export type ReaderPreferences=Readonly<{version:1;textScale:number;autoDelaySeconds:number;format:ReaderFormat;tapMode:ReaderTapMode;imagePreloadMode:ImagePreloadMode;imagePreloadCount:number}>;
export const DEFAULT_READER_PREFERENCES:ReaderPreferences=Object.freeze({version:1,textScale:1,autoDelaySeconds:3,format:'auto',tapMode:'next',imagePreloadMode:'upcoming',imagePreloadCount:3});
function valid(value:unknown):value is ReaderPreferences{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const candidate=value as Record<string,unknown>;
 return (candidate.tapMode==='next'||candidate.tapMode==='halves')&&candidate.version===1&&FORMATS.includes(candidate.format as ReaderFormat)&&typeof candidate.textScale==='number'&&READER_TEXT_SCALES.includes(candidate.textScale)&&typeof candidate.autoDelaySeconds==='number'&&Number.isFinite(candidate.autoDelaySeconds)&&candidate.autoDelaySeconds>=1&&candidate.autoDelaySeconds<=30&&IMAGE_PRELOAD_MODES.includes(candidate.imagePreloadMode as ImagePreloadMode)&&typeof candidate.imagePreloadCount==='number'&&Number.isInteger(candidate.imagePreloadCount)&&candidate.imagePreloadCount>=1&&candidate.imagePreloadCount<=10;
}
export function readReaderPreferences(storage:Pick<Storage,'getItem'>):ReaderPreferences{
 const raw=storage.getItem(READER_PREFERENCES_KEY);if(!raw)return DEFAULT_READER_PREFERENCES;
 let value:unknown;try{value=JSON.parse(raw);}catch{return DEFAULT_READER_PREFERENCES;}
 const stored=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
 const candidate=stored?{...stored,tapMode:!Object.hasOwn(stored,'tapMode')?'next':stored.tapMode,format:!Object.hasOwn(stored,'format')?'auto':stored.format==='classic'?'landscape':stored.format,imagePreloadMode:!Object.hasOwn(stored,'imagePreloadMode')?'upcoming':stored.imagePreloadMode,imagePreloadCount:!Object.hasOwn(stored,'imagePreloadCount')?3:stored.imagePreloadCount}:value;
 return valid(candidate)?{version:1,textScale:candidate.textScale,autoDelaySeconds:candidate.autoDelaySeconds,format:candidate.format,tapMode:candidate.tapMode,imagePreloadMode:candidate.imagePreloadMode,imagePreloadCount:candidate.imagePreloadCount}:DEFAULT_READER_PREFERENCES;
}
export function writeReaderPreferences(storage:Pick<Storage,'setItem'>,preferences:ReaderPreferences):void{
 if(!valid(preferences))throw Error('읽기 설정 값을 확인해 주세요.');
 storage.setItem(READER_PREFERENCES_KEY,JSON.stringify({version:1,textScale:preferences.textScale,autoDelaySeconds:preferences.autoDelaySeconds,format:preferences.format,tapMode:preferences.tapMode,imagePreloadMode:preferences.imagePreloadMode,imagePreloadCount:preferences.imagePreloadCount}));
}
