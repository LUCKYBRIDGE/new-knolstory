'use client';
import dialogSurface from './story-dialog-surface.module.css';
/* eslint-disable @next/next/no-img-element -- catalog source thumbnails, not a story renderer */
import {useEffect,useRef,useState} from 'react';
import {cutLabel,resolveStageComposition,type StoryProject,type StoryLine} from '@knolstory/story-domain';
import {importStoryStaging,undoStoryStagingImport,canUndoStoryStagingImport,type StagingImportUndo} from '@knolstory/runtime-core';
import {resolveAsset,assetDisplayName} from '@knolstory/asset-registry';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './story-staging-import.module.css';
type Props={project:StoryProject;line:StoryLine;ordered:readonly StoryLine[];onChange:(project:StoryProject)=>void};
export function StoryStagingImport(p:Props){
 const [open,setOpen]=useState(false),[undo,setUndo]=useState<StagingImportUndo|null>(null),[notice,setNotice]=useState<{scope:string;text:string}|null>(null);
 const scope=`${p.project.id}/${p.line.id}`;
 const setMessage=(text:string)=>setNotice({scope,text});
 const message=notice?.scope===scope?notice.text:'';
 const availableUndo=undo?.lineId===p.line.id&&canUndoStoryStagingImport(p.project,undo);
 return <div className={styles.entry}><button type="button" disabled={p.ordered.length<2} aria-haspopup="dialog" onClick={()=>setOpen(true)}>다른 컷 배치 가져오기</button>
  {undo?.projectId===p.project.id&&undo.lineId===p.line.id&&<button type="button" disabled={!availableUndo} onClick={()=>{try{p.onChange(undoStoryStagingImport(p.project,undo));setUndo(null);setMessage('가져온 배치를 되돌렸어요. 이후 수정한 글은 유지됩니다.');}catch(issue){setMessage(String(issue));}}}>가져온 배치 되돌리기</button>}
  {message&&<p role="status">{message}</p>}
  {open&&<ImportDialog key={`${p.project.id}/${p.line.id}`} {...p} onClose={()=>setOpen(false)} onApply={(project,undo)=>{p.onChange(project);setUndo(undo);setMessage('선택한 배치를 가져왔어요. 이 컷부터 재생에서 확인할 수 있어요.');setOpen(false);}}/>}
 </div>;
}
function ImportDialog({project,line,ordered,onClose,onApply}:Props&{onClose:()=>void;onApply:(project:StoryProject,undo:StagingImportUndo)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),select=useRef<HTMLSelectElement>(null);
 const previous=ordered[ordered.findIndex(item=>item.id===line.id)-1];
 const [sourceId,setSourceId]=useState(previous?.id??ordered.find(item=>item.id!==line.id)!.id),[background,setBackground]=useState(true),[actors,setActors]=useState(true),[motion,setMotion]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const element=dialog.current,opener=document.activeElement as HTMLElement|null;element?.showModal();select.current?.focus();return()=>{element?.close();if(opener?.isConnected)opener.focus();};},[]);
 const source=project.lines.find(item=>item.id===sourceId)!,chapter=project.chapters.find(item=>item.id===source.chapterId)!;
 const stage=resolveStageComposition(chapter,source,project),backgroundId=source.backgroundMode==='none'?'':source.backgroundId||chapter.backgroundId||project.stageDefaults?.backgroundId||'';
 const artIds=[backgroundId,...stage.leftActors.map(actor=>actor.assetId),...stage.rightActors.map(actor=>actor.assetId)].filter(Boolean);
 return <dialog ref={dialog} className={`${styles.dialog} ${dialogSurface.surface}`} aria-labelledby="staging-import-title" onKeyDown={event=>trapDialogTab(event,dialog.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}><div className={styles.shell}>
  <header><h2 id="staging-import-title">다른 컷 배치 가져오기</h2><button type="button" aria-label="배치 가져오기 닫기" onClick={onClose}>닫기</button></header>
  <div className={styles.body}><p>적용할 컷: {cutLabel(project.chapters.find(item=>item.id===line.chapterId)!,line)} · {line.text||'빈 글'}</p>
   <label>원본 컷<select ref={select} aria-label="배치 원본 컷" value={sourceId} onChange={event=>setSourceId(event.target.value)}>{ordered.filter(item=>item.id!==line.id).map(item=><option key={item.id} value={item.id}>{cutLabel(project.chapters.find(ch=>ch.id===item.chapterId)!,item)} · {item.text.slice(0,40)||'빈 글'}</option>)}</select></label>
   <p className={styles.sourceText}>{source.speakerName||'해설'} · {source.text||'빈 글'}</p>
   <div className={styles.assets}>{artIds.map((id,index)=>{const asset=resolveAsset(id);return <figure key={`${id}/${index}`}>{asset&&<img src={asset.src} alt=""/>}<figcaption>{asset?assetDisplayName(asset):'자료 확인 필요'}</figcaption></figure>;})}</div>
   <p>배경: {backgroundId?(resolveAsset(backgroundId)?assetDisplayName(resolveAsset(backgroundId)!):'자료 확인 필요'):'그림 없음'} · 인물 {stage.leftActors.length+stage.rightActors.length}명</p>
   <fieldset><legend>가져올 항목</legend><label className={styles.check}><input type="checkbox" checked={background} onChange={event=>setBackground(event.target.checked)}/>배경 이미지 · 원본에 없으면 현재 배경도 없앱니다</label><label className={styles.check}><input type="checkbox" checked={actors} onChange={event=>setActors(event.target.checked)}/>인물과 위치·크기·방향 · 현재 인물 배치를 교체합니다</label><label className={styles.check}><input type="checkbox" checked={motion} disabled={!actors} onChange={event=>setMotion(event.target.checked)}/>인물의 등장·퇴장·이동 동작도 함께 가져오기</label></fieldset>
   <p>현재 글·말하는 이름·선택지·소리·화면 효과·배경 구도는 유지됩니다. 인물 대상 효과와 화자 연결은 바뀐 인물에서 확인하세요. 자료 그림은 원본 참고이며 실제 결과는 적용 후 같은 미리보기에서 확인합니다.</p>{error&&<p role="alert">{error}</p>}
  </div><footer><button type="button" onClick={onClose}>취소</button><button type="button" disabled={!background&&!actors} onClick={()=>{try{const result=importStoryStaging(project,sourceId,line.id,{background,actors,motion});onApply(result.project,result.undo);}catch(issue){setError(String(issue));}}}>선택한 배치 적용</button></footer>
 </div></dialog>;
}
