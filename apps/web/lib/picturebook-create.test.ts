import {describe,expect,it} from 'vitest';
import {getShortStoryOriginal} from '@knolstory/compatibility';
import {createPlayback} from '@knolstory/runtime-core';
import {ALL_EDITING_ALLOWED,EDITING_PRESETS} from './editing-permissions';
import {chapterLabel,type StoryProject} from '@knolstory/story-domain';
import {chosenPages,planPicturebookCreation,type PicturebookCreateInput} from './picturebook-create';
import {forgetPicturebookRequest,parsePicturebookLinks,peekPicturebookLinks,picturebookLinkKey,picturebookOwnerScope,picturebookSends,readPicturebookRequest,savePicturebookRequest,sentPagePlaces,type PicturebookRequest} from './picturebook-links';
import {readWorkspace,writeWorkspace,WORKSPACE_KEY} from './workspace-storage';

const NOW='2026-11-20T09:00:00.000Z';
const book={...getShortStoryOriginal('rabbit'),id:'0b3b9c5e-7a51-4d7e-8f1e-3c2f1a0b9d11',title:'나의 별주부전'};
function request(overrides:Partial<PicturebookRequest>={}):PicturebookRequest{
 return {requestId:'request-aaaa-1111',workId:'work-aaaa-1111',ownerScope:'device',createdAt:NOW,book,pageIds:book.pages.map(page=>page.id),startPageId:book.pages[3]!.id,stages:{},target:{kind:'new'},...overrides};
}
function input(overrides:Partial<PicturebookCreateInput>={}):PicturebookCreateInput{
 let n=0;
 return {request:request(),ownerScope:'device',permissions:ALL_EDITING_ALLOWED,works:{},links:{},createId:()=>`id-${++n}`,now:NOW,...overrides};
}
function memoryStorage(limit=Infinity){
 const items=new Map<string,string>();
 return {items,getItem:(key:string)=>items.get(key)??null,removeItem:(key:string)=>void items.delete(key),
  setItem:(key:string,value:string)=>{if(value.length>limit)throw new DOMException('quota','QuotaExceededError');items.set(key,value);}};
}
function made(){const plan=planPicturebookCreation(input());if(plan.kind!=='create')throw Error('expected create');return plan;}
const ordered=(project:StoryProject)=>[...project.chapters].sort((a,b)=>a.order-b.order);

