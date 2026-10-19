"use client";
/* eslint-disable @next/next/no-img-element -- catalog thumbnails are resource references, not another story renderer */
import {useState} from 'react';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {changeChapterResource,type ResourceType} from '../lib/chapter-resources';
export {changeChapterResource} from '../lib/chapter-resources';
import type {StoryProject} from '@knolstory/story-domain';
import {AssetPickerField} from './asset-picker-field';
import styles from './story-chapter-resources.module.css';

type Props={project:StoryProject;chapterId:string;onProjectChange:(project:StoryProject)=>void;charactersEnabled:boolean;disabled?:boolean;composing?:boolean};


function ResourceList({ids,type,onRemove}:{ids:readonly string[];type:ResourceType;onRemove:(id:string)=>void}) {
 const unique=[...new Set(ids)];
 return unique.length?<ul className={styles.list} aria-label={`장의 ${type==='background'?'배경':'인물'} 자료`}>
  {unique.map((id,index)=>{
   const asset=resolveAsset(id),available=asset?.type===type;
   const name=available?assetDisplayName(asset):`이름 확인 필요 · 자료 ${index+1}`;
   return <li key={id} data-chapter-resource-id={id}>
    {available&&<img src={asset.src} alt="" loading="lazy"/>}
    <span>{name}</span>
    <button type="button" onClick={()=>onRemove(id)} aria-label={`${name} 목록에서 제외`}>목록에서 제외</button>
   </li>;
  })}
 </ul>:<p>목록에 추가한 {type==='background'?'배경':'인물'}이 없어요.</p>;
}

export function StoryChapterResources({project,chapterId,onProjectChange,charactersEnabled,disabled=false,composing=false}:Props) {
 const [error,setError]=useState('');
 const chapter=project.chapters.find(item=>item.id===chapterId);
 if(!chapter)return null;
 const apply=(type:ResourceType,id:string,action:'add'|'remove')=>{
  if(disabled||composing||(type==='character'&&!charactersEnabled))return;
  try {onProjectChange(changeChapterResource(project,chapterId,type,id,action));setError('');}
  catch(cause){setError(cause instanceof Error?cause.message:'장 자료 목록을 바꾸지 못했어요. 다시 시도해 주세요.');}
 };
 const group=(type:ResourceType)=>{
  const ids=type==='background'?chapter.backgroundAssetIds:chapter.characterAssetIds;
  return <fieldset disabled={disabled||composing}>
   <legend>{type==='background'?'배경 목록':'인물 목록'}</legend>
   <AssetPickerField label={`장 자료에 ${type==='background'?'배경':'인물'} 추가`} type={type} value="" chapterAssetIds={ids} onChange={id=>apply(type,id,'add')}/>
   <ResourceList ids={ids} type={type} onRemove={id=>apply(type,id,'remove')}/>
  </fieldset>;
 };
 return <details className={styles.resources}>
  <summary>장 자료 목록</summary>
  <p>그림을 고를 때 이 장에서 자주 쓸 자료를 빠르게 찾는 목록이에요. 이 장에서 사용한 모든 그림을 보여 주는 목록은 아니에요.</p>
  <p>목록에서 제외해도 컷에 사용한 그림과 장 기본 설정은 그대로 남아요.</p>
  {error&&<p role="alert">{error}</p>}
  {group('background')}
  {charactersEnabled&&group('character')}
 </details>;
}
