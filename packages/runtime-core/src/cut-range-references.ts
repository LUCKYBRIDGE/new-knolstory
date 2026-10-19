import {chapterLabel,cutLabel,type StoryProject} from '@knolstory/story-domain';
export type CutRangeReference=Readonly<{ownerId:string;owner:'cut'|'chapter';label:string;kind:'effect'|'music'|'ambience'}>;
/** Only surviving owners matter when deleting the endpoint cut itself. */
export function cutRangeEndReferences(project:StoryProject,endId:string):CutRangeReference[]{
 const refs:CutRangeReference[]=[];
 for(const line of project.lines){
  if(line.id===endId)continue;
  const chapter=project.chapters.find(item=>item.id===line.chapterId)!;
  const label=cutLabel(chapter,line);
  for(const [index,effect] of (line.presentation?.effects??[]).entries())if(effect.endLineId===endId)refs.push({owner:'cut',ownerId:line.id,label:`${label} · ${index+1}번째 효과`,kind:'effect'});
  for(const kind of ['music','ambience'] as const){const cue=line.audio?.[kind];if(cue?.action==='play'&&cue.endLineId===endId)refs.push({owner:'cut',ownerId:line.id,label:`${label} · ${kind==='music'?'배경음':'주변 소리'}`,kind});}
 }
 for(const chapter of project.chapters)for(const kind of ['music','ambience'] as const){const cue=chapter.audio?.[kind];if(cue?.action==='play'&&cue.endLineId===endId)refs.push({owner:'chapter',ownerId:chapter.id,label:`${chapterLabel(chapter)} · 장 ${kind==='music'?'배경음':'주변 소리'}`,kind});}
 return refs;
}
