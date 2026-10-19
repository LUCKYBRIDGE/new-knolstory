import type {EditorTool} from './workspace-storage';

export type WorkSection='info'|'planning'|'memos'|'scores';
export type EditorReturnContext=Readonly<{editorView:'cut'|'writer';activeTool:EditorTool;writerChapterId:string|null;soundTool:boolean}>;
export type MemoNavigationRequest=Readonly<{projectId:string;memoId:string;lineId:string;section?:WorkSection;returnToEditor?:boolean;editorContext?:EditorReturnContext}>;
/** Personal copies retain memo/cut IDs; only the owning work identity changes. */
export function remapMemoNavigation(request:MemoNavigationRequest|null,sourceId:string,copyId:string):MemoNavigationRequest|null{
 return request?.projectId===sourceId?{...request,projectId:copyId}:request;
}
