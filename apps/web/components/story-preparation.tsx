"use client";
import { useState } from 'react';
import { chapterLabel, type StoryPlanning, type StoryProject } from '@knolstory/story-domain';
import {COVER_THEMES} from '@knolstory/story-domain';
import {resolveStoryCover} from '../lib/book-cover';
import { AssetPickerField } from './asset-picker-field';
import { addPreparationMemo, deletePreparationMemo, memoDestinations, updatePreparationCover, updatePreparationInfo, updatePreparationMemo, updatePreparationPlanning, type PreparationMemo } from '../lib/story-preparation';
import styles from './story-preparation.module.css';

export type StoryPreparationProps = {
  onEditCover?:()=>void;
  project: StoryProject; onProjectChange: (project: StoryProject) => void;
  onOpenCut: (lineId: string) => void; onContinueWriting: () => void; currentLineId?: string;
};
const basicPlanning: [keyof StoryPlanning,string][] = [
  ['premise','핵심 아이디어'],['mainCharacter','주인공'],['mainGoal','주인공의 목표'],['centralProblem','갈등과 문제'],
  ['opening','시작'],['middle','전개'],['ending','마무리'],
];
const otherPlanning: [keyof StoryPlanning,string][] = [
  ['material','이야기 소재'],['theme','전하고 싶은 주제'],['stakes','실패하면 잃는 것'],['endingChange','끝에서 달라지는 것'],
  ['crisis','위기'],['climax','절정'],['characterNotes','인물 메모'],['worldNotes','세계와 장소'],['mood','분위기'],
  ['openQuestions','더 생각할 질문'],['freeNotes','자유 기획 메모'],
];
const memoKinds: [PreparationMemo['kind'],string][]=[['free','자유 메모'],['character','인물'],['relationship','관계'],['place','장소'],['event','사건'],['task','할 일']];

