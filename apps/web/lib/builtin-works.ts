/** Stable manuscript identities, independent of display titles and workspace aliases. */
import type {StoryProject} from '@knolstory/story-domain';
export const BUILTIN_WORKS = [
 {id:'rabbit',title:'별주부전',originalDocumentId:'classic-rabbit-tale',knolstoryDocumentId:'pinky-review-main-002'},
 {id:'onggojib',title:'옹고집전',originalDocumentId:'classic-onggojib-tale',knolstoryDocumentId:'pinky-review-main-003'},
 {id:'seonnyeo',title:'선녀와 나무꾼',originalDocumentId:'classic-seonnyeo-tale',knolstoryDocumentId:'pinky-review-main-004'},
 {id:'heungbu',title:'흥부와 놀부',originalDocumentId:'classic-heungbu-tale',knolstoryDocumentId:'heungbu-nolbu-nolstory'},
] as const;
export type BuiltinWorkId=typeof BUILTIN_WORKS[number]['id'];
type EditionWork={key:string;kind:'original'|'example'|'own'|'imported';project:{id:string;title:string}};
export type GroupedBuiltinWork<T> = T & {builtin?:{id:BuiltinWorkId;title:string;original?:T;knolstory?:T}};
/** Group display entries only. Each edition retains its source document and storage key. */
export function groupBuiltinWorks<T extends EditionWork>(works:readonly T[]):GroupedBuiltinWork<T>[] {
 const builtin=BUILTIN_WORKS.flatMap(definition=>{
  const original=works.find(work=>work.kind==='original'&&work.project.id===definition.originalDocumentId);
  const knolstory=works.find(work=>work.kind==='example'&&work.project.id===definition.knolstoryDocumentId);
  const representative=original??knolstory;
  return representative?[{...representative,builtin:{id:definition.id,title:definition.title,original,knolstory}}]:[];
 });
 const independent=works.filter(work=>!builtin.some(group=>group.builtin.original===work||group.builtin.knolstory===work));
 return [...builtin,...independent];
}

/** Work labels are a pristine-thumbnail projection; authored cover/title data wins. */
export function builtinShelfCoverProject<T extends EditionWork & {project:StoryProject}>(work:GroupedBuiltinWork<T>,originals:readonly {project:StoryProject}[]):StoryProject {
 const project=work.builtin?.original?.project??work.project;
 if(!work.builtin)return project;
 const original=originals.find(item=>item.project.id===project.id)?.project;
 if(!original||project.title!==original.title||JSON.stringify(project.cover)!==JSON.stringify(original.cover))return project;
 return {...project,title:work.builtin.title};
}
