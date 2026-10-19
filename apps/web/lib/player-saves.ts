import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {restorePlayback,type PlaybackState} from '@knolstory/runtime-core';
export const PLAYER_SAVES_KEY='knolstory-player-v1';
export type PlayerSlotId='auto'|'quick'|number;
export type PlayerThumbnail=Readonly<{dataUrl:string;width:number;height:number}>;
export const PLAYER_THUMBNAIL_MAX_BYTES=40*1024;
export function isPlayerThumbnail(value:unknown):value is PlayerThumbnail{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 if(typeof v.width!=='number'||!Number.isInteger(v.width)||v.width<1||v.width>320||typeof v.height!=='number'||!Number.isInteger(v.height)||v.height<1||v.height>320||typeof v.dataUrl!=='string')return false;
 const match=/^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(v.dataUrl);
 if(!match||match[1].length%4!==0||match[1].length>Math.ceil(PLAYER_THUMBNAIL_MAX_BYTES/3)*4)return false;
 try{const bytes=atob(match[1]);return bytes.length<=PLAYER_THUMBNAIL_MAX_BYTES&&bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';}catch{return false;}
}
/** Source position in Unicode code points, independent of device pagination. */
export type PlayerDialoguePosition=Readonly<{lineId:string;offset:number}>;
export type PlayerSlot=Readonly<{projectId:string;projectTitle:string;fingerprint:string;savedAt:string;playback:PlaybackState;summary?:Readonly<{location:string;speaker:string;text:string}>;thumbnail?:PlayerThumbnail;dialoguePosition?:PlayerDialoguePosition}>;
export type PlayerSaves=Readonly<{version:1|2|3;works:Readonly<Record<string,Readonly<Record<string,PlayerSlot>>>>}>;
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

function validSlotId(id:string|number):boolean{return id==='auto'||id==='quick'||typeof id==='number'&&Number.isInteger(id)&&id>=1&&id<=9||typeof id==='string'&&/^[1-9]$/.test(id);}
function validDialoguePosition(value:unknown):value is PlayerDialoguePosition{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const position=value as Record<string,unknown>;
 return typeof position.lineId==='string'&&position.lineId.length>0&&position.lineId.length<=200&&Number.isSafeInteger(position.offset)&&(position.offset as number)>=0;
}
function normalizeDialoguePosition(project:StoryProject,state:PlaybackState,position?:PlayerDialoguePosition):PlayerDialoguePosition|undefined{
 if(!position||state.status==='ended'||position.lineId!==state.lineId)return undefined;
 const line=project.lines.find(item=>item.id===position.lineId);
 return line?{lineId:line.id,offset:Math.min(position.offset,Array.from(line.text).length)}:undefined;
}
function validateSlot(value:unknown):value is PlayerSlot{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>,s=v.playback as Record<string,unknown>|undefined;
 if(v.dialoguePosition!==undefined&&!validDialoguePosition(v.dialoguePosition))return false;
 if(v.thumbnail!==undefined&&!isPlayerThumbnail(v.thumbnail))return false;
 if(v.summary!==undefined){const summary=v.summary as Record<string,unknown>;if(!summary||typeof summary!=='object'||typeof summary.location!=='string'||typeof summary.speaker!=='string'||typeof summary.text!=='string')return false;}
 if(s?.choiceHistory!==undefined&&(!Array.isArray(s.choiceHistory)||s.choiceHistory.some(record=>!record||typeof record!=='object'||!Number.isInteger(record.pathIndex)||record.pathIndex<0||!Array.isArray(s.path)||record.pathIndex>=s.path.length||typeof record.choiceId!=='string')))return false;
 return typeof v.projectId==='string'&&typeof v.projectTitle==='string'&&typeof v.fingerprint==='string'&&typeof v.savedAt==='string'&&Number.isFinite(Date.parse(v.savedAt))&&!!s&&typeof s==='object'&&Array.isArray(s.path)&&s.path.length<=10000&&s.path.every(x=>typeof x==='string')&&(s.lineId===null||typeof s.lineId==='string')&&['reading','choice','ended','pending','approval-required'].some(status=>s.status===status);
}
export function readPlayerSaves(storage:Pick<Storage,'getItem'>):PlayerSaves{
 const raw=storage.getItem(PLAYER_SAVES_KEY);if(!raw)return {version:3,works:{}};
 let value:unknown;try{value=JSON.parse(raw);}catch{throw Error('저장한 진행을 읽지 못했어요. 기존 데이터는 지우지 않았어요. 현재 읽기는 계속할 수 있어요.');}
 if(!value||typeof value!=='object')throw Error('저장한 진행을 읽지 못했어요. 기존 데이터는 지우지 않았어요. 현재 읽기는 계속할 수 있어요.');
 const v=value as Record<string,unknown>;
 if((v.version!==1&&v.version!==2&&v.version!==3)||!v.works||typeof v.works!=='object'||Array.isArray(v.works))throw Error('저장한 진행을 읽지 못했어요. 기존 데이터는 지우지 않았어요. 현재 읽기는 계속할 수 있어요.');
 for(const [projectId,slots] of Object.entries(v.works)){
  if(!slots||typeof slots!=='object'||Array.isArray(slots))throw Error('저장한 진행을 읽지 못했어요. 기존 데이터는 지우지 않았어요. 현재 읽기는 계속할 수 있어요.');
  for(const [id,slot] of Object.entries(slots)){if(!validSlotId(id)||(v.version===1&&id==='quick')||(v.version!==3&&!!slot&&typeof slot==='object'&&'thumbnail' in slot)||!validateSlot(slot)||slot.projectId!==projectId)throw Error('저장한 진행을 읽지 못했어요. 기존 데이터는 지우지 않았어요. 현재 읽기는 계속할 수 있어요.');}
 }
 return {...value as PlayerSaves,version:3};
}
export function savePlayerSlot(saves:PlayerSaves,project:StoryProject,state:PlaybackState,id:PlayerSlotId,savedAt=new Date().toISOString(),thumbnail?:PlayerThumbnail,dialoguePosition?:PlayerDialoguePosition):PlayerSaves{
 if(dialoguePosition!==undefined&&!validDialoguePosition(dialoguePosition))throw Error('읽던 글 위치를 확인해 주세요.');
 if(thumbnail!==undefined&&!isPlayerThumbnail(thumbnail))throw Error('저장 화면 이미지를 확인해 주세요.');
 if(!validSlotId(id)||!Number.isFinite(Date.parse(savedAt)))throw Error('저장 위치를 확인해 주세요.');
 const playback=restorePlayback(project,state);
 const line=project.lines.find(item=>item.id===(playback.lineId??playback.path.at(-1))),chapter=project.chapters.find(item=>item.id===line?.chapterId);
 const position=normalizeDialoguePosition(project,playback,dialoguePosition);
 const slot:PlayerSlot={projectId:project.id,projectTitle:project.title,fingerprint:projectPlaybackFingerprint(project),savedAt,playback,...(position?{dialoguePosition:position}:{}),...(thumbnail?{thumbnail}:{}),summary:{location:chapter&&line?cutLabel(chapter,line):'이야기 끝',speaker:line?.speakerName||'해설',text:(line?.text||'빈 글').slice(0,1000)}};
 return {...saves,version:3,works:{...saves.works,[project.id]:{...saves.works[project.id],[String(id)]:slot}}};
}
export function writePlayerSaves(storage:Pick<Storage,'setItem'>,saves:PlayerSaves):void{storage.setItem(PLAYER_SAVES_KEY,JSON.stringify(saves));}
export function loadPlayerSlot(project:StoryProject,slot:PlayerSlot,allowChanged=false):Readonly<{state:PlaybackState;changed:boolean;dialoguePosition?:PlayerDialoguePosition}>{
 if(!validateSlot(slot)||slot.projectId!==project.id)throw Error('이 작품의 읽기 저장이 아닙니다.');
 const changed=isPlayerSlotChanged(project,slot);
 if(changed&&!allowChanged)throw Error('저장 이후 작품이 변경되었습니다. 연결을 확인하고 현재 작품에서 이어읽기를 선택해 주세요.');
 const state=restorePlayback(project,slot.playback);
 const dialoguePosition=changed?undefined:normalizeDialoguePosition(project,state,slot.dialoguePosition);
 return {state,changed,...(dialoguePosition?{dialoguePosition}:{})};
}
