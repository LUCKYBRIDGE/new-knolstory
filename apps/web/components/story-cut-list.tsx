"use client";
import { chapterLabel, type Chapter, type StoryLine, type StoryProject } from "@knolstory/story-domain";
import type { StoryFlowGraph } from "@knolstory/runtime-core";
import styles from "./story-workspace.module.css";
type Props = { project: StoryProject; chapter: Chapter; line: StoryLine; ordered: StoryLine[]; graph: StoryFlowGraph; mode: "edit"|"play"; hidden:boolean; onRenameProject(title:string):void; onRenameChapter(title:string):void; onAddChapter():void; onSelectCut(id:string):void };
export function StoryCutList({project,chapter,line,ordered,graph,mode,hidden,onRenameProject,onRenameChapter,onAddChapter,onSelectCut}:Props) {
  const nodes=new Map(graph.nodes.map(node=>[node.lineId,node]));
  return <aside className={styles.cuts} aria-label="장과 컷 목록" hidden={hidden}>
    <h2>이야기 구성</h2>
    {mode==='edit'&&<div className={styles.structure}>
      <label>작품 제목<input aria-label="작품 제목" maxLength={200} value={project.title} onChange={event=>onRenameProject(event.target.value)}/></label>
      <label>장 제목<input aria-label="장 제목" maxLength={200} value={chapter.title} onChange={event=>onRenameChapter(event.target.value)}/></label>
      <button onClick={onAddChapter}>새 장 추가</button>
      <p className={styles.hint}>새 컷을 쓴 뒤 선택지의 도착 컷을 연결하세요. 갈래의 마지막 컷은 ‘이야기 끝’으로 지정해요.</p>
    </div>}
    {[...project.chapters].sort((a,b)=>a.order-b.order).map(item=><details key={item.id} open={item.id===chapter.id}>
      <summary>{chapterLabel(item)} · {ordered.filter(cut=>cut.chapterId===item.id).length}컷</summary>
      {ordered.filter(cut=>cut.chapterId===item.id).map(cut=><button data-line-id={cut.id} key={cut.id} className={`${styles.cut} ${cut.id===line.id?styles.active:''}`} aria-current={cut.id===line.id?'true':undefined} onClick={()=>onSelectCut(cut.id)}>
        {cut.order}컷 · {cut.speakerName||'해설'} · {cut.text.slice(0,48)}{cut.flow?.type==='choice'?' ↗ 선택':''}{nodes.get(cut.id)?.shared?' · 합류':''}{nodes.get(cut.id)?.reachable===false?' · 도달 불가':''}
      </button>)}
    </details>)}
  </aside>;
}
