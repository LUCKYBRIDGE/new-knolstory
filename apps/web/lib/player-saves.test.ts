import {describe,it,expect} from 'vitest';
import type {StoryProject} from '@knolstory/story-domain';
import {createBlankStoryProject,createPlayback,advancePlayback} from '@knolstory/runtime-core';
import {PLAYER_SAVES_KEY,readPlayerSaves,savePlayerSlot,writePlayerSaves,loadPlayerSlot,projectPlaybackFingerprint} from './player-saves';
const p=()=>createBlankStoryProject({id:'p',chapterId:'c',lineId:'a'});
const memory=()=>{const entries=new Map<string,string>();return {getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},entries};};
describe('player slots',()=>{
 it('stores separate works and manual slots without replacing autosave and round trips ended states',()=>{const project=p(),state=advancePlayback(project,createPlayback(project));const storage=memory();let saves=readPlayerSaves(storage);saves=savePlayerSlot(saves,project,state,1,'2026-10-07T00:00:00Z');saves=savePlayerSlot(saves,project,createPlayback(project),'auto','2026-10-07T00:00:01Z');saves=savePlayerSlot(saves,{...project,id:'other'},createPlayback({...project,id:'other'}),1);writePlayerSaves(storage,saves);expect([...storage.entries.keys()]).toEqual([PLAYER_SAVES_KEY]);const read=readPlayerSaves(storage);expect(loadPlayerSlot(project,read.works.p['1']).state.status).toBe('ended');expect(read.works.p.auto).toBeDefined();expect(read.works.other['1']).toBeDefined();});
 it('detects modified content including audio without invalidating timestamp-only changes and validates route on explicit compatibility load',()=>{const project=p(),state=createPlayback(project),slot=savePlayerSlot({version:1,works:{}},project,state,1).works.p['1'];expect(projectPlaybackFingerprint({...project,updatedAt:'different'})).toBe(slot.fingerprint);const changed={...project,lines:project.lines.map(l=>({...l,text:'changed',audio:{music:{action:'stop' as const}}}))};expect(()=>loadPlayerSlot(changed,slot)).toThrow('변경');expect(loadPlayerSlot(changed,slot,true).changed).toBe(true);expect(()=>loadPlayerSlot({...changed,lines:[]},slot,true)).toThrow();expect(()=>loadPlayerSlot({...project,id:'other'},slot)).toThrow();});
 it('preserves malformed storage and rejects invalid slots instead of overwriting them',()=>{const storage=memory();storage.setItem(PLAYER_SAVES_KEY,'bad');expect(()=>readPlayerSaves(storage)).toThrow();expect(storage.getItem(PLAYER_SAVES_KEY)).toBe('bad');expect(()=>savePlayerSlot({version:1,works:{}},p(),createPlayback(p()),0)).toThrow();expect(()=>readPlayerSaves({getItem:()=>'{"version":1,"works":{"p":{"1":{"savedAt":3}}}}'})).toThrow();expect(()=>writePlayerSaves({setItem:()=>{throw Error('quota');}},{version:1,works:{}})).toThrow('quota');});
});

describe('preparation and reading independence',()=>{
 it('keeps reading saves valid when only work information, cover, planning or memos change',()=>{
  const project=p(),slot=savePlayerSlot({version:1,works:{}},project,createPlayback(project),1).works.p['1'];
  const changed={...project,title:'새 제목',description:'소개',cover:{author:'작가'} as StoryProject['cover'],planning:{...project.planning,premise:'다음 아이디어'},creativeMemos:[{id:'m',kind:'free' as const,title:'메모',fields:[],order:1,createdAt:'2026-10-07T00:00:00.000Z',updatedAt:'2026-10-07T00:00:00.000Z'}]};
  expect(projectPlaybackFingerprint(changed)).toBe(slot.fingerprint);expect(loadPlayerSlot(changed,slot).changed).toBe(false);
 });
});
