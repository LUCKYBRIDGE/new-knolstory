# Compatibility Matrix

기준: `story-maker@18da4fc`. 필수 지원 행은 M2(도메인과 호환) 이후 자동 테스트 1개 이상과 연결돼야 한다. 선택적 import 어댑터·자동 이전은 실제 구현할 때 해당 테스트를 추가한다.

| Area | Next requirement | 담당 | 근거 |
|---|---|---|---|
| .knolstory | Open without semantic loss; write current schema | `compatibility` | ADR 0001 |
| .nolstory v1 | Read (import only) | `compatibility` | legacy `docs/decisions/nolstory-file-v1.md` |
| StoryDocument | Schemas v1–v5 migrate to current (`CURRENT_SCHEMA_VERSION = 5` at baseline) | `story-domain` | legacy `app/story-project-document.ts` |
| Asset ID | Existing references resolve; asset revisions honored | `asset-registry` | |
| StageComposition | Placement meaning preserved (max 2 per side, 4 total, focus/listener, depth) | `runtime-core` | legacy ADR stage-composition-v1 |
| Next original artwork direction | Optional StageActorEntry `facing: "original"` disables mirror; existing omitted/left/right semantics stay unchanged | `story-domain`, `runtime-core` | Additive v5 value in current Next reader; older readers may reject this new value. composition-intent tests |
| Stage Layout | Alpha-silhouette layout meaning preserved; numeric parity within tolerance | `runtime-core` | Blueprint v1.4 M4 |
| Flow | Choice (2–4)/goto/merge/ending; `null` ending ≠ `""` pending link; teacher-approval condition | `story-domain`, `runtime-core` | legacy ADR story-flow-v1 |
| Reader path | Existing branch continuity, resume position, cover/end state | `runtime-core`, `apps/web` | |
| Dialogue/narration | Text/speaker meaning preserved; speaker name ≠ character image | `story-domain` | |
| Presentation | v1 effect → v2 presentation semantic mapping; per-cut explicit look | `runtime-core` | legacy 연출 시스템 개발안 v2 |
| Cover | Existing cover data readable | `story-domain` | |
| ShortStory | `.shortstory` + manifest readable; Web render + A4 print | `compatibility`, `apps/web` | ADR 0009 |
| Excel (Next 놀스토리·숏스토리 형식) | Versioned format; supported fields round-trip without silent loss | `compatibility` | ADR 0009 (REFINE, 구형 탭 구조 고정 없음) |
| Public Google Sheet (Next 형식) | One-time read using the shared versioned table schema | `compatibility` | ADR 0009 |
| Legacy Excel / Google Sheet | Import adapter scope assessed in M2/M8; no legacy export requirement | `compatibility` | ADR 0009 |
| Legacy local storage (IDB `nolstory-workspace-v1`, `storygame*` keys, reading progress, display settings, shortstory repo) | File import is the default; automatic migration optional if needed; never mutate originals | `compatibility`, `apps/web` | ADR 0010 |
| Server payload v1 (draft/playback, shortstory manifest v1) | Import adapter only if existing data is needed; Next write contract may change | `server`, `compatibility` | ADR 0011 |
| Share / remix (`allowRemix`, publication fingerprint) | Policy preserved | `story-domain`, `server` | |
| Offline HTML export | Not produced (existing files still open as-is) | — | ADR 0009 RETIRE |
| Legacy Web renderer internals | Not required | | |
| Legacy Web animation internals | Not required | | |
| Legacy CSS structure | Not required | | |

## 2026-10-07 구도·오디오·인물 동작 확장

- StoryDocument v5에 선택적 Chapter/Line.audio, presentation.backgroundFocal, StageActorEntry.motion을 추가한다. 구형 작품의 Asset ID·Flow·StageComposition·직접 위치/배율/방향은 그대로 보존한다. 새로운 일반 인물 기본 크기는 실제 실루엣을 기준으로 하므로 렌더된 크기는 기존과 다를 수 있다. 문서 값을 재작성하지 않는다.
- `.knolstory` 최상위 audioResources는 사용자 오디오의 휴대 첨부 표다. project에는 ID만 저장한다. 첨부 없는 기존 파일은 정상으로 읽고, 사용자 자산이 빠진 파일은 현재 작품을 유지하며 오류를 안내한다. 이 확장을 모르는 구형 편집기에서 재저장하면 오디오·첨부/동작 의미를 보존한다고 보장하지 않는다.
- RuntimeScene contractVersion1의 선택적 viewportVersion1, actor motion version1, audio version1은 새 host/presenter 동시 배포가 필요하다. 기존 probe payload도 새 presenter에서 동작한다.
- 검증과 시각적 변화의 근거: [표시 영역 구도·오디오 제작](../architecture/responsive-audio-authoring.md).

## 2026-10-07 게임 저작/파일 확장

Chapter.chapterNumber/branchLabel은 order와 별개이며 기존ID와Flow를 유지한다. PlaybackState.choiceHistory는 정확한 선택ID를 보관한다. RuntimePresentation.version2는 화면/배경/인물과 반복/지속을 Core에서 해석한다. 세로는 원본구도를 보존하며 주화자만 투영한다. Next 표1은 보존 자료와 편집 행을 함께 왕복하고 구형8탭/4탭 및 수식은 명확히 거부한다. .shortstory v1은 Web/A4 그림책으로 음악/연출을 포함하지 않는다. [검증 및 제한](../architecture/vn-workflow-verification.md).
