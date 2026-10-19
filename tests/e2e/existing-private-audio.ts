import type {Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {createStoryDocument,type StoryProject} from '../../packages/story-domain/src';
import type {AudioResource} from '../../apps/web/lib/audio-resources';

/** Prior device data, never a permitted new upload/import path. */
export function priorAudioResource(bytes:Buffer,name:string,kind:'music'|'sound',originalName:string):AudioResource{
 const id=`audio:custom:${createHash('sha256').update(bytes).digest('hex')}:wav`;
 return {id,name,kind,mime:'audio/wav',data:bytes.toString('base64'),metadata:{category:kind==='music'?'background':'effect',tags:[],originalName,source:'이전 기기 자료'}};
}
/** Seed an isolated test browser's existing device snapshot and both IDB stores atomically. */
export async function existingPrivateWorkspace(page:Page,project:StoryProject,resources:readonly AudioResource[],lineId=project.lines[0].id){
 const current=createStoryDocument({project,savedAt:'2026-10-11T00:00:00.000Z',appVersion:'prior-device-test'});
 const document={...current,schemaVersion:7};
 const key=`new:prior:${project.id}`;
 const raw=JSON.stringify({workspaceVersion:2,document,works:{[key]:document},storyId:key,lineId,mode:'edit',view:'editor',editorView:'cut',activeTool:'text'});
 await page.addInitScript(({raw,resources,workId})=>{
  if(window!==window.top||sessionStorage.getItem('test-prior-audio-seeded'))return;
  sessionStorage.setItem('test-prior-audio-seeded','yes');
  localStorage.setItem('knolstory-next-workspace-v1',raw);
  localStorage.setItem('storygame-prior-audio','untouched legacy media work');
  const ready=new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('knolstory-audio-assets-v1',2);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('resources'))db.createObjectStore('resources',{keyPath:'id'});if(!db.objectStoreNames.contains('work-metadata'))db.createObjectStore('work-metadata',{keyPath:['workId','id']});};
   request.onsuccess=()=>{const db=request.result,tx=db.transaction(['resources','work-metadata'],'readwrite');for(const [position,resource] of resources.entries()){tx.objectStore('resources').put(resource);const {data:_data,...metadata}=resource;tx.objectStore('work-metadata').put({...metadata,workId,position});}tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
   request.onerror=()=>reject(request.error);
  });
  (window as unknown as {priorAudioReady:Promise<void>}).priorAudioReady=ready;
 },{raw,resources,workId:project.id});
 return {project:current.project,document,raw};
}
