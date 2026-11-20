import type {StoryProject} from '@knolstory/story-domain';
import {convertPicturebookToChapters} from '@knolstory/runtime-core';
import {assertCatalogOnlyMedia} from './catalog-only-authoring';
import {shortStoryCoverProject} from './shortstory-cover';
import {picturebookLinkKey,picturebookLinkState,type PicturebookLink,type PicturebookLinks,type PicturebookRequest} from './picturebook-links';
import type {EditingPermissions} from './editing-permissions';

export type PicturebookCreateInput=Readonly<{
 request:PicturebookRequest;
 /** Owner scope of the account settled now (never a guess while the account is unknown). */
 ownerScope:string;
 permissions:Pick<EditingPermissions,'newWorks'|'forcedStoryKey'|'images'|'characters'>;
 /** Work keys stored on this device right now, after this tab became the writer. */
 workKeys:ReadonlySet<string>;
 deletedKey?:string;
 links:PicturebookLinks;
 createId:()=>string;
 now:string;
}>;
export type PicturebookCreatePlan=
 /** The work already exists (a retry of this request, or the work made earlier from this book). */
 | Readonly<{kind:'open';workKey:string;lineId?:string;links:PicturebookLinks;notice:string}>
 | Readonly<{kind:'create';workKey:string;project:StoryProject;lineId:string;chapterNumber:number;links:PicturebookLinks;notice:string}>;

/**
 * Decide what ‘이대로 놀스토리 만들기’ does on this device, before anything is written.
 * Errors are messages for the student; on an error nothing has been stored.
 */
export function planPicturebookCreation(input:PicturebookCreateInput):PicturebookCreatePlan{
 const {request,permissions}=input;
 if(request.ownerScope!==input.ownerScope)throw Error('그림책에서 시작한 계정과 지금 계정이 달라요. 그림책 화면에서 다시 시작해 주세요.');
 const key=picturebookLinkKey(input.ownerScope,request.book.id);
 const workKey=`new:${request.workId}`;
 const startIndex=request.book.pages.findIndex(page=>page.id===request.startPageId);
 const linkFor=(link:PicturebookLink|undefined)=>link?.pages[request.startPageId]?.lineId;
 // A work ID already used by the deleted work must never be reused: restoring it would collide.
 if(input.deletedKey===workKey)throw Error('이 요청의 작품이 ‘삭제한 작품’에 있어요. 서재에서 복구하거나 그림책 화면에서 다시 시작해 주세요.');
 // Same request again (double click, reload, crash after the write): open what it already made.
 if(input.workKeys.has(workKey)){
  const link=input.links[key]?.workKey===workKey?input.links[key]:undefined;
  return {kind:'open',workKey,lineId:linkFor(link),links:input.links,notice:'그림책에서 만든 놀스토리를 열었어요.'};
 }
 const state=picturebookLinkState(input.links,input.workKeys,input.deletedKey,input.ownerScope,request.book.id);
 // Another request (another tab, another click) already made this book's work: never make a second one.
 if(state.kind==='open')return {kind:'open',workKey:state.link.workKey,links:input.links,notice:'이 그림책으로 쓰던 놀스토리를 열었어요. 새로 만들지 않았어요.'};
 if(state.kind==='deleted'&&!request.replaceLink)throw Error('이 그림책으로 만든 놀스토리가 ‘삭제한 작품’에 있어요. 서재에서 복구하면 이어 쓸 수 있어요.');
 if(state.kind==='missing'&&!request.replaceLink)throw Error('이 그림책으로 만든 놀스토리를 이 기기에서 찾지 못했어요. 그림책 화면에서 ‘새 놀스토리로 만들기’를 골라 주세요.');
 if(!permissions.newWorks)throw Error('선생님이 새 작품 만들기를 막아 두었어요. 그림책은 그대로 있어요.');
 if(permissions.forcedStoryKey)throw Error('선생님이 정한 작품만 편집할 수 있어요. 그림책은 그대로 있어요.');
 const stages=Object.values(request.stages);
 if(!permissions.images&&stages.some(stage=>stage.kind==='stage'))throw Error('그림 고르기 권한이 바뀌었어요. 그림책 화면에서 다시 준비해 주세요.');
 if(!permissions.characters&&stages.some(stage=>stage.kind==='stage'&&(stage.left.length||stage.right.length)))throw Error('인물 배치 권한이 바뀌었어요. 그림책 화면에서 다시 준비해 주세요.');
 const cover=shortStoryCoverProject(request.book).cover;
 const conversion=convertPicturebookToChapters({book:request.book,stages:request.stages,workId:request.workId,createId:input.createId,updatedAt:input.now,...(cover?{cover}:{})});
 // Every picture the new work points to must be a registered asset (sketches included).
 assertCatalogOnlyMedia(conversion.project);
 const link:PicturebookLink={ownerScope:input.ownerScope,bookId:request.book.id,workKey,requestId:request.requestId,createdAt:input.now,
  pages:Object.fromEntries(conversion.chapters.map(item=>[item.pageId,{chapterId:item.chapterId,lineId:item.lineId}]))};
 const start=conversion.chapters[startIndex]!;
 return {kind:'create',workKey,project:conversion.project,lineId:start.lineId,chapterNumber:startIndex+1,links:{...input.links,[key]:link},
  notice:`그림책 ${request.book.pages.length}쪽으로 ${conversion.chapters.length}장을 만들었어요. ${startIndex+1}장 첫 컷에서 써 보세요.`};
}
