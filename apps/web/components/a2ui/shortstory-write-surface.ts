// 숏스토리 쪽 쓰기 · ‘글 · 그림 · 쪽’ 탭과 그림 탭의 도움말 as A2UI surfaces from the focus editor catalog.
// One kind of work at a time (focus plan step 6); the 그림 tab explains itself through its help button, not a standing sentence.
import {applyMessages,focusEditorCatalog,type A2uiMessage,type Surface} from '@knolstory/ui';

export type WriteTab='text'|'picture'|'pages';
export const WRITE_EVENTS={tab:'changeWriteTab',pictureHelp:'pictureHelp'} as const;
export const PICTURE_HELP='삽화 대신 배경과 인물을 따로 골라 이 쪽 그림을 꾸며요.';

export function writeTabsMessages({selected,pictures}:{selected:WriteTab;pictures:boolean}):A2uiMessage[]{
 const surfaceId='shortstory-write-tabs';
 const tabs=[{value:'text',label:'글'},...(pictures?[{value:'picture',label:'그림'}]:[]),{value:'pages',label:'쪽'}];
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'Tabs',name:'쪽 쓰기 작업',panels:'write',tabs,selected:{path:'/selected'},change:{event:{name:WRITE_EVENTS.tab}}},
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{selected}}},
 ];
}
export const writeTabsSurface=(input:Parameters<typeof writeTabsMessages>[0]):Surface=>[...applyMessages(writeTabsMessages(input)).values()][0]!;

/** The help button opens its explanation right under itself (aria-expanded, set by the page), where the eye already is. */
export function pictureHelpMessages(open=false):A2uiMessage[]{
 const surfaceId='shortstory-picture-help';
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'ToolGroup',name:'쪽 그림',labelVisible:true,children:['help']},
   {id:'help',component:'IconButton',icon:'help',name:'쪽 그림 도움말',title:'삽화 대신 배경과 인물을 따로 골라 꾸며요',action:{event:{name:WRITE_EVENTS.pictureHelp}}},
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{open}}},
 ];
}
export const pictureHelpSurface=(open=false):Surface=>[...applyMessages(pictureHelpMessages(open)).values()][0]!;
