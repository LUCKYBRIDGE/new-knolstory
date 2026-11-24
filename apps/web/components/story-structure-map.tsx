'use client';
import {useMemo,useState} from 'react';
import {chaptersForDisplay,chapterLabel,type StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
import {storyStructure,type StoryStructure,type StructureBlock,type StructureEnd,type StructureLeg} from '../lib/story-structure-map';
import styles from './story-structure-map.module.css';

type Props={project:StoryProject;graph:StoryFlowGraph;structure?:StoryStructure;currentLineId:string;onSelectCut:(lineId:string,repair?:{choiceId?:string;kind?:string})=>void};
/** More blocks than this read chapter by chapter. */
export const STRUCTURE_GROUPED_AFTER=12;
const ROLE={start:'▶ 시작',branch:'◆ 갈림길',join:'● 다시 만나는 곳',detached:'시작부터 이어지는 길 없음'} as const;
/** Where a block sits on the map, so the map can scroll to it (현재 컷으로, a way's end, a search result). */
export const structureBlockId=(lineId:string)=>`structure-${lineId}`;
export function revealStructureBlock(lineId:string,cutId?:string){
 const block=document.getElementById(structureBlockId(lineId));if(!block)return false;
 let parent=block.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
 // A cut inside a way is shown where it is (its run opens around it); otherwise the block's head.
 const cut=cutId?block.querySelector<HTMLElement>(`[data-structure-cut="${CSS.escape(cutId)}"]`):null;
 if(cut){let run=cut.parentElement;while(run&&run!==block){if(run instanceof HTMLDetailsElement)run.open=true;run=run.parentElement;}}
 const target=cut&&cut.checkVisibility()?cut:block.querySelector<HTMLElement>('[data-structure-head]');
 (target??block).scrollIntoView({block:'center'});target?.focus({preventScroll:true});return true;
}
/** A long run shows the cuts around the current one (or its first cuts) and opens more on request. */
const WINDOW=6;
function RunCuts({ids,currentLineId,nodes,onSelectCut}:{ids:readonly string[];currentLineId:string;nodes:Map<string,StoryFlowGraph['nodes'][number]>;onSelectCut:Props['onSelectCut']}){
 const at=ids.indexOf(currentLineId);
 const [range,setRange]=useState(()=>at<0?[0,Math.min(ids.length,WINDOW)]:[Math.max(0,at-3),Math.min(ids.length,at+4)]);
 const [from,to]=range as [number,number];
 return <>
  {from>0&&<button type="button" className={styles.more} onClick={()=>setRange([Math.max(0,from-20),to])}>앞 컷 더 보기 · {from}컷</button>}
  <ol>{ids.slice(from,to).map(id=>{const node=nodes.get(id)!;return <li key={id}><button type="button" aria-current={id===currentLineId?'true':undefined} data-structure-cut={id} onClick={()=>onSelectCut(id)}><strong>{node.chapterLabel.split(' · ')[0]} {node.order}컷</strong><span>{node.text.trim()||'아직 글이 없는 컷'}</span></button></li>;})}</ol>
  {to<ids.length&&<button type="button" className={styles.more} onClick={()=>setRange([from,Math.min(ids.length,to+20)])}>뒤 컷 더 보기 · {ids.length-to}컷</button>}
 </>;
}

function endWords(end:StructureEnd){
 if(end.kind==='cut')return end.role==='branch'?`◆ ${end.place} 갈림길로`:end.role==='join'?`● ${end.place}에서 다시 만나요`:`${end.place}로`;
 if(end.kind==='ending')return `■ ${end.place} · 이야기 끝`;
 if(end.kind==='story-end')return '■ 이야기 끝';
 if(end.kind==='loop')return `↺ ${end.place}로 돌아가요`;
 return end.kind==='pending'?'도착 컷을 정해 주세요':'도착 컷을 찾을 수 없어요';
}

/** 갈래 구조 (the catalog's custom StoryStructure): start, branch points and joins first; cuts that simply follow one another fold into one run. */
export function StoryStructureMap({project,graph,structure:given,currentLineId,onSelectCut}:Props){
 const structure=useMemo(()=>given??storyStructure(project,graph),[given,project,graph]);
 const nodes=useMemo(()=>new Map(graph.nodes.map(node=>[node.lineId,node])),[graph]);
 const current=structure.member.get(currentLineId);
 const currentBlock=current?.block??structure.blocks.find(block=>block.legs.some(leg=>'lineId' in leg.end&&leg.end.lineId===currentLineId))?.lineId;
 // Long works read chapter by chapter; the chapter of the current cut starts open.
 const grouped=structure.blocks.length>STRUCTURE_GROUPED_AFTER;
 const chapters=chaptersForDisplay(project.chapters).map(chapter=>({chapter,blocks:structure.blocks.filter(block=>block.chapterId===chapter.id)})).filter(item=>item.blocks.length);
 const leg=(block:StructureBlock,item:StructureLeg,index:number)=>{
  const inRun=current?.block===block.lineId&&current.leg===index,atEnd='lineId' in item.end&&item.end.lineId===currentLineId&&item.end.kind==='ending';
  const end=item.end;
  return <li key={item.edgeId} className={styles.leg} data-current={inRun||atEnd||undefined}>
   <span className={styles.way}><b>{item.mark?`${item.mark}. `:''}{item.words.label}</b>{item.words.condition&&<small className={styles.condition}>{item.words.condition}</small>}</span>
   {item.run.length>0&&<details className={styles.run} open={inRun||undefined}><summary>{item.runLabel}{item.run.length>1?` · ${item.run.length}컷`:''}{inRun?' · 현재 편집':''}</summary>
    <RunCuts ids={item.run} currentLineId={currentLineId} nodes={nodes} onSelectCut={onSelectCut}/></details>}
   {end.kind==='cut'||end.kind==='loop'?<button type="button" className={styles.end} data-structure-end={end.lineId} onClick={()=>{if(!revealStructureBlock(end.lineId))onSelectCut(end.lineId);}}>{endWords(end)}</button>
    :end.kind==='ending'?<button type="button" className={`${styles.end} ${styles.ending}`} aria-current={end.lineId===currentLineId?'true':undefined} aria-label={`${end.place} 편집 · 이야기 끝`} onClick={()=>onSelectCut(end.lineId)}>{endWords(end)}</button>
    :end.kind==='story-end'?<span className={`${styles.end} ${styles.ending}`}>{endWords(end)}</span>
    :<button type="button" className={`${styles.end} ${styles.problem}`} onClick={()=>onSelectCut(end.lineId,{...(item.choiceId?{choiceId:item.choiceId}:{}),kind:end.kind})}>{endWords(end)} · 이 컷에서 수정</button>}
  </li>;
 };
 const card=(block:StructureBlock)=><li key={block.lineId} id={structureBlockId(block.lineId)} className={styles.block} data-roles={block.roles.join(' ')} data-current={currentBlock===block.lineId||undefined}>
  <button type="button" data-structure-head className={styles.head} aria-current={block.lineId===currentLineId?'true':undefined} aria-label={`${block.place} 편집 · ${block.roles.map(role=>ROLE[role]).join(' · ')||'이어지는 컷'}`} onClick={()=>onSelectCut(block.lineId)}>
   <span className={styles.roles}>{block.roles.map(role=><span key={role} data-role={role}>{role==='join'?`● ${block.incoming}갈래가 만나요`:ROLE[role]}</span>)}{block.lineId===currentLineId&&<span data-role="current">현재 편집</span>}</span>
   <strong>{block.place}</strong><span className={styles.excerpt}>{block.excerpt}</span>
  </button>
  <ul className={styles.legs}>{block.legs.map((item,index)=>leg(block,item,index))}</ul>
 </li>;
 return <div className={styles.structure} data-testid="story-structure">
  {grouped?chapters.map(({chapter,blocks})=><details key={chapter.id} className={styles.chapter} open={blocks.some(block=>block.lineId===currentBlock)||undefined}>
   <summary>{chapterLabel(chapter)} <span>{blocks.filter(block=>block.roles.includes('branch')).length?`갈림길 ${blocks.filter(block=>block.roles.includes('branch')).length}`:''}{blocks.some(block=>block.roles.includes('join'))?` · 만나는 곳 ${blocks.filter(block=>block.roles.includes('join')).length}`:''}{blocks.some(block=>block.lineId===currentBlock)?' · 현재 편집':''}</span></summary>
   <ol className={styles.blocks}>{blocks.map(card)}</ol></details>)
   :<ol className={styles.blocks}>{structure.blocks.map(card)}</ol>}
 </div>;
}
