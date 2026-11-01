import type {StoryProject} from '@knolstory/story-domain';
import {createStoryCheckpoint} from './story-checkpoints';

/** A removed collection is a real storage change, not permission to restore an old tab's snapshot. */
export function assertTakeoverCollectionExists(raw:string|null,beforeRaw:string|null):void{
 if(raw===null&&beforeRaw!==null)throw Error('다른 탭에서 기기 보관함을 삭제했어요. 현재 원고를 작품 파일로 저장한 뒤 보관함을 다시 열어 주세요.');
}

/** The stored version must be recoverable before this tab may replace it with its own draft.
 * Do not turn a failed checkpoint (including size/quota failures) into a successful takeover. */
export function preserveConcurrentStory(storage:Pick<Storage,'getItem'|'setItem'>,project:StoryProject,before:StoryProject|undefined,stored:StoryProject|undefined):boolean{
 if(before&&!stored)throw Error('다른 탭에서 이 작품을 삭제했어요. 현재 원고를 작품 파일로 저장한 뒤 보관함을 다시 열어 주세요.');
 if(!stored)return false;
 const same=(a:StoryProject,b:StoryProject)=>JSON.stringify(a)===JSON.stringify(b);
 if(same(project,stored)||before&&(same(stored,before)||same(project,before)))return false;
 createStoryCheckpoint(storage,stored,'manual');
 return true;
}

/** Keep unsaved works remembered while changing screens; the baseline must come from the guard's
 * last persisted raw value, never from the mutable in-memory work list. Conflicting noncurrent works
 * block takeover rather than quietly discard either revision. */
export function mergeWorkspaceProjects(storage:Pick<Storage,'getItem'|'setItem'>,mine:Readonly<Record<string,StoryProject>>,stored:Readonly<Record<string,StoryProject>>,base:Readonly<Record<string,StoryProject>>,currentId:string):{works:Record<string,StoryProject>;conflict:boolean}{
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 let works={...stored};
 for(const [key,work] of Object.entries(mine)){
  if(key===currentId||same(work,base[key]))continue;
  if(base[key]&&!stored[key]||stored[key]&&!same(stored[key],base[key])&&!same(work,stored[key]))throw Error('다른 탭에서도 다른 작품을 바꿨어요. 현재 원고를 작품 파일로 저장한 뒤 보관함을 다시 열어 주세요.');
  works={...works,[key]:work};
 }
 const current=mine[currentId];
 const conflict=current?preserveConcurrentStory(storage,current,base[currentId],stored[currentId]):false;
 return {works,conflict};
}