export function StoryPreparation({project,onProjectChange,onOpenCut,onContinueWriting,currentLineId,onEditCover}:StoryPreparationProps) {
  const cover=resolveStoryCover(project);
  const chapters=project.chapters.slice().sort((a,b)=>a.order-b.order);
  const cuts=chapters.flatMap(chapter=>project.lines.filter(l=>l.chapterId===chapter.id).slice().sort((a,b)=>a.order-b.order).map((line,index)=>({id:line.id,label:`${chapterLabel(chapter)} · ${index+1}컷`})));
  const updateCover=(patch:Parameters<typeof updatePreparationCover>[1])=>onProjectChange(updatePreparationCover(project,patch));
  const planningFields=(items:typeof basicPlanning)=>items.map(([key,label])=><label key={key}>{label}<textarea aria-label={label} rows={key==='premise'?3:2} value={project.planning[key]} onChange={e=>onProjectChange(updatePreparationPlanning(project,{[key]:e.target.value}))}/></label>);
  return <section className={styles.preparation} aria-label="작품 준비">
    <header className={styles.header}><div><h2>작품 준비</h2><p>정보와 아이디어를 정리해요. 기획은 비워 두어도 바로 이야기를 쓸 수 있어요.</p></div><button type="button" onClick={onContinueWriting}>이 장 대본 쓰기</button></header>
    <p className={styles.hint}>입력한 내용은 작품에 자동 저장됩니다. 기획과 메모는 읽기 화면의 대사에 포함되지 않아요.</p>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="preparation-info"><h3 id="preparation-info">작품 정보</h3>
        <label>작품 제목<input aria-label="작품 제목" value={project.title} onChange={e=>onProjectChange(updatePreparationInfo(project,{title:e.target.value}))}/></label>
        <label>작품 소개<textarea aria-label="작품 소개" rows={3} value={project.description} onChange={e=>onProjectChange(updatePreparationInfo(project,{description:e.target.value}))}/></label>
        <label>지은이<input aria-label="지은이" value={cover.author} onChange={e=>updateCover({author:e.target.value})}/></label>
        <label>부제<input aria-label="부제" value={cover.subtitle} onChange={e=>updateCover({subtitle:e.target.value})}/></label>
        <label>작가의 말<textarea aria-label="작가의 말" rows={3} value={cover.authorNote} onChange={e=>updateCover({authorNote:e.target.value})}/></label>
        {onEditCover&&<button onClick={onEditCover}>책 표지 편집</button>}<details><summary>기본 표지 고르기</summary><p className={styles.hint}>서재에서 작품을 구분하는 표지입니다. 이야기 속 배경이나 인물은 바뀌지 않아요.</p>
          {cover.design && <p className={styles.hint}>이 작품에는 고급 표지 디자인이 저장되어 있어요. 기본 표지 설정을 바꿔도 기존 디자인은 보존됩니다.</p>}
          <label>표지 색감<select aria-label="표지 색감" value={cover.theme} onChange={e=>updateCover({theme:e.target.value as typeof cover.theme})}>{Object.entries(COVER_THEMES).map(([key,theme])=><option key={key} value={key}>{theme.label}</option>)}</select></label>
          <label>표지 배치<select aria-label="표지 배치" value={cover.layout} onChange={e=>updateCover({layout:e.target.value as typeof cover.layout})}><option value="classic">기본 책</option><option value="picture">장면형</option><option value="bold">인물형</option></select></label>
          <AssetPickerField label="표지 배경" type="background" value={cover.backgroundId} allowNone onChange={id=>updateCover({backgroundId:id})}/>
          <AssetPickerField label="표지 인물" type="character" value={cover.characterId} allowNone onChange={id=>updateCover({characterId:id})}/>
        </details>
      </section>
      <section className={styles.panel} aria-labelledby="preparation-planning"><h3 id="preparation-planning">이야기 기획</h3><p className={styles.hint}>어떤 이야기를 쓰고 싶은가요? 떠오르는 항목부터 적어 보세요.</p>
        {planningFields(basicPlanning)}
        <details><summary>기획 더 적기</summary>
          <label>이야기 구조<select aria-label="이야기 구조" value={project.planning.structureMode} onChange={e=>onProjectChange(updatePreparationPlanning(project,{structureMode:e.target.value as StoryPlanning['structureMode']}))}><option value="free">자유롭게</option><option value="three">시작·전개·마무리</option><option value="four">기·승·전·결</option><option value="five">발단·전개·위기·절정·결말</option></select></label>
          {planningFields(otherPlanning)}
        </details>
      </section>
    </div>
    <section className={styles.panel} aria-labelledby="preparation-memos"><div className={styles.header}><div><h3 id="preparation-memos">창작 메모</h3><p className={styles.hint}>작품 전체의 아이디어를 적거나 장·컷에 연결해 다시 찾아가요.</p></div><div className={styles.actions}>
      <button type="button" onClick={()=>onProjectChange(addPreparationMemo(project,crypto.randomUUID(),new Date().toISOString()))}>작품 메모 추가</button>
      {currentLineId && <button type="button" onClick={()=>onProjectChange(addPreparationMemo(project,crypto.randomUUID(),new Date().toISOString(),currentLineId))}>현재 컷 메모 추가</button>}
    </div></div>
      {project.creativeMemos.length===0 && <p>아직 메모가 없어요. 생각난 아이디어나 다음에 할 일을 적어 두세요.</p>}
      <div className={styles.memoGrid}>{project.creativeMemos.slice().sort((a,b)=>a.order-b.order).map((memo,index)=><MemoEditor key={memo.id} memo={memo} index={index} project={project} cuts={cuts} onOpenCut={onOpenCut}
        onChange={patch=>onProjectChange(updatePreparationMemo(project,memo.id,{...patch,updatedAt:new Date().toISOString()}))} onDelete={()=>onProjectChange(deletePreparationMemo(project,memo.id))}/>)}</div>
    </section>
    <button type="button" onClick={onContinueWriting}>기획을 두고 대본 쓰러 가기</button>
  </section>;
}

