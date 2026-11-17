import {prepareJsonbSnapshot,type AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import {documentCreate,documentList,documentSave,type OnlineDocumentMetadata} from './document-api';
import {studentTitle} from './student-title';

/** Bringing a handed-in copy back into the student's personal online works (5 works, 10MB).
 * The submission itself stays in the submission space. */
export const snapshotTitle=(snapshot:AuthoringJsonbSnapshot)=>snapshot.content.format==='shortstory'?snapshot.content.project.title:snapshot.content.document.project.title;
/** The same work under another title (and, to replace an online work, that work's identity). */
export async function retitle(snapshot:AuthoringJsonbSnapshot,title:string,projectId?:string):Promise<AuthoringJsonbSnapshot>{
 const content=structuredClone(snapshot.content);
 const project=content.format==='shortstory'?content.project:content.document.project;
 project.title=title;if(projectId)project.id=projectId;
 return prepareJsonbSnapshot(content);
}
/** "07_하늘 (2)", "07_하늘 (3)" … the first title no online work uses yet. */
export function freeTitle(title:string,taken:ReadonlySet<string>):string{
 const base=title.replace(/\s\(\d+\)$/,'');
 for(let n=2;n<1000;n++){const next=`${base} (${n})`;if(!taken.has(next))return next;}
 return `${base} (${Date.now()})`;
}
export type ImportPlan=Readonly<{snapshot:AuthoringJsonbSnapshot;title:string;existing:OnlineDocumentMetadata|null;suggestion:string}>;
/** Looks for an online work with the same title (and kind) before anything is written. */
export async function planImport(snapshot:AuthoringJsonbSnapshot,accountId:string,fetcher:typeof fetch=fetch):Promise<ImportPlan>{
 const title=studentTitle(snapshotTitle(snapshot));
 const {documents}=await documentList(fetcher,undefined,accountId);
 const live=documents.filter(item=>!item.deletedAt);
 const existing=live.find(item=>item.title===title&&item.format===snapshot.content.format)??null;
 return {snapshot,title,existing,suggestion:freeTitle(title,new Set(live.map(item=>item.title)))};
}
const key=()=>crypto.randomUUID();
/** A new online work under `title`, with its own identity so it never collides with another. */
export async function importAsNew(plan:ImportPlan,title:string,csrf:string,accountId:string,fetcher:typeof fetch=fetch){
 return documentCreate(await retitle(plan.snapshot,studentTitle(title),crypto.randomUUID()),key(),csrf,fetcher,accountId);
}
/** Replaces the online work of the same title; its earlier content cannot be recovered. */
export async function importOverwrite(plan:ImportPlan,csrf:string,accountId:string,fetcher:typeof fetch=fetch){
 if(!plan.existing)throw Error('덮어쓸 작품이 없어요.');
 const target=plan.existing;
 return documentSave(target.recordId,await retitle(plan.snapshot,target.title,target.clientProjectId),target.revision,key(),csrf,fetcher,accountId);
}
