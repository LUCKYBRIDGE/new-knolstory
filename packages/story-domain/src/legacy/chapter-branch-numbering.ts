import type {StoryProject} from './story-data';
import {orderedStoryFlowLines,storyFlowTargets} from './story-flow';

export type ChapterIdentity=Readonly<{chapterNumber:number;branchLabel?:string}>;
export type ChapterNumbering=Readonly<{identities:ReadonlyMap<string,ChapterIdentity>;reachable:ReadonlySet<string>;depth:ReadonlyMap<string,number>}>;

/** A, B … Z, AA … for the n-th way out of one branch point (0-based). */
export function branchLetter(index:number):string{let result='';for(let value=index+1;value>0;value=Math.floor((value-1)/26))result=String.fromCharCode(65+(value-1)%26)+result;return result;}
const commonPrefix=(values:readonly string[])=>values.reduce((prefix,value)=>{let at=0;while(at<prefix.length&&at<value.length&&prefix[at]===value[at])at++;return prefix.slice(0,at);});

/**
 * Chapter numbers and branch letters that follow the story's links, so an author can tell the ways apart:
 * - the number is the reading step (longest way from the start, so it never goes back; a shorter way may skip a number);
 * - the letter says which way out of a branch point a chapter is on, in the authored order of that point's choices or
 *   score rules (10장: 1st choice → 11A장, 2nd → 11B장; score rules → 11A·11B·11C, the default way last);
 * - chapters further along a way keep its letter (11A → 12A), a branch inside a way adds a letter (12A → 13AA·13AB),
 *   and where ways meet again only their shared letters stay (11A and 11B meet in 12장).
 * Only chapters reachable from the start are numbered; loops back to an earlier chapter do not count as steps.
 */
export function branchChapterNumbering(project:Pick<StoryProject,'chapters'|'lines'>):ChapterNumbering{
 const lines=orderedStoryFlowLines(project),chapterOf=new Map(lines.map(line=>[line.id,line.chapterId]));
 const ids=[...project.chapters].sort((a,b)=>a.order-b.order).map(chapter=>chapter.id).filter(id=>lines.some(line=>line.chapterId===id));
 // Ways out of each chapter, in authored order (cut order, then choice or rule order).
 const out=new Map(ids.map(id=>[id,[] as string[]]));
 lines.forEach((line,index)=>{for(const target of storyFlowTargets(lines,index)){const chapter=target?chapterOf.get(target):undefined;const list=out.get(line.chapterId);if(chapter&&list&&chapter!==line.chapterId&&!list.includes(chapter))list.push(chapter);}});
 const start=lines[0]?.chapterId;
 // Loops back to an earlier chapter (found from the start, depth first) are left out of the steps.
 const back=new Set<string>(),state=new Map<string,1|2>();
 const visit=(root:string)=>{const stack:[string,number][]=[[root,0]];state.set(root,1);
  while(stack.length){const top=stack[stack.length-1]!;const targets=out.get(top[0])??[];
   if(top[1]>=targets.length){state.set(top[0],2);stack.pop();continue;}
   const target=targets[top[1]++]!;if(state.get(target)===1)back.add(`${top[0]}>${target}`);else if(!state.has(target)){state.set(target,1);stack.push([target,0]);}}};
 if(start)visit(start);
 const reachable=new Set(state.keys());
 const forward=(id:string)=>(out.get(id)??[]).filter(target=>!back.has(`${id}>${target}`));
 const parents=new Map(ids.map(id=>[id,[] as string[]]));
 for(const id of reachable)for(const target of forward(id))parents.get(target)!.push(id);
 // Reading steps: longest way over the forward links (Kahn order).
 const depth=new Map<string,number>(),waiting=new Map([...reachable].map(id=>[id,parents.get(id)!.length]));
 const order=[...reachable].filter(id=>waiting.get(id)===0);
 for(const id of order)depth.set(id,0);
 for(let at=0;at<order.length;at++){const id=order[at]!;for(const target of forward(id)){depth.set(target,Math.max(depth.get(target)??0,depth.get(id)!+1));waiting.set(target,waiting.get(target)!-1);if(waiting.get(target)===0)order.push(target);}}
 // Letters: what each way in brings (its parent's letters, plus the way's own letter at a branch point); meeting ways keep what they share.
 const path=new Map<string,string>();
 for(const id of order){
  const arrivals=parents.get(id)!.map(parent=>{const ways=forward(parent);return (path.get(parent)??'')+(ways.length>1?branchLetter(ways.indexOf(id)):'');});
  path.set(id,arrivals.length?commonPrefix(arrivals):'');
 }
 const identities=new Map<string,ChapterIdentity>(),taken=new Set<string>();
 for(const id of [...order].sort((a,b)=>depth.get(a)!-depth.get(b)!||ids.indexOf(a)-ids.indexOf(b))){
  const chapterNumber=depth.get(id)!+1;let branchLabel=path.get(id)??'';
  // Two chapters can only meet on one name through unusual link shapes; keep the names apart with one more letter.
  for(let extra=0;taken.has(`${chapterNumber}${branchLabel}`);extra++)branchLabel=`${path.get(id)??''}${branchLetter(extra)}`;
  taken.add(`${chapterNumber}${branchLabel}`);
  identities.set(id,{chapterNumber,...(branchLabel?{branchLabel}:{})});
 }
 return {identities,reachable,depth};
}
