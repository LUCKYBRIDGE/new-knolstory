import {withStudentNumber} from './student-file-prefix';
import {previewAuthoringFile} from './story-file-preview';
import {createStoryDocument,serializeStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {referencedAudioIds} from './audio-portability';
import {listAudioResources,listWorkAudioResources,importAudioResources} from './audio-resources';
export function documentFor(project:StoryProject){return createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'knolstory-next'});}
export async function portableStory(project:StoryProject){
 const ids=referencedAudioIds(project).filter(id=>id.startsWith('audio:custom:'));
 const attached=await listWorkAudioResources(project.id);
 const missing=ids.filter(id=>!attached.some(item=>item.id===id));
 const resources=[...attached,...(missing.length?await listAudioResources(missing,project.id):[])];
 if(ids.some(id=>!resources.some(r=>r.id===id)))throw new Error('작품 오디오 자료가 보관함에 없어요.');
 const document=JSON.parse(serializeStoryDocument(documentFor(project)));
 return {...document,...(resources.length?{audioResources:resources}:{})};
}
export async function readStoryFile(file:File):Promise<StoryProject>{
 const archive=await previewAuthoringFile(file);
 if(archive.format!=='knolstory')throw new Error('숏스토리는 숏스토리 편집 화면에서 가져오세요.');
 await importAudioResources(archive.audioResources,archive.document.project.id);
 return archive.document.project;
}
export function downloadArtifact(data:BlobPart,name:string,mime:string){
 const blob=new Blob([data],{type:mime});if(blob.size>25_000_000)throw new Error('파일 자료가 너무 커요.');
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=withStudentNumber(name);anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
