import {createAuthoringArchive,encodeAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot,type AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import {parseShortStoryLibrary,SHORTSTORY_LIBRARY_KEY} from './shortstory-library';
import {WORKSPACE_KEY,readWorkspace} from './workspace-storage';
import {isPersonalWork} from './personal-library';
import {portableStory,downloadArtifact} from './story-archive';
export type LocalWorkChoice=Readonly<{key:string;title:string}>;
/** Works kept on this device (the 내 작품 list). Reads only; never writes the workspace. */
export function listLocalWorks(storage:Pick<Storage,'getItem'>=localStorage):LocalWorkChoice[]{
 const raw=storage.getItem(WORKSPACE_KEY);
 const stories=raw?Object.entries(readWorkspace(raw).works).filter(([key])=>isPersonalWork(key)).map(([key,project])=>({key,title:project.title||'제목 없는 작품'})):[];
 const books=storage.getItem(SHORTSTORY_LIBRARY_KEY);
 const shortStories=books?parseShortStoryLibrary(books).books.map(book=>({key:`shortstory:${book.id}`,title:`${book.title||'제목 없는 그림책'} · 숏스토리`})):[];
 return [...stories,...shortStories];
}
/** Same snapshot shape the personal online-works upload sends, so the server can reuse its document validation. */
export async function localWorkSnapshot(key:string,storage:Pick<Storage,'getItem'>=localStorage):Promise<AuthoringJsonbSnapshot>{
 if(key.startsWith('shortstory:')){
  const raw=storage.getItem(SHORTSTORY_LIBRARY_KEY);
  const book=raw?parseShortStoryLibrary(raw).books.find(item=>`shortstory:${item.id}`===key):undefined;
  if(!book)throw Error('기기에서 그림책을 찾지 못했어요.');
  return prepareJsonbSnapshot(await createAuthoringArchive({format:'shortstory',project:book}));
 }
 const raw=storage.getItem(WORKSPACE_KEY);if(!raw)throw Error('기기에서 작품을 찾지 못했어요.');
 const project=readWorkspace(raw).works[key];if(!project||!isPersonalWork(key))throw Error('기기에서 작품을 찾지 못했어요.');
 const {audioResources,...document}=await portableStory(project);
 return prepareJsonbSnapshot(await createAuthoringArchive({format:'knolstory',document,audioResources:audioResources??[]}));
}
/** Teachers get a submitted work as a .knolstory file they import into their library like any other work file. */
export async function downloadSubmissionFile(snapshot:AuthoringJsonbSnapshot,fileName:string){
 const archive=await restoreJsonbSnapshot(snapshot);
 downloadArtifact(await encodeAuthoringArchive(archive),`${fileName.replace(/[\\/:*?"<>|]/g,'_')}.${archive.format}`,'application/octet-stream');
}
export function formatSubmittedAt(value:number|null|undefined){return value?new Date(value).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}):'';}
