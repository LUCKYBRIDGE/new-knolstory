import {DEFAULT_COVER} from "@knolstory/story-domain";
import {createCatalogEditCopy,personalCoverTitle,hasDefaultPersonalCover} from "./personal-library";

import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,createPlayback} from '@knolstory/runtime-core';
import {captureContext} from './workspace-storage';
import {prepareImportedWork,copyPersonalWork,readDeletedWork,writeDeletedWork,DELETED_WORK_KEY} from './personal-library';
const project=createBlankStoryProject({id:'source',chapterId:'chapter',lineId:'cut',title:'원작'});
describe('personal library protection',()=>{
 it('copies identity without changing manuscript and preserves source title',()=>{const copy=copyPersonalWork(project,'copy','2026-10-09');expect(copy.id).toBe('copy');expect(copy.title).toBe('원작 · 내 사본');expect(copy.lines).toEqual(project.lines);expect(project.id).toBe('source');});
 it('rejects a repeated builtin archive after its imported identity was forked',()=>{const first=prepareImportedWork(project,{},['source'],'fork');expect(first.id).toBe('fork');expect(()=>prepareImportedWork(project,{'import:fork':first},['source'],'fork2')).toThrow('같은 작품');expect(first.lines).toEqual(project.lines);});
 it('persists a recoverable personal work and context',()=>{let raw:string|null=null;const storage={setItem:(key:string,value:string)=>{expect(key).toBe(DELETED_WORK_KEY);raw=value;},getItem:()=>raw};writeDeletedWork(storage,{key:'new:source',project});expect(readDeletedWork(storage)?.project).toEqual(project);expect(readDeletedWork(storage)?.key).toBe('new:source');});
 it('preserves editing context while validating recovery input',()=>{const context=captureContext(project,undefined,{storyId:'new:source',lineId:'cut',mode:'edit',playback:createPlayback(project),editorView:'writer',activeTool:'writer',writerChapterId:'chapter',previewProfile:'portrait',view:'library'});let raw='';writeDeletedWork({setItem:(_key,value)=>{raw=value;}},{key:'new:source',project,context});expect(readDeletedWork({getItem:()=>raw})?.context).toEqual(context);const corrupt=JSON.parse(raw);corrupt.context='invalid';expect(()=>readDeletedWork({getItem:()=>JSON.stringify(corrupt)})).toThrow();});
 it('rejects built-in removal and corrupt recovery without hiding it',()=>{expect(()=>writeDeletedWork({setItem:()=>{}},{key:'heungbu',project})).toThrow();expect(()=>readDeletedWork({getItem:()=>'{bad'})).toThrow();});
});

it('numbers editable catalog copies without changing the source manuscript or a renamed copy',()=>{
 const source={...project,id:'pinky-review-main-004',title:'선녀 각색',cover:{...DEFAULT_COVER,theme:'forest' as const,backgroundId:'original-art'}};
 const first=createCatalogEditCopy(source,'one','2026-11-04',{});
 const second=createCatalogEditCopy(source,'two','2026-11-04',{'new:one':first});
 const third=createCatalogEditCopy(source,'three','2026-11-04',{'new:one':first,'new:two':second});
 expect([first.title,second.title,third.title]).toEqual(['[내작품] 선녀와 나무꾼','[내작품] 선녀와 나무꾼 2','[내작품] 선녀와 나무꾼 3']);
 expect(first.cover).toEqual(DEFAULT_COVER);
 expect(first.lines).toEqual(source.lines);
 expect(source.title).toBe('선녀 각색');
 const renamed={...second,title:'직접 바꾼 제목'};
 expect(personalCoverTitle(renamed.title)).toBe(renamed.title);
 expect(personalCoverTitle(first.title)).toBe('선녀와 나무꾼');
 expect(hasDefaultPersonalCover(first)).toBe(true);
 expect(hasDefaultPersonalCover({...first,cover:{...DEFAULT_COVER,titleColor:'#ffffff'}})).toBe(false);
});
