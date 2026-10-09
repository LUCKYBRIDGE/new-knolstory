'use client';
import {useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent} from 'react';
import type {CoverBox, CoverFaceId, StoryCover, StoryProject} from '@knolstory/story-domain';
import {coverElementBox, coverElementText, defaultCoverComposition, resolveBookCover, updateCoverComposition} from '../lib/book-cover';
import {patchCoverElement} from '../lib/book-cover-editor';
import {changeCoverComposition, changeLayerBox, type CompositionAction} from '../lib/cover-editor-interactions';
import {BookCover} from './book-cover';
import styles from './book-cover-editor.module.css';

type Target = {id:string; action:CompositionAction|'move'|'resize'};
type Gesture = Target & {pointer:number; x:number; y:number; width:number; height:number; cover:StoryCover};
const boxStyle=(box:CoverBox):CSSProperties=>({left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.w*100}%`,height:`${box.h*100}%`});
const labels={title:'제목',character:'인물',background:'배경'};

/** Static cover canvas. Story playback and Stage layout are never rendered here. */
export function CoverEditorCanvas({project,cover,face,selectedId,onSelect,onChange,onBegin,onEnd}:{
  project:StoryProject; cover:StoryCover; face:CoverFaceId; selectedId:string;
  onSelect:(id:string)=>void; onChange:(next:StoryCover,gesture?:boolean)=>void;
  onBegin:()=>void; onEnd:(cancelled:boolean)=>void;
}) {
  const root=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null);
  const [basic,setBasic]=useState<'title'|'character'|'background'>('title');
  const model=resolveBookCover({...project,cover},face);
  const items=model.elements;
  const selected=items.find(item=>item.id===selectedId);
  const actor={x:model.artBox.x+model.actorBox.x*model.artBox.w,y:model.artBox.y+model.actorBox.y*model.artBox.h,w:model.actorBox.w*model.artBox.w,h:model.actorBox.h*model.artBox.h};
  const basicBox=basic==='title'?model.titleBox:basic==='character'?actor:model.artBox;
  const selection=cover.design?(selected?coverElementBox(selected):undefined):face==='front'&&cover.composition?basicBox:undefined;
  const resizeAction:Target['action']=cover.design?'resize':basic==='title'?'width':basic==='character'?'scale':'zoom';
  const change=(start:StoryCover,target:Target,dx:number,dy:number):StoryCover=>{
    if(start.design){
      const item=start.design.faces[face].elements.find(item=>item.id===target.id);
      return item?{...start,design:patchCoverElement(start.design,face,item.id,{box:changeLayerBox(item,target.action==='resize'?'resize':'move',dx,dy)})}:start;
    }
    const action=target.action as CompositionAction;
    const horizontal=['width','scale','zoom'].includes(action)?dx||dy:dx;
    return updateCoverComposition(start,changeCoverComposition(start.composition??defaultCoverComposition(start),action,horizontal*100,dy*100));
  };
  const begin=(event:PointerEvent<HTMLButtonElement>,target:Target)=>{
    if(event.button!==0||!root.current)return;
    const rect=root.current.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    if(cover.design)onSelect(target.id);
    gesture.current={...target,pointer:event.pointerId,x:event.clientX,y:event.clientY,width:rect.width,height:rect.height,cover};
    onBegin();event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();
  };
  const move=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=gesture.current;if(!start||start.pointer!==event.pointerId)return;
    onChange(change(start.cover,start,(event.clientX-start.x)/start.width,(event.clientY-start.y)/start.height),true);
  };
  const end=(cancelled:boolean)=>{
    if(!gesture.current)return;
    gesture.current=null;onEnd(cancelled);
  };
  const keyboard=(event:KeyboardEvent<HTMLButtonElement>,target:Target)=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();
    const step=event.shiftKey?.05:.01;
    onChange(change(cover,target,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0));
  };
  return <>
    <div className={styles.canvas} data-face={face} ref={root}>
      <BookCover project={{...project,cover}} face={face}/>
      {cover.design?items.map((item,index)=><button type="button" key={item.id} className={`${styles.layerTarget} ${selectedId===item.id?styles.selectedTarget:''}`}
        aria-label={`${item.type==='text'?'글':'그림'} 상자 직접 이동 · ${index+1}번 ${item.type==='text'?coverElementText(item,model.context).slice(0,40)||'빈 글':'그림'}`} aria-pressed={selectedId===item.id} style={boxStyle(coverElementBox(item))}
        onClick={()=>onSelect(item.id)} onPointerDown={event=>begin(event,{id:item.id,action:'move'})} onPointerMove={move} onPointerUp={()=>end(false)} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(false)} onKeyDown={event=>keyboard(event,{id:item.id,action:'move'})}/>):selection&&<button type="button" className={`${styles.layerTarget} ${styles.selectedTarget}`}
        aria-label={`${labels[basic]} 위치 직접 조정`} style={boxStyle(selection)} onPointerDown={event=>begin(event,{id:basic,action:basic})} onPointerMove={move} onPointerUp={()=>end(false)} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(false)} onKeyDown={event=>keyboard(event,{id:basic,action:basic})}/>}
      {selection&&<button type="button" className={styles.moveHandle} aria-label={cover.design?'선택한 상자 위치 직접 조정':`${labels[basic]} 이동 손잡이`}
        style={{left:`clamp(0px, calc(${(selection.x+selection.w/2)*100}% - 22px), calc(100% - 44px))`,top:`clamp(0px, calc(${selection.y*100}% - 22px), calc(100% - 44px))`}}
        onPointerDown={event=>begin(event,{id:cover.design?selectedId:basic,action:cover.design?'move':basic})} onPointerMove={move} onPointerUp={()=>end(false)} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(false)} onKeyDown={event=>keyboard(event,{id:cover.design?selectedId:basic,action:cover.design?'move':basic})}>✥</button>}
      {selection&&<button type="button" className={styles.resizeHandle} aria-label={cover.design?'선택한 상자 크기 직접 조정':`${labels[basic]} 크기 직접 조정`}
        style={{left:`clamp(0px, calc(${(selection.x+selection.w)*100}% - 22px), calc(100% - 44px))`,top:`clamp(0px, calc(${(selection.y+selection.h)*100}% - 22px), calc(100% - 44px))`}}
        onPointerDown={event=>begin(event,{id:cover.design?selectedId:basic,action:resizeAction})} onPointerMove={move} onPointerUp={()=>end(false)} onPointerCancel={()=>end(true)} onLostPointerCapture={()=>end(false)} onKeyDown={event=>keyboard(event,{id:cover.design?selectedId:basic,action:resizeAction})}>↘</button>}
    </div>
    {!cover.design&&face==='front'&&<div className={styles.canvasTools} aria-label="표지 직접 조정">{(['title','character','background'] as const).filter(id=>id==='title'||(id==='character'?cover.characterId:cover.backgroundId)).map(id=><button type="button" key={id} aria-pressed={basic===id&&!!cover.composition} onClick={()=>{if(!cover.composition)onChange({...cover,composition:defaultCoverComposition(cover)});setBasic(id);}}>{labels[id]} 선택</button>)}</div>}
    <p className={styles.canvasHint}>{cover.design?'상자를 눌러 선택하고 끌어 옮겨요.':'제목·인물·배경을 선택해 직접 움직여요.'}<br/>방향키로 한 칸 · Shift + 방향키로 다섯 칸 · ↘ 크기 조절</p>
  </>;
}
