import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '@knolstory/compatibility';
import {createPlayback} from '@knolstory/runtime-core';
import {ALL_EDITING_ALLOWED,EDITING_PRESETS} from './editing-permissions';
import {planPicturebookCreation,type PicturebookCreateInput} from './picturebook-create';
import {forgetPicturebookRequest,parsePicturebookLinks,peekPicturebookLinks,picturebookLinkKey,picturebookOwnerScope,readPicturebookRequest,savePicturebookRequest,type PicturebookRequest} from './picturebook-links';
import {readWorkspace,writeWorkspace,WORKSPACE_KEY} from './workspace-storage';

const NOW='2026-11-20T09:00:00.000Z';
const book={...getShortStoryOriginal('rabbit'),id:'0b3b9c5e-7a51-4d7e-8f1e-3c2f1a0b9d11',title:'나의 별주부전'};
function request(overrides:Partial<PicturebookRequest>={}):PicturebookRequest{
 return {requestId:'request-aaaa-1111',workId:'work-aaaa-1111',ownerScope:'device',createdAt:NOW,book,startPageId:book.pages[3]!.id,stages:{},replaceLink:false,...overrides};
}
function input(overrides:Partial<PicturebookCreateInput>={}):PicturebookCreateInput{
 let n=0;
 return {request:request(),ownerScope:'device',permissions:ALL_EDITING_ALLOWED,workKeys:new Set(),links:{},createId:()=>`id-${++n}`,now:NOW,...overrides};
}
function memoryStorage(limit=Infinity){
 const items=new Map<string,string>();
 return {items,getItem:(key:string)=>items.get(key)??null,removeItem:(key:string)=>void items.delete(key),
  setItem:(key:string,value:string)=>{if(value.length>limit)throw new DOMException('quota','QuotaExceededError');items.set(key,value);}};
}

describe('making one KnolStory from a picture book',()=>{
 it('makes 8 chapters and opens the chapter of the page the student was looking at',()=>{
  const plan=planPicturebookCreation(input());
  if(plan.kind!=='create')throw Error('expected create');
  expect(plan.workKey).toBe('new:work-aaaa-1111');
  expect(plan.project.chapters).toHaveLength(8);
  expect(plan.chapterNumber).toBe(4);
  expect(plan.project.lines.find(line=>line.id===plan.lineId)!.chapterId).toBe(plan.project.chapters[3]!.id);
  const link=plan.links[picturebookLinkKey('device',book.id)]!;
  expect(link).toMatchObject({workKey:'new:work-aaaa-1111',bookId:book.id,requestId:'request-aaaa-1111'});
  expect(Object.keys(link.pages)).toEqual(book.pages.map(page=>page.id));
  // The cover the student made for the picture book is carried over as cover data.
  expect(plan.project.cover?.author).toBe(book.authorDisplayName);
 });
 it('opens instead of making again: the same request retried, or another tab’s request for the same book',()=>{
  const first=planPicturebookCreation(input());if(first.kind!=='create')throw Error('expected create');
  const keys=new Set([first.workKey]);
  expect(planPicturebookCreation(input({workKeys:keys,links:first.links}))).toMatchObject({kind:'open',workKey:first.workKey,lineId:first.lineId});
  const otherTab=planPicturebookCreation(input({request:request({requestId:'request-bbbb-2222',workId:'work-bbbb-2222'}),workKeys:keys,links:first.links}));
  expect(otherTab).toMatchObject({kind:'open',workKey:first.workKey});
 });
 it('does not make the work again by itself when it was deleted or is missing on this device',()=>{
  const first=planPicturebookCreation(input());if(first.kind!=='create')throw Error('expected create');
  const later=request({requestId:'request-cccc-3333',workId:'work-cccc-3333'});
  expect(()=>planPicturebookCreation(input({request:later,links:first.links,deletedKey:first.workKey}))).toThrow('삭제한 작품');
  expect(()=>planPicturebookCreation(input({request:later,links:first.links}))).toThrow('찾지 못했어요');
  // The deleted work's own ID is never reused, even when the student asks for a new work.
  expect(()=>planPicturebookCreation(input({request:{...request(),replaceLink:true},links:first.links,deletedKey:first.workKey}))).toThrow('삭제한 작품');
  const replaced=planPicturebookCreation(input({request:{...later,replaceLink:true},links:first.links}));
  expect(replaced).toMatchObject({kind:'create',workKey:'new:work-cccc-3333'});
 });
 it('keeps account and guest works apart and refuses a request from another owner',()=>{
  const guest=planPicturebookCreation(input());if(guest.kind!=='create')throw Error('expected create');
  const account=picturebookOwnerScope('account-1');
  const signedIn=planPicturebookCreation(input({ownerScope:account,request:request({ownerScope:account,workId:'work-dddd-4444'}),workKeys:new Set([guest.workKey]),links:guest.links}));
  expect(signedIn.kind).toBe('create');
  expect(()=>planPicturebookCreation(input({ownerScope:account}))).toThrow('계정이 달라요');
 });
 it('follows the teacher’s limits and changed picture permissions',()=>{
  expect(()=>planPicturebookCreation(input({permissions:{...ALL_EDITING_ALLOWED,newWorks:false}}))).toThrow('새 작품 만들기');
  expect(()=>planPicturebookCreation(input({permissions:{...ALL_EDITING_ALLOWED,forcedStoryKey:'rabbit'}}))).toThrow('정한 작품');
  const staged=request({stages:{[book.pages[3]!.id]:{kind:'stage',origin:'approved',backgroundId:'rabbit-turtle.background.classic-sea',left:[{assetId:'rabbit-turtle.character.classic-riding'}],right:[]}}});
  expect(()=>planPicturebookCreation(input({request:staged,permissions:EDITING_PRESETS.textOnly}))).toThrow('그림 고르기 권한');
  expect(()=>planPicturebookCreation(input({request:staged,permissions:EDITING_PRESETS.textAndImages}))).toThrow('인물 배치 권한');
  expect(planPicturebookCreation(input({permissions:EDITING_PRESETS.textOnly})).kind).toBe('create');
 });
 it('refuses pictures that are not registered assets',()=>{
  const outside=request({stages:{[book.pages[0]!.id]:{kind:'stage',origin:'student',backgroundId:'https://example.invalid/a.png',left:[],right:[]}}});
  expect(()=>planPicturebookCreation(input({request:outside}))).toThrow(/찾을 수 없어요|외부 그림/);
 });
});

