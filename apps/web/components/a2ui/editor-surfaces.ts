// A2UI surfaces for parts of the real editor that are drawn by the catalog renderer (FocusSurface).
// Each function returns A2UI v0.9 messages applied to a Surface; the editor maps the events back to its own handlers.
import {applyMessages,focusEditorCatalog,type A2uiComponent,type A2uiMessage,type Surface} from '@knolstory/ui';

const surfaceFrom=(surfaceId:string,components:A2uiComponent[],data:Record<string,unknown>):Surface=>{
 const messages:A2uiMessage[]=[
  {version:'v0.9',createSurface:{surfaceId,catalogId:focusEditorCatalog.catalogId}},
  {version:'v0.9',updateComponents:{surfaceId,components}},
  {version:'v0.9',updateDataModel:{surfaceId,path:'/',value:data}},
 ];
 return [...applyMessages(messages).values()][0]!;
};

export const WORK_TAB_EVENT='changeTask';
export type WorkTask='basic'|'text'|'background'|'characters'|'audio'|'direction';

/** 쓰기·원고·배경·인물·음향·연출 tabs. */
export function workTabsSurface({tabs,current,titles,disabled}:{tabs:readonly WorkTask[];current:string;titles:Record<string,string>;disabled:boolean}):Surface{
 return surfaceFrom('work-tabs',[
  {id:'work-tabs',component:'WorkTabs',tabs:[...tabs],selected:current,titles,disabled:{path:'/disabled'},change:{event:{name:WORK_TAB_EVENT}}},
 ],{disabled});
}

export const CUT_EVENTS={select:'selectCut',play:'playFromCut'} as const;

/** One cut of a list screen: the catalog draws the card, its head and text; the screen's own tools go in the `tools` Slot. */
export function cutItemSurface({lineId,cut,speaker,text,current,disabled,showText,phoneShowsAll}:{lineId:string;cut:number;speaker:string;text:string;current:boolean;disabled:boolean;showText:boolean;phoneShowsAll:boolean}):Surface{
 return surfaceFrom(`cut-${lineId}`,[
  {id:'cut-list',component:'CutList',...(phoneShowsAll?{phoneShows:'all'}:{}),children:['cut']},
  {id:'cut',component:'CutItem',cut:{path:'/cut'},speaker:{path:'/speaker'},text:{path:'/text'},current:{path:'/current'},disabled:{path:'/disabled'},showText,
   select:{event:{name:CUT_EVENTS.select,context:{lineId}}},play:{event:{name:CUT_EVENTS.play,context:{lineId}}},children:['tools']},
  {id:'tools',component:'Slot',name:'tools'},
 ],{cut,speaker,text,current,disabled});
}

export const BASIC_HEAD_EVENTS={speaker:'changeSpeaker',kind:'changeLineKind',play:'playFromCut'} as const;

/** 쓰기: the current cut's head — 화자, (linked images Slot), 종류, ▶ 재생. */
/** The linked-art Slot is always there so the head keeps its four columns (the screen leaves it empty when nothing is linked). */
export function basicHeadSurface({speaker,kind,busy,kindDisabled,playDisabled=false}:{speaker:string;kind:string;busy:boolean;kindDisabled:boolean;playDisabled?:boolean}):Surface{
 return surfaceFrom('basic-head',[
  {id:'head',component:'ToolGroup',name:'현재 컷의 화자',children:['speaker','linked','kind','play']},
  {id:'speaker',component:'TextField',label:'화자',name:'현재 컷 화자',value:{path:'/speaker'},maxChars:200,disabled:{path:'/busy'},change:{event:{name:BASIC_HEAD_EVENTS.speaker}}},
  {id:'linked',component:'Slot',name:'linked'},
  {id:'kind',component:'Choice',label:'종류',name:'현재 컷 글 종류',title:'글 종류 설정',value:{path:'/kind'},disabled:{path:'/kindDisabled'},options:[{value:'dialogue',label:'대사'},{value:'narration',label:'해설'}],change:{event:{name:BASIC_HEAD_EVENTS.kind}}},
  {id:'play',component:'Button',label:'재생',name:'이 컷부터 재생',icon:'play',title:'현재 컷부터 실제 이야기 재생',disabled:{path:'/playDisabled'},action:{event:{name:BASIC_HEAD_EVENTS.play}}},
 ],{speaker,kind,busy,kindDisabled:busy||kindDisabled,playDisabled:busy||playDisabled});
}

