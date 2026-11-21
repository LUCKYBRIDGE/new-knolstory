import {restoreJsonbSnapshot,type AuthoringArchive,type ShortStoryProject} from '@knolstory/compatibility';
import {convertPicturebookToChapters} from '@knolstory/runtime-core';
import {createStoryDocument} from '@knolstory/story-domain';
import {submissionMine,templateGet,type Assignment} from './classroom-api';
import {assertCatalogOnlyMedia} from './catalog-only-authoring';
import {chosenPages} from './picturebook-create';
import {confirmedStages,type PicturebookPermissions} from './picturebook-preparation';
import {shortStoryCoverProject} from './shortstory-cover';
import {documentRead} from './document-api';
import {quoted} from './korean-particle';

/** Where a student's task copy starts. Copies live on one device, so on another device the student
 * can continue from their own submission or a personal online work instead of the template.
 * `from` comes from the task link: "submission" or "online:<recordId>". */
export async function taskStartArchive(task:Assignment,from:string|null,fetcher:typeof fetch=fetch,permissions:PicturebookPermissions={images:true,characters:true}):Promise<AuthoringArchive|null>{
 // A KnolStory task that follows a ShortStory task starts from the student's passed picture book.
 if(task.after&&!from){
  if(!task.after.passed)throw Error(`앞 단계 ${quoted(task.after.title,'을/를')} 선생님이 통과시킨 뒤에 쓸 수 있어요.`);
  const passed=await submissionMine(task.after.id,fetcher);if(!passed)throw Error('통과한 숏스토리 제출본을 찾지 못했어요. 선생님께 확인해 주세요.');
  const archive=await restoreJsonbSnapshot(passed.document);
  if(archive.format!=='shortstory')throw Error('앞 단계 제출본이 숏스토리가 아니에요. 선생님께 확인해 주세요.');
  return picturebookTaskArchive(archive.project,permissions);
 }
 if(from==='submission'){const saved=await submissionMine(task.id,fetcher);if(!saved)throw Error('내 제출본을 찾지 못했어요.');return restoreJsonbSnapshot(saved.document);}
 if(from?.startsWith('online:'))return restoreJsonbSnapshot((await documentRead(from.slice(7),fetcher)).snapshot);
 return task.template?restoreJsonbSnapshot(await templateGet(task.id,fetcher)):null;
}
export const taskStartSource=(url:URL)=>{const from=url.searchParams.get('from');return from==='submission'||/^online:[a-f0-9-]{36}$/.test(from??'')?from:null;};
/** The KnolStory a stage task starts with: one chapter per page of the passed picture book, each first cut
 * on its reviewed or chosen stage, and the page's words and picture kept as the chapter's 그림책 구상. */
export function picturebookTaskArchive(book:ShortStoryProject,permissions:PicturebookPermissions,createId:()=>string=()=>crypto.randomUUID(),now=new Date().toISOString()):AuthoringArchive{
 const chosen=chosenPages(book,book.pages.map(page=>page.id));
 const cover=shortStoryCoverProject(book).cover;
 const {project}=convertPicturebookToChapters({book:chosen,stages:confirmedStages(chosen,{},permissions),workId:createId(),createId,updatedAt:now,...(cover?{cover}:{})});
 assertCatalogOnlyMedia(project);
 return {format:'knolstory',formatVersion:2,document:createStoryDocument({project,savedAt:now,appVersion:'knolstory-next'}),audioResources:[]};
}
