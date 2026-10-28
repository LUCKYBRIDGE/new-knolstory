import {storyBranchConditionTerms,type StoryBranchChoice,type StoryAudio,type StoryBranchCondition,type StoryProject} from '@knolstory/story-domain';
/** Moving a choice changes its owner only. Destinations, range ends and provenance remain literal. */
export function relocateChoiceConditions(project:StoryProject,from:string,to:string,choiceIds:ReadonlySet<string>):StoryProject{
 const cue=<T extends {branchCondition?:StoryBranchCondition}>(value:T):T=>{
  const condition=value.branchCondition;
  const matches=(term:StoryBranchChoice)=>term.sourceLineId===from&&choiceIds.has(term.choiceId);
  if(!condition||!storyBranchConditionTerms(condition).some(matches))return value;
  const move=(term:StoryBranchChoice)=>matches(term)?{...term,sourceLineId:to}:term;
  return {...value,branchCondition:'terms' in condition?{...condition,terms:condition.terms.map(move)}:move(condition)};
 };
 const audio=(value:StoryAudio):StoryAudio=>({...value,
  ...((value.music?.action==='play'||value.music?.action==='sequence')?{music:cue(value.music)}:{}),
  ...((value.ambience?.action==='play'||value.ambience?.action==='sequence')?{ambience:cue(value.ambience)}:{}),
  ...(value.sounds!==undefined?{sounds:value.sounds.map(cue)}:{}),
 });
 return {...project,
  chapters:project.chapters.map(chapter=>chapter.audio?{...chapter,audio:audio(chapter.audio)}:chapter),
  lines:project.lines.map(line=>({...line,
   ...(line.visibility?.choices?{visibility:{...line.visibility,choices:cue({branchCondition:line.visibility.choices}).branchCondition}}:{}),
   ...(line.audio?{audio:audio(line.audio)}:{}),
   ...(line.presentation?.effects!==undefined?{presentation:{...line.presentation,effects:line.presentation.effects.map(cue)}}:{}),
  })),
 };
}
