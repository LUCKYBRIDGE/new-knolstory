import {createStoryDocument,parseStoryDocument,serializeStoryDocument,type StoryProject} from '@knolstory/story-domain';
import {compileStoryScene} from '@knolstory/runtime-core';
import {importStoryExcel,importStoryTable,parseTableCsv,parseTableTsv} from '@knolstory/compatibility';
import {portableAudioResources,referencedAudioIds} from './audio-portability';
import {listAudioResources,importAudioResources} from './audio-resources';
export function documentFor(project:StoryProject){return createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'knolstory-next'});}
export async function portableStory(project:StoryProject){
 const ids=referencedAudioIds(project).filter(id=>id.startsWith('audio:custom:'));
 const resources=ids.length?await listAudioResources(ids):[];
 if(ids.some(id=>!resources.some(r=>r.id===id)))throw new Error('작품 오디오 자료가 보관함에 없습니다.');
 const document=JSON.parse(serializeStoryDocument(documentFor(project)));
 return {...document,...(resources.length?{audioResources:resources}:{})};
}
export async function loadStoryArchive(raw:unknown):Promise<StoryProject>{
 const resources=portableAudioResources(raw),parsed=parseStoryDocument(raw);
 if(!parsed.ok)throw new Error(parsed.issues.map(i=>`${i.path}: ${i.message}`).join('\n'));
 const project=parsed.document.project;
 if(!project.lines.length)throw new Error('편집할 컷이 없습니다.');
 for(const line of project.lines)compileStoryScene(project,line.id,0,{mode:'edit'});
 const ids=referencedAudioIds(project).filter(id=>id.startsWith('audio:custom:'));
 const existing=ids.length?await listAudioResources(ids):[];
 if(ids.some(id=>!resources.some(r=>r.id===id)&&!existing.some(r=>r.id===id)))throw new Error('작품에 연결된 오디오 자료가 파일에 없습니다.');
 await importAudioResources(resources);return project;
}
export async function readStoryFile(file:File):Promise<StoryProject>{
 if(file.size>25_000_000)throw new Error('작품/표 파일은25MB 이하로 선택하세요.');
 const ext=file.name.toLowerCase().split('.').at(-1);
 if(ext==='shortstory')throw new Error('숏스토리는 숏스토리 편집 화면에서 가져오세요.');
 if(ext==='xlsx'){const archive=await importStoryExcel(new Uint8Array(await file.arrayBuffer()));return loadStoryArchive({...archive.document,audioResources:archive.audioResources});}
 if(ext==='csv'||ext==='tsv'){const archive=importStoryTable((ext==='csv'?parseTableCsv:parseTableTsv)(await file.text()));return loadStoryArchive({...archive.document,audioResources:archive.audioResources});}
 if(file.size>20_000_000)throw new Error('작품 파일은20MB 이하로 선택하세요.');
 return loadStoryArchive(JSON.parse(await file.text()));
}
export function downloadArtifact(data:BlobPart,name:string,mime:string){
 const blob=new Blob([data],{type:mime});if(blob.size>25_000_000)throw new Error('파일 자료가 너무 큽니다.');
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
