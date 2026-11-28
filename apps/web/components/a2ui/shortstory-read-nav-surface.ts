// 숏스토리 읽기 · 쪽 넘김 줄(‹ 이전 쪽 · n / 전체 · 다음 쪽 ›) as an A2UI surface from the focus editor catalog.
// The page keeps its <nav> landmark; the turn's names and labels are the same as before (표지로 · 책 덮기 at the ends).
import {applyMessages,focusEditorCatalog,type A2uiMessage,type Surface} from '@knolstory/ui';

export const READ_NAV_EVENTS={previous:'turnPrevious',next:'turnNext'} as const;
export type ReadNavInput=Readonly<{index:number;count:number}>;

export function readNavMessages({index,count}:ReadNavInput):A2uiMessage[]{
 const surfaceId='shortstory-read-nav',first=index===0,last=index===count-1;
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'ToolGroup',name:'쪽 넘기기',children:['previous','place','next']},
   {id:'previous',component:'Button',label:first?'‹ 표지':'‹ 이전 쪽',name:first?'표지로':'이전 쪽',action:{event:{name:READ_NAV_EVENTS.previous}}},
   {id:'place',component:'Chip',label:`${index+1} / ${count}`},
   {id:'next',component:'Button',label:last?'책 덮기 ›':'다음 쪽 ›',name:last?'책 덮기':'다음 쪽',variant:'primary',action:{event:{name:READ_NAV_EVENTS.next}}},
  ]}},
 ];
}
export const readNavSurface=(input:ReadNavInput):Surface=>[...applyMessages(readNavMessages(input)).values()][0]!;
