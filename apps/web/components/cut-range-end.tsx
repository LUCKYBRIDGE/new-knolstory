'use client';
import {cutLabel,type StoryProject} from '@knolstory/story-domain';
import {orderedLines} from '@knolstory/runtime-core';
import styles from './cut-range-end.module.css';
type Props={project?:StoryProject;lineId?:string;chapterId?:string;value?:string;onChange:(end:string|undefined)=>void;label:string};
export function CutRangeEnd({project,lineId,chapterId,value,onChange,label}:Props){
 if(!project)return null;
 const start=project.lines.find(line=>line.id===lineId);
 const chapter=project.chapters.find(ch=>ch.id===(chapterId??start?.chapterId));
 if(!chapter||!chapterId&&!start)return null;
 return <div className={styles.range}><p>{chapterId?'시작 컷: 이 장에 실제로 들어온 컷 · 장 기본 소리':`시작 컷: ${cutLabel(chapter,start!)} · 현재 편집 컷`}</p><label>{label}<select aria-label={label} value={value??''} onChange={event=>onChange(event.target.value||undefined)}><option value="">종료 컷 지정 안 함 · 계속 유지</option>{orderedLines(project).map(line=><option key={line.id} value={line.id}>{cutLabel(project.chapters.find(ch=>ch.id===line.chapterId)!,line)} · {line.text.slice(0,32)||'빈 글'}</option>)}</select></label><p>종료 컷에서도 재생되고, 다음에 읽는 컷에서 멈춥니다. 분기가 종료 컷을 지나지 않으면 계속 유지됩니다.{chapterId?' 이 장에 다시 들어오면 장 기본 소리를 다시 적용합니다.':''}</p></div>;
}
