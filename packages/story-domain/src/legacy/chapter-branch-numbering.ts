import type {StoryProject} from './story-data';
import {orderedStoryFlowLines,storyFlowTargets} from './story-flow';

export type ChapterIdentity=Readonly<{chapterNumber:number;branchLabel?:string}>;
export type ChapterNumbering=Readonly<{identities:ReadonlyMap<string,ChapterIdentity>;reachable:ReadonlySet<string>;depth:ReadonlyMap<string,number>;
 /** Every chapter in story order: one storyline followed to its end before the next (A before B), a chapter where ways meet only after all of them; unreachable chapters last. */
 order:readonly string[]}>;

/** A, B … Z, AA … for the n-th way out of one branch point (0-based). */
export function branchLetter(index:number):string{let result='';for(let value=index+1;value>0;value=Math.floor((value-1)/26))result=String.fromCharCode(65+(value-1)%26)+result;return result;}
const commonPrefix=(values:readonly string[])=>values.reduce((prefix,value)=>{let at=0;while(at<prefix.length&&at<value.length&&prefix[at]===value[at])at++;return prefix.slice(0,at);});

/**
 * Chapter numbers and branch letters that follow the story's links, so an author can tell the ways apart:
 * - the number is the reading step (longest way from the start, so it never goes back; a shorter way may skip a number);
 * - the letter says which way out of a branch point a chapter is on, in the authored order of that point's choices or
 *   score rules (10장: 1st choice → 11A장, 2nd → 11B장; score rules → 11A·11B·11C, the default way last);
 * - chapters further along a way keep its letter (11A → 12A), a branch inside a way adds a letter (12A → 13AA·13AB),
 *   and where ways meet again only their shared letters stay (11A and 11B meet in 12장);
 * - when several branch points split into the same chapters by the same choices (6A and 6B → 7 by the 1st, 7′ by the 2nd),
 *   those chapters keep the choice's letter after what the points share (7A, 7B).
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
 const topological=[...reachable].filter(id=>waiting.get(id)===0);
 for(const id of topological)depth.set(id,0);
 for(let at=0;at<topological.length;at++){const id=topological[at]!;for(const target of forward(id)){depth.set(target,Math.max(depth.get(target)??0,depth.get(id)!+1));waiting.set(target,waiting.get(target)!-1);if(waiting.get(target)===0)topological.push(target);}}
 // Letters: what each way in brings (its parent's letters, plus the way's own letter at a branch point); meeting ways keep what they share.
 const path=new Map<string,string>();
 for(const id of topological){
  const from=parents.get(id)!;
  const arrivals=from.map(parent=>{const ways=forward(parent);return (path.get(parent)??'')+(ways.length>1?branchLetter(ways.indexOf(id)):'');});
  // Several branch points split into the same chapters, each by the same choice (6A and 6B: 1st → 7, 2nd → 7′):
  // keep that choice's letter after what they share, so the chapters those points lead to stay apart (7A, 7B).
  const letters=from.map(parent=>{const ways=forward(parent);return ways.length>1?branchLetter(ways.indexOf(id)):'';});
  const key=(chapter:string)=>[...parents.get(chapter)!].sort().join('\n');
  const sameChoice=from.length>1&&letters[0]!==''&&letters.every(letter=>letter===letters[0])
   // Only for chapters the same branch points split into together; elsewhere meeting ways keep what they share.
   &&[...reachable].some(other=>other!==id&&key(other)===key(id));
  path.set(id,!arrivals.length?'':sameChoice?commonPrefix(from.map(parent=>path.get(parent)??''))+letters[0]:commonPrefix(arrivals));
 }
 const identities=new Map<string,ChapterIdentity>(),taken=new Set<string>();
 for(const id of [...topological].sort((a,b)=>depth.get(a)!-depth.get(b)!||ids.indexOf(a)-ids.indexOf(b))){
  const chapterNumber=depth.get(id)!+1;let branchLabel=path.get(id)??'';
  // Two chapters can only meet on one name through unusual link shapes; keep the names apart with one more letter.
  for(let extra=0;taken.has(`${chapterNumber}${branchLabel}`);extra++)branchLabel=`${path.get(id)??''}${branchLetter(extra)}`;
  taken.add(`${chapterNumber}${branchLabel}`);
  identities.set(id,{chapterNumber,...(branchLabel?{branchLabel}:{})});
 }
 // Story order: among the chapters whose ways in are all placed, keep to the storyline with the earliest letters,
 // so ways that stay apart read one after another and a meeting chapter waits for every way into it.
 const placed:string[]=[],left=new Map([...reachable].map(id=>[id,parents.get(id)!.length])),ready=[...reachable].filter(id=>left.get(id)===0);
 const label=(id:string)=>identities.get(id)?.branchLabel??'';
 while(ready.length){
  ready.sort((a,b)=>label(a).localeCompare(label(b))||depth.get(a)!-depth.get(b)!||ids.indexOf(a)-ids.indexOf(b));
  const id=ready.shift()!;placed.push(id);
  for(const target of forward(id)){left.set(target,left.get(target)!-1);if(left.get(target)===0)ready.push(target);}
 }
 const order=[...placed,...ids.filter(id=>!reachable.has(id))];
 return {identities,reachable,depth,order};
}
/** Chapters in story order (see `branchChapterNumbering`), for chapter lists and pickers. */
const storyOrderCache=new WeakMap<object,{chapters:readonly unknown[];order:readonly string[]}>();
export function chaptersInStoryOrder<T extends {id:string}>(project:Pick<StoryProject,'lines'>&{chapters:readonly T[]}):T[]{
 // Pickers redraw often; the order only changes with the cuts or chapters, so keep it per lines/chapters pair.
 const cached=storyOrderCache.get(project.lines);
 const order=cached&&cached.chapters===project.chapters?cached.order:branchChapterNumbering(project as unknown as Pick<StoryProject,'chapters'|'lines'>).order;
 if(!cached||cached.chapters!==project.chapters)storyOrderCache.set(project.lines,{chapters:project.chapters,order});
 const at=new Map(order.map((id,index)=>[id,index]));
 return [...project.chapters].sort((a,b)=>(at.get(a.id)??order.length)-(at.get(b.id)??order.length));
}
