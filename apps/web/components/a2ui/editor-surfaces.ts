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

/** One cut of a list screen: the catalog draws the card, its head and text; the task's tools are the custom CutTools component. */
export function cutItemSurface({lineId,cut,speaker,text,current,disabled,showText,phoneShowsAll,task='text'}:{lineId:string;cut:number;speaker:string;text:string;current:boolean;disabled:boolean;showText:boolean;phoneShowsAll:boolean;task?:string}):Surface{
 return surfaceFrom(`cut-${lineId}`,[
  {id:'cut-list',component:'CutList',...(phoneShowsAll?{phoneShows:'all'}:{}),children:['cut']},
  {id:'cut',component:'CutItem',cut:{path:'/cut'},speaker:{path:'/speaker'},text:{path:'/text'},current:{path:'/current'},disabled:{path:'/disabled'},showText,
   select:{event:{name:CUT_EVENTS.select,context:{lineId}}},play:{event:{name:CUT_EVENTS.play,context:{lineId}}},children:['tools']},
  {id:'tools',component:'CutTools',lineId,task},
 ],{cut,speaker,text,current,disabled});
}

export const BASIC_HEAD_EVENTS={speaker:'changeSpeaker',kind:'changeLineKind',play:'playFromCut'} as const;

/** 쓰기: the current cut's head — 화자, linked images, 종류, ▶ 재생. */
/** The linked-art place is always there so the head keeps its four columns (empty when nothing is linked). */
export function basicHeadSurface({speaker,kind,busy,kindDisabled,playDisabled=false,images=[]}:{speaker:string;kind:string;busy:boolean;kindDisabled:boolean;playDisabled?:boolean;images?:{key:string;assetId?:string;name:string}[]}):Surface{
 return surfaceFrom('basic-head',[
  {id:'head',component:'ToolGroup',name:'현재 컷의 화자',children:['speaker','linked','kind','play']},
  {id:'speaker',component:'TextField',label:'화자',name:'현재 컷 화자',value:{path:'/speaker'},maxChars:200,disabled:{path:'/busy'},change:{event:{name:BASIC_HEAD_EVENTS.speaker}}},
  // The speaker's linked art: chips when there is some, otherwise an empty place that keeps the head's four columns.
  {id:'linked',component:'Column',...(images.length?{name:'현재 컷 화자에 연결된 이미지',children:['linked-chips']}:{element:'span',children:[]})},
  ...(images.length?[{id:'linked-chips',component:'Column',children:images.map(image=>`chip-${image.key}`)}]:[]),
  ...images.flatMap(image=>[{id:`chip-${image.key}`,component:'Chip',label:image.name,...(image.assetId?{icon:`thumb-${image.key}`}:{})},...(image.assetId?[{id:`thumb-${image.key}`,component:'AssetThumbnail',assetId:image.assetId,size:'chip'}]:[])]),
  {id:'kind',component:'Choice',label:'종류',name:'현재 컷 글 종류',title:'글 종류 설정',value:{path:'/kind'},disabled:{path:'/kindDisabled'},options:[{value:'dialogue',label:'대사'},{value:'narration',label:'해설'}],change:{event:{name:BASIC_HEAD_EVENTS.kind}}},
  {id:'play',component:'Button',label:'재생',name:'이 컷부터 재생',icon:'play',title:'현재 컷부터 실제 이야기 재생',disabled:{path:'/playDisabled'},action:{event:{name:BASIC_HEAD_EVENTS.play}}},
 ],{speaker,kind,busy,kindDisabled:busy||kindDisabled,playDisabled:busy||playDisabled});
}

export const CUT_PLACE_EVENT='selectCutFromList';
export type CutPlaceGroup={label:string;options:{value:string;label:string}[]};

