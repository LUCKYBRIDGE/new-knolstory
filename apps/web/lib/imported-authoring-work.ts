import type {StoryProject} from '@knolstory/story-domain';
/** Spreadsheet edits carry the source ID: create an independent identity when already owned here. */
export function independentImportedWork(project:StoryProject,works:Readonly<Record<string,StoryProject>>,builtinIds:readonly string[],newId:string):StoryProject{
 const occupied=builtinIds.includes(project.id)||Object.values(works).some(work=>work.id===project.id);
 return occupied?{...project,id:newId}:project;
}
