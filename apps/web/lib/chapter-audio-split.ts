import {createStoryDocument,parseStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {splitContinuousAudioRange} from './continuous-audio-split';
import type {CombinedRangeUndo} from './combined-range-edit';
/** Chapter ownership remains on the chapter; synthesize only for shared path validation. */
export function splitChapterAudioRange(project:StoryProject,chapterId:string,target:'music'|'ambience',splitLineId:string):{project:StoryProject;undo:CombinedRangeUndo}{
 const chapter=project.chapters.find(ch=>ch.id===chapterId),cue=chapter?.audio?.[target],cuts=project.lines.filter(line=>line.chapterId===chapterId).sort((a,b)=>a.order-b.order),first=cuts[0],right=cuts.find(line=>line.id===splitLineId);
 if(cue?.action==='sequence')throw Error('순서 재생은 컷 사이의 재생 위치를 알 수 없어 구간을 나눌 수 없어요. 음원 목록에서 사용 구간을 편집해 주세요.');
 if(!chapter||cue?.action!=='play'||!first||!right||first.id===right.id)throw Error('장의 소리가 이어지는 구간에서 첫 컷보다 뒤의 컷을 선택해 주세요.');
 const override=first.audio?.[target];if(override&&override.action!=='maintain')throw Error('첫 컷에서 장의 소리를 바꾸고 있어요. 컷에서 시작한 구간을 선택해 주세요.');
 const synthetic={...project,lines:project.lines.map(line=>line.id===first.id?{...line,audio:{...line.audio,[target]:structuredClone(cue)}}:line)};
 const split=splitContinuousAudioRange(synthetic,first.id,target,right.id),left=split.project.lines.find(line=>line.id===first.id)!.audio![target];
 const next={...split.project,chapters:project.chapters.map(ch=>ch.id===chapterId?{...ch,audio:{...ch.audio,[target]:left}}:ch),lines:split.project.lines.map(line=>line.id===first.id?first:line)};
 const checked=parseStoryDocument(createStoryDocument({project:next,savedAt:new Date().toISOString(),appVersion:'chapter-split'}));if(!checked.ok)throw Error(checked.issues.map(issue=>issue.message).join('\n'));
 const snapshot=(p:StoryProject)=>{const line=p.lines.find(line=>line.id===right.id)!;return [{lineId:line.id,audio:structuredClone(line.audio),presentation:structuredClone(line.presentation)}];};
 return {project:next,undo:{projectId:project.id,target,before:snapshot(project),after:snapshot(next),chapter:{id:chapterId,before:structuredClone(chapter.audio),after:structuredClone(next.chapters.find(ch=>ch.id===chapterId)!.audio)}}};
}
