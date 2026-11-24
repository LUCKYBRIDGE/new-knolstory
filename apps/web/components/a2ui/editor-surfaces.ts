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
export function basicHeadSurface({speaker,kind,busy,kindDisabled}:{speaker:string;kind:string;busy:boolean;kindDisabled:boolean}):Surface{
 return surfaceFrom('basic-head',[
  {id:'head',component:'ToolGroup',name:'현재 컷의 화자',children:['speaker','linked','kind','play']},
  {id:'speaker',component:'TextField',label:'화자',name:'현재 컷 화자',value:{path:'/speaker'},maxChars:200,disabled:{path:'/busy'},change:{event:{name:BASIC_HEAD_EVENTS.speaker}}},
  {id:'linked',component:'Slot',name:'linked'},
  {id:'kind',component:'Choice',label:'종류',name:'현재 컷 글 종류',title:'글 종류 설정',value:{path:'/kind'},disabled:{path:'/kindDisabled'},options:[{value:'dialogue',label:'대사'},{value:'narration',label:'해설'}],change:{event:{name:BASIC_HEAD_EVENTS.kind}}},
  {id:'play',component:'Button',label:'재생',name:'이 컷부터 재생',icon:'play',title:'현재 컷부터 실제 이야기 재생',disabled:{path:'/busy'},action:{event:{name:BASIC_HEAD_EVENTS.play}}},
 ],{speaker,kind,busy,kindDisabled:busy||kindDisabled});
}
