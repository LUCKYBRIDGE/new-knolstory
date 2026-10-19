"use client";
import {DialogueCapacityHint} from './dialogue-capacity-hint';

import { useEffect, useRef, useState } from "react";
import { ASSET_CATALOG } from "@knolstory/asset-registry";
import { addTypedStoryCut, duplicateStoryCut, moveStoryCut, moveStoryCutToChapter, updateStoryChapter, patchStoryLine, splitStoryCut, mergeStoryCuts } from "@knolstory/runtime-core";
import { chapterLabel, type Chapter, type StoryLine, type StoryProject } from "@knolstory/story-domain";
import { AssetPickerField } from "./asset-picker-field";
import { StoryAudioControls } from "./story-audio-controls";
import {StoryCutNotes} from './story-cut-notes';
import styles from "./chapter-writer.module.css";

type Props = {
  onPreviewFromBranch?:(sourceLineId:string)=>void;
  editingActive?:boolean;
  project: StoryProject;
  chapterId: string;
  lineId: string;
  onSelectCut: (id: string) => void;
  onProjectChange: (next: StoryProject, selectedId?: string) => void;
  onOpenCut: (id: string) => void;
  onDeleteCut: (id: string) => void;
  onComposing?: (value:boolean)=>void;
};
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/** Manuscript editing keeps the legacy chapter-resource model; Ren'Py stays outside this surface. */
export function ChapterWriter({ project, chapterId, lineId, onSelectCut, onProjectChange, onOpenCut, onDeleteCut, onComposing, editingActive=true, onPreviewFromBranch }: Props) {
  const chapter = project.chapters.find(item => item.id === chapterId);
  const cuts = project.lines.filter(item => item.chapterId === chapterId).sort((a, b) => a.order - b.order);
  const index = cuts.findIndex(item => item.id === lineId);
  const selected = cuts[index];
  const rootRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [splitPosition, setSplitPosition] = useState<{id:string;position:number} | null>(null);
  const [notice,setNotice] = useState("");
  const [destination, setDestination] = useState("");
  const [speakerDraft, setSpeakerDraft] = useState("");
  const [error, setError] = useState("");
  const speakerNames = unique([...(chapter?.chapterSpeakerNames ?? []), ...project.speakerNames, ...(project.characters ?? []).map(item => item.name)]);
  const apply = (operation: () => StoryProject, nextId?: string) => {
    try { onProjectChange(operation(), nextId); setError(""); setNotice(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "편집 내용을 확인해 주세요."); }
  };
  const moveSelection = (delta: number) => { const next = cuts[index + delta]; if (next) onSelectCut(next.id); };
  useEffect(()=>{
    const current=rootRef.current?.querySelector<HTMLElement>('[data-writer-current="true"]');
    const panel=rootRef.current?.closest<HTMLElement>('[data-writer-scroll]');
    if(current&&panel) {
      const top=current.getBoundingClientRect().top-panel.getBoundingClientRect().top;
      if(top<56||top+current.clientHeight>panel.clientHeight) panel.scrollTop+=top-56;
    }
  },[chapterId,lineId]);

  // Ported from baseline app/components/CutNavigation.tsx: Alt navigation never handles IME/modal keys.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat ||
          !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          !(event.target instanceof Element) || !rootRef.current?.contains(event.target) ||
          event.target.closest('[role="dialog"], dialog, [role="region"][aria-label="창작노트"]')) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      moveSelection(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!chapter) return null;
  const updateChapter = (patch: Partial<Chapter>) => apply(() => updateStoryChapter(project, chapterId, patch));
  const patchCut = (id: string, patch: Partial<StoryLine>) => apply(()=>patchStoryLine(project,id,patch));
  const add = (type: StoryLine["type"]) => {
    const after = selected ?? project.lines[0];
    if (!after) return;
    const id = crypto.randomUUID();
    apply(() => {
      const added = addTypedStoryCut(project, after.id, id, type);
      if (after.chapterId === chapterId) return added;
      const moved = moveStoryCutToChapter(added, id, chapterId);
      return { ...moved, lines: moved.lines.map(cut => cut.id === id ? { ...cut, inheritActors: true, stageComposition: undefined, leftAssetId: "", rightAssetId: "", backgroundId: "", backgroundMode: undefined } : cut) };
    }, id);
  };
  const addResource = (type: "character" | "background", id: string) => {
    if (!id || id === "__none") return;
    const key = type === "character" ? "characterAssetIds" : "backgroundAssetIds";
    updateChapter({ [key]: unique([...chapter[key], id]) });
  };
  const defaultAsset = (field: "backgroundId" | "leftAssetId" | "rightAssetId", id: string) => {
    const key = field === "backgroundId" ? "backgroundAssetIds" : "characterAssetIds";
    const value = id === "__none" ? "" : id;
    updateChapter({ [field]: value, [key]: unique([...chapter[key], value]) });
  };
  const pool = [...chapter.characterAssetIds, ...chapter.backgroundAssetIds];
  const flowDescription = (line: StoryLine) => line.flow?.type === "choice" ? `선택지 ${line.flow.options.length}개` :
    line.flow?.type === "goto" ? line.flow.targetLineId === null ? "엔딩" : line.flow.targetLineId === "" ? "연결 대기" : "다른 컷 연결" : "순서대로";

  return <section ref={rootRef} className={styles.writer} aria-label="장 전체 글 고치기">
    <header className={styles.heading}><h2>장 전체 글 고치기</h2><p>이 장의 컷 글을 이어 보며 고칩니다. 배치와 선택지는 필요한 컷에서만 열어 주세요.</p></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <details className={styles.settings}>
      <summary>장 설정 · 말하는 인물과 기본 자료</summary>
      <fieldset><legend>장 번호와 갈래</legend>
        <label>장 번호<input aria-label="장 번호" type="number" min={1} step={1} value={chapter.chapterNumber ?? chapter.order} onChange={event => { const value=Number(event.target.value); if(Number.isSafeInteger(value)&&value>0) updateChapter({chapterNumber:value}); }} /></label>
        <label>갈래 표시<input aria-label="장 갈래 표시" maxLength={20} placeholder="A, B · 공통 장은 비워 두세요" value={chapter.branchLabel ?? ""} onChange={event => updateChapter({branchLabel:event.target.value})} /></label>
        <p className={styles.hint}>표시: {chapterLabel(chapter)}. 장 번호와 갈래는 표시 이름이며, 이야기 진행은 컷의 순서와 선택지 연결을 따릅니다. 같은 단계의 다른 갈래는 3장A, 3장B처럼 지정하세요.</p>
      </fieldset>
      <label>장 제목<input aria-label="대본 장 제목" value={chapter.title} maxLength={200} onChange={event => updateChapter({ title: event.target.value })} /></label>
      <label>장 개요<textarea aria-label="장 개요" value={chapter.summary} maxLength={20000} rows={3} onChange={event => updateChapter({ summary: event.target.value })} /></label>
      <fieldset><legend>이 장의 말하는 인물</legend>
        <div className={styles.chips}>{speakerNames.map(name => <button key={name} type="button" aria-pressed={chapter.chapterSpeakerNames.includes(name)} onClick={() => updateChapter({chapterSpeakerNames: chapter.chapterSpeakerNames.includes(name) ? chapter.chapterSpeakerNames.filter(item => item !== name) : [...chapter.chapterSpeakerNames, name]})}>{name}</button>)}</div>
        <label>장 말하는 인물 추가<input aria-label="장 말하는 인물 추가" value={speakerDraft} maxLength={200} onChange={event => setSpeakerDraft(event.target.value)} /></label>
        <button type="button" disabled={!speakerDraft.trim()} onClick={() => { updateChapter({ chapterSpeakerNames: unique([...chapter.chapterSpeakerNames, speakerDraft.trim()]) }); setSpeakerDraft(""); }}>장 말하는 인물 등록</button>
      </fieldset>
      <p className={styles.hint}>장 기본 자료는 이어받는 컷에 적용됩니다. 기본값을 비우면 작품 기본값을 이어받을 수 있으며, 직접 배치하거나 인물 없음을 지정한 컷은 유지됩니다.</p>
      <AssetPickerField label="장 기본 배경" type="background" value={chapter.backgroundId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 배경 이어받기" onChange={id => defaultAsset("backgroundId", id)} />
      <AssetPickerField label="장 기본 왼쪽 인물" type="character" value={chapter.leftAssetId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 왼쪽 인물 이어받기" onChange={id => defaultAsset("leftAssetId", id)} />
      <AssetPickerField label="장 기본 오른쪽 인물" type="character" value={chapter.rightAssetId} chapterAssetIds={pool} allowDefault defaultLabel="작품 기본 오른쪽 인물 이어받기" onChange={id => defaultAsset("rightAssetId", id)} />
      <StoryAudioControls onPreviewFromBranch={onPreviewFromBranch} editingActive={editingActive} key={`${project.id}/${chapter.id}`} workId={project.id} project={project} chapterId={chapter.id} scope="chapter" value={chapter.audio} onChange={audio=>updateChapter({audio})}/>
      <fieldset><legend>이 장에서 고른 자료</legend>
        <AssetPickerField label="장 자료에 인물 추가" type="character" value="" chapterAssetIds={pool} onChange={id => addResource("character", id)} />
        <AssetPickerField label="장 자료에 배경 추가" type="background" value="" chapterAssetIds={pool} onChange={id => addResource("background", id)} />
        <ul className={styles.resources}>{pool.map(id => <li key={id}><span>{ASSET_CATALOG.find(asset => asset.id === id)?.label ?? id}</span><button type="button" aria-label={`${ASSET_CATALOG.find(asset => asset.id === id)?.label ?? id} 장 자료에서 제외`} onClick={() => updateChapter({ characterAssetIds: chapter.characterAssetIds.filter(item => item !== id), backgroundAssetIds: chapter.backgroundAssetIds.filter(item => item !== id) })}>목록에서 제외</button></li>)}</ul>
        <p className={styles.hint}>자료 목록에서 제외해도 컷에 사용한 이미지와 기본 배치는 남습니다.</p>
      </fieldset>
    </details>
    <nav className={styles.navigation} aria-label="대본 컷 이동">
      <button type="button" disabled={index <= 0} aria-keyshortcuts="Alt+ArrowLeft" onClick={() => moveSelection(-1)}>이전 컷</button>
      <strong aria-live="polite">{chapterLabel(chapter)} · {index + 1} / {cuts.length}컷</strong>
      <button type="button" disabled={index < 0 || index >= cuts.length - 1} aria-keyshortcuts="Alt+ArrowRight" onClick={() => moveSelection(1)}>다음 컷</button>
    </nav>
    <div className={styles.actions}>
      <button type="button" disabled={!project.lines.length} onClick={() => add("dialogue")}>대사 컷 추가</button>
      <button type="button" disabled={!project.lines.length} onClick={() => add("narration")}>해설 컷 추가</button>
    </div>
    {selected && <details className={styles.operations}>
      <summary>컷 정리 · 복제/이동/삭제</summary>
      <div className={styles.actions}>
        <button type="button" onClick={() => { const id = crypto.randomUUID(); apply(() => duplicateStoryCut(project, selected.id, id), id); }}>현재 컷 복제</button>
        {index>0&&<button type="button" onClick={() => apply(() => moveStoryCut(project, selected.id, "up"))}>현재 컷 위로</button>}
        {index<cuts.length-1&&<button type="button" onClick={() => apply(() => moveStoryCut(project, selected.id, "down"))}>현재 컷 아래로</button>}
      </div>
      <label>컷 이동할 장<select aria-label="컷 이동할 장" value={destination} onChange={event => setDestination(event.target.value)}><option value="">도착 장 선택</option>{project.chapters.filter(item => item.id !== chapterId).map(item => <option key={item.id} value={item.id}>{chapterLabel(item)}</option>)}</select></label>
      <div className={styles.actions}><button type="button" disabled={!destination || !project.chapters.some(item => item.id === destination && item.id !== chapterId)} onClick={() => apply(() => moveStoryCutToChapter(project, selected.id, destination), selected.id)}>다른 장으로 이동</button>
        {project.lines.length>1&&<button type="button" onClick={() => onDeleteCut(selected.id)}>현재 컷 삭제</button>}</div>
    </details>}
    <ol className={styles.manuscript}>{cuts.map(line => <li key={line.id} data-writer-current={line.id===lineId?'true':undefined} className={line.id === lineId ? styles.current : undefined}>
      <div className={styles.cutHeading}><strong>{line.order}컷 · {line.type === "dialogue" ? "대사" : "해설"}{line.id === lineId ? " · 현재 편집" : ""}</strong><span>{flowDescription(line)}</span></div>
      {line.id === lineId ? <>
        <div className={styles.fields}><label>글 종류<select aria-label={`${line.order}컷 글 종류`} value={line.type} onChange={event => patchCut(line.id, { type: event.target.value as StoryLine["type"], ...(event.target.value === "narration" ? { speaker: "narration" as const } : {}) })}><option value="dialogue">대사</option><option value="narration">해설</option></select></label>
          <label>말하는 인물<select aria-label={`${line.order}컷 말하는 인물`} value={line.speakerName} onChange={event => patchCut(line.id, { speakerName: event.target.value })}><option value="">말하는 인물 없음</option>{unique([line.speakerName, ...speakerNames]).map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
        <label>대사 / 해설<textarea ref={textRef} aria-label={`${line.order}컷 대사 / 해설`} onSelect={event=>setSplitPosition({id:line.id,position:event.currentTarget.selectionStart})} value={line.text} rows={5} maxLength={20000} onCompositionStart={()=>onComposing?.(true)} onCompositionEnd={()=>onComposing?.(false)} onChange={event => patchCut(line.id, { text: event.target.value })} /></label>
        <DialogueCapacityHint text={line.text}/>
        <StoryCutNotes line={line} patch={values=>patchCut(line.id,values)} onComposing={onComposing}/>
        <div className={styles.actions}>
          <button type="button" onClick={() => {
            const position=splitPosition?.id===line.id?splitPosition.position:textRef.current?.selectionStart??0;
            const id=crypto.randomUUID();
            try {onProjectChange(splitStoryCut(project,line.id,id,position),id);setError("");setNotice("글을 나눴어요. 새 컷은 같은 배치와 연출·소리를 이어받으며, 선택지와 엔딩은 뒤 컷에 남아요.");}
            catch(cause){setError(cause instanceof Error?cause.message:"나눌 위치를 확인해 주세요.");}
          }}>커서 위치에서 컷 나누기</button>
          {index<cuts.length-1&&<button type="button" onClick={() => {
            const next=cuts[index+1];if(!next)return;
            try {onProjectChange(mergeStoryCuts(project,line.id,next.id),line.id);setError("");setNotice("두 컷의 모든 글자를 그대로 이어 붙였어요.");}
            catch(cause){setError(cause instanceof Error?cause.message:"두 컷의 설정을 확인해 주세요.");}
          }}>다음 컷과 합치기</button>}
        </div>
        <p className={styles.hint}>글 안을 눌러 나눌 위치를 고르세요. 합치기는 같은 말하는 인물·무대·메모이며 연출·소리와 뒤 컷으로 들어오는 연결이 없는 두 컷에만 적용돼요.</p>
      </> : <button type="button" className={styles.excerpt} aria-label={`${line.order}컷 글 고치기`} onClick={() => onSelectCut(line.id)}><strong>{line.speakerName || (line.type === "narration" ? "해설" : "말하는 인물 없음")}</strong><span>{line.text || "아직 쓴 글이 없어요."}</span></button>}
      {line.id===lineId&&<button type="button" data-writer-cut-id={line.id} onClick={() => onOpenCut(line.id)}>이 컷 편집 화면 열기</button>}
    </li>)}</ol>
  </section>;
}
