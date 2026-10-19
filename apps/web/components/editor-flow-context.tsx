'use client';
import dialogSurface from './story-dialog-surface.module.css';
import {useEffect,useRef,useState} from 'react';
import {findUpstreamBranches,type FlowNode,type FlowEdge,type StoryFlowGraph} from '@knolstory/runtime-core';
import type {StoryProject} from '@knolstory/story-domain';
import {describeStoryEdge} from '../lib/story-connection-labels';
import {trapDialogTab} from '../lib/dialog-keyboard';
import styles from './editor-flow-context.module.css';
type Props={project?:StoryProject;node:FlowNode;graph:StoryFlowGraph;disabled:boolean;editingPath?:readonly string[];onReturnVisit?:(index:number)=>boolean;onSelect:(id:string)=>boolean|void;onRepair:(id:string,repair:{choiceId?:string;kind:string})=>boolean|void};
export function EditorFlowContext(p:Props){
 const [open,setOpen]=useState(false);
 const warning=p.node.outgoing.some(edge=>edge.status==='pending'||edge.status==='missing');
 const label=p.node.shared?'여러 갈래에서 함께 쓰는 컷':!p.node.reachable?'시작부터 이어지는 길 없음':warning?'연결 확인 필요':p.node.kind==='choice'?'선택지':p.node.kind==='ending'?'이야기 끝':'연결';
 return <><button type="button" className={styles.opener} aria-label="현재 컷 연결 살펴보기" aria-haspopup="dialog" disabled={p.disabled} onClick={()=>setOpen(true)}>{label==='연결'?'연결 살펴보기':`연결 살펴보기 · ${label}`}</button>{open&&<ContextDialog key={p.node.lineId} {...p} onClose={()=>setOpen(false)}/>}</>;
}
function ContextDialog({project,node,graph,disabled,editingPath,onReturnVisit,onSelect,onRepair,onClose}:Props&{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current,opener=document.activeElement as HTMLElement|null;element?.showModal();element?.querySelector<HTMLElement>('button')?.focus();return()=>{element?.close();if(opener?.isConnected)opener.focus();};},[]);
 const nodes=new Map(graph.nodes.map(item=>[item.lineId,item]));
 const upstream=findUpstreamBranches(graph,node.lineId);
 function linked(edge:FlowEdge,incoming:boolean){
  const target=nodes.get(incoming?edge.sourceLineId:edge.targetLineId??'');
  return <li key={edge.id}><strong>{project?describeStoryEdge(project,edge):edge.label}</strong>{target?<><p>{target.chapterLabel} · {target.order}컷</p><p className={styles.text}>{target.text||'아직 글이 없는 컷'}</p><button type="button" disabled={disabled} data-flow-cut={target.lineId} aria-label={`${target.chapterLabel} · ${target.order}컷 편집`} onClick={()=>{if(onSelect(target.lineId)!==false)onClose();}}>이 컷 편집</button></>:edge.status==='ending'?<p>이야기 끝</p>:<><p>{edge.status==='pending'?'도착 컷을 정해 주세요':'도착 컷을 찾을 수 없음'}</p><button type="button" disabled={disabled} onClick={()=>{if(onRepair(node.lineId,{choiceId:edge.choiceId,kind:edge.status==='pending'?'pending':'missing'})!==false)onClose();}}>연결 편집 열기</button></>}</li>;
 }
 return <dialog ref={dialog} className={`${styles.dialog} ${dialogSurface.surface}`} aria-labelledby="editor-flow-context-title" onKeyDown={event=>trapDialogTab(event,dialog.current)} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}><div className={styles.shell}>
  <header><h2 id="editor-flow-context-title">현재 컷 연결 살펴보기</h2><button type="button" aria-label="연결 살펴보기 닫기" onClick={onClose}>닫기</button></header>
  <div className={styles.body}><p>{node.chapterLabel} · {node.order}컷</p>{node.shared&&<p>여러 길이 다시 만나는 지점입니다. 아래에서 이 컷으로 오는 선택과 조건을 확인할 수 있어요. 이 컷을 수정하면 이곳을 지나는 모든 길에 반영됩니다.</p>}{!node.reachable&&<p>시작부터 이 컷까지 이어지는 길이 없습니다. 이 컷으로 오는 길을 확인해 주세요.</p>}<p>이 표시는 원고의 연결 관계입니다. 독자가 실제로 선택한 읽기 경로와 구분합니다.</p>
   {editingPath&&<section aria-label="내 편집 이동 경로"><details className={styles.upstream}><summary>내 편집 이동 경로 · {editingPath.length}컷</summary><p>내가 편집하며 실제로 이동한 컷입니다. 이야기 연결이나 독자의 진행을 바꾸지 않습니다. 최근 32번의 방문을 보관합니다.</p><ol className={styles.visits}>{editingPath.map((id,index)=>{const visit=nodes.get(id);return visit?<li key={`${index}/${id}`}><strong>{visit.chapterLabel} · {visit.order}컷</strong><p className={styles.text}>{visit.text||'아직 글이 없는 컷'}</p>{index<editingPath.length-1&&<button type="button" disabled={disabled} data-editing-path-index={index} aria-label={`편집 경로 ${index+1}번째 컷으로 돌아가기`} onClick={()=>{if(onReturnVisit?.(index))onClose();}}>이 방문으로 돌아가기</button>}</li>:null;})}</ol></details>{editingPath.length>1&&<button type="button" disabled={disabled} onClick={()=>{if(onReturnVisit?.(editingPath.length-2))onClose();}}>이전 편집 컷으로 돌아가기</button>}</section>}
   <details className={styles.upstream}><summary>이 컷으로 이어질 수 있는 앞 갈림길 · {upstream.length}개</summary><p>가까운 갈림길부터 표시합니다. 여러 길이 만나거나 같은 컷으로 돌아오는 길도 포함합니다. 실제로 읽을 수 있는 길은 독자의 선택과 점수에 따라 달라집니다.</p>{!upstream.length&&<p>현재 컷 앞에서 이어지는 선택지·조건 갈림길이 없습니다.</p>}<ul>{upstream.map(branch=><li key={branch.node.lineId}><strong>{branch.node.chapterLabel} · {branch.node.order}컷</strong><p className={styles.text}>{branch.node.text||'아직 글이 없는 컷'}</p><ul>{branch.routes.map(route=><li key={route.edge.id}>{project?describeStoryEdge(project,route.edge):route.edge.label} · 현재 컷까지 최소 {route.distance}번 이동</li>)}</ul><button type="button" disabled={disabled} data-upstream-cut={branch.node.lineId} onClick={()=>{if(onSelect(branch.node.lineId)!==false)onClose();}}>이 갈림길 편집</button></li>)}</ul></details>
   <section aria-label="들어오는 연결"><h3>이 컷으로 오는 길 · {node.incoming.length}개</h3>{!node.incoming.length&&<p>{graph.startLineId===node.lineId?'작품의 시작 컷입니다.':'이 컷으로 오는 연결이 없습니다.'}</p>}<ul>{node.incoming.map(edge=>linked(edge,true))}</ul></section>
   <section aria-label="나가는 연결"><h3>이 컷에서 나가는 길 · {node.outgoing.length}개</h3><ul>{node.outgoing.map(edge=>linked(edge,false))}</ul></section>
  </div>
 </div></dialog>;
}
