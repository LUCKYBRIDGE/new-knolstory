import {createStoryDocument,parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {preflight} from './workspace-storage';

export const CHECKPOINT_KEY='knolstory-checkpoints-v1';
const MAX_CHECKPOINTS=10;
const MAX_BYTES=2*1024*1024;
class CheckpointCapacityError extends Error {}
export type StoryCheckpointReason='manual'|'before-delete';
export type StoryCheckpoint=Readonly<{
 id:string;projectId:string;createdAt:string;reason:StoryCheckpointReason;project:StoryProject;
}>;
type CheckpointStorage=Pick<Storage,'getItem'|'setItem'>;
type CheckpointOptions=Readonly<{id?:string;now?:string}>;
const readFailure=()=>new Error('이 기기의 복구 기록을 읽지 못했어요. 저장된 원본은 보존합니다. 작품 파일을 따로 보관해 주세요.');
function validDate(value:unknown):value is string{return typeof value==='string'&&value.length>0&&Number.isFinite(Date.parse(value));}
function validReason(value:unknown):value is StoryCheckpointReason{return value==='manual'||value==='before-delete';}

/** Read a separate, bounded recovery store. Never rewrite or discard malformed raw data. */
export function readStoryCheckpoints(storage:Pick<Storage,'getItem'>):readonly StoryCheckpoint[]{
 try{
  const raw=storage.getItem(CHECKPOINT_KEY);if(raw===null)return [];
  if(raw.length*2>MAX_BYTES)throw readFailure();
  const values:unknown=JSON.parse(raw);if(!Array.isArray(values)||values.length>MAX_CHECKPOINTS)throw readFailure();
  const ids=new Set<string>();
  return values.map((value:unknown)=>{
   if(!value||typeof value!=='object'||Array.isArray(value))throw readFailure();
   const c=value as Record<string,unknown>;
   if(typeof c.id!=='string'||!c.id.trim()||ids.has(c.id)||!validDate(c.createdAt)||!validReason(c.reason)||typeof c.projectId!=='string')throw readFailure();
   const parsed=parseStoryDocument(c.document);if(!parsed.ok||parsed.document.project.id!==c.projectId)throw readFailure();
   preflight(parsed.document.project);ids.add(c.id);
   return {id:c.id,projectId:c.projectId,createdAt:c.createdAt,reason:c.reason,project:parsed.document.project};
  });
 }catch{throw readFailure();}
}
function record(checkpoint:StoryCheckpoint){
 const {project,...metadata}=checkpoint;
 return {...metadata,document:createStoryDocument({project,savedAt:checkpoint.createdAt,appVersion:'knolstory-next'})};
}

/** Explicit checkpoints only: snapshots are independent of subsequent editor changes. */
export function createStoryCheckpoint(storage:CheckpointStorage,project:StoryProject,reason:StoryCheckpointReason,options:CheckpointOptions={}):StoryCheckpoint[]{
 const existing=readStoryCheckpoints(storage);
 const id=options.id??crypto.randomUUID(),createdAt=options.now??new Date().toISOString();
 if(!id.trim()||existing.some(c=>c.id===id)||!validDate(createdAt)||!validReason(reason))throw new Error('복구 기록의 이름 또는 시각을 확인해 주세요.');
 const document=createStoryDocument({project:structuredClone(project),savedAt:createdAt,appVersion:'knolstory-next'});
 const parsed=parseStoryDocument(document);if(!parsed.ok)throw new Error('작품 형식을 확인해 주세요. 복구 기록 원본은 보존합니다.');
 preflight(parsed.document.project);
 const checkpoint:StoryCheckpoint={id,projectId:project.id,createdAt,reason,project:parsed.document.project};
 const records=[record(checkpoint),...existing.map(record)].slice(0,MAX_CHECKPOINTS);
 if(JSON.stringify([records[0]]).length*2>MAX_BYTES)throw new CheckpointCapacityError('이 작품은 복구 기록 용량(2MB)을 넘습니다. .knolstory 파일로 보관해 주세요.');
 let retained=records;
 while(JSON.stringify(retained).length*2>MAX_BYTES)retained=retained.slice(0,-1);
 try{storage.setItem(CHECKPOINT_KEY,JSON.stringify(retained));}
 catch{throw new Error('복구 기록을 저장하지 못했어요. 저장 공간을 확인하고 .knolstory 파일로 보관해 주세요. 기존 기록은 보존합니다.');}
 return [checkpoint,...existing].slice(0,retained.length);
}

/** Oversized stories keep their existing single-cut undo; corrupt or unavailable history still blocks. */
export function recordBeforeCutDeletion(storage:CheckpointStorage,project:StoryProject):string|undefined{
 try{createStoryCheckpoint(storage,project,'before-delete');return undefined;}
 catch(error){if(error instanceof CheckpointCapacityError)return '복구 기록 용량(2MB)을 넘는 긴 원고입니다. 컷 삭제 되돌리기는 이 화면에서 사용할 수 있어요. 재열기 전에 현재 원고와 되돌린 원고를 작품 파일로 보관해 주세요.';throw error;}
}
