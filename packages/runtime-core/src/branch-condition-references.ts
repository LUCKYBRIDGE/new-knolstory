import {chapterLabel,cutLabel,type StoryBranchCondition,type StoryProject} from '@knolstory/story-domain';
export type StoryBranchConditionReference=Readonly<{ownerId:string;owner:'cut'|'chapter';label:string;kind:'effect'|'music'|'ambience'|'sound';condition:StoryBranchCondition}>;
/** Collect authored references; a deletion query excludes the cut owner that is itself removed. */
export function storyBranchConditionReferences(project:StoryProject,sourceLineId?:string):StoryBranchConditionReference[]{
 const refs:StoryBranchConditionReference[]=[];
 for(const node of [...project.chapters,...project.lines]){
  const owner='chapterId' in node?'cut':'chapter';
  if(owner==='cut'&&node.id===sourceLineId)continue;
  const label='chapterId' in node?cutLabel(project.chapters.find(chapter=>chapter.id===node.chapterId)!,node):chapterLabel(node);
  const add=(condition:StoryBranchCondition|undefined,kind:StoryBranchConditionReference['kind'],suffix:string)=>{
   if(condition&&(sourceLineId===undefined||condition.sourceLineId===sourceLineId))refs.push({ownerId:node.id,owner,label:`${label} · ${suffix}`,kind,condition:{...condition}});
  };
  if('chapterId' in node)for(const [index,cue] of (node.presentation?.effects??[]).entries())add(cue.branchCondition,'effect',`${index+1}번째 효과`);
  for(const kind of ['music','ambience'] as const){const cue=node.audio?.[kind];if(cue?.action==='play')add(cue.branchCondition,kind,kind==='music'?'배경음':'주변 소리');}
  for(const [index,cue] of (node.audio?.sounds??[]).entries())add(cue.branchCondition,'sound',`${index+1}번째 효과음`);
 }
 return refs;
}
