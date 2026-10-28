'use client';
import {useState} from 'react';
import type {StoryProject} from '@knolstory/story-domain';
import type {CombinedEditingEntry} from '../lib/combined-editing-tracks';
type Props={project:StoryProject;entry:CombinedEditingEntry;disabled:boolean;onSplit:(splitId:string)=>void};
export function StoryChapterAudioSplit({project,entry,disabled,onSplit}:Props){
 const cuts=project.lines.filter(line=>line.chapterId===entry.sourceChapterId).sort((a,b)=>a.order-b.order),candidates=cuts.slice(1,entry.endCutIndex+1),[split,setSplit]=useState(candidates[0]?.id??'');
 if(!entry.sourceChapterId||entry.sourceLineId||entry.startCutIndex!==0||candidates.length===0||entry.target!=='music'&&entry.target!=='ambience')return null;
 if(project.chapters.find(ch=>ch.id===entry.sourceChapterId)?.audio?.[entry.target]?.action==='sequence')return <p>순서 재생은 음원 목록에서 사용 구간과 순서를 편집해 주세요.</p>;
 return <details data-chapter-audio-split><summary>장의 소리 구간 나누기</summary><fieldset disabled={disabled}><label>뒤 구간 시작 컷<select aria-label="장 소리 구간 나눌 컷" value={split} onChange={event=>setSplit(event.target.value)}>{candidates.map(line=><option key={line.id} value={line.id}>{cuts.findIndex(cut=>cut.id===line.id)+1}컷부터</option>)}</select></label><button type="button" onClick={()=>onSplit(split)}>장 소리를 두 구간으로 나누기</button><small>앞 구간은 장 설정에 남기고, 뒤 구간은 선택한 컷에서 따로 편집해요. 나누기만 하면 같은 소리는 이어 재생해요.</small></fieldset></details>;
}
