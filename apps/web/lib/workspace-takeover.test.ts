import {describe,it,expect} from 'vitest';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {CHECKPOINT_KEY,readStoryCheckpoints} from './story-checkpoints';
import {preserveConcurrentStory,mergeWorkspaceProjects,assertTakeoverCollectionExists} from './workspace-takeover';

const base=createBlankStoryProject({id:'work',chapterId:'chapter',lineId:'cut'});
const changed=(text:string)=>({...base,lines:base.lines.map(line=>({...line,text}))});
const storage=()=>{const data=new Map<string,string>([['workspace','incoming raw']]);return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
describe('workspace takeover preserves the replaced manuscript first',()=>{
 it('refuses to recreate a collection removed after this tab read it',()=>{
  expect(()=>assertTakeoverCollectionExists(null,'previous raw')).toThrow(/삭제/);
  expect(()=>assertTakeoverCollectionExists(null,null)).not.toThrow();
  expect(()=>assertTakeoverCollectionExists('new raw','previous raw')).not.toThrow();
 });
 it('keeps the complete incoming version before replacing a conflicting draft',()=>{
  const store=storage(),incoming=changed('다른 탭');
  expect(preserveConcurrentStory(store,changed('현재 탭'),base,incoming)).toBe(true);
  expect(readStoryCheckpoints(store)[0]!.project).toEqual(incoming);
  expect(store.getItem('workspace')).toBe('incoming raw');
 });
 it('does not make history for identical edits or a clean current tab',()=>{
  const store=storage(),incoming=changed('같은 글');
  expect(preserveConcurrentStory(store,incoming,base,incoming)).toBe(false);
  expect(preserveConcurrentStory(store,base,base,incoming)).toBe(false);
  expect(store.getItem(CHECKPOINT_KEY)).toBeNull();
 });
 it('refuses takeover when the complete incoming story exceeds checkpoint capacity',()=>{
  const store=storage(),incoming={...base,lines:Array.from({length:600},(_,i)=>({...base.lines[0]!,id:`cut-${i}`,order:i+1,text:'가'.repeat(2000)}))};
  expect(()=>preserveConcurrentStory(store,changed('현재 탭'),base,incoming)).toThrow(/2MB/);
  expect(store.getItem('workspace')).toBe('incoming raw');expect(store.getItem(CHECKPOINT_KEY)).toBeNull();
 });
 it('refuses takeover when history is corrupt or cannot be written',()=>{
  const store=storage();store.setItem(CHECKPOINT_KEY,'broken');
  expect(()=>preserveConcurrentStory(store,changed('현재 탭'),base,changed('다른 탭'))).toThrow();
  expect(store.getItem(CHECKPOINT_KEY)).toBe('broken');
  expect(()=>preserveConcurrentStory({...store,getItem:()=>null,setItem:()=>{throw Error('quota');}},changed('현재 탭'),base,changed('다른 탭'))).toThrow();
 });
 it('does not recreate a work deleted by another tab when an old tab takes over',()=>{
  const store=storage();
  expect(()=>preserveConcurrentStory(store,base,base,undefined)).toThrow(/삭제/);
  expect(store.getItem('workspace')).toBe('incoming raw');expect(store.getItem(CHECKPOINT_KEY)).toBeNull();
 });
 it('uses the persisted baseline even after changing screens remembered an unsaved draft',()=>{
  const store=storage(),mine=changed('화면 이동 직전 쓴 글'),incoming=changed('다른 탭의 글');
  const result=mergeWorkspaceProjects(store,{work:mine},{work:incoming},{work:base},'work');
  expect(result.conflict).toBe(true);expect(readStoryCheckpoints(store)[0]!.project).toEqual(incoming);
 });
 it('keeps new and changed noncurrent works until the next snapshot saves them',()=>{
  const store=storage(),newWork={...base,id:'new'},other={...base,id:'other'},edited={...other,title:'미보관 제목'};
  const result=mergeWorkspaceProjects(store,{work:base,other:edited,new:newWork},{work:base,other},{work:base,other},'work');
  expect(result.works.other).toEqual(edited);expect(result.works.new).toEqual(newWork);
 });
 it('blocks a conflict in another unsaved work before claiming either revision was preserved',()=>{
  const store=storage();
  expect(()=>mergeWorkspaceProjects(store,{work:base,other:changed('내 글')},{work:base,other:changed('다른 글')},{work:base,other:base},'work')).toThrow(/다른 작품/);
  expect(store.getItem('workspace')).toBe('incoming raw');expect(store.getItem(CHECKPOINT_KEY)).toBeNull();
 });
});
