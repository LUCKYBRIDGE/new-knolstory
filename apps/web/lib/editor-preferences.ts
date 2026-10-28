import {useSyncExternalStore} from 'react';
import type {CutArrangement} from './cut-arrangement';

export type EditingScreen='basic'|'text'|'background'|'characters'|'audio'|'direction'|'audio-direction';
export type Companion=Exclude<EditingScreen,'basic'|'audio-direction'>;
export type EditorPreferences=Readonly<{
 screen:EditingScreen;
 arrangement?:CutArrangement;
 effectAssistance?:Readonly<{showGuides:boolean;snap:boolean}>;
 enabled:Readonly<{characters:boolean;audio:boolean;direction:boolean}>;
 logic:Readonly<{choices:boolean;scores:boolean;branches:boolean}>;
 companions:Readonly<Partial<Record<EditingScreen,readonly Companion[]>>>;
}>;
export const defaultEditorPreferences:EditorPreferences={screen:'basic',arrangement:'auto',effectAssistance:{showGuides:true,snap:true},enabled:{characters:false,audio:false,direction:false},logic:{choices:false,scores:false,branches:false},companions:{}};
const screens:readonly EditingScreen[]=['basic','text','background','characters','audio','direction','audio-direction'];
const companionNames:readonly Companion[]=['text','background','characters','audio','direction'];
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function normalizeEditorPreferences(value:unknown):EditorPreferences {
 const raw=record(value),enabledRaw=record(raw.enabled),logicRaw=record(raw.logic),companionsRaw=record(raw.companions),assistanceRaw=record(raw.effectAssistance);
 const enabled={characters:enabledRaw.characters===true,audio:enabledRaw.audio===true,direction:enabledRaw.direction===true};
 const logic={choices:logicRaw.choices===true,scores:logicRaw.scores===true,branches:logicRaw.branches===true};
 const requested=screens.includes(raw.screen as EditingScreen)?raw.screen as EditingScreen:'basic';
 const screen=requested==='audio-direction'?enabled.audio&&enabled.direction?requested:'basic':(requested==='characters'||requested==='audio'||requested==='direction')&&!enabled[requested]?'basic':requested;
 const companions=Object.fromEntries(companionNames.flatMap(primary=>{
  const values=companionsRaw[primary];
  if(!Array.isArray(values))return [];
  const selected=[...new Set(values.filter((item):item is Companion=>companionNames.includes(item as Companion)&&item!==primary))];
  return selected.length?[[primary,selected]]:[];
 }));
 const arrangement=raw.arrangement==='columns'||raw.arrangement==='stacked'?raw.arrangement:'auto';
 const effectAssistance={showGuides:typeof assistanceRaw.showGuides==='boolean'?assistanceRaw.showGuides:true,snap:typeof assistanceRaw.snap==='boolean'?assistanceRaw.snap:true};
 return {screen,arrangement,effectAssistance,enabled,logic,companions};
}
export const editorPreferencesKey=(projectId:string)=>`knolstory-editor-session-v1:${encodeURIComponent(projectId)}`;
export function readEditorPreferences(storage:Pick<Storage,'getItem'>,projectId:string):EditorPreferences {
 try {const raw=JSON.parse(storage.getItem(editorPreferencesKey(projectId))??'null');return record(raw).version===1?normalizeEditorPreferences(raw):defaultEditorPreferences;}
 catch {return defaultEditorPreferences;}
}
export function writeEditorPreferences(storage:Pick<Storage,'setItem'>,projectId:string,value:EditorPreferences):boolean {
 try {storage.setItem(editorPreferencesKey(projectId),JSON.stringify({version:1,...normalizeEditorPreferences(value)}));return true;}
 catch {return false;}
}

// Each tab owns this UI-only cache. Failed session storage must not block editing.
export function createEditorPreferencesStore(storage:()=>Pick<Storage,'getItem'|'setItem'>) {
 const cache=new Map<string,EditorPreferences>();
 const listeners=new Set<()=>void>();
 const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
 const snapshot=(projectId:string):EditorPreferences=>{
  const cached=cache.get(projectId);
  if(cached)return cached;
  let value=defaultEditorPreferences;
  try {value=readEditorPreferences(storage(),projectId);}catch {/* Browser policy can deny session storage access. */}
  cache.set(projectId,value);
  return value;
 };
 const update=(projectId:string,change:(current:EditorPreferences)=>EditorPreferences)=>{
  const next=normalizeEditorPreferences(change(snapshot(projectId)));
  cache.set(projectId,next);
  try {writeEditorPreferences(storage(),projectId,next);}catch {/* Keep usable in-memory state when session storage is unavailable. */}
  listeners.forEach(listener=>listener());
 };
 return {subscribe,snapshot,update};
}
const sessionStore=createEditorPreferencesStore(()=>window.sessionStorage);
const serverSnapshot=()=>defaultEditorPreferences;
export function useEditorPreferences(projectId:string):readonly [EditorPreferences,(update:(current:EditorPreferences)=>EditorPreferences)=>void] {
 const value=useSyncExternalStore(sessionStore.subscribe,()=>sessionStore.snapshot(projectId),serverSnapshot);
 return [value,change=>sessionStore.update(projectId,change)];
}
