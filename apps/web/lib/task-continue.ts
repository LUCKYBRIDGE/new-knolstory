import {restoreJsonbSnapshot,type AuthoringArchive} from '@knolstory/compatibility';
import {submissionMine,templateGet,type Assignment} from './classroom-api';
import {documentRead} from './document-api';

/** Where a student's task copy starts. Copies live on one device, so on another device the student
 * can continue from their own submission or a personal online work instead of the template.
 * `from` comes from the task link: "submission" or "online:<recordId>". */
export async function taskStartArchive(task:Assignment,from:string|null,fetcher:typeof fetch=fetch):Promise<AuthoringArchive|null>{
 if(from==='submission'){const saved=await submissionMine(task.id,fetcher);if(!saved)throw Error('내 제출본을 찾지 못했어요.');return restoreJsonbSnapshot(saved.document);}
 if(from?.startsWith('online:'))return restoreJsonbSnapshot((await documentRead(from.slice(7),fetcher)).snapshot);
 return task.template?restoreJsonbSnapshot(await templateGet(task.id,fetcher)):null;
}
export const taskStartSource=(url:URL)=>{const from=url.searchParams.get('from');return from==='submission'||/^online:[a-f0-9-]{36}$/.test(from??'')?from:null;};
