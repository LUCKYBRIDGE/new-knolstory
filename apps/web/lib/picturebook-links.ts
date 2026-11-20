import {parseShortStory,type ShortStoryProject} from '@knolstory/compatibility';
import type {PicturebookPageStage} from '@knolstory/runtime-core';

/**
 * Device index: where each picture-book page was sent, per owner and book.
 * A book can be sent many times (to a new KnolStory, or into a work being written), so a link keeps
 * every send. It lives inside the workspace snapshot, so the manuscript and its link are written in one
 * storage write. Files never carry it: an account or a device location never leaves the browser.
 */
export type PicturebookSend=Readonly<{
 workKey:string;requestId:string;createdAt:string;
 /** Picture-book page ID → the chapter and first cut made from it in that work. */
 pages:Readonly<Record<string,Readonly<{chapterId:string;lineId:string}>>>;
}>;
export type PicturebookLink=Readonly<{ownerScope:string;bookId:string;sends:readonly PicturebookSend[]}>;
export type PicturebookLinks=Readonly<Record<string,PicturebookLink>>;

/** A signed-in account and a guest on this device never share a link. */
export function picturebookOwnerScope(accountId:string|null):string{return accountId?`account:${accountId}`:'device';}
export function picturebookLinkKey(ownerScope:string,bookId:string):string{return `${ownerScope}|${bookId}`;}

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max=300):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const MAX_SENDS=100;
function checkSend(send:unknown):send is PicturebookSend{
 return record(send)&&text(send.workKey)&&text(send.requestId)&&text(send.createdAt)&&send.workKey.startsWith('new:')&&record(send.pages)
  &&Object.keys(send).every(item=>['workKey','requestId','createdAt','pages'].includes(item))
  &&Object.values(send.pages).every(page=>record(page)&&text(page.chapterId)&&text(page.lineId)&&Object.keys(page).length===2);
}
/** Strict: a damaged index stops the read like any other part of the workspace (the original is kept). */
export function parsePicturebookLinks(value:unknown):PicturebookLinks{
 if(value===undefined)return {};
 if(!record(value)||Object.keys(value).length>500)throw Error('그림책 연결 기록 형식을 확인해 주세요. 원본은 보존해요.');
 const links:Record<string,PicturebookLink>={};
 for(const [key,link] of Object.entries(value)){
  if(!record(link)||!text(link.ownerScope)||!text(link.bookId)||key!==picturebookLinkKey(link.ownerScope,link.bookId))throw Error('그림책 연결 기록을 확인해 주세요. 원본은 보존해요.');
  // A record from before several sends were kept: one send.
  const sends=Array.isArray(link.sends)?link.sends:'workKey' in link?[{workKey:link.workKey,requestId:link.requestId,createdAt:link.createdAt,pages:link.pages}]:null;
  if(!sends||sends.length>MAX_SENDS||!sends.every(checkSend)||Object.keys(link).some(item=>!['ownerScope','bookId','sends','workKey','requestId','createdAt','pages'].includes(item)))
   throw Error('그림책 연결 기록을 확인해 주세요. 원본은 보존해요.');
  links[key]={ownerScope:link.ownerScope,bookId:link.bookId,sends:structuredClone(sends) as PicturebookSend[]};
 }
 return links;
}
/** Add one send to the index (newest last, oldest dropped past the limit). */
export function withPicturebookSend(links:PicturebookLinks,ownerScope:string,bookId:string,send:PicturebookSend):PicturebookLinks{
 const key=picturebookLinkKey(ownerScope,bookId),sends=[...(links[key]?.sends??[]),send].slice(-MAX_SENDS);
 return {...links,[key]:{ownerScope,bookId,sends}};
}
export function picturebookSends(links:PicturebookLinks,ownerScope:string,bookId:string):readonly PicturebookSend[]{
 return links[picturebookLinkKey(ownerScope,bookId)]?.sends??[];
}
/** Pages already sent and still in a work on this device: page ID → where they are now (work, chapter). */
export type SentPlace=Readonly<{workKey:string;chapterId:string;lineId:string}>;
export function sentPagePlaces(sends:readonly PicturebookSend[],works:Readonly<Record<string,{chapters:readonly {id:string}[];lines:readonly {id:string}[]}>>):Record<string,SentPlace[]>{
 const places:Record<string,SentPlace[]>={};
 for(const send of sends){
  const work=works[send.workKey];if(!work)continue;
  for(const [pageId,page] of Object.entries(send.pages)){
   if(!work.chapters.some(chapter=>chapter.id===page.chapterId))continue;
   const lineId=work.lines.some(line=>line.id===page.lineId)?page.lineId:'';
   (places[pageId]??=[]).push({workKey:send.workKey,chapterId:page.chapterId,lineId});
  }
 }
 return places;
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

/** Where the chosen pages go: a new KnolStory, or between the chapters of a work being written. */
export type PicturebookTarget=Readonly<{kind:'new'}>|Readonly<{kind:'existing';workKey:string;afterChapterId:string|null}>;
/**
 * A confirmed ‘놀스토리로 보내기’. The picture-book screen saves it; the KnolStory workspace
 * (the only writer of the work library) carries it out. The URL carries only its short ID.
 * `workId` stays the same for every retry, so a retry finds the work it already made.
 */
export type PicturebookRequest=Readonly<{
 requestId:string;workId:string;ownerScope:string;createdAt:string;
 book:ShortStoryProject;
 /** Chosen pages, in book order. */
 pageIds:readonly string[];
 /** The page whose chapter opens after sending (one of the chosen pages). */
 startPageId:string;
 stages:Readonly<Record<string,PicturebookPageStage>>;
 target:PicturebookTarget;
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
 if(!record(request))throw Error('그림책에서 보내기 요청을 찾지 못했어요. 그림책 화면에서 다시 시작해 주세요.');
 if(now-Date.parse(String(request.createdAt))>REQUEST_LIFETIME_MS)throw Error('보내기 요청이 오래되었어요. 그림책 화면에서 다시 시작해 주세요.');
 const target=request.target as unknown;
 const targetOk=record(target)&&(target.kind==='new'||target.kind==='existing'&&text(target.workKey)&&(target.afterChapterId===null||text(target.afterChapterId)));
 if(!text(request.workId)||!text(request.ownerScope)||!text(request.startPageId)||!record(request.stages)||!Array.isArray(request.pageIds)||!targetOk)throw Error('보내기 요청을 확인해 주세요. 그림책 화면에서 다시 시작해 주세요.');
 const book=parseShortStory(request.book);
 if(!request.pageIds.length||request.pageIds.some(id=>!book.pages.some(page=>page.id===id))||new Set(request.pageIds).size!==request.pageIds.length)throw Error('고른 쪽을 그림책에서 찾지 못했어요. 그림책 화면에서 다시 골라 주세요.');
 if(!request.pageIds.includes(request.startPageId))throw Error('시작할 쪽을 고른 쪽에서 찾지 못했어요.');
 return {...request,book};
}
export function forgetPicturebookRequest(storage:Pick<Storage,'getItem'|'setItem'>,requestId:string){
 try{const requests=readRequests(storage);delete requests[requestId];storage.setItem(PICTUREBOOK_REQUESTS_KEY,JSON.stringify(requests));}catch{/* An old request expires on its own. */}
}
