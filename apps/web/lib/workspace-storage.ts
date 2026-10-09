import {createStoryDocument,parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {compileStoryScene,createPlayback,orderedLines,restorePlayback,type PlaybackState} from '@knolstory/runtime-core';
import type {PreviewProfile} from './story-viewport';
export const WORKSPACE_KEY='knolstory-next-workspace-v1';
export type WorkspaceView='home'|'library'|'prepare'|'editor'|'book'|'cover';
export type EditorTool='text'|'assets'|'flow'|'presentation'|'cuts'|'writer'|null;
export type WorkContext=Readonly<{lineId:string;editorView:'cut'|'writer';activeTool:EditorTool;writerChapterId:string|null;previewProfile:PreviewProfile;playback?:PlaybackState;hasRead:boolean}>;
export type WorkspaceState=Readonly<{storyId:string;lineId:string;mode:'edit'|'play';playback:PlaybackState;editorView:'cut'|'writer';activeTool:EditorTool;writerChapterId:string|null;previewProfile:PreviewProfile;view:WorkspaceView}>;
export type WorkContexts=Readonly<Record<string,WorkContext>>;
export function preflight(project:StoryProject){
 const cuts=orderedLines(project);if(!cuts.length)throw Error('편집할 컷이 없는 작품입니다.');
 for(const cut of cuts)compileStoryScene(project,cut.id,0,{mode:'edit'});
}
export function captureContext(project:StoryProject,previous:WorkContext|undefined,state:WorkspaceState):WorkContext{
 const lineId=project.lines.some(line=>line.id===state.lineId)?state.lineId:orderedLines(project)[0]!.id;
 let playback:PlaybackState|undefined;
 try{const candidate=state.mode==='play'?state.playback:previous?.playback;if(candidate)playback=restorePlayback(project,candidate);}catch{/* Only the derived resume is invalid; authored content remains intact. */}
 return {lineId,editorView:state.editorView,activeTool:state.activeTool,writerChapterId:project.chapters.some(ch=>ch.id===state.writerChapterId)?state.writerChapterId:null,previewProfile:state.previewProfile,playback,hasRead:!!playback&&(state.mode==='play'||previous?.hasRead===true)};
}
const documentFor=(project:StoryProject)=>createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'knolstory-next-0.1'});
export function writeWorkspace(storage:Pick<Storage,'setItem'>,project:StoryProject,works:Readonly<Record<string,StoryProject>>,contexts:WorkContexts,state:WorkspaceState){
 const nextWorks={...works,[state.storyId]:project};const nextContexts={...contexts,[state.storyId]:captureContext(project,contexts[state.storyId],state)};
 const data={workspaceVersion:2,...state,document:documentFor(project),works:Object.fromEntries(Object.entries(nextWorks).map(([id,work])=>[id,documentFor(work)])),contexts:nextContexts};
 storage.setItem(WORKSPACE_KEY,JSON.stringify(data));return {works:nextWorks,contexts:nextContexts};
}
/** Additive reader: the original key and document envelope remain readable by older hosts. */
export function readWorkspace(raw:string){
 const value:unknown=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('기기 저장 형식을 확인해 주세요. 원본은 보존합니다.');
 const stored=value as Record<string,unknown>;
 if(stored.workspaceVersion!==undefined&&stored.workspaceVersion!==2)throw Error('이 기기 저장은 다른 버전에서 만들어졌습니다. 원본은 보존합니다.');
 const parsed=parseStoryDocument(stored.document);if(!parsed.ok)throw Error('저장된 작품 형식을 확인해 주세요. 원본은 보존합니다.');
 const project=parsed.document.project;preflight(project);
 if(stored.works!==undefined&&(!stored.works||typeof stored.works!=='object'||Array.isArray(stored.works)))throw Error('저장된 작품 목록을 확인해 주세요. 원본은 보존합니다.');
 const works=Object.fromEntries(Object.entries((stored.works??{}) as Record<string,unknown>).map(([id,document])=>{const result=parseStoryDocument(document);if(!result.ok)throw Error('저장된 작품 목록에 읽을 수 없는 작품이 있습니다. 원본은 보존합니다.');preflight(result.document.project);return [id,result.document.project];}));
 const storyId=typeof stored.storyId==='string'?stored.storyId:`import:${project.id}`;const allWorks={...works,[storyId]:project};
 const view:WorkspaceView=['home','library','prepare','book','cover'].includes(String(stored.view))?stored.view as WorkspaceView:'editor';
 let playback=createPlayback(project);let warning='';
 if(stored.playback!==undefined)try{playback=restorePlayback(project,stored.playback);}catch{warning='이야기 연결이 바뀌어 이어읽기를 처음부터 준비했습니다. 작품 내용은 보존됩니다.';}
 const contexts:Record<string,WorkContext>={};
 if(stored.contexts!==undefined&&(!stored.contexts||typeof stored.contexts!=='object'||Array.isArray(stored.contexts)))throw Error('작품별 작업 위치 형식을 확인해 주세요. 원본은 보존합니다.');
 for(const [key,p] of Object.entries(allWorks)){
  const candidate=(stored.contexts as Record<string,unknown>|undefined)?.[key];
  if(candidate!==undefined&&(!candidate||typeof candidate!=='object'||Array.isArray(candidate)))throw Error('작품별 작업 위치를 확인해 주세요. 원본은 보존합니다.');
  const c=(candidate??(key===storyId?stored:{})) as Record<string,unknown>;
  const state:WorkspaceState={storyId:key,lineId:typeof c.lineId==='string'?c.lineId:orderedLines(p)[0]!.id,mode:'edit',playback:createPlayback(p),editorView:c.editorView==='writer'?'writer':'cut',activeTool:['text','assets','flow','presentation','cuts','writer'].includes(String(c.activeTool))?c.activeTool as EditorTool:'text',writerChapterId:typeof c.writerChapterId==='string'?c.writerChapterId:null,previewProfile:['auto','desktop','portrait','landscape'].includes(String(c.previewProfile))?c.previewProfile as PreviewProfile:'auto',view};
  let resume:PlaybackState|undefined;try{if(c.playback)resume=restorePlayback(p,c.playback);}catch{warning='저장된 읽기 연결을 확인할 수 없어 해당 작품은 처음부터 읽기를 제공합니다. 작품 내용은 보존합니다.';}
  contexts[key]=captureContext(p,{...state,playback:resume,hasRead:c.hasRead===true||key===storyId&&stored.mode==='play'||!!resume&&resume.path.length>1},state);
 }
 return {project,storyId,works:allWorks,contexts,view,playback,mode:stored.mode==='play'?'play' as const:'edit' as const,warning};
}
