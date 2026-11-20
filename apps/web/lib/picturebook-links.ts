import {parseShortStory,type ShortStoryProject} from '@knolstory/compatibility';
import type {PicturebookPageStage} from '@knolstory/runtime-core';

/**
 * Device index: which KnolStory was made from which picture book, per owner.
 * It lives inside the workspace snapshot, so the manuscript and its link are written in one
 * storage write. Files never carry it: an account or a device location never leaves the browser.
 */
export type PicturebookLink=Readonly<{
 ownerScope:string;bookId:string;workKey:string;requestId:string;createdAt:string;
 /** Picture-book page ID → the chapter and first cut made from it. */
 pages:Readonly<Record<string,Readonly<{chapterId:string;lineId:string}>>>;
}>;
export type PicturebookLinks=Readonly<Record<string,PicturebookLink>>;

/** A signed-in account and a guest on this device never share a link. */
export function picturebookOwnerScope(accountId:string|null):string{return accountId?`account:${accountId}`:'device';}
export function picturebookLinkKey(ownerScope:string,bookId:string):string{return `${ownerScope}|${bookId}`;}

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=300):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
/** Strict: a damaged index stops the read like any other part of the workspace (the original is kept). */
export function parsePicturebookLinks(value:unknown):PicturebookLinks{
 if(value===undefined)return {};
 if(!record(value)||Object.keys(value).length>500)throw Error('그림책 연결 기록 형식을 확인해 주세요. 원본은 보존해요.');
 for(const [key,link] of Object.entries(value)){
  if(!record(link)||!text(link.ownerScope)||!text(link.bookId)||!text(link.workKey)||!text(link.requestId)||!text(link.createdAt)||key!==picturebookLinkKey(link.ownerScope,link.bookId)||!link.workKey.startsWith('new:')||!record(link.pages)
   ||Object.keys(link).some(item=>!['ownerScope','bookId','workKey','requestId','createdAt','pages'].includes(item))
   ||Object.values(link.pages).some(page=>!record(page)||!text(page.chapterId)||!text(page.lineId)||Object.keys(page).length!==2))
   throw Error('그림책 연결 기록을 확인해 주세요. 원본은 보존해요.');
 }
 return structuredClone(value) as PicturebookLinks;
}

export type PicturebookLinkState=
 | Readonly<{kind:'none'}>
 | Readonly<{kind:'open';link:PicturebookLink}>
 /** The work is in ‘삭제한 작품’: restoring it brings the link back. Nothing is made again. */
 | Readonly<{kind:'deleted';link:PicturebookLink}>
 /** The work is gone from this device. Making a new one is the student's explicit choice. */
 | Readonly<{kind:'missing';link:PicturebookLink}>;
export function picturebookLinkState(links:PicturebookLinks,workKeys:ReadonlySet<string>,deletedKey:string|undefined,ownerScope:string,bookId:string):PicturebookLinkState{
 const link=links[picturebookLinkKey(ownerScope,bookId)];
 if(!link)return {kind:'none'};
 if(workKeys.has(link.workKey))return {kind:'open',link};
 if(deletedKey===link.workKey)return {kind:'deleted',link};
 return {kind:'missing',link};
}

/** Read only the link index and work keys, for the picture-book screens that do not own the workspace. */
export function peekPicturebookLinks(raw:string|null):{links:PicturebookLinks;workKeys:Set<string>;deletedKey?:string}{
 if(raw===null)return {links:{},workKeys:new Set()};
 const value=JSON.parse(raw) as Record<string,unknown>;
 if(!record(value))throw Error('기기 보관함을 읽지 못했어요.');
 const workKeys=new Set([...Object.keys(record(value.works)?value.works:{}),...(typeof value.storyId==='string'?[value.storyId]:[])]);
 const deleted=record(value.deletedWork)&&typeof value.deletedWork.key==='string'?value.deletedWork.key:undefined;
 return {links:parsePicturebookLinks(value.picturebookLinks),workKeys,deletedKey:deleted};
}

/**
 * A confirmed ‘이대로 놀스토리 만들기’. The picture-book screen saves it; the KnolStory workspace
 * (the only writer of the work library) turns it into one work. The URL carries only its short ID.
 * `workId` stays the same for every retry, so a retry finds the work it already made.
 */
export type PicturebookRequest=Readonly<{
 requestId:string;workId:string;ownerScope:string;createdAt:string;
 book:ShortStoryProject;startPageId:string;
 stages:Readonly<Record<string,PicturebookPageStage>>;
 /** The student chose to make a new work although an earlier one was linked. */
 replaceLink:boolean;
}>;
export const PICTUREBOOK_REQUESTS_KEY='knolstory-picturebook-requests-v1';
const REQUEST_LIFETIME_MS=24*60*60*1000;
const MAX_REQUESTS=8;
const shortId=/^[A-Za-z0-9-]{8,64}$/;
export function isPicturebookRequestId(value:string|null):value is string{return !!value&&shortId.test(value);}
function readRequests(storage:Pick<Storage,'getItem'>):Record<string,PicturebookRequest>{
 try{const value=JSON.parse(storage.getItem(PICTUREBOOK_REQUESTS_KEY)??'{}');return record(value)?value as Record<string,PicturebookRequest>:{};}catch{return {};}
}
export function savePicturebookRequest(storage:Pick<Storage,'getItem'|'setItem'>,request:PicturebookRequest,now=Date.now()){
 const kept=Object.values(readRequests(storage)).filter(item=>record(item)&&now-Date.parse(String(item.createdAt))<REQUEST_LIFETIME_MS&&item.requestId!==request.requestId)
  .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,MAX_REQUESTS-1);
 // A quota failure here stops before anything is created; the caller reports it.
 storage.setItem(PICTUREBOOK_REQUESTS_KEY,JSON.stringify(Object.fromEntries([...kept,request].map(item=>[item.requestId,item]))));
}
export function readPicturebookRequest(storage:Pick<Storage,'getItem'>,requestId:string,now=Date.now()):PicturebookRequest{
 const request=readRequests(storage)[requestId];
 if(!record(request))throw Error('그림책에서 만들기 요청을 찾지 못했어요. 그림책 화면에서 다시 시작해 주세요.');
 if(now-Date.parse(String(request.createdAt))>REQUEST_LIFETIME_MS)throw Error('만들기 요청이 오래되었어요. 그림책 화면에서 다시 시작해 주세요.');
 if(!text(request.workId)||!text(request.ownerScope)||!text(request.startPageId)||!record(request.stages)||typeof request.replaceLink!=='boolean')throw Error('만들기 요청을 확인해 주세요. 그림책 화면에서 다시 시작해 주세요.');
 const book=parseShortStory(request.book);
 if(!book.pages.some(page=>page.id===request.startPageId))throw Error('시작할 쪽을 그림책에서 찾지 못했어요.');
 return {...request,book};
}
export function forgetPicturebookRequest(storage:Pick<Storage,'getItem'|'setItem'>,requestId:string){
 try{const requests=readRequests(storage);delete requests[requestId];storage.setItem(PICTUREBOOK_REQUESTS_KEY,JSON.stringify(requests));}catch{/* An old request expires on its own. */}
}
