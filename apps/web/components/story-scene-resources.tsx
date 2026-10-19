'use client';
/* eslint-disable @next/next/no-img-element -- catalog thumbnails, not a second scene renderer */
import type {StoryProject,StoryLine,StageComposition} from '@knolstory/story-domain';
import {resolveAsset,assetDisplayName} from '@knolstory/asset-registry';
import {actorLabel} from '../lib/actor-label';
import styles from './story-scene-resources.module.css';
type Props={project:StoryProject;line:StoryLine;stage:StageComposition;onFocus:(label:string)=>void};
function Thumbnail({id}:{id:string}){const asset=resolveAsset(id);return asset?<img src={asset.src} alt=""/>:null;}
export function StorySceneResources({project,line,stage,onFocus}:Props){
 const chapter=project.chapters.find(item=>item.id===line.chapterId);
 const backgroundId=line.backgroundMode==='none'?'':line.backgroundId||chapter?.backgroundId||project.stageDefaults?.backgroundId||'';
 const background=resolveAsset(backgroundId),actors=[...stage.leftActors,...stage.rightActors];
 return <details key={`${project.id}/${line.id}`} className={styles.resources} data-scene-resources><summary>현재 배경·인물 확인 · 인물 {actors.length}명</summary>
  <p>자료 그림과 저작 배치 정보입니다. 실제 장면은 같은 미리보기에서 확인합니다.</p>
  <ul><li><Thumbnail id={backgroundId}/><div><strong>배경 · {background?assetDisplayName(background):backgroundId?'자료 확인 필요':'그림 없음'}</strong><p>{line.backgroundId?'이 컷에서 지정':line.backgroundMode==='none'?'이 컷에서 숨김':'장·작품 기본 배경'}</p><button type="button" aria-label="현재 배경 설정으로 이동" onClick={()=>onFocus('배경')}>배경 설정</button></div></li>
   {actors.map(actor=>{const name=actorLabel(stage,actor.key),asset=resolveAsset(actor.assetId);return <li key={actor.key}><Thumbnail id={actor.assetId}/><div><strong>{name} · {asset?assetDisplayName(asset):'자료 확인 필요'}</strong><p>{actor.xAnchor!==undefined?`가로 ${actor.xAnchor}%`:actor.position==='center'?'화면 중앙':'가로 자동 배치'} · 크기 {actor.scaleMultiplier??1}배 · {actor.facing==='left'?'왼쪽 바라보기':actor.facing==='right'?'오른쪽 바라보기':actor.facing==='original'?'원본 방향':'기본 방향'}</p>{actor.motion&&<p>동작 · {actor.motion.type==='fade-in'?'서서히 등장':actor.motion.type==='fade-out'?'서서히 퇴장':'지정 위치에서 이동'}</p>}<button type="button" aria-label={`${name} 배치로 이동`} onClick={()=>onFocus(`${name} 가로 위치`)}>인물 배치 설정</button></div></li>;})}
  </ul>
 </details>;
}
