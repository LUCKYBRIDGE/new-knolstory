'use client';
import {useMemo} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import type {StoryFlowGraph} from '@knolstory/runtime-core';
import {FocusSurface,type FocusSurfaceAction} from './a2ui/focus-surface';
import {connectionsSurface,CONNECTION_EVENTS,type ConnectionFork,type ConnectionOut,type ConnectionWay} from './a2ui/editor-surfaces';
import {connectionTrail,type EdgeWords} from '../lib/story-connection-trail';
import styles from './story-connections.module.css';

type Props={
 project:StoryProject;graph:StoryFlowGraph;lineId:string;open:boolean;disabled:boolean;device:'phone'|'tablet';
 /** Cuts the author visited while editing (newest last); the one before the current cut is offered as ‘방금 보던 컷’. */
 editingPath:readonly string[];
 /** Repair buttons only where the matching editor is turned on (선택지 or 분기조건); reading never turns one on. */
 canRepair:boolean;
 onToggle:(open:boolean)=>void;onSelect:(lineId:string)=>boolean|void;onReturnVisit:(index:number)=>boolean;
 onRepair:(lineId:string,repair:{choiceId?:string;kind:string})=>boolean|void;onOpenMap?:()=>void;
};
const short=(text:string,length=22)=>text.length>length?`${text.slice(0,length)}…`:text;
const say=(words:EdgeWords)=>words.condition?`${words.label} · ${words.condition}`:words.label;
const chose=(words:EdgeWords)=>/^[“"‘'「『]/u.test(words.label)?`${words.label} 고르면${words.condition?` · ${words.condition}`:''}`:say(words);

/**
 * 이야기 연결: the authored links around the current cut (앞 갈림길 → 지금 → 다음), drawn by the A2UI catalog.
 * It stays open while the author moves between cuts and only reads the work; moving uses the editor's own cut change.
 */
export function StoryConnections(p:Props){
 const trail=useMemo(()=>connectionTrail(p.project,p.graph,p.lineId),[p.project,p.graph,p.lineId]);
 if(!trail)return null;
 const nodes=new Map(p.graph.nodes.map(node=>[node.lineId,node]));
 const incomingSources=new Set(trail.incoming.map(way=>way.lineId));
 // The nearest branch point leads with its shortest way here; its other ways and further branch points fold away.
 const branches=trail.upstream.filter(branch=>!incomingSources.has(branch.lineId)).map(branch=>({branch,ways:[...branch.routes].map((route,index)=>({route,index})).sort((a,b)=>a.route.distance-b.route.distance)
  .map(({route,index})=>({id:`up-${branch.lineId}-${index}`,label:chose(route.words),where:route.distance<=1?`${branch.place}에서 바로 여기로`:`${branch.place}에서 ${route.distance-1}컷 지나 여기로`,lineId:branch.lineId}))}));
 const upstream:ConnectionFork[]=branches.flatMap(({branch,ways},at)=>at===0
  ?[{id:`up-${branch.lineId}`,title:`${branch.place} 갈림길`,note:branch.excerpt,ways:ways.slice(0,1)},...(ways.length>1?[{id:`up-${branch.lineId}-more`,title:`${branch.place} 갈림길의 다른 길`,ways:ways.slice(1)}]:[])]
  :[{id:`up-${branch.lineId}`,title:`${branch.place} 갈림길`,note:branch.excerpt,ways}]);
 const incoming:ConnectionWay[]=trail.incoming.filter(way=>way.lineId).map(way=>({id:`in-${way.edgeId}`,label:`← ${chose(way.words)}`,where:`${way.place} · ${way.excerpt}`,lineId:way.lineId!}));
 const outgoing:ConnectionOut[]=trail.outgoing.map(way=>{
  const head=`${way.mark?`${way.mark}. `:''}${way.words.label==='순서대로'||way.words.label==='이동'?'':say(way.words)}`.trim();
  if(way.status==='connected'&&way.lineId)return {id:way.edgeId,label:`${head||'다음'} →`,where:`${way.place} · ${way.excerpt}${way.ending?' · 이야기 끝':''}`,lineId:way.lineId};
  if(way.status==='ending')return {id:way.edgeId,label:head||'이야기 끝',notice:{kind:'empty',text:head?`${short(head,40)} → 이야기 끝`:'여기서 이야기가 끝나요'}};
  const problem=way.status==='pending'?'도착 컷을 정해 주세요':'도착 컷을 찾을 수 없어요';
  return {id:way.edgeId,label:head||'다음',notice:{kind:'warning',text:`${short(head||'다음 컷',30)} · ${problem}`,...(p.canRepair?{repair:{...(way.choiceId?{choiceId:way.choiceId}:{}),kind:way.status==='pending'?'pending':'missing'}}:{})}};
 });
 const previous=p.editingPath.length>1?p.editingPath[p.editingPath.length-2]:undefined,previousNode=previous&&previous!==p.lineId?nodes.get(previous):undefined;
 const surface=connectionsSurface({open:p.open,summary:trail.warning?'이야기 연결 · 확인 필요':'이야기 연결',upstream,incoming,
  here:`지금 · ${trail.place}`,...(trail.marks.length?{marks:trail.marks.join(' · ')}:{}),outgoing,
  ...(previousNode?{back:{name:`방금 보던 컷으로 돌아가기 · ${previousNode.chapterLabel.split(' · ')[0]} ${previousNode.order}컷`}}:{}),
  visits:p.editingPath.slice(0,-1).map((id,index)=>({id,index,node:nodes.get(id)})).filter(visit=>visit.node).reverse().slice(0,12)
   .map(visit=>({index:visit.index,label:`${visit.index+1}. ${visit.node!.chapterLabel.split(' · ')[0]} ${visit.node!.order}컷`,where:short(visit.node!.text.replace(/\s+/g,' ').trim()||'아직 글이 없는 컷',40)})),
  map:!!p.onOpenMap,disabled:p.disabled});
 const focusWriting=()=>requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('[data-current-cut] textarea')?.focus({preventScroll:true}));
 const onAction=({action}:FocusSurfaceAction)=>{
  const event='event' in action?action.event:undefined,context=event?.context??{};
  if(event?.name===CONNECTION_EVENTS.toggle){p.onToggle(context.open===true);return;}
  if(event?.name===CONNECTION_EVENTS.select&&typeof context.lineId==='string'&&context.lineId){if(p.onSelect(context.lineId)!==false)focusWriting();return;}
  if(event?.name===CONNECTION_EVENTS.back&&previous){if(p.onReturnVisit(p.editingPath.length-2))focusWriting();return;}
  if(event?.name===CONNECTION_EVENTS.visit&&typeof context.index==='number'){if(p.onReturnVisit(context.index))focusWriting();return;}
  if(event?.name===CONNECTION_EVENTS.map){p.onOpenMap?.();return;}
  if(event?.name===CONNECTION_EVENTS.repair)p.onRepair(trail.lineId,{...(typeof context.choiceId==='string'&&context.choiceId?{choiceId:context.choiceId}:{}),kind:String(context.kind)});
 };
 return <FocusSurface inline surface={surface} rootId="connections" device={p.device} onAction={onAction}
  attrs={component=>component.id==='connections'?{className:styles.connections,'data-story-connections':p.open?'open':'closed'}
   :component.component==='Fork'?{className:component.id==='fork-here'?`${styles.step} ${styles.here}`:styles.step,'data-connection-step':component.id}
   :component.component==='Notice'?{className:styles.notice,'data-kind':String(component.kind)}:component.component==='ToolGroup'?{className:styles.tools}:component.component==='Column'?{className:styles.group}:undefined}
  skin={{pathChoice:styles.way}}/>;
}