/** Top bar: the short ‘1장 · 3컷’ place with the full list and the open screen's ‹ › arrows. */
export type CutSteps={previousDisabled:boolean;nextDisabled:boolean};
export function cutPlaceSurface({short,value,groups,disabled,chapter,cut,steps}:{short:string;value:string;groups:CutPlaceGroup[];disabled:boolean;chapter:number;cut:number;steps?:CutSteps|null}):Surface{
 const arrow=(direction:'previous'|'next')=>({id:direction,component:'IconButton',icon:direction,name:direction==='previous'?'이전 컷 편집':'다음 컷 편집',title:direction==='previous'?'이전 컷':'다음 컷',keepFocus:true,disabled:{path:`/${direction}Disabled`},action:{event:{name:CUT_STEP_EVENT,context:{direction}}}});
 return surfaceFrom('cut-place',[
  {id:'place',component:'CutNavigator',chapter,cut,short:{path:'/short'},name:'현재 장과 컷 이동',groups,value:{path:'/value'},disabled:{path:'/disabled'},change:{event:{name:CUT_PLACE_EVENT}},...(steps?{previousButton:'previous',nextButton:'next'}:{})},
  ...(steps?[arrow('previous'),arrow('next')]:[]),
 ],{short,value,disabled,previousDisabled:steps?.previousDisabled??true,nextDisabled:steps?.nextDisabled??true});
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
 * file tools, the current-cut settings panel and leaving actions are custom components the screen registers.
 */
export function topBarSurface({unified,title,open,disabled,scores,fullscreen,fullscreenAvailable,loadComplete}:{unified:boolean;title:string;open:boolean;disabled:boolean;scores:boolean;fullscreen:boolean;fullscreenAvailable:boolean;loadComplete:boolean}):Surface{
 const prepare=(section:string,label:string)=>({id:`prepare-${section}`,component:'Button',label,disabled:{path:'/disabled'},action:{event:{name:TOP_BAR_EVENTS.prepare,context:{section}}}});
 return surfaceFrom('top-bar',[
  {id:'drawer',component:'Drawer',summary:unified?'설정':'작품',...(unified?{summaryName:'설정',icon:true,subtitle:'편집 메뉴',title,closeName:'편집 설정 닫기',close:{event:{name:TOP_BAR_EVENTS.close}}}:{}),
   open:{path:'/open'},toggle:{event:{name:TOP_BAR_EVENTS.toggle}},children:[...(unified?['settings']:[]),'work','files',...(unified?['leave']:[])]},
  ...(unified?[{id:'settings',component:'CutSettings'}]:[]),
  {id:'work',component:'ToolGroup',name:'작품 설정',labelVisible:true,children:['prepare-info','prepare-planning','prepare-memos',...(scores?['prepare-scores']:[])]},
  prepare('info','작품 정보·표지'),prepare('planning','이야기 기획'),prepare('memos','창작 메모'),...(scores?[prepare('scores','이야기 점수')]:[]),
  {id:'files',component:'ToolGroup',name:'파일·저장',labelVisible:true,children:['file-tools']},
  {id:'file-tools',component:'FileTools'},
  ...(unified?[
   // The library is the always-visible icon in the bar; the drawer does not repeat it.
   {id:'leave',component:'ToolGroup',name:'화면·나가기',labelVisible:true,children:['leave-tools']},
   {id:'leave-tools',component:'LeaveActions'},
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

/** The place before/after the current cut: the neighbouring cut (scene preview as the custom ScenePreview), the add-next offer, or a short empty line. */
export function cutCardSurface({side,kind,label,order,text,lineId,disabled=false}:{side:'previous'|'next';kind:'cut'|'add'|'none';label?:string;order?:string;text:string;lineId?:string;disabled?:boolean}):Surface{
 const select={event:{name:kind==='add'?NEIGHBOUR_EVENTS.add:NEIGHBOUR_EVENTS.select,context:{lineId:lineId??''}}};
 return surfaceFrom(`card-${side}-${kind}-${lineId??''}`,[
  {id:'card',component:'CutCard',side,kind,...(kind==='cut'?{devices:['tablet','desktop'],preview:'preview'}:{}),...(label!==undefined?{label}:{}),...(order!==undefined?{order}:{}),
   text:{path:'/text'},disabled:{path:'/disabled'},...(kind==='none'?{}:{select})},
  ...(kind==='cut'?[{id:'preview',component:'ScenePreview',lineId:lineId??'',label:label??''}]:[]),
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

export const PICKER_EVENT='openAssetBrowser';
/** An image field: its name (visible or for assistive tech), the picked image's name and thumbnail, and an inherited hint. */
export function assetPickerSurface({kind,label,labelVisible,name,assetValue,assetId,inherited,hint}:{kind:'background'|'character';label:string;labelVisible:boolean;name:string;assetValue:string;assetId?:string;inherited:boolean;hint?:string}):Surface{
 return surfaceFrom(`picker-${label}`,[
  {id:'picker',component:'AssetPicker',kind,label,labelVisible,value:name,assetValue,inherited,...(hint?{hint}:{}),...(assetId?{preview:'thumb'}:{}),action:{event:{name:PICKER_EVENT}}},
  ...(assetId?[{id:'thumb',component:'AssetThumbnail',assetId,size:'picker'}]:[]),
 ],{});
}

export const BACKGROUND_DISPLAY_EVENTS={fit:'changeBackgroundFit',x:'changeBackgroundFocalX',y:'changeBackgroundFocalY',reset:'resetBackgroundFocal'} as const;
/** 배경 화면의 표시 조정: 표시 방식, 중심 가로·세로, 중심 초기화 (folded). */
export function backgroundDisplaySurface({cut,fit,x,y,focalSet}:{cut:number;fit:string;x:number;y:number;focalSet:boolean}):Surface{
 const ev=(name:string)=>({event:{name}});
 return surfaceFrom(`background-display-${cut}`,[
  {id:'display',component:'More',summary:'표시 조정',lead:`${cut}컷 배경`,title:'작은 자료 이미지는 그대로예요. 결과는 재생으로 확인해요.',wrap:false,children:['fit','x','y','reset']},
  {id:'fit',component:'Choice',label:'배경 표시',name:`${cut}컷 배경 표시`,value:{path:'/fit'},options:[{value:'',label:'자료 기본 표시'},{value:'cover',label:'화면 채우기'},{value:'contain',label:'전체 이미지 보기'}],change:ev(BACKGROUND_DISPLAY_EVENTS.fit)},
  {id:'x',component:'Slider',label:'배경 중심 가로',name:`${cut}컷 배경 중심 가로`,value:{path:'/x'},valueText:{path:'/xText'},min:0,max:100,change:ev(BACKGROUND_DISPLAY_EVENTS.x)},
  {id:'y',component:'Slider',label:'배경 중심 세로',name:`${cut}컷 배경 중심 세로`,value:{path:'/y'},valueText:{path:'/yText'},min:0,max:100,change:ev(BACKGROUND_DISPLAY_EVENTS.y)},
  {id:'reset',component:'Button',label:'중심 초기화',name:`${cut}컷 배경 중심 초기화`,disabled:{path:'/resetDisabled'},action:ev(BACKGROUND_DISPLAY_EVENTS.reset)},
 ],{fit,x,y,xText:`${Math.round(x)}%`,yText:`${Math.round(y)}%`,resetDisabled:!focalSet});
}

export const ACTOR_EVENTS={x:'moveActorX',side:'moveActorSide',facing:'turnActor',scale:'scaleActor',reset:'resetPlacement',remove:'removeCharacter'} as const;
export type ActorCard={key:string;number:number;side:'left'|'center'|'right';heading:string;x:number;xText:string;scale:number;facing:string;leftFull:boolean;rightFull:boolean;overlapped:boolean;inLeft:boolean;inRight:boolean};
/** 인물 화면: one actor's card — picker, overlap warning, 가로 위치·배치 위치·방향·크기, 기본 배치로·빼기. */
export function actorCardSurface({cut,actor}:{cut:number;actor:ActorCard}):Surface{
 const n=actor.number,ev=(name:string)=>({event:{name,context:{key:actor.key}}});
 return surfaceFrom(`actor-${actor.key}`,[
  {id:'card',component:'Column',element:'section',title:actor.heading,children:['picker',...(actor.overlapped?['overlap']:[]),'x','side','facing','scale','actions']},
  {id:'picker',component:'AssetPicker',kind:'character',label:`${cut}컷 인물 ${n}`,value:'',action:ev('pickActor')},
  ...(actor.overlapped?[{id:'overlap',component:'Notice',kind:'warning',text:'다른 인물과 많이 겹쳐요.'}]:[]),
  {id:'x',component:'Slider',label:'가로 위치',name:`${cut}컷 인물 ${n} 가로 위치`,value:{path:'/x'},valueText:{path:'/xText'},min:5,max:95,change:ev(ACTOR_EVENTS.x)},
  {id:'side',component:'Choice',label:'배치 위치',name:`${cut}컷 인물 ${n} 배치 위치`,value:{path:'/side'},options:[{value:'left',label:'왼쪽',disabled:!actor.inLeft&&actor.leftFull},{value:'center',label:'중앙'},{value:'right',label:'오른쪽',disabled:!actor.inRight&&actor.rightFull}],change:ev(ACTOR_EVENTS.side)},
  {id:'facing',component:'Choice',label:'방향',name:`${cut}컷 인물 ${n} 방향`,value:{path:'/facing'},options:[{value:'auto',label:'자료 기본 방향'},{value:'original',label:'원본 방향'},{value:'left',label:'왼쪽 보기'},{value:'right',label:'오른쪽 보기'}],change:ev(ACTOR_EVENTS.facing)},
  {id:'scale',component:'Slider',label:'크기',name:`${cut}컷 인물 ${n} 크기`,value:{path:'/scale'},min:50,max:140,unit:'%',change:ev(ACTOR_EVENTS.scale)},
  {id:'actions',component:'ToolGroup',name:`인물 ${n} 정리`,children:['reset','remove']},
  {id:'reset',component:'Button',label:'기본 배치로',name:`인물 ${n} 기본 배치로`,action:ev(ACTOR_EVENTS.reset)},
  {id:'remove',component:'Button',label:'빼기',name:`인물 ${n} 빼기`,action:ev(ACTOR_EVENTS.remove)},
 ],{x:actor.x,xText:actor.xText,side:actor.side,facing:actor.facing,scale:actor.scale});
}

export const PANEL_TOGGLE_EVENT='toggleCutPanel';
/** 음향·연출 화면의 컷 하나: 지금 상태 한 줄(Chip)과 열 때만 그리는 판(More → SoundEditor/DirectionEditor). */
export function cutPanelSurface({kind,lineId,cut,summary,open}:{kind:'audio'|'direction';lineId:string;cut:number;summary:string;open:boolean}):Surface{
 return surfaceFrom(`${kind}-panel-${lineId}`,[
  {id:'summary',component:'Chip',label:summary},
  {id:'edit',component:'More',summary:kind==='audio'?'음향 수정':'연출 수정',lead:`${cut}컷`,contentShown:{path:'/open'},toggle:{event:{name:PANEL_TOGGLE_EVENT}},wrap:false,children:['editor']},
  {id:'editor',component:kind==='audio'?'SoundEditor':'DirectionEditor',lineId,...(kind==='audio'?{scope:'cut'}:{})},
 ],{open});
}

/** 쓰기 머리의 연결된 그림: 그림과 이름 칩(AssetThumbnail), 없으면 빈 자리. */
export function linkedImagesSurface({images}:{images:{key:string;assetId?:string;name:string}[]}):Surface{
 return surfaceFrom('linked-images',[
  {id:'linked',component:'Column',name:'현재 컷 화자에 연결된 이미지',children:images.length?['chips']:[]},
  ...(images.length?[{id:'chips',component:'Column',children:images.map(image=>`chip-${image.key}`)}]:[]),
  ...images.flatMap(image=>[{id:`chip-${image.key}`,component:'Chip',label:image.name,...(image.assetId?{icon:`thumb-${image.key}`}:{})},...(image.assetId?[{id:`thumb-${image.key}`,component:'AssetThumbnail',assetId:image.assetId,size:'chip'}]:[])]),
 ],{});
}

/** 인물 화면: 다른 컷 배치 가져오기 (custom StagingImport). */
export function stagingImportSurface(lineId:string):Surface{
 return surfaceFrom(`staging-${lineId}`,[{id:'staging',component:'StagingImport',lineId}],{});
}

/** 쓰기·원고: a cut's branch/score text variants and scene visibility (custom TextVariants, shown when those features are on). */
export function textVariantsSurface(lineId:string):Surface{
 return surfaceFrom(`variants-${lineId}`,[{id:'variants',component:'TextVariants',lineId}],{});
}

export type CompanionView={kind:'text'|'background'|'characters'|'audio'|'direction';title?:string;text?:string;assetId?:string;actors?:{key:string;side:string;assetId:string}[]};
const companionParts=(prefix:string,view:CompanionView):A2uiComponent[]=>{
 if(view.kind==='background')return [{id:prefix,component:'AssetThumbnail',assetId:view.assetId??''}];
 if(view.kind==='characters')return [{id:prefix,component:'Column',children:(view.actors??[]).map(actor=>`${prefix}-${actor.key}`)},
  ...(view.actors??[]).flatMap(actor=>[{id:`${prefix}-${actor.key}`,component:'Chip',label:actor.side,iconSide:'end',icon:`${prefix}-${actor.key}-thumb`},{id:`${prefix}-${actor.key}-thumb`,component:'AssetThumbnail',assetId:actor.assetId}])];
 return [{id:prefix,component:'Chip',label:view.text??''}];
};
/** What a cut has, shown for reference only: its text, background, characters, sound or direction (함께 보기, 현재 인물 미리보기). */
export function companionSurface(id:string,view:CompanionView):Surface{
 return surfaceFrom(`companion-${id}`,companionParts('companion',view),{});
}
/** 목록 화면 컷 카드의 ‘확인용 함께 보기’: one titled section per chosen view. */
export function companionsSurface(lineId:string,views:CompanionView[]):Surface{
 return surfaceFrom(`companions-${lineId}`,[
  {id:'companions',component:'Column',element:'aside',name:'확인용 함께 보기',children:views.map(view=>`section-${view.kind}`)},
  ...views.flatMap(view=>[{id:`section-${view.kind}`,component:'Column',element:'section',title:view.title??'',children:[`part-${view.kind}`]},...companionParts(`part-${view.kind}`,view)]),
 ],{});
}

export const CONNECTION_EVENTS={toggle:'toggleConnections',select:'selectConnectedCut',repair:'repairConnection',back:'returnToPreviousVisit',visit:'returnToVisit',map:'openStoryMap'} as const;
export type ConnectionVisit=Readonly<{index:number;label:string;where:string}>;
export type ConnectionWay=Readonly<{id:string;label:string;where:string;lineId:string}>;
export type ConnectionFork=Readonly<{id:string;title:string;note?:string;ways:readonly ConnectionWay[]}>;
export type ConnectionOut=Readonly<{id:string;label:string;where?:string;lineId?:string;notice?:{kind:'empty'|'warning';text:string;repair?:{choiceId?:string;kind:'pending'|'missing'}}}>;
/**
 * 쓰기: 이야기 연결 — the authored links around the current cut, kept open while the author moves between cuts.
 * Nearest branch point first (more in a nested More), the ways in where several ways meet or a way has a condition,
 * then the current cut and its ways out with their destinations. Reading only: nothing here changes the work.
 */
export function connectionsSurface({open,summary,upstream,incoming,here,marks,outgoing,back,visits=[],map,disabled}:{open:boolean;summary:string;upstream:readonly ConnectionFork[];incoming:readonly ConnectionWay[];here:string;marks?:string;outgoing:readonly ConnectionOut[];back?:{name:string};visits?:readonly ConnectionVisit[];map:boolean;disabled:boolean}):Surface{
 const select=(way:{id:string;lineId:string})=>({event:{name:CONNECTION_EVENTS.select,context:{lineId:way.lineId,way:way.id}}});
 const fork=(item:ConnectionFork):A2uiComponent[]=>[
  {id:`fork-${item.id}`,component:'Fork',title:item.title,...(item.note?{note:item.note}:{}),children:item.ways.map(way=>`way-${way.id}`)},
  ...item.ways.map(way=>({id:`way-${way.id}`,component:'PathChoice',label:way.label,where:way.where,disabled:{path:'/disabled'},select:select(way)})),
 ];
 const [nearest,...further]=upstream;
 // Everything past the nearest way folds into one More: the other ways from branch points, and the ways in where several meet.
 const more=further.reduce((sum,item)=>sum+item.ways.length,0)+incoming.length;
 const tools=[...(back?['back']:[]),...(map?['map']:[])];
 const components:A2uiComponent[]=[
  {id:'connections',component:'More',summary,title:'앞 갈림길, 지금 컷, 다음 선택지와 도착 컷',open:{path:'/open'},toggle:{event:{name:CONNECTION_EVENTS.toggle}},
   children:['trail']},
  // Catalog rule: a Fork or a nested More sits in a Column, never straight in a More.
  {id:'trail',component:'Column',gap:8,children:[...(nearest?['upstream']:[]),...(more?['other-ways']:[]),'fork-here',...(tools.length?['trail-tools']:[]),...(visits.length?['visits']:[])]},
  ...(nearest?<A2uiComponent[]>[{id:'upstream',component:'Column',element:'section',name:'앞 갈림길',gap:8,children:[`fork-${nearest.id}`]},...fork(nearest)]:[]),
  ...(more?<A2uiComponent[]>[{id:'other-ways',component:'More',summary:`다른 길 더 보기 · ${more}`,children:['other-ways-list']},
   {id:'other-ways-list',component:'Column',gap:8,children:[...(incoming.length?['fork-in']:[]),...further.map(item=>`fork-${item.id}`)]},
   ...(incoming.length?fork({id:'in',title:'여기로 오는 길',ways:incoming}):[]),...further.flatMap(fork)]:[]),
  {id:'fork-here',component:'Fork',title:here,...(marks?{note:marks}:{}),children:outgoing.map(way=>`out-${way.id}`)},
  ...outgoing.flatMap((way):A2uiComponent[]=>way.notice
   ?[{id:`out-${way.id}`,component:'Notice',kind:way.notice.kind,text:way.notice.text,...(way.notice.repair?{actions:[`repair-${way.id}`]}:{})},
    ...(way.notice.repair?<A2uiComponent[]>[{id:`repair-${way.id}`,component:'Button',label:'연결 정하기',name:`${way.label} 연결 정하기`,disabled:{path:'/disabled'},action:{event:{name:CONNECTION_EVENTS.repair,context:{way:way.id,choiceId:way.notice.repair.choiceId??'',kind:way.notice.repair.kind}}}}]:[])]
   :[{id:`out-${way.id}`,component:'PathChoice',label:way.label,where:way.where??'',disabled:{path:'/disabled'},select:select({id:way.id,lineId:way.lineId??''})}]),
  ...(tools.length?<A2uiComponent[]>[{id:'trail-tools',component:'ToolGroup',name:'이야기 연결 도구',children:tools},
   ...(back?<A2uiComponent[]>[{id:'back',component:'Button',label:'← 방금 보던 컷',name:back.name,disabled:{path:'/disabled'},action:{event:{name:CONNECTION_EVENTS.back}}}]:[]),
   ...(map?<A2uiComponent[]>[{id:'map',component:'Button',label:'이야기 지도',name:'이야기 지도 열기',disabled:{path:'/disabled'},action:{event:{name:CONNECTION_EVENTS.map}}}]:[])]:[]),
  // 내 편집 이동 경로: the cuts the author moved through (not a reader's path); any earlier visit can be returned to.
  ...(visits.length?<A2uiComponent[]>[{id:'visits',component:'More',summary:`내 편집 이동 경로 · ${visits.length}`,title:'내가 편집하며 이동한 컷이에요. 이야기 연결이나 독자의 진행은 바꾸지 않아요.',children:['visits-list']},
   {id:'visits-list',component:'Column',gap:8,children:['fork-visits']},
   {id:'fork-visits',component:'Fork',title:'편집하며 지나온 컷',children:visits.map(visit=>`visit-${visit.index}`)},
   ...visits.map(visit=>({id:`visit-${visit.index}`,component:'PathChoice',label:visit.label,where:visit.where,disabled:{path:'/disabled'},select:{event:{name:CONNECTION_EVENTS.visit,context:{index:visit.index}}}}))]:[]),
 ];
 return surfaceFrom('connections',components,{open,disabled});
}

/** 이야기 흐름 지도 · 갈래 구조: the catalog fixes its place (a named section) and props; the map registers the drawing. */
export function structureSurface({currentLineId,grouped}:{currentLineId:string;grouped:boolean}):Surface{
 return surfaceFrom('story-structure',[
  {id:'structure-place',component:'Column',element:'section',name:'갈래 구조',gap:12,children:['structure']},
  {id:'structure',component:'StoryStructure',currentLineId,grouped},
 ],{});
}
