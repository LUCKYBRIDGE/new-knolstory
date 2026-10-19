import {describe,it,expect} from 'vitest';
import {createBlankStoryProject,createPlayback,advancePlayback,insertStoryCut} from '@knolstory/runtime-core';
import {createStoryDocument} from '@knolstory/story-domain';
import {createAuthoringArchive,prepareJsonbSnapshot,restoreJsonbSnapshot} from '@knolstory/compatibility';
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


it('atomically retains the prior deleted-work recovery if saving the next removal fails',()=>{
 const p=work(),deleted=work('deleted'),older=work('older');let raw='';
 const storage={setItem:(_k:string,v:string)=>{raw=v;}};
 writeWorkspace(storage,p,{}, {},{...state(p),deletedWork:{key:'new:older',project:older}});
 const before=raw;expect(()=>writeWorkspace({setItem:()=>{throw Error('quota');}},p,{}, {},{...state(p),deletedWork:{key:'new:deleted',project:deleted}})).toThrow('quota');
 expect(raw).toBe(before);expect(readWorkspace(raw).deletedWork?.project).toEqual(older);
 writeWorkspace(storage,p,{}, {},{...state(p),deletedWork:{key:'new:deleted',project:deleted}});expect(readWorkspace(raw).deletedWork?.project).toEqual(deleted);
});


it('persists each work editing visits independently from reader path and exported document',()=>{
 const a=work(),b=work('b'),read=advancePlayback(a,createPlayback(a));let raw='';
 const contexts={'import:b':{...captureContext(b,undefined,state(b)),editingPath:['b-second','b-first','b-second']}};
 writeWorkspace({setItem:(_key,value)=>{raw=value;}},a,{'import:b':b},contexts,{...state(a),editingPath:['a-first','a-second','a-first'],mode:'play',playback:read});
 const restored=readWorkspace(raw);expect(restored.contexts['new:a'].editingPath).toEqual(['a-first','a-second','a-first']);expect(restored.contexts['import:b'].editingPath).toEqual(['b-second','b-first','b-second']);expect(restored.contexts['new:a'].playback?.path).toEqual(read.path);expect(restored.project).toEqual(a);expect(JSON.parse(raw).document.project.editingPath).toBeUndefined();
});
it('prunes invalid stored editing IDs only and preserves a legacy workspace without this additive field',()=>{
 const p=work();const raw=JSON.stringify({...state(p),document:doc(p),editingPath:['a-first',42,'removed','a-second',{}]});
 const loaded=readWorkspace(raw);expect(loaded.contexts['new:a'].editingPath).toEqual(['a-first','a-second']);expect(loaded.project).toEqual(p);
 expect(readWorkspace(JSON.stringify({...state(p),document:doc(p)})).contexts['new:a'].editingPath).toEqual(['a-first']);
});


it('does not export local editing visits to official files or JSONB snapshots',async()=>{
 const p=work();let raw='';writeWorkspace({setItem:(_key,value)=>{raw=value;}},p,{}, {},{...state(p),editingPath:['a-first','a-second','a-first']});
 const loaded=readWorkspace(raw);const archive=await createAuthoringArchive({format:'knolstory',document:doc(loaded.project),audioResources:[]});const snapshot=await prepareJsonbSnapshot(archive);
 expect(JSON.stringify(archive)).not.toContain('editingPath');expect(JSON.stringify(snapshot)).not.toContain('editingPath');expect((await restoreJsonbSnapshot(snapshot))).toEqual(archive);if(archive.format!=='knolstory')throw Error('unexpected format');expect(archive.document.project).toEqual(p);
});

it('reads a retired classic preview as landscape without changing the authored project',()=>{
 const project=work();const raw=JSON.stringify({...state(project),previewProfile:'classic',document:doc(project)});
 const loaded=readWorkspace(raw);expect(loaded.contexts['new:a'].previewProfile).toBe('landscape');expect(loaded.project).toEqual(project);expect(JSON.parse(raw).previewProfile).toBe('classic');
});