export const CUT_PLACE_EVENT='selectCutFromList';
export type CutPlaceGroup={label:string;options:{value:string;label:string}[]};

/** Top bar: the short ‘1장 · 3컷’ place with the full list; the open screen's arrows fill the `steps` Slot. */
export function cutPlaceSurface({short,value,groups,disabled,chapter,cut}:{short:string;value:string;groups:CutPlaceGroup[];disabled:boolean;chapter:number;cut:number}):Surface{
 return surfaceFrom('cut-place',[
  {id:'place',component:'CutNavigator',chapter,cut,short:{path:'/short'},name:'현재 장과 컷 이동',groups,value:{path:'/value'},disabled:{path:'/disabled'},change:{event:{name:CUT_PLACE_EVENT}},steps:'steps'},
  {id:'steps',component:'Slot',name:'steps'},
 ],{short,value,disabled});
}

export const CUT_STEP_EVENT='stepCut';
/** ‹ › around the place. keepFocus: pressing them never takes the caret out of the text being written. */
export function cutStepsSurface({previousDisabled,nextDisabled}:{previousDisabled:boolean;nextDisabled:boolean}):Surface{
 return surfaceFrom('cut-steps',[
  {id:'previous',component:'IconButton',icon:'previous',name:'이전 컷 편집',title:'이전 컷',keepFocus:true,disabled:{path:'/previousDisabled'},action:{event:{name:CUT_STEP_EVENT,context:{direction:'previous'}}}},
  {id:'next',component:'IconButton',icon:'next',name:'다음 컷 편집',title:'다음 컷',keepFocus:true,disabled:{path:'/nextDisabled'},action:{event:{name:CUT_STEP_EVENT,context:{direction:'next'}}}},
 ],{previousDisabled,nextDisabled});
}

export const TOP_BAR_EVENTS={toggle:'toggleDrawer',close:'closeDrawer',prepare:'prepareWork',library:'openLibrary',fullscreen:'toggleFullscreen'} as const;

/**
 * The top bar's settings drawer and its two shortcuts (전체 화면, 서재). The drawer's groups are catalog parts;
 * file tools, the current-cut settings panel and leaving actions are the screen's own and fill Slots.
 */
export function topBarSurface({unified,title,open,disabled,scores,fullscreen,fullscreenAvailable,loadComplete}:{unified:boolean;title:string;open:boolean;disabled:boolean;scores:boolean;fullscreen:boolean;fullscreenAvailable:boolean;loadComplete:boolean}):Surface{
 const prepare=(section:string,label:string)=>({id:`prepare-${section}`,component:'Button',label,disabled:{path:'/disabled'},action:{event:{name:TOP_BAR_EVENTS.prepare,context:{section}}}});
 return surfaceFrom('top-bar',[
  {id:'drawer',component:'Drawer',summary:unified?'설정':'작품',...(unified?{summaryName:'설정',icon:true,subtitle:'편집 메뉴',title,closeName:'편집 설정 닫기',close:{event:{name:TOP_BAR_EVENTS.close}}}:{}),
   open:{path:'/open'},toggle:{event:{name:TOP_BAR_EVENTS.toggle}},children:[...(unified?['settings']:[]),'work','files',...(unified?['leave']:[])]},
  ...(unified?[{id:'settings',component:'Slot',name:'settings'}]:[]),
  {id:'work',component:'ToolGroup',name:'작품 설정',labelVisible:true,children:['prepare-info','prepare-planning','prepare-memos',...(scores?['prepare-scores']:[])]},
  prepare('info','작품 정보·표지'),prepare('planning','이야기 기획'),prepare('memos','창작 메모'),...(scores?[prepare('scores','이야기 점수')]:[]),
  {id:'files',component:'ToolGroup',name:'파일·저장',labelVisible:true,children:['file-tools']},
  {id:'file-tools',component:'Slot',name:'files'},
  ...(unified?[
   {id:'leave',component:'ToolGroup',name:'화면·나가기',labelVisible:true,children:['leave-tools','to-library']},
   {id:'leave-tools',component:'Slot',name:'leave'},
   {id:'to-library',component:'Button',label:'서재로',disabled:{path:'/disabled'},action:{event:{name:TOP_BAR_EVENTS.library}}},
   ...(fullscreenAvailable?[{id:'fullscreen',component:'IconButton',icon:fullscreen?'fullscreen-exit':'fullscreen',name:fullscreen?'편집 화면 전체 화면 해제':'편집 화면 전체 화면',title:fullscreen?'전체 화면 해제':'전체 화면',pressed:{path:'/fullscreen'},disabled:{path:'/shortcutDisabled'},action:{event:{name:TOP_BAR_EVENTS.fullscreen}}}]:[]),
   {id:'library',component:'IconButton',icon:'library',label:'서재',name:'서재 · 홈으로 이동',title:'서재로 이동',disabled:{path:'/shortcutDisabled'},action:{event:{name:TOP_BAR_EVENTS.library}}},
  ]:[]),
 ],{open,disabled,fullscreen,shortcutDisabled:disabled||!loadComplete});
}

