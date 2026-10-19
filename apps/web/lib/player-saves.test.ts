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


describe('v2 quick slots migration',()=>{
 it('reads v1 without writing and upgrades on explicit write preserving all nine slots',()=>{
  const project=p(),storage=memory();let original={version:1 as const,works:{}};
  for(let id=1;id<=9;id++)original=savePlayerSlot(original,project,createPlayback(project),id) as typeof original;
  storage.setItem(PLAYER_SAVES_KEY,JSON.stringify({...original,version:1}));const raw=storage.getItem(PLAYER_SAVES_KEY);
  const read=readPlayerSaves(storage);expect(read.version).toBe(3);expect(storage.getItem(PLAYER_SAVES_KEY)).toBe(raw);
  const next=savePlayerSlot(read,project,createPlayback(project),'quick');writePlayerSaves(storage,next);
  expect(readPlayerSaves(storage).works.p.quick).toBeDefined();expect(Object.keys(next.works.p)).toHaveLength(10);
 });
 it('rejects unknown versions and quick slots injected into v1, preserving raw bytes',()=>{
  const project=p(),quick=savePlayerSlot({version:2,works:{}},project,createPlayback(project),'quick');
  for(const version of [1,4]){const storage=memory();const raw=JSON.stringify({...quick,version});storage.setItem(PLAYER_SAVES_KEY,raw);expect(()=>readPlayerSaves(storage)).toThrow();expect(storage.getItem(PLAYER_SAVES_KEY)).toBe(raw);}
 });
 it('rejects noncanonical slot ids and malformed choice records',()=>{
  const project=p(),saves=savePlayerSlot({version:2,works:{}},project,createPlayback(project),1);
  const slot=saves.works.p['1'];expect(()=>readPlayerSaves({getItem:()=>JSON.stringify({version:2,works:{p:{'01':slot}}})})).toThrow();
  expect(()=>loadPlayerSlot(project,{...slot,playback:{...slot.playback,choiceHistory:[{pathIndex:-1,choiceId:'a'}]}})).toThrow();
 });
});


describe('native thumbnail envelope v3',()=>{
 const thumbnail={dataUrl:'data:image/webp;base64,UklGRgAAAABXRUJQ',width:320,height:180};
 it('stores native thumbnail without changing playback and migrates v2 without writing',()=>{
  const project=p(),storage=memory(),state=createPlayback(project);
  const next=savePlayerSlot({version:2,works:{}},project,state,'quick','2026-10-07T00:00:00Z',thumbnail);
  expect(next.version).toBe(3);expect(next.works.p.quick.thumbnail).toEqual(thumbnail);expect(loadPlayerSlot(project,next.works.p.quick).state).toEqual(state);
  const old=JSON.stringify({...next,version:2,works:{p:{quick:{...next.works.p.quick,thumbnail:undefined}}}});storage.setItem(PLAYER_SAVES_KEY,old);
  expect(readPlayerSaves(storage).version).toBe(3);expect(storage.getItem(PLAYER_SAVES_KEY)).toBe(old);
 });
 it('rejects injected urls, excessive bytes, bad dimensions and pre-v3 thumbnail fields without overwriting raw',()=>{
  const project=p(),slot=savePlayerSlot({version:2,works:{}},project,createPlayback(project),1).works.p['1'];
  for(const bad of [{...thumbnail,dataUrl:'https://example.com/picture.webp'},{...thumbnail,width:321},{...thumbnail,height:0},{...thumbnail,dataUrl:'data:image/webp;base64,'+'A'.repeat(60000)}]){
   expect(()=>savePlayerSlot({version:2,works:{}},project,createPlayback(project),1,undefined,bad)).toThrow();
   const storage=memory(),raw=JSON.stringify({version:3,works:{p:{1:{...slot,thumbnail:bad}}}});storage.setItem(PLAYER_SAVES_KEY,raw);expect(()=>readPlayerSaves(storage)).toThrow();expect(storage.getItem(PLAYER_SAVES_KEY)).toBe(raw);
  }
  expect(()=>readPlayerSaves({getItem:()=>JSON.stringify({version:2,works:{p:{1:{...slot,thumbnail}}}})})).toThrow();
 });
});

 describe('source position saves',()=>{
  const project=()=>{const blank=p();return {...blank,lines:blank.lines.map(line=>({...line,text:'첫 😀 문장. 다음 문장.'}))};};
  it('round trips position additively and clamps it to the matching current text',()=>{
   const story=project(),state=createPlayback(story),storage=memory();
   const saves=savePlayerSlot({version:3,works:{}},story,state,'quick',undefined,undefined,{lineId:'a',offset:6});
   writePlayerSaves(storage,saves);const slot=readPlayerSaves(storage).works.p.quick;
   expect(loadPlayerSlot(story,slot).dialoguePosition).toEqual({lineId:'a',offset:6});
   expect(savePlayerSlot(saves,story,state,1,undefined,undefined,{lineId:'a',offset:999}).works.p['1'].dialoguePosition).toEqual({lineId:'a',offset:Array.from(story.lines[0].text).length});
   expect(saves.works.p.quick.dialoguePosition).toEqual({lineId:'a',offset:6});
   expect(loadPlayerSlot(story,{...slot,dialoguePosition:{lineId:'a',offset:999}}).dialoguePosition?.offset).toBe(Array.from(story.lines[0].text).length);
   expect(Array.from(story.lines[0].text).length).toBe(story.lines[0].text.length-1);
  });
  it('drops stale, changed and ended positions while keeping legacy slots readable',()=>{
   const story=project(),state=createPlayback(story),slot=savePlayerSlot({version:3,works:{}},story,state,1,undefined,undefined,{lineId:'a',offset:6}).works.p['1'];
   expect(loadPlayerSlot(story,{...slot,dialoguePosition:undefined}).dialoguePosition).toBeUndefined();
   expect(loadPlayerSlot(story,{...slot,dialoguePosition:{lineId:'other',offset:6}}).dialoguePosition).toBeUndefined();
   const changed={...story,lines:story.lines.map(line=>({...line,text:'수정됨'}))};
   expect(loadPlayerSlot(changed,slot,true).dialoguePosition).toBeUndefined();
   expect(savePlayerSlot({version:3,works:{}},story,state,1,undefined,undefined,{lineId:'other',offset:6}).works.p['1'].dialoguePosition).toBeUndefined();
   expect(savePlayerSlot({version:3,works:{}},story,advancePlayback(story,state),1,undefined,undefined,{lineId:'a',offset:6}).works.p['1'].dialoguePosition).toBeUndefined();
  });
  it('rejects malformed positions and preserves rejected raw storage',()=>{
   const story=project(),state=createPlayback(story),slot=savePlayerSlot({version:3,works:{}},story,state,1).works.p['1'];
   for(const bad of [null,[],{}, {lineId:'',offset:1},{lineId:'a',offset:-1},{lineId:'a',offset:.5},{lineId:'a',offset:'3'},{lineId:'a',offset:Number.MAX_SAFE_INTEGER+1}]){
    expect(()=>savePlayerSlot({version:3,works:{}},story,state,1,undefined,undefined,bad as never)).toThrow();
    const storage=memory(),raw=JSON.stringify({version:3,works:{p:{1:{...slot,dialoguePosition:bad}}}});storage.setItem(PLAYER_SAVES_KEY,raw);
    expect(()=>readPlayerSaves(storage)).toThrow();expect(storage.getItem(PLAYER_SAVES_KEY)).toBe(raw);
   }
  });
 });