describe('the device link index',()=>{
 it('is written with the work in one workspace write and read back strictly',()=>{
  const plan=planPicturebookCreation(input());if(plan.kind!=='create')throw Error('expected create');
  const storage=memoryStorage(),lineId=plan.lineId;
  writeWorkspace(storage,plan.project,{},{},{picturebookLinks:plan.links,storyId:plan.workKey,lineId,editingPath:[lineId],mode:'edit',playback:createPlayback(plan.project,lineId),editorView:'cut',activeTool:'text',writerChapterId:null,previewProfile:'auto',view:'editor'});
  const raw=storage.getItem(WORKSPACE_KEY)!;
  const loaded=readWorkspace(raw);
  expect(loaded.picturebookLinks).toEqual(plan.links);expect(loaded.works[plan.workKey]).toEqual(plan.project);
  expect(loaded.contexts[plan.workKey]!.lineId).toBe(lineId);
  expect(peekPicturebookLinks(raw)).toMatchObject({links:plan.links,workKeys:new Set([plan.workKey])});
  const damaged=JSON.parse(raw);damaged.picturebookLinks[picturebookLinkKey('device',book.id)].workKey='import:x';
  expect(()=>readWorkspace(JSON.stringify(damaged))).toThrow('그림책 연결');
  expect(()=>parsePicturebookLinks({wrong:{}})).toThrow();
 });
 it('keeps the previous workspace untouched when the browser storage is full',()=>{
  const plan=planPicturebookCreation(input());if(plan.kind!=='create')throw Error('expected create');
  const storage=memoryStorage(2000);storage.items.set(WORKSPACE_KEY,'previous workspace');
  expect(()=>writeWorkspace(storage,plan.project,{},{},{picturebookLinks:plan.links,storyId:plan.workKey,lineId:plan.lineId,mode:'edit',playback:createPlayback(plan.project),editorView:'cut',activeTool:'text',writerChapterId:null,previewProfile:'auto',view:'editor'})).toThrow();
  expect(storage.items.get(WORKSPACE_KEY)).toBe('previous workspace');
 });
 it('keeps a confirmed request until the workspace has used it, and only for a day',()=>{
  const storage=memoryStorage();
  savePicturebookRequest(storage,request());
  expect(readPicturebookRequest(storage,'request-aaaa-1111').book.id).toBe(book.id);
  expect(()=>readPicturebookRequest(storage,'request-aaaa-1111',Date.parse(NOW)+25*60*60*1000)).toThrow('오래되었어요');
  forgetPicturebookRequest(storage,'request-aaaa-1111');
  expect(()=>readPicturebookRequest(storage,'request-aaaa-1111')).toThrow('찾지 못했어요');
  const full=memoryStorage(10);
  expect(()=>savePicturebookRequest(full,request())).toThrow();
 });
});
