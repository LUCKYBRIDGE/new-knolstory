"use client";

import {useId,useState} from 'react';
import {updateStoryChapter} from '@knolstory/runtime-core';
import {chapterLabel,type Chapter,type StoryProject} from '@knolstory/story-domain';
import {AssetPickerField} from './asset-picker-field';
import {StoryChapterResources} from './story-chapter-resources';
import {StoryAudioControls} from './story-audio-controls';
import styles from './story-chapter-settings.module.css';

type Props={
 project:StoryProject; chapterId:string; onProjectChange:(project:StoryProject)=>void;
 charactersEnabled:boolean; audioEnabled:boolean; disabled?:boolean; composing?:boolean;
 onComposing?:(value:boolean)=>void; onPreviewFromBranch?:(id:string)=>void;
};
type ImageField='backgroundId'|'leftAssetId'|'rightAssetId';

/** Default edits must leave cut overrides and the chapter's resource list intact. */
export function changeChapterDefaultImage(project:StoryProject,chapterId:string,field:ImageField,assetId:string):StoryProject {
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter) throw new Error('이야기 장을 찾을 수 없어요.');
 const value=assetId==='__none'?'':assetId;
 const key=field==='backgroundId'?'backgroundAssetIds':'characterAssetIds';
 return updateStoryChapter(project,chapterId,{[field]:value,...(value?{[key]:[...new Set([...chapter[key],value])]}:{})});
}

/** Preserve the number actually shown by historical numbered titles until explicitly edited. */
export function getDisplayedChapterNumber(chapter:Chapter):number {
 const prefix=chapterLabel(chapter).match(/^([0-9]+)\s*장/u);
 const displayed=prefix?Number(prefix[1]):chapter.order;
 return chapter.chapterNumber??(Number.isSafeInteger(displayed)&&displayed>0?displayed:chapter.order);
}

export function getDisplayedChapterBranch(chapter:Chapter):string {
 if(chapter.chapterNumber!==undefined)return chapter.branchLabel??'';
 const prefix=chapter.title.trim().match(/^\d+\s*장([A-Za-z]+)?(?=\s|[·:：.-]|$)/u);
 return prefix?prefix[1]??'':chapter.branchLabel??'';
}

export function changeChapterBranchLabel(project:StoryProject,chapterId:string,branchLabel:string):StoryProject {
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter) throw new Error('이야기 장을 찾을 수 없어요.');
 return updateStoryChapter(project,chapterId,{branchLabel,...(chapter.chapterNumber===undefined?{chapterNumber:getDisplayedChapterNumber(chapter)}:{})});
}

/** A blank numeric draft must never become zero or overwrite the authored number. */
export function changeChapterNumber(project:StoryProject,chapterId:string,draft:string):StoryProject {
 const value=Number(draft);
 if(!validChapterNumber(draft)) throw new Error('장 번호는 1 이상의 정수로 입력해 주세요.');
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter)throw new Error('이야기 장을 찾을 수 없어요.');
 return updateStoryChapter(project,chapterId,{chapterNumber:value,...(chapter.chapterNumber===undefined&&getDisplayedChapterBranch(chapter)!==(chapter.branchLabel??'')?{branchLabel:getDisplayedChapterBranch(chapter)}:{})});
}

function validChapterNumber(draft:string):boolean {
 return /^[0-9]+$/.test(draft)&&Number.isSafeInteger(Number(draft))&&Number(draft)>=1;
}

function ChapterNumberInput({value,disabled,errorId,onCommit}:{value:number;disabled:boolean;errorId:string;onCommit:(draft:string)=>void}) {
 const [draft,setDraft]=useState(String(value));
 const [previousValue,setPreviousValue]=useState(value);
 const [invalid,setInvalid]=useState(false);
 // Keep the focused input mounted when a committed number changes.
 if(previousValue!==value){setPreviousValue(value);setDraft(String(value));setInvalid(false);}
 return <input aria-label="장 번호" aria-invalid={invalid?true:undefined} aria-describedby={invalid?errorId:undefined} type="number" min={1} step={1} value={draft} disabled={disabled} onChange={event=>{setDraft(event.target.value);setInvalid(false);}} onBlur={()=>{if(draft!==String(value)){setInvalid(!validChapterNumber(draft));onCommit(draft);}}}/>;
}

