import {createStoryChoiceChapter,type StoryProject} from '@knolstory/story-domain';
import {orderedLines} from '@knolstory/runtime-core';
import {visitEditingCut} from './editor-navigation';
/** Prepare a branch before any storage/UI mutation. Authored content remains the SSOT. */
export function createChoiceWritingDraft(project:StoryProject,sourceLineId:string,optionId:string,path:unknown,createId:()=>string){
 const result=createStoryChoiceChapter(project,sourceLineId,optionId,createId);
 const tail=orderedLines(project).at(-1);
 const originPath=visitEditingCut(path,sourceLineId,project.lines.map(cut=>cut.id),sourceLineId);
 return {...result,sourceLineId,editingPath:visitEditingCut(originPath,result.line.id,result.project.lines.map(cut=>cut.id),sourceLineId),closedLinearTailId:tail&&!tail.flow?tail.id:undefined};
}
