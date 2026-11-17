import type {AuthoringJsonbSnapshot} from '@knolstory/compatibility';

/** A plain reading of a handed-in work for the teacher: chapters (or pages) and who says what.
 * No stage, sound or effects; "작품 열기" in the library still plays the whole work. */
export type ScriptSection=Readonly<{title:string;lines:readonly Readonly<{speaker:string;text:string}>[]}>;
export type Script=Readonly<{title:string;sections:readonly ScriptSection[];empty:boolean}>;
type Line={chapterId?:string;order?:number;type?:string;speaker?:string;speakerName?:string;text?:string};
const speakerOf=(line:Line)=>line.type==='narration'||line.speaker==='narration'?'':line.speakerName||(line.speaker&&line.speaker!=='narration'?line.speaker:'');
export function submissionScript(snapshot:AuthoringJsonbSnapshot):Script{
 const content=snapshot.content;
 if(content.format==='shortstory'){
  const pages=[...content.project.pages].sort((a,b)=>a.order-b.order);
  const sections=pages.map((page,index)=>({title:page.title||`${index+1}쪽`,lines:page.text.trim()?[{speaker:'',text:page.text}]:[]}));
  return {title:content.project.title,sections,empty:sections.every(section=>!section.lines.length)};
 }
 const project=content.document.project as unknown as {title:string;chapters:{id:string;order:number;title:string}[];lines:Line[]};
 const chapters=[...project.chapters].sort((a,b)=>a.order-b.order);
 const sections=chapters.map((chapter,index)=>({title:chapter.title||`${index+1}장`,lines:project.lines.filter(line=>line.chapterId===chapter.id&&(line.text??'').trim())
  .sort((a,b)=>(a.order??0)-(b.order??0)).map(line=>({speaker:speakerOf(line),text:line.text??''}))}));
 return {title:project.title,sections,empty:sections.every(section=>!section.lines.length)};
}
