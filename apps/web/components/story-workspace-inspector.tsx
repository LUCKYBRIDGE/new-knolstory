"use client";
import {DialogueCapacityHint} from './dialogue-capacity-hint';
import {useRef} from 'react';
import {StorySceneResources} from './story-scene-resources';
import {SecondsInput} from './seconds-input';
import {StoryStagingImport} from './story-staging-import';
import {StoryCutNotes} from './story-cut-notes';
import {StoryDirectionPanel} from './story-direction-panel';
import { ChoiceScoreEditor, ScoreRouteEditor } from './story-score-controls';
import {
  cutLabel,
  type StoryProject,
  type StoryLine,
  type StageComposition,
  type StageActorEntry,
} from "@knolstory/story-domain";
import {actorLabel as authoringActorLabel} from '../lib/actor-label';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';
import {resetActorPlacement} from "@knolstory/runtime-core";
import styles from "./story-workspace.module.css";
import { AssetPickerField } from "./asset-picker-field";
import { StoryAudioControls } from "./story-audio-controls";
import { StorySpeakerControls } from "./story-speaker-controls";
import { StoryCompositionControls, cleanedComposition } from "./story-composition-controls";
export type StoryInspectorSection =
  | "text"
  | "assets"
  | "presentation"
  | "sound"
  | "flow"
  | "all";
