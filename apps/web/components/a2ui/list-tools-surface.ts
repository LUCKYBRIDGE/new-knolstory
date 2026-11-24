// The list screens' toolbar (현재 컷 찾기 · 함께 보기) as an A2UI surface from the focus editor catalog.
// The real editor draws it with FocusSurface, so the catalog — not hand-written markup — decides its controls.
import {applyMessages,focusEditorCatalog,type A2uiMessage,type Surface} from '@knolstory/ui';

export type CompanionToggle=Readonly<{id:string;label:string;checked:boolean}>;
export const LIST_TOOLS_EVENTS={reveal:'revealCurrentCut',companion:'toggleCompanion'} as const;

export function listToolsMessages({task,companions,busy,findDisabled}:{task:string;companions:readonly CompanionToggle[];busy:boolean;findDisabled:boolean}):A2uiMessage[]{
 const surfaceId=`list-tools-${task}`;
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'list-tools',component:'ToolGroup',name:'목록 도구',children:['find-current']},
   {id:'find-current',component:'Button',label:'현재 컷 찾기',disabled:{path:'/findDisabled'},action:{event:{name:LIST_TOOLS_EVENTS.reveal}}},
   ...(companions.length?[
    {id:'companions',component:'ToolGroup',name:'함께 보기',labelVisible:true,devices:['tablet','desktop'],children:companions.map(item=>`companion-${item.id}`)},
    ...companions.map(item=>({id:`companion-${item.id}`,component:'Toggle',label:item.label,name:`${item.label} 함께 보기`,value:{path:`/companions/${item.id}`},disabled:{path:'/busy'},change:{event:{name:LIST_TOOLS_EVENTS.companion,context:{task:item.id}}}})),
   ]:[]),
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{busy,findDisabled:busy||findDisabled,companions:Object.fromEntries(companions.map(item=>[item.id,item.checked]))}}},
 ];
}

export function listToolsSurface(input:Parameters<typeof listToolsMessages>[0]):Surface{
 return [...applyMessages(listToolsMessages(input)).values()][0]!;
}