/** Content for the existing Settings disclosure; never adds a second menu. */
export function StoryChapterSettings({project,chapterId,onProjectChange,charactersEnabled,audioEnabled,disabled=false,composing=false,onComposing,onPreviewFromBranch}:Props) {
 const [error,setError]=useState('');
 const errorId=useId();
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter) return null;
 const name=chapterLabel(chapter);
 const apply=(operation:()=>StoryProject)=>{
  if(disabled) return;
  try {onProjectChange(operation());setError('');}
  catch(cause){setError(cause instanceof Error?cause.message:'장 설정을 적용하지 못했어요. 입력 내용을 확인해 주세요.');}
 };
 const patch=(values:Partial<Chapter>)=>apply(()=>updateStoryChapter(project,chapterId,values));
 const image=(field:ImageField,id:string)=>{if(!composing) apply(()=>changeChapterDefaultImage(project,chapterId,field,id));};
 const pool=[...new Set([...chapter.backgroundAssetIds,...chapter.characterAssetIds])];
 const composition={onCompositionStart:()=>onComposing?.(true),onCompositionEnd:()=>onComposing?.(false)};
 return <section className={styles.settings} aria-label={`${name} 설정`}>
  <p>설정할 장 · {name}</p>
  {error&&<p id={errorId} role="alert">{error}</p>}
  <label>장 제목<input aria-label={`${name} 장 제목`} value={chapter.title} maxLength={200} disabled={disabled} {...composition} onChange={event=>patch({title:event.target.value})}/></label>
  <details><summary>장 번호·갈래 표시</summary>
   <label>장 번호<ChapterNumberInput key={`${project.id}/${chapterId}`} value={getDisplayedChapterNumber(chapter)} errorId={errorId} disabled={disabled||composing} onCommit={draft=>{if(!composing)apply(()=>changeChapterNumber(project,chapterId,draft));}}/></label>
   <label>갈래 표시<input aria-label="장 갈래 표시" maxLength={20} placeholder="예: A, B · 표시하지 않으려면 비워 두세요" value={getDisplayedChapterBranch(chapter)} disabled={disabled} {...composition} onChange={event=>apply(()=>changeChapterBranchLabel(project,chapterId,event.target.value))}/></label>
   <p>장 이름에 보이는 번호와 갈래 표시를 바꿔요. 장 순서나 컷 연결은 바뀌지 않아요. 갈래 표시를 적어도 새로운 이야기 갈래가 만들어지지는 않아요.</p>
  </details>
  <label>장 개요<textarea aria-label={`${name} 장 개요`} value={chapter.summary} maxLength={20000} rows={3} disabled={disabled} {...composition} onChange={event=>patch({summary:event.target.value})}/></label>
  <fieldset disabled={disabled||composing}>
   <legend>이어받는 컷의 배경</legend>
   <AssetPickerField label="장 기본 배경" type="background" value={chapter.backgroundId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 배경 이어받기" onChange={id=>image('backgroundId',id)}/>
   <p>배경을 이어받는 컷에 적용해요. 컷에서 직접 고른 배경은 그대로 남아요.</p>
  </fieldset>
  {charactersEnabled&&<details><summary>장 기본 인물</summary><fieldset disabled={disabled||composing}>
   <legend>기본 인물 이미지</legend>
   <AssetPickerField label="장 기본 왼쪽 인물" type="character" value={chapter.leftAssetId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 왼쪽 인물 이어받기" onChange={id=>image('leftAssetId',id)}/>
   <AssetPickerField label="장 기본 오른쪽 인물" type="character" value={chapter.rightAssetId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 오른쪽 인물 이어받기" onChange={id=>image('rightAssetId',id)}/>
   <p>인물을 이어받는 컷에 적용해요. 컷에서 직접 정한 인물 배치는 그대로 남아요.</p>
  </fieldset></details>}
  <StoryChapterResources project={project} chapterId={chapterId} onProjectChange={onProjectChange} charactersEnabled={charactersEnabled} disabled={disabled} composing={composing}/>
  {audioEnabled&&<details><summary>장 기본 음향</summary><fieldset disabled={disabled||composing}>
   <legend>이 장에 들어올 때 적용할 음향</legend>
   <StoryAudioControls key={`${project.id}/${chapterId}`} project={project} workId={project.id} chapterId={chapterId} scope="chapter" value={chapter.audio} editingActive={!disabled&&!composing} onChange={audio=>{if(!composing)patch({audio});}} onPreviewFromBranch={onPreviewFromBranch}/>
  </fieldset></details>}
 </section>;
}
