import { createStoryDocument, disconnectStoryFlowTargets, parseStoryDocument, resolveStageComposition, stageProjection, type Chapter, type StoryLine, type StoryProject } from '@knolstory/story-domain';
import { insertStoryCut } from './authoring';
export type ChapterAuthoringPatch = Partial<Pick<Chapter, 'chapterNumber' | 'branchLabel' | 'title' | 'summary' | 'chapterSpeakerNames' | 'backgroundId' | 'leftAssetId' | 'rightAssetId' | 'characterAssetIds' | 'backgroundAssetIds'>>;
function validate(project: StoryProject): StoryProject {
 const candidate={...project,updatedAt:new Date().toISOString()};
 const result=parseStoryDocument(createStoryDocument({project:candidate,savedAt:candidate.updatedAt,appVersion:'knolstory-next'}));
 if(!result.ok) throw new Error(result.issues.map(i=>i.message).join('\n'));
 return candidate;
}
function cut(project:StoryProject,id:string):StoryLine { const found=project.lines.find(l=>l.id===id); if(!found) throw new Error('이야기 컷을 찾을 수 없어요.'); return found; }
function chapter(project:StoryProject,id:string):Chapter { const found=project.chapters.find(c=>c.id===id); if(!found) throw new Error('이야기 장을 찾을 수 없어요.'); return found; }
function renumber(lines:StoryLine[],chapterId:string):StoryLine[] {
 const ids=lines.filter(l=>l.chapterId===chapterId).sort((a,b)=>a.order-b.order).map(l=>l.id);
 return lines.map(l=>l.chapterId===chapterId?{...l,order:ids.indexOf(l.id)+1}:l);
}
export function updateStoryChapter(project:StoryProject,id:string,patch:ChapterAuthoringPatch):StoryProject {
 chapter(project,id);
 if(patch.title!==undefined && (typeof patch.title!=='string'||patch.title.length>200)) throw new Error('제목은 200자 이내로 입력해 주세요.');
 return validate({...project,chapters:project.chapters.map(c=>c.id===id?{...c,...structuredClone(patch)}:c)});
}
export const updateChapter=updateStoryChapter;
export function addTypedStoryCut(project:StoryProject,afterId:string,newId:string,type:StoryLine['type']):StoryProject {
 if(type!=='dialogue'&&type!=='narration') throw new Error('컷 종류를 확인해 주세요.');
 const added=insertStoryCut(project,afterId,newId);
 return validate({...added,lines:added.lines.map(l=>l.id===newId?{...l,type,speaker:'narration'}:l)});
}
export function duplicateStoryCut(project:StoryProject,id:string,newId:string):StoryProject {
 const original=cut(project,id); const added=insertStoryCut(project,id,newId);
 const clone={...structuredClone(original),id:newId,order:added.lines.find(l=>l.id===newId)!.order};
 const used=new Set(project.lines.flatMap(l=>l.flow?.type==='choice'?l.flow.options.map(o=>o.id):[]));
 if(clone.flow?.type==='choice') clone.flow={...clone.flow,options:clone.flow.options.map((o,index)=>{
  const base=`${newId}-choice-${index+1}`; let candidate=base; let suffix=1;
  while(used.has(candidate)) candidate=`${base}-${suffix++}`;
  used.add(candidate); return {...o,id:candidate};
 })};
 return validate({...added,lines:added.lines.map(l=>l.id===newId?clone:l)});
}
export function moveStoryCutToChapter(project:StoryProject,id:string,chapterId:string):StoryProject {
 const selected=cut(project,id); chapter(project,chapterId); if(selected.chapterId===chapterId) return project;
 const source=chapter(project,selected.chapterId); const stage=resolveStageComposition(source,selected,project);
 const bg=selected.backgroundMode==='none'?'':selected.backgroundId||source.backgroundId||project.stageDefaults?.backgroundId||'';
 const moved={...selected,chapterId,order:Math.max(0,...project.lines.filter(l=>l.chapterId===chapterId).map(l=>l.order))+1,
  inheritActors:false,stageComposition:stage,...stageProjection(stage),backgroundId:bg,...(!bg?{backgroundMode:'none' as const}:{})};
 const lines=renumber(renumber(project.lines.map(l=>l.id===id?moved:l),selected.chapterId),chapterId);
 return validate({...project,lines,...(project.continuation?.lineId===id?{continuation:{...project.continuation,chapterId}}:{})});
}
export function getStoryCutDeletionImpact(project:StoryProject,id:string):Readonly<{incomingLinks:number;isContinuation:boolean}> {
 cut(project,id);
 return {incomingLinks:project.lines.filter(l=>l.id!==id).reduce((n,l)=>n+(l.flow?.type==='goto'?Number(l.flow.targetLineId===id):l.flow?.type==='choice'?l.flow.options.filter(o=>o.targetLineId===id).length:0),0),isContinuation:project.continuation?.lineId===id};
}
export function deleteStoryCut(project:StoryProject,id:string):StoryProject {
 const selected=cut(project,id); if(project.lines.length===1) throw new Error('작품의 마지막 컷은 삭제할 수 없어요.');
 const lines=renumber(disconnectStoryFlowTargets(project.lines.filter(l=>l.id!==id),new Set([id])),selected.chapterId);
 return validate({...project,lines,...(project.continuation?.lineId===id?{continuation:undefined}:{})});
}
export type StorySpeakerInput=Readonly<{id:string;name:string;defaultImageId:string}>;
export function registerStorySpeaker(project:StoryProject,input:StorySpeakerInput,chapterId?:string):StoryProject {
 if(!input.id?.trim()||!input.name?.trim()||input.name.length>200||typeof input.defaultImageId!=='string') throw new Error('화자 이름과 인물 정보를 확인해 주세요.');
 if(chapterId!==undefined) chapter(project,chapterId);
 const current=project.characters?.find(c=>c.id===input.id); const next={...current,role:current?.role??'',description:current?.description??'',...input};
 return validate({...project,characters:current?(project.characters??[]).map(c=>c.id===input.id?next:c):[...(project.characters??[]),next],
  speakerNames:[...new Set([...project.speakerNames,input.name])],chapters:project.chapters.map(c=>c.id===chapterId?{...c,chapterSpeakerNames:[...new Set([...c.chapterSpeakerNames,input.name])]}:c)});
}
export function assignStorySpeaker(project:StoryProject,id:string,name:string):StoryProject {
 cut(project,id); if(typeof name!=='string'||name.length>200) throw new Error('화자 이름은 200자 이내로 입력해 주세요.');
 return validate({...project,lines:project.lines.map(l=>l.id===id?{...l,speakerName:name}:l)});
}
export function setStageSpeaker(project:StoryProject,id:string,actorKey:string|null):StoryProject {
 const selected=cut(project,id); const stage=resolveStageComposition(chapter(project,selected.chapterId),selected,project);
 if(actorKey!==null&&![...stage.leftActors,...stage.rightActors].some(a=>a.key===actorKey)) throw new Error('무대에 표시된 인물을 골라 주세요.');
 const speaker=actorKey===null?'narration':stage.leftActors.some(a=>a.key===actorKey)?'left':'right';
 const composition={...stage,speakerActorKey:actorKey??undefined,speakerActorKeys:actorKey===null?[]:[actorKey]};
 return validate({...project,lines:project.lines.map(l=>l.id===id?{...l,inheritActors:false,speaker,stageComposition:composition,...stageProjection(composition)}:l)});
}
