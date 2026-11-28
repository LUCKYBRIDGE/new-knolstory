import {insertStoryCut,patchStoryLine,splitStoryCut} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import {speakerPatch,speakerPrefix} from './manuscript-speaker';

// 원고: the chapter reads as one document of seamless cut blocks. A blank line typed or pasted into a block
// starts the next cut there; every piece after the first becomes its own cut, right after the block.

export type CutSplit=Readonly<{project:StoryProject;ids:readonly string[];problem?:string}>;

/** Put pieces[0] in the cut and each later piece in a new cut after it (same speaker unless the piece starts with ‘이름:’).
 * Nothing is lost: if a cut cannot be split, the rest stays in the last cut with its blank line and `problem` says why. */
export function splitCutInto(project:StoryProject,lineId:string,pieces:readonly string[],options:{names:readonly string[];createId:()=>string}):CutSplit{
 const ids=[lineId];let next=project,problem:string|undefined;
 for(let index=1;index<pieces.length;index++){
  const last=ids.at(-1)!,head=pieces[index-1]!,rest=pieces[index]!,source=next.lines.find(line=>line.id===last)!,id=options.createId();
  try{
   if(head&&rest)next=splitStoryCut(patchStoryLine(next,last,{text:head+rest}),last,id,head.length);
   else{
    if(source.flow?.type==='choice')throw Error('선택지 컷 다음은 아래 갈래 줄에서 갈래를 골라 이어 써 주세요.');
    next=patchStoryLine(insertStoryCut(patchStoryLine(next,last,{text:head}),last,id),id,{type:source.type,speaker:source.speaker,speakerName:source.speakerName,text:rest});
   }
   ids.push(id);
  }catch(issue){
   next=patchStoryLine(next,last,{text:pieces.slice(index-1).join('\n\n')});
   problem=issue instanceof Error?issue.message:String(issue);
   break;
  }
 }
 // ‘철수: …’ (or ‘해설: …’) at the start of a new cut names who speaks it.
 for(const id of ids.slice(1)){
  const line=next.lines.find(item=>item.id===id)!,named=speakerPrefix(line.text,options.names,true),speaker=named?speakerPatch(line,named.value):null;
  if(named&&speaker)next=patchStoryLine(next,id,{...speaker,text:named.rest});
 }
 return {project:next,ids,...(problem?{problem}:{})};
}
