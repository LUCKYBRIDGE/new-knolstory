'use client';
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import type {StoryLine,StoryProject} from '@knolstory/story-domain';
import {useTimelinePinch} from './use-timeline-pinch';
import {StoryChapterAudioSplit} from './story-chapter-audio-split';
import {StoryCombinedTime,type TimeViewportHandle} from './story-combined-time';
import {buildCombinedEditingTracks,type CombinedTarget,type CombinedEditingEntry} from '../lib/combined-editing-tracks';
import styles from './story-combined-timeline.module.css';

type Props={
 editingActive?:boolean;
 space?:number;
 onSpaceChange?:(value:number)=>void;
 project:StoryProject;
 chapterId:string;
 lineId:string;
 disabled?:boolean;
 composing?:boolean;
 onSelectCut:(id:string)=>void;
 renderDetails:(target:CombinedTarget,line:StoryLine,onTargetChange:(target:CombinedTarget)=>void,entry?:CombinedEditingEntry,selectionRevision?:number)=>ReactNode;
 onSplitChapterRange?:(entry:CombinedEditingEntry,splitId:string)=>boolean;
 onEditChapter?:(id:string)=>void;
 onPreview?:(id:string)=>void;
 onProjectChange?:(project:StoryProject)=>void;
 onEditRange?:(entry:CombinedEditingEntry,startId:string,endId:string)=>void;
};
const labelWidth=92;
const baseCutWidth=120;
const clampZoom=(value:number)=>Math.max(50,Math.min(400,Math.round(value)));

