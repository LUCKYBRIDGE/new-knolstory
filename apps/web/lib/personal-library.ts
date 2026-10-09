import {createStoryDocument,parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {preflight,readWorkspace,type WorkContext} from './workspace-storage';
export const DELETED_WORK_KEY='knolstory-deleted-work-v1';
export type DeletedWork=Readonly<{key:string;project:StoryProject;context?:WorkContext}>;
export const isPersonalWork=(key:string)=>key.startsWith('new:')||key.startsWith('import:');
/** Only project identity changes: cut, asset, flow and cover identities stay authored. */
export function copyPersonalWork(project:StoryProject,id:string,updatedAt:string):StoryProject{
 return {...structuredClone(project),id,title:`${project.title} · 내 사본`,updatedAt};
}
export function writeDeletedWork(storage:Pick<Storage,'setItem'>,work:DeletedWork){
 if(!isPersonalWork(work.key))throw Error('기본 제공 작품은 삭제할 수 없습니다.');
 preflight(work.project);
 storage.setItem(DELETED_WORK_KEY,JSON.stringify({version:1,key:work.key,context:work.context,document:createStoryDocument({project:work.project,savedAt:new Date().toISOString(),appVersion:'knolstory-next-0.1'})}));
}
export function readDeletedWork(storage:Pick<Storage,'getItem'>):DeletedWork|undefined{
 const raw=storage.getItem(DELETED_WORK_KEY);if(!raw)return undefined;
 const value=JSON.parse(raw);
 if(value?.version!==1||typeof value.key!=='string'||!isPersonalWork(value.key))throw Error('삭제 복구 자료를 읽지 못했어요. 저장된 원본은 유지됩니다.');
 const parsed=parseStoryDocument(value.document);if(!parsed.ok)throw Error('삭제 복구 작품 형식을 확인해 주세요. 저장된 원본은 유지됩니다.');
 const loaded=readWorkspace(JSON.stringify({document:value.document,storyId:value.key,contexts:value.context===undefined?{}:{[value.key]:value.context}}));
 return {key:value.key,project:parsed.document.project,context:value.context===undefined?undefined:loaded.contexts[value.key]};
}

export function prepareImportedWork(project:StoryProject,works:Readonly<Record<string,StoryProject>>,builtinIds:readonly string[],copyId:string):StoryProject{
 const content=(work:StoryProject)=>JSON.stringify({...work,id:undefined,updatedAt:undefined});
 const fingerprint=content(project);
 if(Object.entries(works).some(([key,work])=>isPersonalWork(key)&&(work.id===project.id||content(work)===fingerprint)))throw Error('같은 작품이 이미 서재에 있습니다. 기존 작품을 보존했어요. 서재에서 해당 작품을 열어 주세요.');
 return builtinIds.includes(project.id)?{...project,id:copyId}:project;
}
