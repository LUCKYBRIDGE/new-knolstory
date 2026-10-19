import {describe,expect,it,vi} from 'vitest';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import {CHECKPOINT_KEY,createStoryCheckpoint,readStoryCheckpoints,recordBeforeCutDeletion} from './story-checkpoints';
const work=(id='a')=>createBlankStoryProject({id,chapterId:`${id}-chapter`,lineId:`${id}-first`});
const options=(id='one')=>({id,now:'2026-10-09T00:00:00.000Z'});
function storage(initial:string|null=null){let raw=initial;return {getItem:vi.fn(()=>raw),setItem:vi.fn((_key:string,value:string)=>{raw=value;}),raw:()=>raw};}
describe('bounded explicit story checkpoints',()=>{
 it('reads an empty store without writing',()=>{const s=storage();expect(readStoryCheckpoints(s)).toEqual([]);expect(s.setItem).not.toHaveBeenCalled();});
 it('round trips a complete independent StoryDocument using only the Next namespace',()=>{const s=storage(),p=work();const result=createStoryCheckpoint(s,p,'manual',options());expect(s.setItem).toHaveBeenCalledWith(CHECKPOINT_KEY,expect.any(String));expect(result[0]).toMatchObject({id:'one',projectId:'a',reason:'manual',createdAt:options().now,project:p});expect(readStoryCheckpoints(s)[0].project).toEqual(p);p.title='changed later';expect(result[0].project.title).not.toBe('changed later');});
 it('retains the newest ten snapshots across works and reasons',()=>{const s=storage();for(let i=0;i<12;i++)createStoryCheckpoint(s,work(i%2?'a':'b'),i%2?'manual':'before-delete',options(String(i)));const all=readStoryCheckpoints(s);expect(all).toHaveLength(10);expect(all.map(c=>c.id)).toEqual(['11','10','9','8','7','6','5','4','3','2']);});
 it('preserves malformed raw records and refuses to overwrite them',()=>{for(const raw of ['bad','{}','[{}]']){const s=storage(raw);expect(()=>readStoryCheckpoints(s)).toThrow(/복구 기록/);expect(()=>createStoryCheckpoint(s,work(),'manual',options())).toThrow();expect(s.raw()).toBe(raw);expect(s.setItem).not.toHaveBeenCalled();}});
 it('rejects invalid snapshots and preflight failures before writing',()=>{const s=storage();expect(()=>createStoryCheckpoint(s,{...work(),lines:[]} as StoryProject,'manual',options())).toThrow();expect(s.setItem).not.toHaveBeenCalled();});
 it('surfaces unavailable storage and quota errors without replacing prior checkpoints',()=>{const s=storage();createStoryCheckpoint(s,work(),'manual',options());const before=s.raw();s.setItem.mockImplementation(()=>{throw Error('quota');});expect(()=>createStoryCheckpoint(s,work(),'before-delete',options('two'))).toThrow(/파일/);expect(s.raw()).toBe(before);expect(()=>readStoryCheckpoints({getItem:()=>{throw Error('blocked');}})).toThrow(/복구 기록/);});
 it('rejects an overlarge single project and preserves previous history',()=>{const s=storage();createStoryCheckpoint(s,work(),'manual',options());const before=s.raw();expect(()=>createStoryCheckpoint(s,{...work(),title:'가'.repeat(1_050_000)},'manual',options('big'))).toThrow(/용량/);expect(s.raw()).toBe(before);});
 it('evicts oldest records to respect the total UTF16 byte budget',()=>{const s=storage(),p={...work(),title:'가'.repeat(350_000)};createStoryCheckpoint(s,p,'manual',options('first'));createStoryCheckpoint(s,p,'manual',options('second'));createStoryCheckpoint(s,p,'manual',options('third'));expect(readStoryCheckpoints(s).map(c=>c.id)).toEqual(['third','second']);expect(s.raw()!.length*2).toBeLessThanOrEqual(2*1024*1024);});
 it('rejects duplicate IDs and malformed metadata without losing previous records',()=>{const s=storage();createStoryCheckpoint(s,work(),'manual',options());const before=s.raw();expect(()=>createStoryCheckpoint(s,work(),'manual',options())).toThrow();expect(()=>createStoryCheckpoint(s,work(),'manual',{id:'new',now:'nonsense'})).toThrow();expect(s.raw()).toBe(before);const parsed=JSON.parse(before!);parsed[0].projectId='another';const corrupt=storage(JSON.stringify(parsed));expect(()=>readStoryCheckpoints(corrupt)).toThrow();});
});

it('keeps oversized manuscript deletion available with explicit file-backup warning and existing undo',()=>{
 const s=storage();const project={...work(),title:'가'.repeat(1_050_000)};
 expect(recordBeforeCutDeletion(s,project)).toMatch(/용량.*파일/);
 expect(s.setItem).not.toHaveBeenCalled();
 const broken=storage('broken');expect(()=>recordBeforeCutDeletion(broken,work())).toThrow(/복구 기록/);
});
