import {expect,it} from 'vitest';
import {classicStories,representativeStories,resolveProvidedCatalogStory,refineProvidedStory,enhanceExistingStory} from '@knolstory/compatibility';
import {connectCatalogPerspective} from '../../../packages/compatibility/src/catalog-perspective';
import {createPlayback} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import type {readWorkspace} from './workspace-storage';
import {refreshProvidedWorkspace} from './provided-workspace-refresh';
const stories=[...representativeStories,...classicStories];
function workspace(key:string,project:StoryProject):ReturnType<typeof readWorkspace>{
 const playback=createPlayback(project),lineId=project.lines[0].id;
 const context={lineId,editingPath:[lineId],playback,hasRead:true,editorView:'writer' as const,activeTool:'writer' as const,writerChapterId:project.chapters[0].id,previewProfile:'portrait' as const};
 return {project,storyId:key,works:{[key]:project},contexts:{[key]:context},playback,mode:'play',view:'editor',warning:'kept warning',checked:['kept check'],deletedWork:{key:'new:deleted',project,context}};
}
it('refreshes exact previous published versions of every builtin and preserves all navigation and recovery state',()=>{
 for(const story of stories){
  const previous=connectCatalogPerspective(enhanceExistingStory(refineProvidedStory(story.project))),loaded=workspace(story.id,previous),before=structuredClone(loaded),expected=resolveProvidedCatalogStory(story.project);
  const result=refreshProvidedWorkspace(loaded);
  expect(result.project,story.id).toEqual(expected);expect(result.works[story.id]).toBe(result.project);
  expect({...result,project:loaded.project,works:loaded.works}).toEqual(loaded);
  expect(result.contexts).toBe(loaded.contexts);expect(result.playback).toBe(loaded.playback);expect(result.deletedWork).toBe(loaded.deletedWork);expect(result.checked).toBe(loaded.checked);expect(loaded).toEqual(before);
 }
});
it('keeps a current published workspace reference even when object key order changed during storage parsing',()=>{
 const reorder=(value:unknown):unknown=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorder(item)])):value;
 for(const story of stories){const current=reorder(resolveProvidedCatalogStory(story.project)) as StoryProject,loaded=workspace(story.id,current);expect(refreshProvidedWorkspace(loaded)).toBe(loaded);}
});
it('does not change any authored chapter or content edits on any builtin',()=>{
 for(const story of stories){const current=resolveProvidedCatalogStory(story.project);
  for(const edited of [{...current,title:'내 작품 제목'},{...current,chapters:current.chapters.map((chapter,i)=>i?chapter:{...chapter,chapterNumber:77,title:'직접 쓴 장 제목'})},{...current,lines:current.lines.map((line,i)=>i?line:{...line,text:'직접 쓴 본문'})}]){
   const loaded=workspace(story.id,edited);expect(refreshProvidedWorkspace(loaded)).toBe(loaded);expect(loaded.project).toBe(edited);
  }
 }
});
it('refreshes inactive builtin works without touching active imports or personal copies with a catalog project ID',()=>{
 const story=representativeStories.find(item=>item.id==='onggojib')!,project=story.project,loaded=workspace('import:mine',project),works={...loaded.works,'new:mine':project,[story.id]:project};
 const input={...loaded,works},result=refreshProvidedWorkspace(input);
 expect(result.project).toBe(project);expect(result.works['import:mine']).toBe(project);expect(result.works['new:mine']).toBe(project);expect(result.works[story.id]).toEqual(resolveProvidedCatalogStory(project));expect(result.contexts).toBe(loaded.contexts);
});
it('leaves an entirely personal collection unchanged',()=>{const project={...representativeStories[0].project,id:'my-project'},loaded=workspace('new:my-project',project);expect(refreshProvidedWorkspace(loaded)).toBe(loaded);});
