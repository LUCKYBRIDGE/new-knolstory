import {classicStories,representativeStories,resolveProvidedCatalogStory} from '@knolstory/compatibility';
import type {StoryProject} from '@knolstory/story-domain';
import type {readWorkspace} from './workspace-storage';
type Workspace=ReturnType<typeof readWorkspace>;
const provided=new Map<string,StoryProject>([...representativeStories,...classicStories].map(story=>[story.id,story.project]));
// Parsing can reorder object keys; manuscript array order and every JSON value remain meaningful.
function fingerprint(project:StoryProject):string{
 return JSON.stringify(project,(_key,value:unknown)=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const record=value as Record<string,unknown>;
  return Object.fromEntries(Object.keys(record).sort().map(key=>[key,record[key]]));
 });
}
/** Normalize exact published catalog versions before startup or three-way tab merging.
 * Imported/personal keys, authored differences and all edit/read/recovery state stay untouched. */
export function refreshProvidedWorkspace(loaded:Workspace):Workspace{
 const updates=Object.entries(loaded.works).flatMap(([key,project])=>{
  const original=provided.get(key);if(!original)return [];
  const current=resolveProvidedCatalogStory(original,project);
  return current===project||fingerprint(current)===fingerprint(project)?[]:[[key,current] as const];
 });
 if(!updates.length)return loaded;
 const works={...loaded.works,...Object.fromEntries(updates)};
 return {...loaded,works,project:updates.some(([key])=>key===loaded.storyId)?works[loaded.storyId]:loaded.project};
}
