import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {convertPicturebookToChapters,insertStoryChapters,type PicturebookBook} from '@knolstory/runtime-core';
import type {ShortStoryProject} from '@knolstory/compatibility';
import {assertCatalogOnlyMedia} from './catalog-only-authoring';
import {shortStoryCoverProject} from './shortstory-cover';
import {picturebookSends,withPicturebookSend,type PicturebookLinks,type PicturebookRequest} from './picturebook-links';
import type {EditingPermissions} from './editing-permissions';

export type PicturebookCreateInput=Readonly<{
 request:PicturebookRequest;
 /** Owner scope of the account settled now (never a guess while the account is unknown). */
 ownerScope:string;
 permissions:Pick<EditingPermissions,'newWorks'|'forcedStoryKey'|'images'|'characters'>;
 /** Works stored on this device right now, after this tab became the writer. */
 works:Readonly<Record<string,StoryProject>>;
 deletedKey?:string;
 links:PicturebookLinks;
 createId:()=>string;
 now:string;
}>;
export type PicturebookCreatePlan=
 /** This request already ran (double click, reload, crash after the write): open what it made. */
 | Readonly<{kind:'open';workKey:string;lineId?:string;links:PicturebookLinks;notice:string}>
 /** A new KnolStory, or the work being written with the new chapters in it. */
 | Readonly<{kind:'create'|'insert';workKey:string;project:StoryProject;lineId:string;links:PicturebookLinks;notice:string}>;

/** Only the chosen pages, numbered in book order, as the conversion reads them. */
export function chosenPages(book:ShortStoryProject,pageIds:readonly string[]):PicturebookBook{
 const pages=book.pages.filter(page=>pageIds.includes(page.id)).map((page,index)=>({...page,order:index+1}));
 return {...book,pages};
}
/** "4·5·6장" from the chapter labels the writer will see. */
const chapterNames=(project:StoryProject,ids:readonly string[])=>ids.map(id=>chapterLabel(project.chapters.find(chapter=>chapter.id===id)!).split(' · ')[0]!.replace(/장$/u,'')).join('·')+'장';

/**
 * Decide what ‘놀스토리로 보내기’ does on this device, before anything is written.
 * Errors are messages for the student; on an error nothing has been stored.
 */