/** Cut ranges are manuscript order, not a continuous playback clock. */
export function StoryCombinedTimeline(p:Props){
 const [timeView,setTimeView]=useState(false);
 const [zoom,setZoom]=useState(100);
 const [hand,setHand]=useState(false);
 const [pinchEnabled,setPinchEnabled]=useState(true);
 const [rangeEditing,setRangeEditing]=useState(false),[rangeMode,setRangeMode]=useState<'move'|'start'|'end'>('move');
 const rangeDrag=useRef<{x:number;entry:CombinedEditingEntry;context:string}|null>(null);
 const [target,setTarget]=useState<CombinedTarget>('music');
 const [selected,setSelected]=useState<{context:string;key:string;revision:number;clipId?:string}|null>(null);
 const selectionRevision=useRef(0);
 const timeViewport=useRef<TimeViewportHandle>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const pan=useRef<{pointerId:number;x:number;y:number;left:number;top:number;moved:boolean}|null>(null);
 const suppressClick=useRef(false);
 const [rangeMessage,setRangeMessage]=useState('');
 const rows=useMemo(()=>p.project.lines.filter(line=>line.chapterId===p.chapterId).sort((a,b)=>a.order-b.order),[p.project,p.chapterId]);
 const tracks=useMemo(()=>buildCombinedEditingTracks(p.project,p.chapterId),[p.project,p.chapterId]);
 const layout=useMemo(()=>tracks.map(track=>{
  let ends:number[]=[];
  const entries=track.entries.map(entry=>{const available=ends.findIndex(end=>end<entry.startCutIndex);const lane=available<0?ends.length:available;ends=ends.map((end,index)=>index===lane?entry.endCutIndex:end);if(available<0)ends=[...ends,entry.endCutIndex];return {entry,lane};});
  return {track,entries,laneCount:ends.length};
 }),[tracks]);
 const rangeContext=JSON.stringify([p.project.id,p.chapterId,p.lineId,zoom,rangeMode,hand,rangeEditing,p.disabled,p.composing,rows]);
 const current=rows.find(line=>line.id===p.lineId);
 const currentIndex=rows.findIndex(line=>line.id===p.lineId);
 const context=JSON.stringify([p.project.id,p.chapterId]);
 const selectedSourceEntry=selected?.context===context?tracks.flatMap(track=>track.entries).find(entry=>entry.key===selected.key&&(!entry.sourceLineId||entry.sourceLineId===p.lineId)):undefined;
 const selectedEntry=selectedSourceEntry&&selected?.clipId?{...selectedSourceEntry,cueId:selected.clipId}:selectedSourceEntry;
 const selectedChapter=selectedEntry?.sourceChapterId&&!selectedEntry.sourceLineId?p.project.chapters.find(chapter=>chapter.id===selectedEntry.sourceChapterId):undefined;
 const cutWidth=baseCutWidth*zoom/100;
 const busy=!!p.disabled||!!p.composing;
 const changeZoom=useCallback((requested:number,anchor?:number)=>{
  if(timeView){timeViewport.current?.zoom(requested,anchor);return;}
  const node=viewport.current;if(!node)return;
  const value=clampZoom(requested);
  const point=anchor??Math.max(0,(node.clientWidth-labelWidth)/2);
  const before=Number(node.dataset.zoom??100);
  const position=(node.scrollLeft+point)*value/before-point;
  setZoom(value);
  // Apply scroll only after React has committed the new track widths.
  requestAnimationFrame(()=>{if(viewport.current===node)node.scrollLeft=Math.max(0,position);});
 },[timeView]);
 const reveal=useCallback(()=>{
  if(timeView){timeViewport.current?.reveal();return;}
  const node=viewport.current;if(!node||currentIndex<0)return;
  const left=currentIndex*cutWidth,right=left+cutWidth,available=Math.max(0,node.clientWidth-labelWidth);
  if(left<node.scrollLeft)node.scrollLeft=left;
  else if(right>node.scrollLeft+available)node.scrollLeft=Math.max(0,right-available);
 },[currentIndex,cutWidth,timeView]);
 const fit=()=>{if(timeView){timeViewport.current?.fit();return;}const node=viewport.current;if(node){changeZoom((node.clientWidth-labelWidth)/(Math.max(1,rows.length)*baseCutWidth)*100);node.scrollLeft=0;}};
 const latestReveal=useRef(reveal);useLayoutEffect(()=>{latestReveal.current=reveal;});
 const revealedContext=useRef<string|null>(null);
 useLayoutEffect(()=>{
  if(p.editingActive===false)return;
  const key=JSON.stringify([p.project.id,p.chapterId,p.lineId]);
  // Preserve manual panning when preview returns to the same cut.
  if(revealedContext.current===key)return;
  const frame=requestAnimationFrame(()=>{latestReveal.current();revealedContext.current=key;});
  return()=>cancelAnimationFrame(frame);
 },[p.project.id,p.chapterId,p.lineId,p.editingActive]);
 useEffect(()=>{
  const node=viewport.current;if(!node)return;
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey){event.preventDefault();changeZoom(Number(node.dataset.zoom??100)+(event.deltaY<0?25:-25),Math.max(0,event.clientX-node.getBoundingClientRect().left-labelWidth));}
   else if(event.shiftKey){event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?node.clientWidth:1;node.scrollLeft+=(event.deltaY||event.deltaX)*unit;}
  };
  node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);
 },[changeZoom]);
 useTimelinePinch(viewport,{zoom,minZoom:50,labelWidth,enabled:pinchEnabled&&!busy&&!timeView,context:JSON.stringify([context,p.lineId,timeView]),onZoom:setZoom,onCancelEdit:()=>{rangeDrag.current=null;pan.current=null;suppressClick.current=true;}});
 const selectCut=(index:number)=>{const line=rows[index];if(line&&!busy){setSelected(null);p.onSelectCut(line.id);}};
 const changeTarget=(value:CombinedTarget)=>{setTarget(value);setSelected(null);};
 const entrySource=selectedEntry?.sourceLineId?rows.findIndex(line=>line.id===selectedEntry.sourceLineId):-1;
 const targetLabel=tracks.find(track=>track.target===target)?.label??'음향·연출';
 return <>
  <section className={styles.timeline} data-combined-timeline data-time-view={timeView} aria-label="음향·연출 컷 범위">
   <header className={styles.toolbar}>
    <strong>음향·연출 배치</strong><label className={styles.shortTimeZoom}>배율<select aria-label="시간 작업 배율" value={zoom} onChange={event=>changeZoom(Number(event.target.value))}>{[50,100,150,200,250,300,350,400,...(zoom%50?[zoom]:[])].sort((a,b)=>a-b).map(value=><option key={value} value={value}>{value}%</option>)}</select></label>{timeView&&<button type="button" className={styles.shortTimeFit} onClick={fit}>전체 보기</button>}<button type="button" aria-pressed={timeView} onClick={()=>{if(timeView&&zoom<50)setZoom(50);setTimeView(value=>!value);}}>{timeView?'컷 구간 보기':'현재 컷 시간 보기'}</button>
    <div className={styles.navigation} aria-label="컷 이동">
     <button type="button" disabled={busy||currentIndex<=0} onClick={()=>selectCut(currentIndex-1)} aria-label="이전 컷">‹</button>
     <button type="button" disabled={currentIndex<0} onClick={reveal}>현재 컷</button>
     <button type="button" disabled={busy||currentIndex<0||currentIndex>=rows.length-1} onClick={()=>selectCut(currentIndex+1)} aria-label="다음 컷">›</button>
    </div>
   </header>
   <div className={styles.viewTools}>
    <label>배율<select aria-label="음향·연출 작업 배율" value={zoom} onChange={event=>changeZoom(Number(event.target.value))}>{Array.from(new Set([50,75,100,125,150,200,250,300,350,400,zoom])).sort((a,b)=>a-b).map(value=><option value={value} key={value}>{value}%</option>)}</select></label>
    <button type="button" aria-label="작업 영역 축소" disabled={zoom<=(timeView?10:50)} onClick={()=>changeZoom(zoom-25)}>−</button>
    <button type="button" aria-label="작업 영역 확대" disabled={zoom>=400} onClick={()=>changeZoom(zoom+25)}>+</button>
    <button type="button" onClick={fit}>전체 보기</button>
    <details className={styles.viewSettings} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary>보기 설정</summary><div>{p.onSpaceChange&&<><label className={styles.spaceControl}>시간축 공간<input type="range" aria-label="시간축 공간 비율" min="30" max="75" step="5" value={p.space??50} onChange={event=>p.onSpaceChange?.(Number(event.target.value))}/><output>{p.space??50}%</output></label><button type="button" onClick={()=>p.onSpaceChange?.(50)}>기본 공간으로 복원</button></>}<label><input type="checkbox" checked={pinchEnabled} onChange={event=>setPinchEnabled(event.target.checked)}/>두 손가락으로 확대·축소</label><div hidden={timeView}><label><input type="checkbox" checked={hand} onChange={event=>setHand(event.target.checked)}/>끌어서 작업 영역 이동</label><label><input type="checkbox" checked={rangeEditing} disabled={hand} onChange={event=>setRangeEditing(event.target.checked)}/>막대를 끌어 구간 수정</label>{rangeEditing&&<label>끌기 동작<select aria-label="구간 끌기 동작" value={rangeMode} onChange={event=>setRangeMode(event.target.value as typeof rangeMode)}><option value="move">구간 이동</option><option value="start">시작 조정</option><option value="end">끝 조정</option></select></label>}<p>기본은 스크롤입니다. Shift+휠은 가로 이동, Ctrl+휠은 확대·축소합니다.</p></div></div></details>
   </div>
   {rangeMessage&&<p role="status">{rangeMessage}</p>}
   <p hidden={timeView} className={styles.hint}>막대는 원고 순서의 적용 컷입니다. 항목을 누르면 시작한 컷의 설정을 엽니다.</p>
   {timeView&&p.onProjectChange&&current&&<StoryCombinedTime key={`${p.project.id}/${current.id}`} project={p.project} lineId={current.id} disabled={busy} pinchEnabled={pinchEnabled} zoom={zoom} controlsRef={timeViewport} onZoom={setZoom} onChange={p.onProjectChange} onSelect={item=>{const nextTarget=item.kind==='effect'?'effects':item.kind==='sound'?'sounds':item.kind==='music'||item.kind==='ambience'?item.kind:'motion';setTarget(nextTarget);const entry=tracks.find(track=>track.target===nextTarget)?.entries.find(entry=>entry.sourceLineId===current.id&&(item.kind==='motion'?entry.actorKey===item.actorKey:item.kind==='music'||item.kind==='ambience'?true:entry.cueIndex===item.index));setSelected(entry?{context,key:entry.key,clipId:item.clipId,revision:++selectionRevision.current}:null);}}/>}
   <div hidden={timeView} ref={viewport} className={styles.viewport} data-zoom={zoom} data-hand={hand} data-range-editing={rangeEditing&&!hand} tabIndex={0} role="region" aria-label="음향·연출 작업 영역" onKeyDown={event=>{
    if(event.target!==event.currentTarget||event.nativeEvent.isComposing)return;
    if(event.key==='+'||event.key==='='){event.preventDefault();changeZoom(zoom+25);}
    else if(event.key==='-'){event.preventDefault();changeZoom(zoom-25);}
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.currentTarget.scrollLeft+=(event.key==='ArrowLeft'?-1:1)*cutWidth;}
    else if(event.key==='Home'){event.preventDefault();event.currentTarget.scrollLeft=0;}
    else if(event.key==='End'){event.preventDefault();event.currentTarget.scrollLeft=event.currentTarget.scrollWidth;}
   }} onPointerDown={event=>{
    suppressClick.current=false;
    if(!hand||event.pointerType==='touch'||event.button!==0)return;
    const node=event.currentTarget;pan.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,left:node.scrollLeft,top:node.scrollTop,moved:false};
    node.setPointerCapture(event.pointerId);
   }} onPointerMove={event=>{
    const state=pan.current;if(!state||state.pointerId!==event.pointerId)return;
    const dx=event.clientX-state.x,dy=event.clientY-state.y;
    if(Math.abs(dx)+Math.abs(dy)>4)state.moved=true;
    if(state.moved){event.currentTarget.scrollLeft=state.left-dx;event.currentTarget.scrollTop=state.top-dy;}
   }} onPointerUp={event=>{const state=pan.current;if(state?.pointerId===event.pointerId){suppressClick.current=state.moved;pan.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}} onPointerCancel={()=>{pan.current=null;suppressClick.current=false;}} onClickCapture={event=>{if(suppressClick.current){suppressClick.current=false;if(event.detail!==0){event.preventDefault();event.stopPropagation();}}}}>
    <div className={styles.grid} style={{width:labelWidth+rows.length*cutWidth}}>
     <div className={styles.ruler}>
      <span className={styles.corner}>설정 / 컷</span>
      <div className={styles.cutRuler}>{rows.map((line,index)=><button key={line.id} type="button" style={{width:cutWidth}} disabled={busy} aria-label={`${index+1}컷으로 이동`} aria-current={line.id===p.lineId?'step':undefined} onClick={()=>selectCut(index)} onKeyDown={event=>{
       if(event.nativeEvent.isComposing||busy)return;
       const next=event.key==='ArrowLeft'?index-1:event.key==='ArrowRight'?index+1:event.key==='Home'?0:event.key==='End'?rows.length-1:undefined;
       if(next===undefined)return;event.preventDefault();const cut=rows[next];if(!cut)return;setSelected(null);p.onSelectCut(cut.id);const buttons=event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');buttons?.[next]?.focus({preventScroll:true});
      }}>{index+1}컷</button>)}</div>
     </div>
     {layout.map(({track,entries,laneCount})=><div className={styles.row} key={track.target}>
      <button className={styles.rowLabel} type="button" aria-pressed={target===track.target} disabled={busy} onClick={()=>changeTarget(track.target)}>{track.label}</button>
      <div className={styles.track} style={{width:rows.length*cutWidth,backgroundSize:`${cutWidth}px 100%`}}>
       {currentIndex>=0&&<span className={styles.currentCut} style={{left:currentIndex*cutWidth,width:cutWidth}} aria-hidden="true"/>}
       {track.entries.length===0?<span className={styles.empty}>설정 없음</span>:entries.map(({entry,lane})=><button key={entry.key} className={styles.entry} type="button" disabled={busy} aria-pressed={selected?.context===context&&selected.key===entry.key} data-actor-key={entry.actorKey} style={{left:entry.startCutIndex*cutWidth+3,width:Math.max(1,(entry.endCutIndex-entry.startCutIndex+1)*cutWidth-6),top:6+lane*48}} onPointerDown={event=>{suppressClick.current=false;if(!rangeEditing||hand||busy||!entry.sourceLineId||!(entry.target==='music'||entry.target==='ambience'||entry.target==='effects'))return;if(entry.target==='effects'&&p.project.lines.find(line=>line.id===entry.sourceLineId)?.presentation?.effects?.[entry.cueIndex??-1]?.scope!=='following')return;event.stopPropagation();setRangeMessage('');rangeDrag.current={x:event.clientX,entry,context:rangeContext};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={event=>{const drag=rangeDrag.current;rangeDrag.current=null;if(!drag)return;event.stopPropagation();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);const delta=Math.round((event.clientX-drag.x)/cutWidth);if(!delta)return;suppressClick.current=true;if(drag.context!==rangeContext){setRangeMessage('작업 배율이나 선택한 구간이 바뀌어 끌기를 취소했어요. 다시 끌어 주세요.');return;}const from=rangeMode==='end'?drag.entry.startCutIndex:drag.entry.startCutIndex+delta,to=rangeMode==='start'?drag.entry.endCutIndex:drag.entry.endCutIndex+delta;if(from<0||to<from||to>=rows.length)return;p.onEditRange?.(drag.entry,rows[from].id,rows[to].id);}} onPointerCancel={()=>{rangeDrag.current=null;}} title={`${entry.label} · ${entry.sourceLineId?`${entry.startCutIndex+1}컷에서 시작`:'장 전체 설정'}${entry.conditional?' · 조건 있음':''}${entry.excludedAudio?' · 재생 제외':''}`} onClick={()=>{setTarget(entry.target);setSelected({context,key:entry.key,revision:++selectionRevision.current});if(entry.sourceLineId)p.onSelectCut(entry.sourceLineId);}}>
        <span>{entry.label}</span><small>{entry.sourceLineId?`${entry.startCutIndex+1}컷에서 시작`:'장 기본'}{entry.conditional?' · 조건 있음':''}{entry.excludedAudio?' · 재생 제외':''}</small>
       </button>)}
       <span style={{height:Math.max(58,laneCount*48+10)}} className={styles.trackHeight} aria-hidden="true"/>
      </div>
     </div>)}
    </div>
   </div>
  </section>
  <section className={styles.details} data-combined-details aria-label="선택한 음향·연출 설정">
   <header className={styles.detailHeading}><strong>{selectedChapter?'장 전체 설정':`${currentIndex+1}컷`} · {targetLabel}</strong>{p.onPreview&&current&&<button type="button" disabled={busy} onClick={()=>p.onPreview?.(current.id)}>이 컷 재생</button>}</header>
   <label className={styles.targetSelect}>편집할 항목<select aria-label="통합 화면 편집할 항목" value={target} disabled={busy} onChange={event=>changeTarget(event.target.value as CombinedTarget)}>{tracks.map(track=><option key={track.target} value={track.target}>{track.label}</option>)}</select></label>
   {selectedChapter?<div className={styles.chapterSource}><p>‘{selectedChapter.title}’의 기본 설정입니다. 컷에서 직접 바꾼 설정과 종료 컷을 따릅니다.</p>{p.onEditChapter?<button type="button" disabled={busy} onClick={()=>p.onEditChapter?.(selectedChapter.id)}>장 전체 설정 열기</button>:<p>설정에서 이 장의 음향을 변경할 수 있어요.</p>}{p.onSplitChapterRange&&selectedEntry&&<StoryChapterAudioSplit key={`${p.project.id}/${selectedEntry.key}/${selectedEntry.endCutIndex}`} project={p.project} entry={selectedEntry} disabled={busy} onSplit={id=>{if(p.onSplitChapterRange?.(selectedEntry,id))setSelected(null);}}/>}<button type="button" disabled={busy} onClick={()=>setSelected(null)}>현재 컷의 {targetLabel} 편집</button></div>:current?<>{selectedEntry&&entrySource>=0&&<p className={styles.sourceNote}>{entrySource+1}컷에서 시작한 설정을 편집하고 있어요.</p>}{p.renderDetails(target,current,changeTarget,selectedEntry,selected?.revision)}</>:<p>편집할 컷을 선택해 주세요.</p>}
  </section>
 </>;
}
