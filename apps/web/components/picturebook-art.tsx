'use client';
/* eslint-disable @next/next/no-img-element -- static picture-book reference from registered assets, not story playback */
import {resolveAsset} from '@knolstory/asset-registry';
import styles from './picturebook-art.module.css';

/** A picture-book page picture (background and side characters) as a still reference image. */
export function PicturebookArt({backgroundId,leftAssetId,rightAssetId,label}:{backgroundId:string;leftAssetId:string;rightAssetId:string;label:string}){
 const background=backgroundId?resolveAsset(backgroundId):undefined,left=leftAssetId?resolveAsset(leftAssetId):undefined,right=rightAssetId?resolveAsset(rightAssetId):undefined;
 const missing=[backgroundId,leftAssetId,rightAssetId].filter(id=>id&&!resolveAsset(id)).length;
 return <div className={styles.art} role="img" aria-label={label}>
  {background&&<img className={styles.background} src={background.src} alt=""/>}
  {left&&<img className={styles.left} src={left.src} alt=""/>}{right&&<img className={styles.right} src={right.src} alt=""/>}
  {!background&&!left&&!right&&<span className={styles.empty}>{missing?'그림 자료를 찾지 못했어요':'그림 없는 쪽'}</span>}
 </div>;
}