export function planPicturebookCreation(input:PicturebookCreateInput):PicturebookCreatePlan{
 const {request,permissions}=input;
 if(request.ownerScope!==input.ownerScope)throw Error('그림책에서 시작한 계정과 지금 계정이 달라요. 그림책 화면에서 다시 시작해 주세요.');
 const sends=picturebookSends(input.links,input.ownerScope,request.book.id);
 // Same request again: open what it already made, never send twice.
 const done=sends.find(send=>send.requestId===request.requestId);
 if(done){
  if(input.works[done.workKey])return {kind:'open',workKey:done.workKey,lineId:done.pages[request.startPageId]?.lineId,links:input.links,notice:'그림책에서 보낸 장을 열었어요.'};
  throw Error('이 요청으로 보낸 놀스토리를 이 기기에서 찾지 못했어요. 서재에서 작품을 확인해 주세요.');
 }
 const stages=Object.fromEntries(Object.entries(request.stages).filter(([pageId])=>request.pageIds.includes(pageId)));
 const staged=Object.values(stages);
 if(!permissions.images&&staged.some(stage=>stage.kind==='stage'))throw Error('그림 고르기 권한이 바뀌었어요. 그림책 화면에서 다시 준비해 주세요.');
 if(!permissions.characters&&staged.some(stage=>stage.kind==='stage'&&(stage.left.length||stage.right.length)))throw Error('인물 배치 권한이 바뀌었어요. 그림책 화면에서 다시 준비해 주세요.');
 const book=chosenPages(request.book,request.pageIds);
 const startIndex=book.pages.findIndex(page=>page.id===request.startPageId);
 if(startIndex<0)throw Error('시작할 쪽을 고른 쪽에서 찾지 못했어요.');

 if(request.target.kind==='new'){
  const workKey=`new:${request.workId}`;
  // A work ID already used by the deleted work must never be reused: restoring it would collide.
  if(input.deletedKey===workKey||input.works[workKey])throw Error('이 요청의 작품 구분 정보가 이미 쓰였어요. 그림책 화면에서 다시 시작해 주세요.');
  if(!permissions.newWorks)throw Error('선생님이 새 작품 만들기를 막아 두었어요. 쓰던 놀스토리에 넣을 수는 있어요.');
  if(permissions.forcedStoryKey)throw Error('선생님이 정한 작품만 편집할 수 있어요. 정한 작품에 넣어 주세요.');
  const cover=shortStoryCoverProject(request.book).cover;
  const conversion=convertPicturebookToChapters({book,stages,workId:request.workId,createId:input.createId,updatedAt:input.now,...(cover?{cover}:{})});
  // Every picture the new work points to must be a registered asset (sketches included).
  assertCatalogOnlyMedia(conversion.project);
  const pages=Object.fromEntries(conversion.chapters.map(item=>[item.pageId,{chapterId:item.chapterId,lineId:item.lineId}]));
  const start=conversion.chapters[startIndex]!;
  return {kind:'create',workKey,project:conversion.project,lineId:start.lineId,
   links:withPicturebookSend(input.links,input.ownerScope,request.book.id,{workKey,requestId:request.requestId,createdAt:input.now,pages}),
   notice:`그림책 ${book.pages.length}쪽을 새 놀스토리 ${book.pages.length}장으로 보냈어요. ${startIndex+1}장 첫 컷에서 써 보세요.`};
 }

 const {workKey,afterChapterId}=request.target;
 const work=input.works[workKey];
 if(!work)throw Error(input.deletedKey===workKey?'넣을 놀스토리가 ‘삭제한 작품’에 있어요. 서재에서 복구한 뒤 다시 보내 주세요.':'넣을 놀스토리를 이 기기에서 찾지 못했어요. 그림책 화면에서 다시 골라 주세요.');
 if(permissions.forcedStoryKey&&permissions.forcedStoryKey!==workKey)throw Error('선생님이 정한 작품에만 넣을 수 있어요.');
 if(afterChapterId!==null&&!work.chapters.some(chapter=>chapter.id===afterChapterId))throw Error('넣을 자리의 장이 바뀌었어요. 그림책 화면에서 자리를 다시 골라 주세요.');
 // The chapters are made exactly as a new work's would be, then put in place with fresh IDs.
 const taken=new Set([work.id,...work.chapters.map(chapter=>chapter.id),...work.lines.map(line=>line.id)]);
 // Never an ID the work already uses (a few tries, then the insert refuses a clash itself).
 const freshId=()=>{let id=input.createId();for(let tries=0;taken.has(id)&&tries<20;tries++)id=input.createId();return id;};
 const conversion=convertPicturebookToChapters({book,stages,workId:`${work.id}-incoming`,createId:freshId,updatedAt:input.now});
 assertCatalogOnlyMedia(conversion.project);
 const project=insertStoryChapters(work,{chapters:conversion.project.chapters,lines:conversion.project.lines},afterChapterId);
 const pages=Object.fromEntries(conversion.chapters.map(item=>[item.pageId,{chapterId:item.chapterId,lineId:item.lineId}]));
 const start=conversion.chapters[startIndex]!;
 const where=afterChapterId===null?'맨 앞':`${chapterLabel(work.chapters.find(chapter=>chapter.id===afterChapterId)!).split(' · ')[0]} 뒤`;
 return {kind:'insert',workKey,project,lineId:start.lineId,
  links:withPicturebookSend(input.links,input.ownerScope,request.book.id,{workKey,requestId:request.requestId,createdAt:input.now,pages}),
  notice:`그림책 ${book.pages.length}쪽을 ‘${work.title||'제목 없는 작품'}’ ${where}에 ${chapterNames(project,conversion.chapters.map(item=>item.chapterId))}으로 넣었어요.`};
}
