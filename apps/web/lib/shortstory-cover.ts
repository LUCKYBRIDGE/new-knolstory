import { DEFAULT_COVER, type StoryProject, type StoryCover } from '@knolstory/story-domain';
import type { ShortStoryProject } from '@knolstory/compatibility';
import { createCoverDesign } from './book-cover-editor';
/** Metadata-only adapter reuses the canonical three-face cover editor. No story playback conversion. */
export function shortStoryCoverProject(project:ShortStoryProject):StoryProject {
 return {id:project.id,title:project.title,description:project.description,chapters:[],lines:[],planning:{premise:'',structureMode:'free',material:'',theme:'',mainCharacter:'',mainGoal:'',centralProblem:'',stakes:'',endingChange:'',opening:'',middle:'',crisis:'',climax:'',ending:'',characterNotes:'',worldNotes:'',mood:'',openQuestions:'',freeNotes:''},creativeMemos:[],sheetUrl:'',sheetEditable:false,speakerNames:[],updatedAt:project.updatedAt,cover:{...DEFAULT_COVER,backgroundId:project.cover.backgroundId,characterId:project.cover.characterId,author:project.authorDisplayName,subtitle:project.description,authorNote:project.cover.authorNote,...(project.cover.design?{design:project.cover.design}:{})}};
}
export function applyShortStoryCover(project:ShortStoryProject,cover:StoryCover,title:string):ShortStoryProject {
 return {...project,title,description:cover.subtitle,authorDisplayName:cover.author,cover:{backgroundId:cover.backgroundId,characterId:cover.characterId,authorNote:cover.authorNote,design:cover.design??createCoverDesign(cover)},updatedAt:new Date().toISOString()};
}