describe('sending picture-book pages to a new KnolStory',()=>{
 it('sends every page as a chapter and opens the chapter of the page the student was looking at',()=>{
  const plan=made();
  expect(plan.workKey).toBe('new:work-aaaa-1111');
  expect(plan.project.chapters).toHaveLength(8);
  expect(plan.project.lines.find(line=>line.id===plan.lineId)!.chapterId).toBe(ordered(plan.project)[3]!.id);
  const sends=picturebookSends(plan.links,'device',book.id);
  expect(sends).toHaveLength(1);
  expect(sends[0]).toMatchObject({workKey:'new:work-aaaa-1111',requestId:'request-aaaa-1111'});
  expect(Object.keys(sends[0]!.pages)).toEqual(book.pages.map(page=>page.id));
  expect(plan.notice).toContain('1~8쪽을 새 놀스토리 1~8장으로');
  // The cover the student made for the picture book is carried over as cover data.
  expect(plan.project.cover?.author).toBe(book.authorDisplayName);
 });
 it('sends only the chosen pages, numbered in book order',()=>{
  const pageIds=[book.pages[1]!.id,book.pages[4]!.id,book.pages[6]!.id];
  const plan=planPicturebookCreation(input({request:request({pageIds,startPageId:pageIds[1]!})}));
  if(plan.kind!=='create')throw Error('expected create');
  expect(ordered(plan.project).map(chapter=>chapter.title)).toEqual([book.pages[1]!.title,book.pages[4]!.title,book.pages[6]!.title]);
  expect(plan.project.lines.find(line=>line.id===plan.lineId)!.chapterId).toBe(ordered(plan.project)[1]!.id);
  expect(chosenPages(book,pageIds).pages.map(page=>page.order)).toEqual([1,2,3]);
 });
 it('opens instead of sending again when the same request is retried; a new request makes another work',()=>{
  const first=made(),works={[first.workKey]:first.project};
  expect(planPicturebookCreation(input({works,links:first.links}))).toMatchObject({kind:'open',workKey:first.workKey,lineId:first.lineId});
  const again=planPicturebookCreation(input({request:request({requestId:'request-bbbb-2222',workId:'work-bbbb-2222'}),works,links:first.links}));
  expect(again).toMatchObject({kind:'create',workKey:'new:work-bbbb-2222'});
  expect(picturebookSends(again.links,'device',book.id)).toHaveLength(2);
 });
 it('never reuses a work ID that is in use or in the deleted works',()=>{
  const first=made();
  expect(()=>planPicturebookCreation(input({request:request({requestId:'request-cccc-3333'}),deletedKey:first.workKey}))).toThrow('이미 쓰였어요');
 });
 it('keeps account and guest sends apart and refuses a request from another owner',()=>{
  const guest=made();
  const account=picturebookOwnerScope('account-1');
  const signedIn=planPicturebookCreation(input({ownerScope:account,request:request({ownerScope:account,workId:'work-dddd-4444'}),works:{[guest.workKey]:guest.project},links:guest.links}));
  expect(signedIn.kind).toBe('create');
  expect(picturebookSends(signedIn.links,account,book.id)).toHaveLength(1);
  expect(()=>planPicturebookCreation(input({ownerScope:account}))).toThrow('계정이 달라요');
 });
 it('follows the teacher’s limits and changed picture permissions',()=>{
  expect(()=>planPicturebookCreation(input({permissions:{...ALL_EDITING_ALLOWED,newWorks:false}}))).toThrow('새 작품 만들기');
  expect(()=>planPicturebookCreation(input({permissions:{...ALL_EDITING_ALLOWED,forcedStoryKey:'rabbit'}}))).toThrow('정한 작품');
  const staged=request({stages:{[book.pages[3]!.id]:{kind:'stage',origin:'approved',backgroundId:'rabbit-turtle.background.classic-sea',left:[{assetId:'rabbit-turtle.character.classic-riding'}],right:[]}}});
  expect(()=>planPicturebookCreation(input({request:staged,permissions:EDITING_PRESETS.textOnly}))).toThrow('그림 고르기 권한');
  expect(()=>planPicturebookCreation(input({request:staged,permissions:EDITING_PRESETS.textAndImages}))).toThrow('인물 배치 권한');
  expect(planPicturebookCreation(input({permissions:EDITING_PRESETS.textOnly})).kind).toBe('create');
  // A page that is not sent never blocks: its stage choice is ignored.
  expect(planPicturebookCreation(input({request:{...staged,pageIds:[book.pages[0]!.id],startPageId:book.pages[0]!.id},permissions:EDITING_PRESETS.textOnly})).kind).toBe('create');
 });
 it('refuses pictures that are not registered assets',()=>{
  const outside=request({stages:{[book.pages[0]!.id]:{kind:'stage',origin:'student',backgroundId:'https://example.invalid/a.png',left:[],right:[]}}});
  expect(()=>planPicturebookCreation(input({request:outside}))).toThrow(/찾을 수 없어요|외부 그림/);
 });
});

