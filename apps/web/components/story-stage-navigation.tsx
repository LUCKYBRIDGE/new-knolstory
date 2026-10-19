"use client";
import type {StoryLine} from '@knolstory/story-domain';
import type {PlaybackState} from '@knolstory/runtime-core';
import styles from './story-workspace.module.css';
type Props=Readonly<{mode:'edit'|'play';activeTool:string|null;line:StoryLine;chapterCuts:StoryLine[];chapterCutIndex:number;playback:PlaybackState;onAdd:()=>void;onMove:(direction:'up'|'down')=>void;onSelect:(id:string)=>void;onRepair:()=>void;onRestart:()=>void}>;
/** Navigation requests only; the workspace/Core retain document and playback ownership. */
export function StoryStageNavigation({mode,activeTool,line,chapterCuts,chapterCutIndex,playback,onAdd,onMove,onSelect,onRepair,onRestart}:Props){return <>
          <div className={styles.navigation} hidden={mode==='edit'&&activeTool!=='cuts'}>
            {mode === "edit" ? (
              <>

                <button disabled={line.order <= 1} onClick={() => onMove("up")}>컷 위로 이동</button>
                <button disabled={line.order >= chapterCuts.length} onClick={() => onMove("down")}>컷 아래로 이동</button>
                <button
                  disabled={
                    chapterCutIndex === 0
                  }
                  onClick={() =>
                    onSelect(
                      chapterCuts[chapterCutIndex - 1]!.id,
                    )
                  }
                >
                  이전 컷
                </button>
                <span>
                  {line.order}컷 / 이 장 {chapterCuts.length}컷
                </span>
                <button
                  disabled={
                    chapterCutIndex === chapterCuts.length - 1
                  }
                  onClick={() =>
                    onSelect(
                      chapterCuts[chapterCutIndex + 1]!.id,
                    )
                  }
                >
                  다음 컷
                </button>
              </>
            ) : (
              <>
                <span data-testid="playback-status">
                  {
                    {
                      reading: "읽는 중",
                      choice: "선택해 주세요",
                      ended: "이야기 끝",
                      pending: "연결 대기",
                      "approval-required": "교사 승인 필요",
                    }[playback.status]
                  }
                </span>

              </>
            )}
          </div>
          {mode === 'play' && (playback.status === 'pending' || playback.status === 'approval-required') && <section className={styles.semantic} aria-label="읽기 연결 안내"><p>이 컷에서 진행할 수 있는 길이 없어요. 편집으로 돌아가 도착 컷과 점수 조건을 확인해 주세요.</p><button onClick={onRepair}>이 컷 연결 고치기</button></section>}
          {mode === 'play' && playback.status === 'ended' && <section className={styles.semantic} aria-label="이야기 엔딩"><h2>{line.ending?.name || '이야기 끝'}</h2>{line.ending?.description && <p>{line.ending.description}</p>}<button onClick={onRestart}>다시 읽기</button></section>}

</>;}
