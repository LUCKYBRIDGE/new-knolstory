import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {restorePlayback,type PlaybackState} from '@knolstory/runtime-core';
export const PLAYER_SAVES_KEY='knolstory-player-v1';
export type PlayerSlotId='auto'|number;
export type PlayerSlot=Readonly<{projectId:string;projectTitle:string;fingerprint:string;savedAt:string;playback:PlaybackState;summary?:Readonly<{location:string;speaker:string;text:string}>}>;
export type PlayerSaves=Readonly<{version:1;works:Readonly<Record<string,Readonly<Record<string,PlayerSlot>>>>}>;
function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
 return JSON.stringify(value);
}
function fingerprint(value:unknown):string{
 const text=canonical(value);let h=2166136261;
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 return `${text.length}:${(h>>>0).toString(16)}`;
}
/** Only content consumed by playback invalidates its saved route; preparation is independent. */
export function projectPlaybackFingerprint(project:StoryProject):string{
 const {updatedAt:_updatedAt,title:_title,description:_description,cover:_cover,planning:_planning,creativeMemos:_memos,source:_source,sheetUrl:_url,sheetEditable:_editable,...content}=project;
 return `playback-v2:${fingerprint(content)}`;
}
export function isPlayerSlotChanged(project:StoryProject,slot:PlayerSlot):boolean{
 if(slot.fingerprint===projectPlaybackFingerprint(project))return false;
 const {updatedAt:_updatedAt,...legacyContent}=project;
 return slot.fingerprint.startsWith('playback-v2:')||slot.fingerprint!==fingerprint(legacyContent);
}

function validSlotId(id:string|number):boolean{return id==='auto'||Number.isInteger(Number(id))&&Number(id)>=1&&Number(id)<=9;}
function validateSlot(value:unknown):value is PlayerSlot{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>,s=v.playback as Record<string,unknown>|undefined;
 if(v.summary!==undefined){const summary=v.summary as Record<string,unknown>;if(!summary||typeof summary!=='object'||typeof summary.location!=='string'||typeof summary.speaker!=='string'||typeof summary.text!=='string')return false;}
 return typeof v.projectId==='string'&&typeof v.projectTitle==='string'&&typeof v.fingerprint==='string'&&typeof v.savedAt==='string'&&Number.isFinite(Date.parse(v.savedAt))&&!!s&&typeof s==='object'&&Array.isArray(s.path)&&s.path.length<=10000&&s.path.every(x=>typeof x==='string')&&(s.lineId===null||typeof s.lineId==='string')&&['reading','choice','ended','pending'].includes(String(s.status));
}
export function readPlayerSaves(storage:Pick<Storage,'getItem'>):PlayerSaves{
 const raw=storage.getItem(PLAYER_SAVES_KEY);if(!raw)return {version:1,works:{}};
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=='object')throw Error('읽기 저장을 확인해 주세요. 원본 저장은 보존했습니다.');
 const v=value as Record<string,unknown>;
 if(v.version!==1||!v.works||typeof v.works!=='object'||Array.isArray(v.works))throw Error('읽기 저장 형식을 확인해 주세요. 원본 저장은 보존했습니다.');
 for(const [projectId,slots] of Object.entries(v.works)){
  if(!slots||typeof slots!=='object'||Array.isArray(slots))throw Error('읽기 저장 슬롯을 확인해 주세요. 원본 저장은 보존했습니다.');
  for(const [id,slot] of Object.entries(slots)){if(!validSlotId(id)||!validateSlot(slot)||slot.projectId!==projectId)throw Error('읽기 저장 슬롯이 손상되었습니다. 원본 저장은 보존했습니다.');}
 }
 return value as PlayerSaves;
}
export function savePlayerSlot(saves:PlayerSaves,project:StoryProject,state:PlaybackState,id:PlayerSlotId,savedAt=new Date().toISOString()):PlayerSaves{
 if(!validSlotId(id)||!Number.isFinite(Date.parse(savedAt)))throw Error('저장 위치를 확인해 주세요.');
 const playback=restorePlayback(project,state);
 const line=project.lines.find(item=>item.id===(playback.lineId??playback.path.at(-1))),chapter=project.chapters.find(item=>item.id===line?.chapterId);
 const slot:PlayerSlot={projectId:project.id,projectTitle:project.title,fingerprint:projectPlaybackFingerprint(project),savedAt,playback,summary:{location:chapter&&line?cutLabel(chapter,line):'이야기 끝',speaker:line?.speakerName||'해설',text:(line?.text||'빈 글').slice(0,1000)}};
 return {...saves,works:{...saves.works,[project.id]:{...saves.works[project.id],[String(id)]:slot}}};
}
export function writePlayerSaves(storage:Pick<Storage,'setItem'>,saves:PlayerSaves):void{storage.setItem(PLAYER_SAVES_KEY,JSON.stringify(saves));}
export function loadPlayerSlot(project:StoryProject,slot:PlayerSlot,allowChanged=false):Readonly<{state:PlaybackState;changed:boolean}>{
 if(!validateSlot(slot)||slot.projectId!==project.id)throw Error('이 작품의 읽기 저장이 아닙니다.');
 const changed=isPlayerSlotChanged(project,slot);
 if(changed&&!allowChanged)throw Error('저장 이후 작품이 변경되었습니다. 연결을 확인하고 현재 작품에서 이어읽기를 선택해 주세요.');
 return {state:restorePlayback(project,slot.playback),changed};
}