describe('putting picture-book pages between the chapters of a work being written',()=>{
 function writing(){
  const first=made();
  // The student wrote on in chapter 2 before sending more pages.
  return {first,works:{[first.workKey]:first.project}};
 }
 it('puts the chosen pages after the chosen chapter and opens the first of them',()=>{
  const {first,works}=writing(),after=ordered(first.project)[1]!;
  const pageIds=[book.pages[6]!.id,book.pages[7]!.id];
  const plan=planPicturebookCreation(input({works,links:first.links,request:request({requestId:'request-eeee-5555',workId:'work-eeee-5555',pageIds,startPageId:pageIds[0]!,target:{kind:'existing',workKey:first.workKey,afterChapterId:after.id}})}));
  if(plan.kind!=='insert')throw Error('expected insert');
  expect(plan.workKey).toBe(first.workKey);
  const chapters=ordered(plan.project);
  expect(chapters).toHaveLength(10);
  expect(chapters.slice(2,4).map(chapter=>chapter.title)).toEqual([book.pages[6]!.title,book.pages[7]!.title]);
  expect(chapterLabel(chapters[4]!)).toMatch(/^5장/);
  expect(plan.project.lines.find(line=>line.id===plan.lineId)!.chapterId).toBe(chapters[2]!.id);
  expect(plan.notice).toBe(`그림책 7·8쪽을 ‘${first.project.title}’ 2장 뒤에 3·4장으로 넣었어요.`);
  // Chapters written before keep their IDs and cuts.
  for(const chapter of first.project.chapters)expect(plan.project.chapters.some(item=>item.id===chapter.id)).toBe(true);
  expect(picturebookSends(plan.links,'device',book.id).map(send=>send.workKey)).toEqual([first.workKey,first.workKey]);
 });
 it('puts pages first, and refuses a work that is gone or a chapter that changed',()=>{
  const {first,works}=writing();
  const target=(afterChapterId:string|null,workKey=first.workKey)=>request({requestId:'request-ffff-6666',pageIds:[book.pages[0]!.id],startPageId:book.pages[0]!.id,target:{kind:'existing',workKey,afterChapterId}});
  const plan=planPicturebookCreation(input({works,links:first.links,request:target(null)}));
  expect(ordered(plan.kind==='insert'?plan.project:first.project)[0]!.title).toBe(book.pages[0]!.title);
  expect(()=>planPicturebookCreation(input({works,request:target('gone')}))).toThrow('자리의 장이 바뀌었어요');
  expect(()=>planPicturebookCreation(input({works,request:target(null,'new:missing')}))).toThrow('찾지 못했어요');
  expect(()=>planPicturebookCreation(input({works,deletedKey:'new:missing',request:target(null,'new:missing')}))).toThrow('삭제한 작품');
 });
 it('lets a student who may not make new works put pages into the work the teacher chose, and only that one',()=>{
  const {first,works}=writing();
  const into=(workKey:string)=>request({requestId:'request-gggg-7777',target:{kind:'existing',workKey,afterChapterId:null}});
  expect(planPicturebookCreation(input({works,request:into(first.workKey),permissions:{...ALL_EDITING_ALLOWED,newWorks:false,forcedStoryKey:first.workKey}})).kind).toBe('insert');
  expect(()=>planPicturebookCreation(input({works:{...works,'new:other':first.project},request:into('new:other'),permissions:{...ALL_EDITING_ALLOWED,forcedStoryKey:first.workKey}}))).toThrow('정한 작품에만');
 });
});

describe('the device link index',()=>{
 it('is written with the work in one workspace write and read back strictly',()=>{
  const plan=made();
  const storage=memoryStorage(),lineId=plan.lineId;
  writeWorkspace(storage,plan.project,{},{},{picturebookLinks:plan.links,storyId:plan.workKey,lineId,editingPath:[lineId],mode:'edit',playback:createPlayback(plan.project,lineId),editorView:'cut',activeTool:'text',writerChapterId:null,previewProfile:'auto',view:'editor'});
  const raw=storage.getItem(WORKSPACE_KEY)!;
  const loaded=readWorkspace(raw);
  expect(loaded.picturebookLinks).toEqual(plan.links);expect(loaded.works[plan.workKey]).toEqual(plan.project);
  expect(loaded.contexts[plan.workKey]!.lineId).toBe(lineId);
  expect(peekPicturebookLinks(raw)).toMatchObject({links:plan.links,workKeys:new Set([plan.workKey])});
  const damaged=JSON.parse(raw);damaged.picturebookLinks[picturebookLinkKey('device',book.id)].sends[0].workKey='import:x';
  expect(()=>readWorkspace(JSON.stringify(damaged))).toThrow('그림책 연결');
  expect(()=>parsePicturebookLinks({wrong:{}})).toThrow();
 });
 it('reads a record from before several sends were kept as one send',()=>{
  const key=picturebookLinkKey('device',book.id),pages={p1:{chapterId:'c1',lineId:'l1'}};
  const links=parsePicturebookLinks({[key]:{ownerScope:'device',bookId:book.id,workKey:'new:w',requestId:'r',createdAt:NOW,pages}});
  expect(links[key]!.sends).toEqual([{workKey:'new:w',requestId:'r',createdAt:NOW,pages}]);
 });
 it('tells which pages were sent and where they are now',()=>{
  const plan=made(),sends=picturebookSends(plan.links,'device',book.id);
  const places=sentPagePlaces(sends,{[plan.workKey]:plan.project});
  expect(Object.keys(places)).toHaveLength(8);
  // A deleted chapter or a work gone from this device is no longer counted as sent.
  const without={...plan.project,chapters:plan.project.chapters.filter(chapter=>chapter.id!==ordered(plan.project)[0]!.id)};
  expect(Object.keys(sentPagePlaces(sends,{[plan.workKey]:without}))).toHaveLength(7);
  expect(sentPagePlaces(sends,{})).toEqual({});
 });
 it('keeps the previous workspace untouched when the browser storage is full',()=>{
  const plan=made();
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
