// 갈래 dialogs (여기서 이야기 나누기 · 새 갈래 작성) as A2UI surfaces from the focus editor catalog: a Dialog root, its parts,
// and one action row. The host keeps the <dialog> element and turns the events below into the real story change.
import {applyMessages,focusEditorCatalog,type A2uiMessage,type Surface} from '@knolstory/ui';
import type {StorySplitMode} from '@knolstory/runtime-core';

export const BRANCH_DIALOG_EVENTS={close:'closeDialog',confirm:'confirmDialog',label:'changeWayLabel',addWay:'addWay',removeWay:'removeWay',mode:'changeSplitMode',way:'focusWay'} as const;
const letter=(index:number)=>String.fromCharCode(65+index);
const surfaceOf=(messages:A2uiMessage[]):Surface=>[...applyMessages(messages).values()][0]!;

export type SplitDialogInput=Readonly<{labels:readonly string[];mode:StorySplitMode;nextChapterNumber:number;continuationLabel:string|null;error:string}>;
/** 여기서 이야기 나누기: the ways' words (2–3), what happens when the ways end, a preview of the chapters it makes. */
export function splitDialogMessages(p:SplitDialogInput):A2uiMessage[]{
 const surfaceId='branch-split',filled=p.labels.every(label=>label.trim());
 const keepsStory=p.mode==='separate'&&!!p.continuationLabel;
 const ways=p.labels.map((label,index)=>({id:`way-${letter(index)}`,label:`${letter(index)}. ${label.trim()||`선택 ${index+1}`}`,
  where:keepsStory&&index===0?`지금 이야기 → ${p.continuationLabel}`:`새 장 ${p.nextChapterNumber}장${letter(index)} · 빈 첫 컷${p.mode==='rejoin'?' → 다시 만남':' → 끝'}`}));
 const note=p.mode==='rejoin'?`다 쓰면 ${p.continuationLabel??'이어지는 이야기'}에서 다시 만나요. 새 장은 지금 장 뒤에 놓여요.`
  :keepsStory?'지금 이어지는 이야기는 A 갈래가 되고, 새 갈래는 따로 끝나요.':'갈래마다 따로 끝나요. 새 장은 지금 장 뒤에 놓여요.';
 const fields=p.labels.map((_,index)=>({id:`label-${letter(index)}`,component:'TextField',label:letter(index),name:`선택지 ${letter(index)} 문구`,maxChars:80,
  value:{path:`/labels/${index}`},change:{event:{name:BRANCH_DIALOG_EVENTS.label,context:{way:index}}}}));
 const wayTool=p.labels.length<3
  ?{id:'add-way',component:'Button',label:'+ 선택지',name:'선택지 하나 더',variant:'quiet',action:{event:{name:BRANCH_DIALOG_EVENTS.addWay}}}
  :{id:'remove-way',component:'Button',label:'C 빼기',name:'선택지 C 빼기',variant:'quiet',action:{event:{name:BRANCH_DIALOG_EVENTS.removeWay}}};
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'Dialog',title:'여기서 이야기 나누기',closeName:'이야기 나누기 닫기',close:{event:{name:BRANCH_DIALOG_EVENTS.close}},
    children:['ways','ending','preview',...(p.error?['error']:[])],actions:'actions'},
   {id:'ways',component:'ToolGroup',name:'선택지',labelVisible:true,children:[...fields.map(field=>field.id),wayTool.id]},
   ...fields,wayTool,
   {id:'ending',component:'ToolGroup',name:'갈래가 끝나면',children:['mode']},
   {id:'mode',component:'Choice',label:'갈래 끝',name:'갈래가 끝나면',value:{path:'/mode'},change:{event:{name:BRANCH_DIALOG_EVENTS.mode}},
    options:[{value:'rejoin',label:'다시 만나요',...(p.continuationLabel?{}:{disabled:true})},{value:'separate',label:'각자 끝나요'}]},
   {id:'preview',component:'Fork',title:'만들어질 갈래',note,children:ways.map(way=>way.id)},
   ...ways.map((way,index)=>({id:way.id,component:'PathChoice',label:way.label,where:way.where,select:{event:{name:BRANCH_DIALOG_EVENTS.way,context:{way:index}}}})),
   ...(p.error?[{id:'error',component:'Notice',kind:'error',text:{path:'/error'}}]:[]),
   {id:'actions',component:'ToolGroup',name:'나누기',children:['confirm']},
   {id:'confirm',component:'Button',label:'나누고 첫 갈래 쓰기',variant:'primary',title:filled?'선택지마다 새 장을 만들고 첫 갈래를 써요.':'선택지 문구를 모두 적어 주세요.',disabled:{path:'/blocked'},action:{event:{name:BRANCH_DIALOG_EVENTS.confirm}}},
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{labels:[...p.labels],mode:p.mode,blocked:!filled,error:p.error}}},
 ];
}
export const splitDialogSurface=(p:SplitDialogInput)=>surfaceOf(splitDialogMessages(p));

export type NewBranchDialogInput=Readonly<{label:string;sourceLabel:string;closesLinearTail:boolean;error:string}>;
/** 새 갈래 작성: the way that gets an empty first cut, what stays as it is, and the one step to start writing. */
export function newBranchDialogMessages(p:NewBranchDialogInput):A2uiMessage[]{
 const surfaceId='branch-new';
 return [
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components:[
   {id:'root',component:'Dialog',title:'새 갈래 작성',closeName:'새 갈래 작성 닫기',close:{event:{name:BRANCH_DIALOG_EVENTS.close}},children:['way',...(p.error?['error']:[])],actions:'actions'},
   {id:'way',component:'Fork',title:p.label,note:`${p.sourceLabel} 선택지 · 빈 첫 컷에서 바로 써요`,children:['keeps',...(p.closesLinearTail?['tail']:[])]},
   {id:'keeps',component:'Notice',kind:'irreversible',text:'다른 선택지와 원고는 그대로예요. 다 쓰면 ‘← 방금 보던 컷’으로 돌아와요.'},
   ...(p.closesLinearTail?[{id:'tail',component:'Notice',kind:'warning',text:'기존 원고의 마지막 컷은 이야기 끝이 돼요. 새 갈래로 저절로 이어지지 않아요.'}]:[]),
   ...(p.error?[{id:'error',component:'Notice',kind:'error',text:{path:'/error'}}]:[]),
   {id:'actions',component:'ToolGroup',name:'새 갈래',children:['confirm']},
   {id:'confirm',component:'Button',label:'새 갈래 만들고 글쓰기',variant:'primary',action:{event:{name:BRANCH_DIALOG_EVENTS.confirm}}},
  ]}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:{error:p.error}}},
 ];
}
export const newBranchDialogSurface=(p:NewBranchDialogInput)=>surfaceOf(newBranchDialogMessages(p));