type Props = {
  speakerDetailsEnabled?: boolean;
  onPreviewFromBranch?:(sourceLineId:string)=>void;
  editingActive?:boolean;
  project: StoryProject;
  line: StoryLine;
  stage: StageComposition;
  ordered: StoryLine[];
  patch: (values: Partial<StoryLine>) => void;
  updateActor: (key: string, values: Partial<StageActorEntry>) => void;
  setComposing: (value: boolean) => void;
  onCreateChoiceChapter?: (optionId: string) => void;
  activeSection?: StoryInspectorSection;
  onProjectChange: (next: StoryProject) => void;
  disabled?: boolean;
  composing?: boolean;
  onOpenAssets?: () => void;
  onOpenScores?: () => void;
  choicesEnabled?: boolean;
  scoresEnabled?: boolean;
  branchesEnabled?: boolean;
};
export function StoryWorkspaceInspector({
  speakerDetailsEnabled=true,
  project,
  line,
  stage,
  ordered,
  patch,
  updateActor,
  setComposing,
  onCreateChoiceChapter,
  activeSection = "all",
  onProjectChange,
  disabled=false,
  composing=false,
  onOpenAssets,
  onOpenScores,
  choicesEnabled=true,
  scoresEnabled=true,
  branchesEnabled=true,
  editingActive=true,
  onPreviewFromBranch,
}: Props) {
  const root=useRef<HTMLElement>(null);
  const focusField=(label:string)=>{const field=[...root.current?.querySelectorAll<HTMLElement>('[aria-label]')??[]].find(node=>node.getAttribute('aria-label')===label||node.getAttribute('aria-label')===`${label} 이미지 찾기`);field?.scrollIntoView({block:'nearest'});field?.focus({preventScroll:true});};
  const chapter = project.chapters.find(item=>item.id===line.chapterId);
  const chapterAssets = [...(chapter?.characterAssetIds??[]),...(chapter?.backgroundAssetIds??[])];
  const targetSelect = (
    value: string | null,
    onChange: (target: string | null) => void,
    label: string,
  ) => (
    <select
      aria-label={label}
      disabled={composing}
      value={value === null ? "__ending" : value}
      onChange={(event) =>
        onChange(event.target.value === "__ending" ? null : event.target.value)
      }
    >
      <option value="">연결 대기</option>
      <option value="__ending">이야기 끝</option>
      {ordered.map((item) => (
        <option key={item.id} value={item.id}>
          {cutLabel(project.chapters.find(ch => ch.id === item.chapterId)!, item)} · {item.text.slice(0,24)}
        </option>
      ))}
    </select>
  );

  return (
    <aside ref={root} className={styles.inspector} aria-label="현재 컷 편집">
      <h2>{activeSection === "text" ? "이 컷의 글" : activeSection === "sound" ? "이 컷의 소리" : activeSection === "assets" ? "배경·인물 편집" : activeSection === "flow" ? "선택지·이야기 연결" : activeSection === "presentation" ? "장면 연출" : "현재 컷 편집"}</h2>
      <fieldset disabled={disabled} className={styles.inputBoundary}>
      {(activeSection === "all" || activeSection === "text") && <div
        data-inspector-section="text"
        hidden={activeSection !== "all" && activeSection !== "text"}
      >
        <label>
          글 종류
          <select
            disabled={composing}
            aria-label="글 종류"
            value={line.type}
            onChange={(event) =>
              patch({
                type: event.target.value as StoryLine["type"],
                ...(event.target.value === "narration"
                ? { speaker: "narration" as const }
                  : {}),
              })
            }
          >
            <option value="dialogue">대사</option>
            <option value="narration">해설</option>
          </select>
        </label>
        <label>
          말하는 인물 이름
          <input
            aria-label="말하는 인물 이름"
            value={line.speakerName}
            maxLength={200}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onChange={(event) => patch({ speakerName: event.target.value })}
          />
        </label>
        {speakerDetailsEnabled&&<details className={styles.speakerDetails}><summary>말하는 인물 상세 설정</summary><StorySpeakerControls key={`${project.id}:${line.id}`} project={project} line={line} stage={stage} onProjectChange={onProjectChange} patch={patch} composing={composing} onComposing={setComposing}/><fieldset disabled={composing} className={styles.inputBoundary}><label data-speaker-position>
          말하는 인물의 역할
          <select
            aria-label="말하는 인물의 역할"
            value={line.speaker}
            onChange={(event) =>
              patch({ speaker: event.target.value as StoryLine["speaker"] })
            }
          >
            <option value="narration">배치한 인물과 별개 / 나·해설</option>
            <option value="left">왼쪽 인물</option>
            <option value="right">오른쪽 인물</option>
          </select>
        </label>
        </fieldset></details>}<label data-primary-text>
          대사 / 해설
          <textarea
            id="story-line-text"
            aria-label="대사 / 해설"
            value={line.text}
            maxLength={20000}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onChange={(event) => patch({ text: event.target.value })}
          />
        </label>
        <DialogueCapacityHint text={line.text}/>
        <StoryCutNotes line={line} patch={patch} onComposing={setComposing} disabled={disabled}/>
      </div>}
      {(activeSection === "all" || activeSection === "assets") && <fieldset
        disabled={composing}
        data-inspector-section="assets"
        hidden={activeSection !== "all" && activeSection !== "assets"}
      >
        <legend>배경과 인물</legend>
        <AssetPickerField label="배경" type="background" value={line.backgroundMode==='none'?'__none':line.backgroundId} chapterAssetIds={chapterAssets} allowDefault allowNone defaultLabel="장 기본 배경" onChange={id=>patch(id==='__none'?{backgroundMode:'none',backgroundId:''}:{backgroundMode:undefined,backgroundId:id})}/>
        <details><summary>배경 표시 조정</summary><fieldset><legend>배경의 중요한 부분</legend><label>배경 표시<select aria-label="배경 표시" value={line.presentation?.backgroundFit??'cover'} onChange={event=>patch({presentation:{...line.presentation,backgroundFit:event.target.value as 'cover'|'contain'}})}><option value="cover">화면 채우기 · 일부 잘림</option><option value="contain">전체 이미지 보기 · 여백 허용</option></select></label><p className={styles.hint}>화면을 채우면서 잘릴 때 남길 부분을 정합니다. 가운데가 기본입니다.</p>
          {(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'가로 중심':'세로 중심'}<input type="number" min={0} max={1} step={.05} aria-label={`배경 중심 ${axis==='x'?'가로':'세로'}`} value={line.presentation?.backgroundFocal?.[axis]??.5} onChange={event=>{const value=event.target.valueAsNumber;if(Number.isFinite(value)&&value>=0&&value<=1)patch({presentation:{...line.presentation,backgroundFocal:{x:line.presentation?.backgroundFocal?.x??.5,y:line.presentation?.backgroundFocal?.y??.5,[axis]:value}}});}}/></label>)}
          <button onClick={()=>patch({presentation:{...line.presentation,backgroundFocal:undefined}})}>배경 중심 초기화</button>
        </fieldset></details>
        {(['left','right'] as const).map(side=><AssetPickerField key={side} label={side==='left'?'왼쪽 인물':'오른쪽 인물'} type="character" value={!line.inheritActors&&line.stageComposition&&stage[side==='left'?'leftActors':'rightActors'].length===0?'__none':side==='left'?line.leftAssetId:line.rightAssetId} chapterAssetIds={chapterAssets} allowDefault allowNone defaultLabel="장 기본 인물" onChange={id=>{
          if(id==='__none') patch({stageComposition:cleanedComposition({...stage,[side==='left'?'leftActors':'rightActors']:[]})});
          else patch(side==='left'?{leftAssetId:id}:{rightAssetId:id});
        }}/>) }
        <details data-placement-details><summary>추가 인물·세부 배치</summary>
        <StorySceneResources project={project} line={line} stage={stage} onFocus={focusField}/>
        <StoryStagingImport project={project} line={line} ordered={ordered} onChange={onProjectChange}/>
        <StoryCompositionControls project={project} line={line} stage={stage} ordered={ordered} patch={patch} />
        {[...stage.leftActors, ...stage.rightActors].map((actor) => {const actorLabel=authoringActorLabel(stage,actor.key);const asset=resolveAsset(actor.assetId);return (
          <div className={styles.actor} key={actor.key}>
            <strong>{actorLabel} · {asset?assetDisplayName(asset):'그림 선택'}</strong>
            <button onClick={()=>onProjectChange(resetActorPlacement(project,line.id,actor.key))}>{actorLabel} 배치 기본값으로</button>
            <label>배치<select aria-label={`${actorLabel} 배치`} value={actor.position ?? "auto"} onChange={event => updateActor(actor.key, { position: event.target.value === "center" ? "center" : undefined, xAnchor: undefined })}>
              <option value="auto">현재 쪽 자동 배치</option><option value="center">화면 중앙</option>
            </select></label>
            <label>방향<select aria-label={`${actorLabel} 방향`} value={actor.facing ?? "auto"} onChange={event => updateActor(actor.key, { facing: event.target.value === "auto" ? undefined : event.target.value as StageActorEntry["facing"] })}>
              <option value="auto">작품 자료의 기본 방향</option><option value="original">원본 방향 / 정면 구도 유지</option><option value="left">왼쪽 바라보기</option><option value="right">오른쪽 바라보기</option>
            </select></label>
            <button onClick={() => patch({ stageComposition: cleanedComposition({ ...stage, leftActors: stage.leftActors.filter(item => item.key !== actor.key), rightActors: stage.rightActors.filter(item => item.key !== actor.key) }) })}>{actorLabel} 제거</button>
            <AssetPickerField label={`${actorLabel} 이미지`} type="character" value={actor.assetId} chapterAssetIds={chapterAssets} onChange={id=>updateActor(actor.key,{assetId:id})}/>
            <label>인물 동작<select aria-label={`${actorLabel} 인물 동작`} value={actor.motion?.type??''} onChange={event=>updateActor(actor.key,{motion:event.target.value?{type:event.target.value as NonNullable<StageActorEntry['motion']>['type'],durationMs:600,delayMs:0}:undefined})}>
              <option value="">바로 표시</option><option value="fade-in">서서히 등장</option><option value="fade-out">서서히 퇴장</option><option value="move">지정 위치에서 이동</option>
            </select></label>
            {actor.motion&&<><p className={styles.hint}>이 인물만 움직입니다. 컷 진입 시 시작하고, 설정 변경은 동작을 다시 시작하지 않습니다. 퇴장은 마지막에 인물을 숨깁니다.</p>
              <SecondsInput label={`${actorLabel} 동작 시간`} valueMs={actor.motion.durationMs??600} onChange={durationMs=>updateActor(actor.key,{motion:{...actor.motion!,durationMs}})}/>
              <SecondsInput label={`${actorLabel} 동작 대기`} valueMs={actor.motion.delayMs??0} onChange={delayMs=>updateActor(actor.key,{motion:{...actor.motion!,delayMs}})}/>
              {actor.motion.type==='move'&&<label>출발 가로 위치 (%)<input aria-label={`${actorLabel} 출발 위치`} type="number" min={5} max={95} value={actor.motion.fromXAnchor??50} onChange={event=>updateActor(actor.key,{motion:{...actor.motion!,fromXAnchor:event.target.valueAsNumber}})}/></label>}
            </>}
            <div className={styles.actorFields}>
              <label>
                가로 위치 (%)
                <input
                  type="number"
                  aria-label={`${actorLabel} 가로 위치`}
                  min={5}
                  max={95}
                  value={actor.xAnchor ?? ""}
                  placeholder="자동"
                  onChange={(event) => {
                    if (event.target.value === "") { updateActor(actor.key, { xAnchor: undefined }); return; }
                    const value = event.target.valueAsNumber;
                    if (Number.isFinite(value))
                      updateActor(actor.key, { xAnchor: value });
                  }}
                />
              </label>
              <label>
                크기 배율
                <input
                  type="number"
                  aria-label={`${actorLabel} 크기 배율`}
                  min={0.5}
                  max={1.4}
                  step={0.05}
                  value={actor.scaleMultiplier ?? 1}
                  onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    if (Number.isFinite(value))
                      updateActor(actor.key, { scaleMultiplier: value });
                  }}
                />
              </label>
            </div>
          </div>
        );})}
        </details>
      </fieldset>}
      {(activeSection === "all" || activeSection === "sound") && <fieldset disabled={composing} data-inspector-section="sound" hidden={activeSection !== "all" && activeSection !== "sound"}><StoryAudioControls onPreviewFromBranch={onPreviewFromBranch} editingActive={editingActive} key={`${project.id}/${line.id}`} onProjectChange={onProjectChange} project={project} lineId={line.id} workId={project.id} scope="cut" value={line.audio} onChange={audio=>patch({audio})}/></fieldset>}
      {(activeSection === "all" || activeSection === "presentation") && <fieldset
        disabled={composing}
        data-inspector-section="presentation"
        hidden={activeSection !== "all" && activeSection !== "presentation"}
      >
        <StoryDirectionPanel onPreviewFromBranch={onPreviewFromBranch} key={`${project.id}/${line.id}`} project={project} line={line} stage={stage} onChange={presentation=>patch({presentation})} onProjectChange={onProjectChange} onMotion={onOpenAssets}/>
      </fieldset>}
      {(choicesEnabled || branchesEnabled) && (activeSection === "all" || activeSection === "flow") && <fieldset
        data-inspector-section="flow"
        hidden={activeSection !== "all" && activeSection !== "flow"}
      >
        <legend>다음 이야기 연결</legend>
        <label>
          진행 방식
          <select
            disabled={composing}
            aria-label="진행 방식"
            value={
              line.flow?.type === "goto" && line.flow.targetLineId === null
                ? "ending"
                : line.flow?.type ?? "linear"
            }
            onChange={(event) =>
              patch({
                ending: undefined,
                flow:
                  event.target.value === "linear"
                    ? undefined
                    : event.target.value === "goto"
                      ? { type: "goto", targetLineId: "" }
                      : event.target.value === "ending"
                        ? { type: "goto", targetLineId: null }
                      : {
                          type: "choice",
                          options: [
                            {
                              id: `${line.id}-choice-1`,
                              label: "선택 1",
                              targetLineId: "",
                            },
                            {
                              id: `${line.id}-choice-2`,
                              label: "선택 2",
                              targetLineId: "",
                            },
                          ],
                        },
              })
            }
          >
            <option value="linear">순서대로 다음 컷</option>
            {(branchesEnabled || line.flow?.type === "goto") && <option value="goto" disabled={!branchesEnabled}>도착 컷 지정</option>}
            {(choicesEnabled || line.flow?.type === "choice") && <option value="choice" disabled={!choicesEnabled}>선택지</option>}
            <option value="ending">이야기 끝</option>
          </select>
        </label>
        {branchesEnabled && line.flow?.type === "goto" &&
          targetSelect(
            line.flow.targetLineId,
            (targetLineId) => patch({ flow: { ...line.flow!, type: "goto", targetLineId } }),
            "도착 컷",
          )}
        {scoresEnabled&&onOpenScores&&(line.flow?.type==='choice'||line.flow?.type==='goto'||!!project.scores?.length)&&<div className={styles.inlineSettingAction}><p className={styles.hint}>점수 이름과 시작 값은 작품 설정에서 한 번만 관리합니다.</p><button type="button" disabled={disabled||composing} onClick={onOpenScores}>이야기 점수 설정 열기</button></div>}
        {scoresEnabled && branchesEnabled && line.flow?.type === "goto" && <fieldset disabled={composing} className={styles.inputBoundary}><ScoreRouteEditor project={project} routes={line.flow.routes} onChange={routes=>{if(line.flow?.type==='goto')patch({flow:{...line.flow,routes}});}}/></fieldset>}
        {line.flow?.type === "choice" && !choicesEnabled && <p className={styles.hint}>이 컷의 선택지 {line.flow.options.length}개는 유지됩니다. 수정하려면 편집 설정에서 선택지를 켜 주세요.</p>}
        {choicesEnabled && line.flow?.type === "choice" &&
          line.flow.options.map((option, index) => (
            <div key={option.id} className={styles.choiceCard}>
              <label>
                선택지 {index + 1}
                <input
                  aria-label={`선택지 ${index + 1} 문구`}
                  value={option.label}
                  maxLength={2000}
                  onCompositionStart={() => setComposing(true)}
                  onCompositionEnd={() => setComposing(false)}
                  onChange={(event) => {
                    if (line.flow?.type === "choice")
                      patch({
                        flow: {
                          ...line.flow,
                          options: line.flow.options.map((item) =>
                            item.id === option.id
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        },
                      });
                  }}
                />
              </label>
              {targetSelect(
                option.targetLineId,
                (targetLineId) => {
                  if (line.flow?.type === "choice")
                    patch({
                      flow: {
                        ...line.flow,
                        options: line.flow.options.map((item) =>
                          item.id === option.id
                            ? { ...item, targetLineId }
                            : item,
                        ),
                      },
                    });
                },
                `선택지 ${index + 1} 도착 컷`,
              )}
              <p className={styles.hint}>도착: {option.targetLineId === null ? "이야기 끝" : option.targetLineId === "" ? "연결 대기" : ordered.find(cut=>cut.id===option.targetLineId)?.text || "빈 컷"}</p>{scoresEnabled&&((project.scores?.length??0)>0||(option.effects?.length??0)>0||option.condition)&&<details><summary>선택 결과·표시 조건{option.effects?.length ? ` · 점수 변화 ${option.effects.length}개` : ""}</summary><fieldset disabled={composing} className={styles.inputBoundary}><ChoiceScoreEditor conditionsEnabled={branchesEnabled} scores={project.scores??[]} label={`선택지 ${index+1}`} effects={option.effects} condition={option.condition} onChange={change=>{if(line.flow?.type==='choice')patch({flow:{...line.flow,options:line.flow.options.map(o=>o.id===option.id?{...o,...change}:o)}});}}/></fieldset></details>}
              {branchesEnabled && onCreateChoiceChapter && option.targetLineId === "" && (
                <button
                  type="button"
                  disabled={composing}
                  onClick={() => onCreateChoiceChapter(option.id)}
                >
                  선택지 {index + 1}에 새 장 연결
                </button>
              )}
              {line.flow?.type==="choice"&&line.flow.options.length>2&&<button
                type="button"
                disabled={composing}
                onClick={() => {
                  if (line.flow?.type === "choice" && line.flow.options.length > 2)
                    patch({
                      flow: {
                        ...line.flow,
                        options: line.flow.options.filter((item) => item.id !== option.id),
                      },
                    });
                }}
              >
                선택지 {index + 1} 삭제
              </button>}
            </div>
          ))}
        {choicesEnabled && line.flow?.type === "choice" && line.flow.options.length<4 && (
          <button
            type="button"
            disabled={composing||line.flow.options.length >= 4}
            onClick={() => {
              if (line.flow?.type === "choice" && line.flow.options.length < 4)
                patch({
                  flow: {
                    ...line.flow,
                    options: [
                      ...line.flow.options,
                      {
                        id: crypto.randomUUID(),
                        label: `선택 ${line.flow.options.length + 1}`,
                        targetLineId: "",
                      },
                    ],
                  },
                });
            }}
          >
            선택지 추가
          </button>
        )}
        {choicesEnabled&&line.flow?.type==='choice'&&<p className={styles.hint}>선택지는 2~4개로 구성할 수 있어요.</p>}
        <p className={styles.hint}>
          ‘연결 대기’는 미완성 연결이며, ‘이야기 끝’과 다릅니다.
          연결을 바꾸거나 선택지를 삭제해도 기존 장과 컷 내용은 남아 있습니다.
        </p>
      </fieldset>}
      </fieldset>
    </aside>
  );
}
