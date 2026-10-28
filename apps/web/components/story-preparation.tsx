"use client";
import { useEffect, useRef, useState } from 'react';
import { chapterLabel, type StoryPlanning, type StoryProject } from '@knolstory/story-domain';
import {COVER_THEMES} from '@knolstory/story-domain';
import {resolveStoryCover} from '../lib/book-cover';
import { AssetPickerField } from './asset-picker-field';
import { addMemoField, renameMemoField, moveMemoField, deleteMemoField, restoreMemoField, filterPreparationMemos, type MemoField, type MemoFilter, addPreparationMemo, deletePreparationMemo, memoDestinations, updatePreparationCover, updatePreparationInfo, updatePreparationMemo, updatePreparationPlanning, type PreparationMemo } from '../lib/story-preparation';
import { ProjectScoreEditor } from './story-score-controls';
import type {WorkSection} from '../lib/memo-navigation';
import styles from './story-preparation.module.css';

export type StoryPreparationProps = {
  scoresEnabled?:boolean;
  onComposing?:(value:boolean)=>void;onSectionChange?:(section:WorkSection)=>void;initialSection?:WorkSection;focusMemoId?:string;onReturnToCut?:()=>void;
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

export function StoryPreparation({scoresEnabled=true,project,onProjectChange,onOpenCut,onContinueWriting,currentLineId,onEditCover,focusMemoId,onReturnToCut,initialSection,onSectionChange,onComposing}:StoryPreparationProps) {
  const root=useRef<HTMLElement>(null);
  const [localSection,setSection]=useState<WorkSection>(initialSection??(focusMemoId!==undefined?'memos':'info'));
  const requestedSection=onSectionChange&&initialSection!==undefined?initialSection:localSection;
  const section=requestedSection==='scores'&&!scoresEnabled?'info':requestedSection;
  const sectionNames:Record<WorkSection,string>={info:'작품 정보·표지',planning:'이야기 기획',memos:'창작 메모',scores:'이야기 점수'};
  const [composing,setComposing]=useState(false);
  useEffect(()=>{if(section!=='memos'){const panel=root.current?.querySelector<HTMLElement>(`[data-work-section="${section}"]`);panel?.querySelector<HTMLElement>('input,textarea,button')?.focus({preventScroll:true});return;}if(focusMemoId===undefined)return;if(focusMemoId===''){const section=root.current?.querySelector<HTMLElement>('[data-creative-memos]');section?.scrollIntoView({block:'start'});section?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});return;}const memo=[...root.current?.querySelectorAll<HTMLElement>('[data-memo-id]')??[]].find(node=>node.dataset.memoId===focusMemoId);memo?.scrollIntoView({block:'center'});memo?.querySelector<HTMLElement>('input')?.focus({preventScroll:true});},[focusMemoId,section]);
  const [memoQuery,setMemoQuery]=useState('');
  const [memoKind,setMemoKind]=useState<NonNullable<MemoFilter['kind']>>('');
  const [memoScope,setMemoScope]=useState<NonNullable<MemoFilter['scope']>>('all');
  const visibleMemos=filterPreparationMemos(project.creativeMemos,{query:memoQuery,kind:memoKind,scope:memoScope,lineId:currentLineId,chapterId:project.lines.find(l=>l.id===currentLineId)?.chapterId});
  const addMemo=(lineId?:string)=>{
    setMemoQuery('');setMemoKind('');setMemoScope('all');
    onProjectChange(addPreparationMemo(project,crypto.randomUUID(),new Date().toISOString(),lineId));
  };
  const cover=resolveStoryCover(project);
  const chapters=project.chapters.slice().sort((a,b)=>a.order-b.order);
  const cuts=chapters.flatMap(chapter=>project.lines.filter(l=>l.chapterId===chapter.id).slice().sort((a,b)=>a.order-b.order).map((line,index)=>({id:line.id,label:`${chapterLabel(chapter)} · ${index+1}컷`})));
  const updateCover=(patch:Parameters<typeof updatePreparationCover>[1])=>onProjectChange(updatePreparationCover(project,patch));
  const planningFields=(items:typeof basicPlanning)=>items.map(([key,label])=><label key={key}>{label}<textarea aria-label={label} rows={key==='premise'?3:2} value={project.planning[key]} onChange={e=>onProjectChange(updatePreparationPlanning(project,{[key]:e.target.value}))}/></label>);
  return <section ref={root} className={styles.preparation} aria-label="작품 설정" onCompositionStartCapture={()=>{setComposing(true);onComposing?.(true);}} onCompositionEndCapture={()=>{setComposing(false);onComposing?.(false);}}>
    <header className={styles.header}><h2>{sectionNames[section]}</h2><label>설정 항목<select aria-label="작품 설정 항목" value={section} disabled={composing} onChange={event=>{const next=event.target.value as WorkSection;setSection(next);onSectionChange?.(next);}}>{Object.entries(sectionNames).filter(([key])=>key!=='scores'||scoresEnabled).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button type="button" disabled={composing} className={styles.returnToCut} onClick={onReturnToCut??onContinueWriting}>{onReturnToCut?(section==='memos'?'메모를 두고 현재 컷 편집으로 돌아가기':'현재 컷으로 돌아가기'):'현재 컷 쓰기'}</button></header>
    <p className={styles.hint}>입력 내용은 브라우저에 임시 보관돼요. 작품 파일로 저장해 주세요. 기획과 메모는 읽기 화면의 대사에 포함되지 않아요.</p>
    <div className={styles.columns} hidden={section!=='info'&&section!=='planning'}>
      <section className={styles.panel} data-work-section="info" hidden={section!=='info'} aria-labelledby="preparation-info"><h3 id="preparation-info">작품 정보</h3>
        <label>작품 제목<input aria-label="작품 제목" value={project.title} onChange={e=>onProjectChange(updatePreparationInfo(project,{title:e.target.value}))}/></label>
        <label>작품 소개<textarea aria-label="작품 소개" rows={3} value={project.description} onChange={e=>onProjectChange(updatePreparationInfo(project,{description:e.target.value}))}/></label>
        <label>지은이<input aria-label="지은이" value={cover.author} onChange={e=>updateCover({author:e.target.value})}/></label>
        <label>부제<input aria-label="부제" value={cover.subtitle} onChange={e=>updateCover({subtitle:e.target.value})}/></label>
        <label>작가의 말<textarea aria-label="작가의 말" rows={3} value={cover.authorNote} onChange={e=>updateCover({authorNote:e.target.value})}/></label>
        {onEditCover&&<button disabled={composing} onClick={onEditCover}>책 표지 편집</button>}<details><summary>기본 표지 고르기</summary><p className={styles.hint}>서재에서 작품을 구분하는 표지입니다. 이야기 속 배경이나 인물은 바뀌지 않아요.</p>
          {cover.design && <p className={styles.hint}>이 작품에는 고급 표지 디자인이 저장되어 있어요. 기본 표지 설정을 바꿔도 기존 디자인은 보존됩니다.</p>}
          <label>표지 색감<select aria-label="표지 색감" value={cover.theme} onChange={e=>updateCover({theme:e.target.value as typeof cover.theme})}>{Object.entries(COVER_THEMES).map(([key,theme])=><option key={key} value={key}>{theme.label}</option>)}</select></label>
          <label>표지 배치<select aria-label="표지 배치" value={cover.layout} onChange={e=>updateCover({layout:e.target.value as typeof cover.layout})}><option value="classic">기본 책</option><option value="picture">장면형</option><option value="bold">인물형</option></select></label>
          <AssetPickerField label="표지 배경" type="background" value={cover.backgroundId} allowNone onChange={id=>updateCover({backgroundId:id})}/>
          <AssetPickerField label="표지 인물" type="character" value={cover.characterId} allowNone onChange={id=>updateCover({characterId:id})}/>
        </details>
      </section>
      <section className={styles.panel} data-work-section="planning" hidden={section!=='planning'} aria-labelledby="preparation-planning"><h3 id="preparation-planning">이야기 기획</h3><p className={styles.hint}>어떤 이야기를 쓰고 싶은가요? 떠오르는 항목부터 적어 보세요.</p>
        {planningFields(basicPlanning)}
        <details><summary>기획 더 적기</summary>
          <label>이야기 구조<select aria-label="이야기 구조" value={project.planning.structureMode} onChange={e=>onProjectChange(updatePreparationPlanning(project,{structureMode:e.target.value as StoryPlanning['structureMode']}))}><option value="free">자유롭게</option><option value="three">시작·전개·마무리</option><option value="four">기·승·전·결</option><option value="five">발단·전개·위기·절정·결말</option></select></label>
          {planningFields(otherPlanning)}
        </details>
      </section>
    </div>
    {scoresEnabled&&<div data-work-section="scores" hidden={section!=='scores'}><ProjectScoreEditor project={project} onProjectChange={onProjectChange}/></div>}
    <section data-creative-memos data-work-section="memos" hidden={section!=='memos'} className={styles.panel} aria-labelledby="preparation-memos"><div className={styles.header}><div><h3 id="preparation-memos">창작 메모</h3><p className={styles.hint}>작품 전체의 아이디어를 적거나 장·컷에 연결해 다시 찾아가요.</p></div><div className={styles.actions}>
      <button type="button" onClick={()=>addMemo()}>작품 메모 추가</button>
      {currentLineId && <button type="button" onClick={()=>addMemo(currentLineId)}>현재 컷 메모 추가</button>}
    </div></div>
      {project.creativeMemos.length===0 && <p>아직 메모가 없어요. 생각난 아이디어나 다음에 할 일을 적어 두세요.</p>}
      {project.creativeMemos.length>0 && <><div className={styles.actions}>
        <label>메모 검색<input type="search" aria-label="메모 검색" placeholder="제목·항목·내용·인물" value={memoQuery} onChange={e=>setMemoQuery(e.target.value)}/></label>
        <label>메모 종류 필터<select aria-label="메모 종류 필터" value={memoKind} onChange={e=>setMemoKind(e.target.value as typeof memoKind)}><option value="">모든 종류</option>{memoKinds.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select></label>
        <label>메모 연결 필터<select aria-label="메모 연결 필터" value={memoScope} onChange={e=>setMemoScope(e.target.value as typeof memoScope)}><option value="all">모든 위치</option><option value="work">작품 전체</option>{currentLineId&&<option value="current">현재 장·컷</option>}</select></label>
        {(memoQuery||memoKind||memoScope!=='all')&&<button type="button" onClick={()=>{setMemoQuery('');setMemoKind('');setMemoScope('all');}}>메모 검색 초기화</button>}
      </div><p role="status" className={styles.hint}>메모 {visibleMemos.length} / {project.creativeMemos.length}개</p></>}
      {project.creativeMemos.length>0&&visibleMemos.length===0&&<p>조건에 맞는 메모가 없어요. 검색어나 필터를 바꿔 주세요.</p>}
      <div className={styles.memoGrid}>{visibleMemos.map(memo=><MemoEditor key={memo.id} memo={memo} index={project.creativeMemos.slice().sort((a,b)=>a.order-b.order).findIndex(m=>m.id===memo.id)} project={project} cuts={cuts} onOpenCut={onOpenCut}
        onChange={patch=>onProjectChange(updatePreparationMemo(project,memo.id,{...patch,updatedAt:new Date().toISOString()}))} onDelete={()=>onProjectChange(deletePreparationMemo(project,memo.id))}/>)}</div>
    </section>
  </section>;
}

function MemoEditor({memo,index,project,cuts,onChange,onDelete,onOpenCut}:{memo:PreparationMemo;index:number;project:StoryProject;cuts:{id:string;label:string}[];onChange:(patch:Partial<PreparationMemo>)=>void;onDelete:()=>void;onOpenCut:(id:string)=>void}) {
  const [deleting,setDeleting]=useState(false);
  const [newLabel,setNewLabel]=useState('');
  const [removedField,setRemovedField]=useState<{field:MemoField;index:number}|null>(null);
  const fields=memo.fields.slice().sort((a,b)=>a.order-b.order);
  const changeFields=(next:PreparationMemo)=>onChange({fields:next.fields});
  const links=memoDestinations(project,memo);
  const primary=memo.linkedLineId?`cut:${memo.linkedLineId}`:memo.linkedChapterId?`chapter:${memo.linkedChapterId}`:memo.linkedLineIds?.[0]?`cut:${memo.linkedLineIds[0]}`:memo.linkedChapterIds?.[0]?`chapter:${memo.linkedChapterIds[0]}`:'';
  function changeLink(value:string) {
    const cut=value.startsWith('cut:')?project.lines.find(l=>l.id===value.slice(4)):undefined;
    onChange({linkedLineId:cut?.id,linkedChapterId:cut?.chapterId??(value.startsWith('chapter:')?value.slice(8):undefined),linkedChapterIds:undefined,linkedLineIds:undefined});
  }
  return <article data-memo-id={memo.id} className={styles.memo} aria-label={`메모 ${index+1}`}>
    <label>메모 제목<input aria-label={`메모 ${index+1} 제목`} value={memo.title} onChange={e=>onChange({title:e.target.value})}/></label>
    <label>메모 종류<select aria-label={`메모 ${index+1} 종류`} value={memo.kind} onChange={e=>onChange({kind:e.target.value as PreparationMemo['kind']})}>{memoKinds.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select></label>
    {fields.map((field,fieldIndex)=><MemoFieldEditor key={field.id} field={field} memoIndex={index} fieldIndex={fieldIndex} count={fields.length}
      onValue={value=>onChange({fields:memo.fields.map(f=>f.id===field.id?{...f,value}:f)})}
      onRename={label=>changeFields(renameMemoField(memo,field.id,label))}
      onMove={direction=>changeFields(moveMemoField(memo,field.id,direction))}
      onDelete={()=>{setRemovedField({field,index:fieldIndex});changeFields(deleteMemoField(memo,field.id));}}/>)}
    {removedField&&<div className={styles.confirm}><span>“{removedField.field.label}” 항목을 삭제했어요.</span><button type="button" onClick={()=>{changeFields(restoreMemoField(memo,removedField.field,removedField.index));setRemovedField(null);}}>항목 삭제 되돌리기</button></div>}
    <form className={styles.actions} onSubmit={e=>{e.preventDefault();if(!newLabel.trim())return;changeFields(addMemoField(memo,crypto.randomUUID(),newLabel));setNewLabel('');}}>
      <label>새 항목 이름<input aria-label={`메모 ${index+1} 새 항목 이름`} value={newLabel} onChange={e=>setNewLabel(e.target.value)}/></label>
      <button type="submit" disabled={!newLabel.trim()}>메모 항목 추가</button>
      {fields.length===0&&<button type="button" onClick={()=>changeFields(addMemoField(memo,crypto.randomUUID(),'메모 내용'))}>메모 내용 적기</button>}
    </form>
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


function MemoFieldEditor({field,memoIndex,fieldIndex,count,onValue,onRename,onMove,onDelete}:{field:MemoField;memoIndex:number;fieldIndex:number;count:number;onValue:(value:string)=>void;onRename:(label:string)=>void;onMove:(direction:-1|1)=>void;onDelete:()=>void}) {
  const [label,setLabel]=useState(field.label);
  const [confirmDelete,setConfirmDelete]=useState(false);
  return <div>
    <label>{field.label}<textarea aria-label={`메모 ${memoIndex+1} ${field.label}`} rows={3} value={field.value} onChange={e=>onValue(e.target.value)}/></label>
    <details><summary>{field.label} 항목 관리</summary>
      <form className={styles.actions} onSubmit={e=>{e.preventDefault();if(label.trim())onRename(label);}}>
        <label>항목 이름<input aria-label={`메모 ${memoIndex+1} 항목 ${fieldIndex+1} 이름`} value={label} onChange={e=>setLabel(e.target.value)}/></label>
        <button type="submit" disabled={!label.trim()||label===field.label}>항목 이름 적용</button>
      </form>
      <div className={styles.actions}>
        <button type="button" disabled={fieldIndex===0} onClick={()=>onMove(-1)}>항목 위로</button>
        <button type="button" disabled={fieldIndex===count-1} onClick={()=>onMove(1)}>항목 아래로</button>
        <button type="button" onClick={()=>setConfirmDelete(true)}>항목 삭제</button>
      </div>
      {confirmDelete&&<div className={styles.confirm}><p>“{field.label}” 항목과 내용을 삭제할까요? 바로 되돌릴 수 있어요.</p><button type="button" onClick={onDelete}>항목 삭제 확인</button><button type="button" onClick={()=>setConfirmDelete(false)}>항목 삭제 취소</button></div>}
    </details>
  </div>;
}