export const TEXT_EVENT='changeText';
/** A cut's text box (쓰기 and 원고). */
export function textBoxSurface({lineId,label,value,readOnly,disabled}:{lineId:string;label:string;value:string;readOnly:boolean;disabled:boolean}):Surface{
 return surfaceFrom(`text-${lineId}`,[
  {id:'text',component:'TextArea',label,value:{path:'/value'},maxChars:20000,readOnly:{path:'/readOnly'},disabled:{path:'/disabled'},change:{event:{name:TEXT_EVENT,context:{lineId}}}},
 ],{value,readOnly,disabled});
}

export const NEIGHBOUR_EVENTS={select:'selectNeighbour',add:'addCutAfter',separate:'separatePath'} as const;

/** The place before/after the current cut: the neighbouring cut (scene preview in its Slot), the add-next offer, or a short empty line. */
export function cutCardSurface({side,kind,label,order,text,lineId,disabled=false}:{side:'previous'|'next';kind:'cut'|'add'|'none';label?:string;order?:string;text:string;lineId?:string;disabled?:boolean}):Surface{
 const select={event:{name:kind==='add'?NEIGHBOUR_EVENTS.add:NEIGHBOUR_EVENTS.select,context:{lineId:lineId??''}}};
 return surfaceFrom(`card-${side}-${kind}-${lineId??''}`,[
  {id:'card',component:'CutCard',side,kind,...(kind==='cut'?{devices:['tablet','desktop'],preview:'preview'}:{}),...(label!==undefined?{label}:{}),...(order!==undefined?{order}:{}),
   text:{path:'/text'},disabled:{path:'/disabled'},...(kind==='none'?{}:{select})},
  ...(kind==='cut'?[{id:'preview',component:'Slot',name:'preview'}]:[]),
 ],{text,disabled});
}

export type ForkChoice={id:string;label:string;where?:string;lineId?:string;pending?:string;separateName?:string};
/** A fork or join around the current cut: the ways to go, or a Notice where a way has no cut yet. */
export function forkSurface({kind,title,note,choices,disabled,separateDisabled}:{kind:string;title:string;note?:string;choices:ForkChoice[];disabled:boolean;separateDisabled:boolean}):Surface{
 return surfaceFrom(`fork-${kind}`,[
  {id:'fork',component:'Fork',title,...(note?{note}:{}),children:choices.map(choice=>`choice-${choice.id}`)},
  ...choices.map(choice=>choice.pending!==undefined
   ?{id:`choice-${choice.id}`,component:'Notice',kind:'empty',text:choice.pending}
   :{id:`choice-${choice.id}`,component:'PathChoice',label:choice.label,where:choice.where??'',disabled:{path:'/disabled'},select:{event:{name:NEIGHBOUR_EVENTS.select,context:{lineId:choice.lineId??''}}},
    ...(choice.separateName?{separate:{event:{name:NEIGHBOUR_EVENTS.separate,context:{lineId:choice.lineId??''}}},separateName:choice.separateName,separateDisabled:{path:'/separateDisabled'}}:{})}),
 ],{disabled,separateDisabled});
}

/** One short line after the neighbour place (이 컷에서 이야기가 끝나요). */
export function lineNoticeSurface(text:string):Surface{
 return surfaceFrom('line-notice',[{id:'notice',component:'Notice',kind:'empty',text}],{});
}
