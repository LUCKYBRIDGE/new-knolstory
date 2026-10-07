import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,createPlayback,advancePlayback,insertStoryCut} from '@knolstory/runtime-core';
import {createStoryDocument} from '@knolstory/story-domain';
import {readWorkspace,captureContext,writeWorkspace,WORKSPACE_KEY} from './workspace-storage';
const work=(id='a')=>insertStoryCut(createBlankStoryProject({id,chapterId:`${id}-chapter`,lineId:`${id}-first`}),`${id}-first`,`${id}-second`);
const state=(project=work())=>({storyId:`new:${project.id}`,lineId:project.lines[0].id,mode:'edit' as const,playback:createPlayback(project),editorView:'cut' as const,activeTool:'text' as const,writerChapterId:null,previewProfile:'auto' as const,view:'editor' as const});
const doc=(project=work())=>createStoryDocument({project,savedAt:'2026-10-07T00:00:00.000Z',appVersion:'test'});
describe('workspace library compatibility',()=>{
 it('reads existing device works and current edit/read positions without writing or changing content',()=>{const p=work(),raw=JSON.stringify({...state(p),document:doc(p),works:{'new:a':doc(p),'import:b':doc(work('b'))}});const loaded=readWorkspace(raw);expect(loaded.works['new:a']).toEqual(p);expect(loaded.works['import:b'].id).toBe('b');expect(loaded.view).toBe('editor');expect(loaded.contexts['new:a'].lineId).toBe('a-first');});
 it('separates edit location and read path per work even after editing another cut',()=>{const p=work(),start=state(p);const reading=captureContext(p,undefined,{...start,mode:'play',playback:advancePlayback(p,start.playback)});const edited=captureContext(p,reading,{...start,lineId:'a-first'});expect(edited.lineId).toBe('a-first');expect(edited.playback?.lineId).toBe('a-second');expect(edited.hasRead).toBe(true);});
 it('persists library/preparation views and all session fields through the existing key',()=>{const p=work(),b=work('b'),s={...state(p),view:'library' as const,editorView:'writer' as const,activeTool:'writer' as const,writerChapterId:'a-chapter',previewProfile:'portrait' as const};let raw='';const next=writeWorkspace({setItem:(key,value)=>{expect(key).toBe(WORKSPACE_KEY);raw=value;}},p,{'import:b':b},{},s);expect(next.works['import:b']).toEqual(b);const loaded=readWorkspace(raw);expect(loaded.view).toBe('library');expect(loaded.contexts['new:a']).toMatchObject({editorView:'writer',writerChapterId:'a-chapter',previewProfile:'portrait'});});
 it('rejects malformed documents and future workspace formats before any write',()=>{expect(()=>readWorkspace('bad')).toThrow();expect(()=>readWorkspace(JSON.stringify({workspaceVersion:999,document:doc()}))).toThrow();expect(()=>readWorkspace(JSON.stringify({document:doc(),works:{bad:{}}}))).toThrow();});
 it('handles stale session locations without changing the story and clears invalid read routes after structure edits',()=>{const p=work(),prior={...captureContext(p,undefined,{...state(p),mode:'play'}),lineId:'missing',playback:{...createPlayback(p),path:['missing']}};const result=captureContext(p,prior,state(p));expect(result.lineId).toBe('a-first');expect(result.playback).toBeUndefined();expect(p.lines).toHaveLength(2);});
});

it('preserves home, book-start and cover editor navigation without changing authored document or read path',()=>{
 const p=work();for(const view of ['home','book','cover'] as const){let raw='';writeWorkspace({setItem:(_k,v)=>{raw=v;}},p,{}, {},{...state(p),view});const result=readWorkspace(raw);expect(result.view).toBe(view);expect(result.project).toEqual(p);}
});
