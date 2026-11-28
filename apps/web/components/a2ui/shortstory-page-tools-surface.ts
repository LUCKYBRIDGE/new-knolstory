// 숏스토리 쓰기 · ‘쪽’ 탭의 도구 줄(쪽 추가 · 쪽 순서 · 쪽 삭제) as an A2UI surface from the focus editor catalog.
// Add first, then order, remove last (rule: choose/change first, remove last). The page itself draws it with FocusSurface.
import {applyMessages,focusEditorCatalog,type A2uiMessage,type Surface} from '@knolstory/ui';

export const PAGE_TOOL_EVENTS={add:'addPage',copy:'copyPage',earlier:'movePageEarlier',later:'movePageLater',moveTo:'movePageTo',undoMove:'undoPageMove',remove:'removePage',undoRemove:'undoPageRemove'} as const;
export type PageToolsInput=Readonly<{index:number;count:number;full:boolean;canUndoMove:boolean;canUndoRemove:boolean}>;

export function pageToolsMessages(p:PageToolsInput):A2uiMessage[]{
 const surfaceId='shortstory-page-tools',event=(name:string)=>({event:{name}});
 const order=['earlier','later',...(p.count>2?['move-to']:[]),...(p.canUndoMove?['undo-move']:[])];
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'Column',gap:8,children:['add-group','order-group','remove-group']},
   {id:'add-group',component:'ToolGroup',name:'쪽 추가',labelVisible:true,children:['add','copy']},
   {id:'add',component:'Button',label:'현재 쪽 뒤에 빈 쪽 추가',disabled:p.full,action:event(PAGE_TOOL_EVENTS.add)},
   {id:'copy',component:'Button',label:'현재 쪽 복제',disabled:p.full,action:event(PAGE_TOOL_EVENTS.copy)},
   {id:'order-group',component:'ToolGroup',name:'쪽 순서',labelVisible:true,children:order},
   {id:'earlier',component:'Button',label:'쪽 앞으로 이동',disabled:p.index===0,action:event(PAGE_TOOL_EVENTS.earlier)},
   {id:'later',component:'Button',label:'쪽 뒤로 이동',disabled:p.index===p.count-1,action:event(PAGE_TOOL_EVENTS.later)},
   ...(p.count>2?[{id:'move-to',component:'Choice',label:'이 쪽 옮기기',value:{path:'/index'},change:event(PAGE_TOOL_EVENTS.moveTo),
    options:Array.from({length:p.count},(_,at)=>({value:String(at),label:`${at+1}쪽`}))}]:[]),
   ...(p.canUndoMove?[{id:'undo-move',component:'Button',label:'쪽 이동 되돌리기',variant:'quiet',action:event(PAGE_TOOL_EVENTS.undoMove)}]:[]),
   {id:'remove-group',component:'ToolGroup',name:'쪽 삭제',children:['remove',...(p.canUndoRemove?['undo-remove']:[])]},
   {id:'remove',component:'Button',label:'현재 쪽 삭제',disabled:p.count===1,action:event(PAGE_TOOL_EVENTS.remove)},
   ...(p.canUndoRemove?[{id:'undo-remove',component:'Button',label:'쪽 삭제 되돌리기',variant:'quiet',action:event(PAGE_TOOL_EVENTS.undoRemove)}]:[]),
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{index:String(p.index)}}},
 ];
}
export const pageToolsSurface=(p:PageToolsInput):Surface=>[...applyMessages(pageToolsMessages(p)).values()][0]!;
