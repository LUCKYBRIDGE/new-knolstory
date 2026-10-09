'use client';
/* eslint-disable @next/next/no-img-element -- static cover art uses the existing local asset catalog. */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { resolveAsset } from '@knolstory/asset-registry';
import type { CoverBox, CoverTextElement, CoverImageElement, StoryProject } from '@knolstory/story-domain';
import { COVER_BAND, COVER_FONTS, coverElementBox, coverElementText, coverImageGeometry, resolveBookCover, type CoverFaceId } from '../lib/book-cover';
import styles from './book-cover.module.css';
export type BookEdition = 'original' | 'knolstory' | 'own' | 'imported';
export const BOOK_EDITION_LABELS:Record<BookEdition,string> = {original:'원작',knolstory:'놀스토리',own:'내 작품',imported:'가져온 작품'};
function BookFinish() {
  return <><span className={styles.pageEdges} aria-hidden="true"/><span className={styles.binding} aria-hidden="true"/><span className={styles.surfaceFinish} aria-hidden="true"/></>;
}
const boxStyle=(box:CoverBox):CSSProperties=>({left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.w*100}%`,height:`${box.h*100}%`});
/** Shrink copy as a group so full authored text remains visible in the chosen box. */
function FittedCopy({children,style,className='',signature,layerId,role,writing='horizontal'}:{children:ReactNode;style:CSSProperties;className?:string;signature:string;layerId?:string;role?:string;writing?:string}) {
  const root=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const box=root.current;if(!box)return;
    let cancelled=false;
    const fit=()=>{
      if(cancelled||!box.clientWidth||!box.clientHeight)return;
      const copy=box.firstElementChild as HTMLElement;if(!copy)return;
      copy.style.fontSize=copy.getAttribute('data-cover-copy-size')??'';
      let size=parseFloat(getComputedStyle(copy).fontSize);
      for(let i=0;i<40;i++){
        if(copy.scrollWidth<=box.clientWidth+1&&copy.scrollHeight<=box.clientHeight+1)break;
        const ratio=Math.min(box.clientWidth/Math.max(1,copy.scrollWidth),box.clientHeight/Math.max(1,copy.scrollHeight));
        size=Math.max(.1,size*Math.min(.92,ratio*.98));copy.style.fontSize=`${size}px`;
      }
    };
    fit();const observer=new ResizeObserver(fit);observer.observe(box);
    void document.fonts.ready.then(fit);document.fonts.addEventListener('loadingdone',fit);
    return()=>{cancelled=true;observer.disconnect();document.fonts.removeEventListener('loadingdone',fit);};
  },[signature]);
  return <div ref={root} className={`${styles.copyBox} ${className}`} style={style} data-cover-layer={layerId} data-role={role} data-writing={writing}>{children}</div>;
}
function StaticImage({src,className='',style}:{src:string;className?:string;style?:CSSProperties}) {
  const [failed,setFailed]=useState(false);
  return failed?<span className={styles.missing}>그림을 불러오지 못했어요.</span>:<img src={src} alt="" className={className} style={style} draggable={false} onError={()=>setFailed(true)} />;
}
function ImageLayer({item}:{item:CoverImageElement}) {
  const root=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null);
  const [failed,setFailed]=useState(false);
  const asset=resolveAsset(item.assetId),src=asset?.type===item.assetType?asset.src:undefined;
  const position=()=>{
    const frame=root.current,bitmap=image.current;if(!frame||!bitmap)return;
    const geometry=coverImageGeometry(item,{width:bitmap.naturalWidth,height:bitmap.naturalHeight},{width:frame.clientWidth,height:frame.clientHeight});
    if(geometry) for(const [key,value] of Object.entries(geometry)) bitmap.style.setProperty(key,`${value}px`);
  };
  useLayoutEffect(()=>{const frame=root.current;if(!frame)return;const observer=new ResizeObserver(position);observer.observe(frame);position();return()=>observer.disconnect();});
  return <div ref={root} className={styles.imageLayer} style={boxStyle(item.box)} data-cover-layer={item.id} data-role={item.role} data-frame={item.frame}>
    {src&&!failed?<img ref={image} src={src} alt="" draggable={false} onLoad={position} onError={()=>setFailed(true)} />:<span className={styles.missing}>그림을 불러오지 못했어요.</span>}
  </div>;
}
function TextLayer({item,model}:{item:CoverTextElement;model:ReturnType<typeof resolveBookCover>}) {
  const value=coverElementText(item,model.context);
  return <FittedCopy style={{...boxStyle(coverElementBox(item)),color:item.style.color,textAlign:item.style.align,fontFamily:COVER_FONTS[item.style.fontId].family}}
    signature={JSON.stringify([item,value])} layerId={item.id} role={item.role} writing={item.style.writing}>
    <span className={styles.layerCopy} data-cover-copy-size={`${item.style.fontSize*100}cqw`} style={{fontSize:`${item.style.fontSize*100}cqw`}}>{value}</span>
  </FittedCopy>;
}
/** Static book packaging only; story chapter/cut playback remains in Ren'Py. */
export function BookCover({project,compact=false,className='',face='front',edition='own'}:{project:StoryProject;compact?:boolean;className?:string;face?:CoverFaceId;edition?:BookEdition}) {
  const model=resolveBookCover(project,face),{cover,theme}=model;
  const design=cover.design;
  const common={className:`${styles.book} ${className}`,role:'group', 'aria-label':`${face==='front'?'앞표지':face==='back'?'뒤표지':'책등'} · ${model.title}`,
    'data-cover-face':face,'data-preset':model.preset,'data-edition':edition,'data-compact':compact||undefined};
  if(design) return <div {...common} className={`${common.className} ${styles.layered}`} data-layered-cover="1" data-stock={design.finish.stock} data-texture={design.finish.texture}
    style={{'--cover-paper':design.finish.color,'--cover-ink':design.finish.ink,'--cover-accent':design.finish.accent} as CSSProperties}>
    {model.elements.filter(item=>item.type!=='text'||item.region!=='band').map(item=>item.type==='image'?<ImageLayer key={`${item.id}:${item.assetId}`} item={item}/>:<TextLayer key={item.id} item={item} model={model}/>)}
    {design.band.enabled&&<div className={styles.band} data-cover-band={design.band.designId} aria-hidden="true" style={{top:`${COVER_BAND.top*100}%`,height:`${COVER_BAND.height*100}%`}}/>}
    {model.elements.filter((item):item is CoverTextElement=>item.type==='text'&&item.region==='band').map(item=><TextLayer key={item.id} item={item} model={model}/>)}
    <BookFinish/>
  </div>;
  const composition=cover.composition;
  const backgroundStyle:CSSProperties={objectFit:composition?.backgroundFit==='complete'?'contain':'cover',objectPosition:`${composition?.backgroundX??50}% ${composition?.backgroundY??50}%`,transform:`scale(${composition?.backgroundZoom??1})`,transformOrigin:`${composition?.backgroundX??50}% ${composition?.backgroundY??50}%`};
  const panel=composition?.textPanel==='none'||!composition&&cover.layout==='classic'?'transparent':model.panel;
  return <div {...common} data-layout={cover.layout} data-title-position={cover.titlePosition} data-composition={Boolean(composition)||undefined} data-text-panel={composition?.textPanel}
    style={{'--cover-paper':theme.paper,'--cover-ink':theme.ink,'--cover-accent':theme.accent} as CSSProperties}>
    <div className={styles.legacyFace}>
      {face==='front'?<>
        <div className={styles.art} style={boxStyle(model.artBox)} aria-hidden="true">
          {model.background&&<StaticImage key={model.background.id} src={model.background.src} className={styles.background} style={backgroundStyle}/>}
          {model.character&&<StaticImage key={model.character.id} src={model.character.src} className={styles.actor} style={boxStyle(model.actorBox)}/>}
          {!model.background&&!model.character&&<span className={styles.ornament}>✧</span>}
        </div>
        {(!composition||composition.showEdition)&&<span className={styles.edition}>{BOOK_EDITION_LABELS[edition]}</span>}
        <FittedCopy style={{...boxStyle(model.titleBox),background:'transparent',color:model.ink,textAlign:cover.align,fontFamily:COVER_FONTS[cover.font].family}}
          className={styles.titleBox} role="title" signature={JSON.stringify([model.title,cover])}>
          <div data-cover-copy-size={`${model.titleSize}cqw`} style={{fontSize:`${model.titleSize}cqw`,background:panel}}>
            {cover.subtitle&&<p className={styles.tagline}>{cover.subtitle}</p>}
            <h2 className={styles.title} data-font={cover.font}>{model.title}</h2>
            {cover.author&&cover.authorPosition==='under-title'&&<p className={styles.author}>{cover.author} 지음</p>}
          </div>
        </FittedCopy>
        {cover.author&&cover.authorPosition==='bottom'&&<FittedCopy className={styles.bottomAuthor} style={{left:'12%',top:'89%',width:'79%',height:'7%',background:theme.paper}} signature={cover.author}><p className={styles.author}>{cover.author} 지음</p></FittedCopy>}
      </>:face==='back'?<FittedCopy className={styles.backCopy} style={{left:'12%',top:'10%',width:'78%',height:'78%',textAlign:'left'}} signature={JSON.stringify(model.context)}>
        <div><h2>{model.title}</h2><p>{project.description||'내가 쓴 이야기를 한 권의 책으로.'}</p>{cover.authorNote&&<><h3>작가의 말</h3><p>{cover.authorNote}</p></>}{cover.author&&<p>{cover.author} 지음</p>}<p>이야기를 읽어 주셔서 고마워요.</p></div>
      </FittedCopy>:<FittedCopy style={{left:'10%',top:'6%',width:'80%',height:'88%'}} writing="vertical" signature={model.title}><span className={styles.spineCopy}>{model.title}</span></FittedCopy>}
    </div>
    <BookFinish/>
  </div>;
}
