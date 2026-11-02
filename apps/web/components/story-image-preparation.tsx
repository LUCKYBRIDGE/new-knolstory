'use client';
import {useEffect,useState} from 'react';
import styles from './story-image-preparation.module.css';

/** Keep the previous native scene while only missing full-resolution images arrive. */
export function StoryImagePreparation({pending,error,onRetry}:{pending:boolean;error:string;onRetry:()=>void}){
 const [shown,setShown]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setShown(pending),pending?300:0);return()=>{clearTimeout(timer);};},[pending]);
 if(!error&&(!pending||!shown))return null;
 return <div className={styles.overlay} data-image-preparation={error?'failed':'pending'}>
  <div className={styles.message} role={error?'alert':'status'}>
   <p>{error||'다음 장면의 그림을 준비하고 있어요'}</p>
   {error&&<><button type="button" onClick={onRetry}>그림 다시 받기</button><p className={styles.help}>읽기 설정에서 ‘미리 받지 않기’를 고르면 기존 방식으로 이어 읽을 수 있어요.</p></>}
  </div>
 </div>;
}
