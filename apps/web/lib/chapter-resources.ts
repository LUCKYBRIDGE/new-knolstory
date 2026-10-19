import {resolveAsset} from '@knolstory/asset-registry';
import {updateStoryChapter} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
export type ResourceType='background'|'character';

/** Lists are picker shortcuts. Removing a shortcut must never erase an authored use. */
export function changeChapterResource(project:StoryProject,chapterId:string,type:ResourceType,assetId:string,action:'add'|'remove'):StoryProject {
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter)throw new Error('이야기 장을 찾을 수 없어요.');
 const key=type==='background'?'backgroundAssetIds':'characterAssetIds';
 if(action==='add'&&resolveAsset(assetId)?.type!==type)throw new Error(`${type==='background'?'배경':'인물'} 그림을 선택해 주세요.`);
 const ids=action==='add'?[...new Set([...chapter[key],assetId])]:chapter[key].filter(id=>id!==assetId);
 return updateStoryChapter(project,chapterId,{[key]:ids});
}