function MemoEditor({memo,index,project,cuts,onChange,onDelete,onOpenCut}:{memo:PreparationMemo;index:number;project:StoryProject;cuts:{id:string;label:string}[];onChange:(patch:Partial<PreparationMemo>)=>void;onDelete:()=>void;onOpenCut:(id:string)=>void}) {
  const [deleting,setDeleting]=useState(false);
  const links=memoDestinations(project,memo);
  const primary=memo.linkedLineId?`cut:${memo.linkedLineId}`:memo.linkedChapterId?`chapter:${memo.linkedChapterId}`:memo.linkedLineIds?.[0]?`cut:${memo.linkedLineIds[0]}`:memo.linkedChapterIds?.[0]?`chapter:${memo.linkedChapterIds[0]}`:'';
  function changeLink(value:string) {
    const cut=value.startsWith('cut:')?project.lines.find(l=>l.id===value.slice(4)):undefined;
    onChange({linkedLineId:cut?.id,linkedChapterId:cut?.chapterId??(value.startsWith('chapter:')?value.slice(8):undefined),linkedChapterIds:undefined,linkedLineIds:undefined});
  }
  return <article className={styles.memo} aria-label={`메모 ${index+1}`}>
    <label>메모 제목<input aria-label={`메모 ${index+1} 제목`} value={memo.title} onChange={e=>onChange({title:e.target.value})}/></label>
    <label>메모 종류<select aria-label={`메모 ${index+1} 종류`} value={memo.kind} onChange={e=>onChange({kind:e.target.value as PreparationMemo['kind']})}>{memoKinds.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select></label>
    {memo.fields.slice().sort((a,b)=>a.order-b.order).map(field=><label key={field.id}>{field.label}<textarea aria-label={`메모 ${index+1} ${field.label}`} rows={3} value={field.value} onChange={e=>onChange({fields:memo.fields.map(f=>f.id===field.id?{...f,value:e.target.value}:f)})}/></label>)}
    {memo.fields.length===0 && <button type="button" onClick={()=>onChange({fields:[{id:crypto.randomUUID(),label:'메모 내용',value:'',order:1,source:'custom'}]})}>메모 내용 적기</button>}
    <label>메모 연결 위치<select aria-label={`메모 ${index+1} 연결 위치`} value={primary} onChange={e=>changeLink(e.target.value)}><option value="">작품 전체</option>
      {primary && ![...project.chapters.map(c=>`chapter:${c.id}`),...cuts.map(c=>`cut:${c.id}`)].includes(primary) && <option value={primary}>찾을 수 없는 연결 — 새 위치를 선택해 주세요</option>}
      {project.chapters.slice().sort((a,b)=>a.order-b.order).map(c=><option key={c.id} value={`chapter:${c.id}`}>{chapterLabel(c)}</option>)}
      {cuts.map(c=><option key={c.id} value={`cut:${c.id}`}>{c.label}</option>)}
    </select></label>
    {links.length>1 && <p className={styles.hint}>여러 장·컷의 연결이 보존되어 있어요. 위에서 위치를 새로 고르면 선택한 한 곳으로 연결됩니다.</p>}
    <div className={styles.actions}>{links.map(link=>link.missing?<span key={link.key} className={styles.hint}>{link.label} · 위에서 연결 위치를 고쳐 주세요.</span>:<button type="button" key={link.key} onClick={()=>link.lineId&&onOpenCut(link.lineId)}>{link.label} 열기</button>)}</div>
    {memo.linkedCharacterNames?.length? <p className={styles.hint}>연결된 인물: {memo.linkedCharacterNames.join(', ')}</p>:null}
    {deleting?<div className={styles.confirm}><p>“{memo.title||'제목 없는 메모'}”를 삭제할까요?</p><button type="button" onClick={onDelete}>메모 삭제 확인</button><button type="button" onClick={()=>setDeleting(false)}>취소</button></div>:<button type="button" onClick={()=>setDeleting(true)}>메모 삭제</button>}
  </article>;
}
