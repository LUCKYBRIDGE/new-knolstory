'use client';
import {resolveAsset} from '@knolstory/asset-registry';
import type {Chapter} from '@knolstory/story-domain';
import {PicturebookArt} from './picturebook-art';
import styles from './picturebook-chapter-reference.module.css';

/**
 * The chapter's plan from the picture book: its original page text (the chapter summary)
 * and the page picture it started from. Editing only: reading and playback never show it.
 */
export function PicturebookChapterReference({chapter}:{chapter:Chapter}){
 const sketch=chapter.picturebookSketch;
 const missing=sketch?[sketch.backgroundId,sketch.leftAssetId,sketch.rightAssetId].filter(id=>id&&!resolveAsset(id)).length:0;
 return <section className={styles.reference} aria-label="그림책 구상" data-testid="picturebook-chapter-reference">
  <strong>그림책 구상</strong>
  {sketch&&<PicturebookArt backgroundId={sketch.backgroundId} leftAssetId={sketch.leftAssetId} rightAssetId={sketch.rightAssetId} label="그림책 구상 삽화"/>}
  {missing>0&&<p className={styles.missing}>이 기기에서 그림책 구상 삽화 자료 {missing}개를 찾지 못했어요. 장의 글과 무대는 그대로예요.</p>}
  <p className={styles.summary}>{chapter.summary.trim()?chapter.summary:'그림책 쪽에 글이 없었어요.'}</p>
 </section>;
}
