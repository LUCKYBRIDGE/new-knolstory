import {orderedStoryFlowLines,storyFlowTargets,type StoryProject} from '@knolstory/story-domain';

/**
 * Cuts that sit on a loop: reading can leave them and come back to them (Tarjan's strongly connected components).
 * Comparing this set, not which cut a search happens to report, keeps the check independent of cut order.
 */
export function cutsOnLoops(project:Pick<StoryProject,'chapters'|'lines'>):ReadonlySet<string>{
 const lines=orderedStoryFlowLines(project),ids=new Set(lines.map(line=>line.id));
 const edges=new Map(lines.map((line,index)=>[line.id,storyFlowTargets(lines,index).filter((target):target is string=>!!target&&ids.has(target))]));
 const index=new Map<string,number>(),low=new Map<string,number>(),stack:string[]=[],onStack=new Set<string>(),looped=new Set<string>();
 let counter=0;
 for(const root of ids){
  if(index.has(root))continue;
  // Iterative Tarjan: long student works must not overflow the call stack.
  const work:[string,number][]=[[root,0]];index.set(root,counter);low.set(root,counter++);stack.push(root);onStack.add(root);
  while(work.length){
   const top=work[work.length-1]!,[node,at]=top,targets=edges.get(node)!;
   if(at<targets.length){
    top[1]++;const next=targets[at]!;
    if(!index.has(next)){index.set(next,counter);low.set(next,counter++);stack.push(next);onStack.add(next);work.push([next,0]);}
    else if(onStack.has(next))low.set(node,Math.min(low.get(node)!,index.get(next)!));
    continue;
   }
   work.pop();
   if(work.length){const parent=work[work.length-1]![0];low.set(parent,Math.min(low.get(parent)!,low.get(node)!));}
   if(low.get(node)!==index.get(node))continue;
   const component:string[]=[];let member:string;
   do{member=stack.pop()!;onStack.delete(member);component.push(member);}while(member!==node);
   if(component.length>1||targets.includes(node))for(const id of component)looped.add(id);
  }
 }
 return looped;
}
/** Refuse a move that puts a cut on a loop it was not on before (reading would go round the same cuts again and again). */
export function assertNoNewLoop(before:Pick<StoryProject,'chapters'|'lines'>,after:StoryProject):StoryProject{
 const was=cutsOnLoops(before);
 if([...cutsOnLoops(after)].some(lineId=>!was.has(lineId)))throw new Error('이렇게 옮기면 이야기가 같은 컷들을 계속 되풀이하게 돼요. 이 컷에서 갈라진 길이 다시 만나는 곳보다 앞에 두거나, 다른 자리를 골라 주세요.');
 return after;
}
