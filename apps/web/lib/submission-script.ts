import type {AuthoringJsonbSnapshot} from '@knolstory/compatibility';
import {chapterLabel,chaptersForDisplay} from '@knolstory/story-domain';

/** A plain reading of a handed-in work for the teacher: chapters (or pages) and who says what.
 * No stage, sound or effects; "작품 열기" in the library still plays the whole work. */
/** A picture-book page keeps its picture (registered background and side characters) so the teacher sees it with the words. */
export type ScriptArt=Readonly<{backgroundId:string;leftAssetId:string;rightAssetId:string}>;
/** A choice cut lists its ways: ‘A. 잔치 손님으로’ and where each goes, ‘2-1장 · 잔치’ (or ‘아직 비어 있어요’). */
export type ScriptChoice=Readonly<{mark:string;to:string}>;
export type ScriptLine=Readonly<{speaker:string;text:string;choices?:readonly ScriptChoice[]}>;
/** `from`: a chapter that starts a way out of a choice in another chapter says so — ‘2장 선택지 A’. */
export type ScriptSection=Readonly<{title:string;lines:readonly ScriptLine[];art?:ScriptArt;from?:string}>;
export type Script=Readonly<{title:string;format:'knolstory'|'shortstory';sections:readonly ScriptSection[];empty:boolean}>;
type Option={label?:string;targetLineId?:string};
type Line={id?:string;chapterId?:string;order?:number;type?:string;speaker?:string;speakerName?:string;text?:string;flow?:{type?:string;options?:Option[]}};
type Chapter={id:string;order:number;title:string;chapterNumber?:number;branchLabel?:string};
const mark=(index:number,label?:string)=>`${String.fromCharCode(65+index)}. ${label?.trim()||'문구 없는 선택지'}`;
const speakerOf=(line:Line)=>line.type==='narration'||line.speaker==='narration'?'':line.speakerName||(line.speaker&&line.speaker!=='narration'?line.speaker:'');
export function submissionScript(snapshot:AuthoringJsonbSnapshot):Script{
 const content=snapshot.content;
 if(content.format==='shortstory'){
  const pages=[...content.project.pages].sort((a,b)=>a.order-b.order);
  const sections=pages.map((page,index)=>({title:page.title||`${index+1}쪽`,lines:page.text.trim()?[{speaker:'',text:page.text}]:[],
   ...(page.backgroundId||page.leftAssetId||page.rightAssetId?{art:{backgroundId:page.backgroundId,leftAssetId:page.leftAssetId,rightAssetId:page.rightAssetId}}:{})}));
  return {title:content.project.title,format:'shortstory',sections,empty:sections.every(section=>!section.lines.length&&!section.art)};
 }
 const project=content.document.project as unknown as {title:string;chapters:Chapter[];lines:Line[]};
 const chapters=chaptersForDisplay(project.chapters),byId=new Map(project.chapters.map(chapter=>[chapter.id,chapter]));
 const label=(chapter:Chapter)=>chapterLabel(chapter);
 const lineById=new Map(project.lines.filter(line=>line.id).map(line=>[line.id!,line]));
 const ordered=(chapterId:string)=>project.lines.filter(line=>line.chapterId===chapterId).sort((a,b)=>(a.order??0)-(b.order??0));
 const choicesOf=(line:Line)=>line.flow?.type==='choice'&&line.flow.options?.length?line.flow.options:null;
 // A way's first cut in another chapter: that chapter came from this choice.
 const from=new Map<string,string>();
 for(const line of project.lines){
  const options=choicesOf(line),own=line.chapterId?byId.get(line.chapterId):undefined;
  options?.forEach((option,index)=>{
   const target=option.targetLineId?lineById.get(option.targetLineId):undefined,chapter=target?.chapterId?byId.get(target.chapterId):undefined;
   if(!own||!chapter||chapter.id===own.id||ordered(chapter.id)[0]!==target)return;
   const text=`${label(own).split(' · ')[0]} 선택지 ${String.fromCharCode(65+index)}`;
   from.set(chapter.id,from.has(chapter.id)?`${from.get(chapter.id)}, ${text}`:text);
  });
 }
 const where=(option:Option)=>{
  const target=option.targetLineId?lineById.get(option.targetLineId):undefined,chapter=target?.chapterId?byId.get(target.chapterId):undefined;
  if(!target||!chapter)return '아직 비어 있어요';
  return ordered(chapter.id)[0]===target?label(chapter):`${label(chapter)} · ${target.order}컷`;
 };
 const sections=chapters.map(chapter=>({title:label(chapter),lines:ordered(chapter.id).filter(line=>(line.text??'').trim()||choicesOf(line))
  .map(line=>{const options=choicesOf(line);return {speaker:speakerOf(line),text:line.text??'',...(options?{choices:options.map((option,index)=>({mark:mark(index,option.label),to:where(option)}))}:{})};}),
  ...(from.has(chapter.id)?{from:from.get(chapter.id)!}:{})}));
 return {title:project.title,format:'knolstory',sections,empty:sections.every(section=>!section.lines.length)};
}
