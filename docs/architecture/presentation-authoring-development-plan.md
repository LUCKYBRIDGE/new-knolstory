# 비음원 장면 연출 저작 개선 계획

2026-10-10. 상태: 우선 제작 기능 구현·검증 완료. 음원 추가는 제외한다. 목표는 작가가 코드 없이 장면 연출을 찾고 선택하고 조정한 뒤, 같은 의미를 StoryDocument, Runtime Core, Ren'Py, 공식 파일, Excel/Google workbook, JSONB snapshot 경계에서 보존하는 것이다.

## 현재 원칙과 불변 조건

- StoryDocument와 `.knolstory`가 연출의 원본이다. `.rpy`, ATL, CSS class, Python 함수명은 저작 데이터가 아니다.
- Runtime Core가 StoryDocument, Flow, StageComposition, 배경 초점, 인물 배치, 연출 범위와 시간 의미를 해석한다. Ren'Py는 RuntimeScene/RuntimeCommand만 소비한다.
- 기존 원고, Asset ID, Flow, StageComposition, 사용자 자유 배치, 선택 경로, 읽기 복귀 상태를 보존한다.
- Ren'Py Web이 최종 놀스토리 재생기다. 성능이나 제약을 이유로 별도 Web Stage renderer를 만들지 않는다.
- 화면과 workbook은 초 단위로 안내한다. 문서와 RuntimeScene의 `*Ms` 필드는 밀리초 의미를 유지한다.
- reduced motion은 전환·효과·인물 동작에 적용한다. 동작을 줄여도 작품 원고와 저장 데이터는 바뀌지 않는다.
- 새 연출은 `.knolstory` archive2, workbook, 향후 JSONB snapshot의 공통 검증 경계를 통과해야 한다. 실제 DB 쓰기는 서버 목표가 아니다.

## Ren'Py 기능과 제품 적용 판단

Ren'Py는 ATL transform으로 표시물의 위치·크기·투명도·회전·색상 등을 시간에 따라 바꿀 수 있고, `with`/transition으로 장면 변경을 보여 주며, camera/show layer로 레이어 전체에 변환을 적용할 수 있다. 우리 제품은 이 기능을 직접 노출하지 않고, 창작자가 이해하는 연출 단어와 제한된 값으로만 저장한다. 따라서 아래의 비교는 "Ren'Py에서 가능함"이 아니라 "KnolStory 작가에게 지금 필요한 제품 기능인가"를 기준으로 한다.

| 범주 | Ren'Py 활용 가능성 | 조사 당시 상태 및 확인 | 판정 | 구현/후속 범위 |
|---|---|---|---|---|
| 화면 전환 | Fade, Dissolve, ATL/Python transition, layer transition | `fade-black`, `white-fade`, `dissolve`, `perspective-blackout` 계약과 Ren'Py 재생이 있음. 확인형 전환은 overlay로 처리한다. | 부분 구현 | 전환 선택 UI를 효과와 분리해 "자동/확인 후 진행", 제목·설명·버튼 문구, 지속 시간을 한글로 조정하게 한다. 현재 컷 미리보기와 취소/되돌림을 명확히 한다. |
| 인물 등장·퇴장·이동 | ATL alpha/xoffset, show/hide/replacement | StageActor `motion`에 `fade-in`, `fade-out`, `move`, duration/delay/fromXAnchor가 있고 Ren'Py가 소비한다. | 부분 구현 | 인물 동작 UI를 "배경과 인물" 안의 숫자 나열에서 "등장/퇴장/이동" 카드로 정리하고, 출발 위치를 현재 위치 대비 쉬운 프리셋+세부 조정으로 제공한다. |
| 인물 표정 | 이미지 교체, layeredimage, show tag replacement | 현재 자산 카탈로그는 character image 교체와 방향/크기/강조만 다룬다. 표정 계층/동일 인물 variant 계약은 없다. | 누락 | 이번 P1에서는 제외한다. 표정은 asset taxonomy와 같은 인물 variant 규칙이 필요하므로 ASSET-ACTOR-EXPRESSION 후속 목표로 둔다. |
| 인물 강조 | matrixcolor, opacity, depth, target mask | RuntimeActor의 `emphasis`, `spectral`, `opacity`, `depth`와 말하는 인물 dim 처리, actor target effect가 있다. | 부분 구현 | "말하는 인물 강조", "희미하게", "유령처럼"을 코드 없는 선택지로 노출하고 효과 대상 인물 선택과 충돌하지 않게 설명한다. |
| 배경·시점 | background fit/focal, camera/show layer transform, zoom/pan | `backgroundFit`, `backgroundFocal`, responsive rect가 있다. camera zoom/pan/rotate는 저작 계약에 없다. | 부분 구현 | P1은 "화면 채우기/전체 보기/중심"을 현재 UI에서 더 읽기 쉽게 한다. camera zoom/pan은 `viewpoint` 계약을 새로 설계해야 하므로 P2로 둔다. |
| 화면 효과 | Solid overlay, AlphaMask, crack/spotlight assets, shake function | `shake`, `flash-red`, `fade-black`, `crack`, `spotlight`, `flash`, `screen-crack`가 RuntimeEffect와 Ren'Py에 있다. 대상·범위·반복·지연·지속 시간도 있다. | 구현됨/부분 구현 | 기능은 있으나 편집 UX가 목록형이다. P1은 효과 선택을 목적별 묶음으로 바꾸고, 순서 이동·복제·개별 취소·전체 해제를 추가한다. |
| 연출 순서 | ATL block order, effect list order | `effects` 배열 순서와 workbook `order`가 보존된다. UI에는 순서 재배열이 없다. | 부분 구현 | 효과 카드에 위/아래 이동과 "먼저/나중" 설명을 넣고, Runtime Core가 현재 순서를 그대로 보낸다는 검사를 보강한다. |
| 시작 시점 | `pause`, timer, elapsed clock | `scene-enter`, `with-dialogue`, `after-delay`, `delayMs`가 있다. `with-dialogue`의 제품 의미가 아직 거의 동일하게 재생된다. | 부분 구현 | 시작 시점 문구를 "컷 시작 즉시/글이 보일 때/몇 초 뒤"로 정리하고, `with-dialogue`가 전환 완료 뒤 clock에 묶이는지 Ren'Py 검증을 추가한다. |
| 지속 시간 | ATL linear/ease duration, transition delay | 조사 당시 effect 시간은 고정, transition/actor motion은 조정 가능했다. 이번에 effect durationMs와 실제 재생을 연결했다. | 부분 구현 → 우선 기능 구현됨 | 시간 입력은 유지하되 빈 값/기본값/범위 오류를 카드 안에서 설명한다. |
| 반복 | ATL repeat, screen timer/function clock | effect repeat/periodMs loop가 있다. 인물 motion과 transition 반복은 없다. | 부분 구현 | 반복은 배경/화면 ambience성 효과에만 P1로 허용한다. 전환 반복과 인물 동작 반복은 의도적 제외로 둔다. |
| 적용 범위 | layer/target, tag, displayable-specific transform | 화면/배경/인물 target과 cut/following scope가 있다. 실제 방문 경로만 유지한다. | 구현됨/부분 구현 | UI에서 "현재 컷만/다음 컷에도 유지/이 컷에서 끊기"를 한 곳에서 보이게 한다. 대상 인물이 없는 컷의 미적용 상태를 경고한다. |
| 화면 회전/3D/perspective | camera transform, perspective, rotate | 저작 계약에 없다. 긴 한국어/학교 기기/배치 보존 위험이 크다. | 의도적 제외 | 실제 작품 요구가 확인될 때 별도 계약으로 검토한다. 지금은 회상·균열·시점 전환 같은 제품 프리셋으로 충분성을 높인다. |

## 최소 구현 묶음

### P1-A. 연출 선택과 조정 UI

작업 위치:

- `apps/web/components/story-effect-controls.tsx`
- `apps/web/components/story-workspace-inspector.tsx`
- `apps/web/components/story-workspace.module.css`
- 필요하면 작은 pure helper를 `apps/web/lib/`에 추가한다.

구현 내용:

1. "장면 연출"에서 소리 컨트롤과 비음원 연출을 분리한다. 이번 목표의 비음원 연출 탭은 전환, 화면/배경/인물 효과, 인물 동작으로 이동할 수 있어야 한다.
2. 효과를 카드형 목록으로 만들되 중첩 카드는 쓰지 않는다. 각 카드에는 효과 이름, 대상, 적용 범위, 시작, 지속 시간, 반복, 강도, 순서 이동, 제거가 있다.
3. "이 컷에서 이전부터 이어진 효과 끝내기"는 별도 체크박스가 아니라 이어지는 효과 영역의 명령으로 둔다. 현재 컷 효과와 이어지는 효과를 구분해 작가가 범위를 오해하지 않게 한다.
4. 인물 동작은 배치 숫자 옆에 묻히지 않게 "등장·퇴장·이동" 선택기로 정리한다. 대상 인물의 이름/그림 이름을 함께 표시한다.
5. 모든 시간 입력은 초로 보이고, 기본값은 "기본 0.6초"처럼 표시한다. 내부 저장은 기존 ms 필드다.
6. 긴 한국어 문구와 버튼은 줄바꿈을 허용하고, PC/태블릿/휴대폰 세로·가로에서 44px 터치 영역을 유지한다.

완료 조건:

- 현재 컷에서 효과 추가→대상 변경→범위 변경→순서 이동→삭제→미리보기→편집 복귀가 원고와 StageComposition을 손상하지 않는다.
- 모바일 compact 화면에서 "연출 편집"이 하나의 긴 패널로 흘러가며, 버튼·select·초 입력이 겹치거나 잘리지 않는다.

### P1-B. 전환과 미리보기/취소 흐름

작업 위치:

- `apps/web/components/story-workspace.tsx`
- `apps/web/components/story-workspace-inspector.tsx`
- `apps/web/lib/presentation-phase.ts`
- `renpy/responsive-spike/game/presentation.rpy`
- `renpy/responsive-spike/game/script.rpy`

구현 내용:

1. "연출 미리보기"는 현재 컷의 presentationEntry를 새로 발급해 전환·효과·인물 동작을 처음부터 재생한다.
2. 편집 중 값 변경은 저장된 원고를 즉시 바꾸되, "편집으로" 복귀와 별개로 최근 연출 변경 취소를 제공한다. 취소는 현재 컷 presentation/stage motion만 되돌리고 원고 본문·Flow·자산 ID는 건드리지 않는다.
3. 확인형 전환 overlay는 긴 제목·설명·버튼 문구가 portrait/landscape에서 잘리지 않아야 한다.
4. `presentationDone` 이후에만 읽기 입력이 진행되며, 이전/다시 읽기/처음부터 읽기 때 같은 entrance가 재시작된다.

완료 조건:

- 전환 확인 버튼, 자동 전환, reduced motion, 이전/다시 읽기, 편집 복귀가 모두 같은 RuntimeScene 계약으로 동작한다.
- 확인형 전환이 진행 입력을 막은 뒤 정상 해제한다.

### P1-C. 계약·파일 왕복 보강

작업 위치:

- `packages/story-domain/src/legacy/story-presentation.ts`
- `packages/story-domain/src/legacy/story-stage-composition.ts`
- `packages/runtime-contract/src/index.ts`
- `packages/runtime-core/src/presentation-scopes.ts`
- `packages/runtime-core/src/story-runtime.ts`
- `packages/compatibility/src/authoring-workbook/presentation.ts`
- `packages/compatibility/src/authoring-workbook/stage.ts`
- `packages/compatibility/src/authoring-field-schema.json`은 generator로만 갱신한다.

구현 내용:

1. P1에서 새 필드가 필요하면 먼저 StoryDocument schemaVersion/adapter 필요성을 판단한다. 현재 목표는 가능하면 기존 `StoryPresentation`과 `StageActorMotion` 필드 안에서 끝낸다.
2. workbook 한글 label과 안내는 "효과 순서", "시작 후 기다리는 시간 (초)", "한 번 재생 시간 (초)", "반복 주기 (초)", "대상 인물 키"를 유지하되 UI 문구와 같은 단어로 맞춘다.
3. JSONB snapshot은 archive 검증 경계를 재사용한다. 별도 JSONB 전용 연출 의미를 만들지 않는다.
4. unknown field, duplicate key, invalid target actor, 잘못된 반복 주기, 범위 밖 시간은 저장 전에 거부한다.

완료 조건:

- `.knolstory` 내보내기/가져오기, workbook export/import, xlsx roundtrip, JSONB snapshot/restore가 같은 presentation/stage motion 의미를 보존한다.
- 기존 Next 대표 작품의 미수정 원고, Asset ID, Flow, StageComposition, 자유 배치가 바뀌지 않는다.

### P1-D. 실제 작품 검증

필수 검증:

- Unit/contract: StoryPresentation guard, RuntimePresentation guard, presentation scope/order, actor motion, authoring workbook, archive, JSONB snapshot.
- Host UI: PC/tablet/phone portrait/landscape에서 효과 선택·편집·순서 이동·취소·미리보기·저장·reload.
- Native Ren'Py: 실제 runtime에서 전환, 인물 등장/퇴장/이동, 화면/배경/인물 효과, following scope, 반복, reduced motion, 읽기 복귀.
- File roundtrip: `.knolstory` export/import, Excel app edit, Google Sheet export/import, JSONB snapshot/restore. 변경한 연출 외 미수정 필드 전체 비교.
- 증거 기록: 명령, 빌드 버전, 입력 fixture, 통과/실패/제외, screenshots/logs, 한계를 `docs/architecture/evidence/non-audio-direction/`에 남긴다.

Runtime을 바꾸면 `pnpm runtime:build` 후 `pnpm build`를 순서대로 수행한다. old `out`을 대상으로 테스트하지 않는다.

## 후속 목표

| Goal | State/priority | Dependency | Completion condition |
|---|---|---|---|
| PRES-UI | 우선 기능 완료 P1 | 현재 StoryPresentation/StageActorMotion 계약, DESIGN compact 기준 | 코드 없는 선택·조정·순서·취소·미리보기 UI가 PC/태블릿/휴대폰에서 저장·재열기까지 동작 |
| PRES-ROUNDTRIP | 완료 P1 | PRES-UI, workbook/schema generator, archive/JSONB validators | `.knolstory`, Excel, Google, JSONB roundtrip에서 연출 외 미수정 필드 일치와 invalid value 거부 |
| PRES-NATIVE | 완료 P1 | PRES-UI, Runtime Core, Ren'Py build | 실제 Ren'Py가 전환·효과·인물 동작·반복·reduced motion·읽기 복귀를 재생하고 evidence 기록 |
| ASSET-ACTOR-EXPRESSION | 미구현 P2 | 자산 카탈로그의 동일 인물/표정 variant 계약과 migration | 표정 선택이 Asset ID와 같은 인물 의미를 보존하고 파일/workbook/runtime에서 왕복 |
| VIEWPOINT-MOTION | 후보 P2 | camera/viewpoint StoryDocument 계약, 배경 crop/텍스트 가독성 정책 | 배경 pan/zoom/시점 이동이 Stage Layout을 우회하지 않고 Runtime Core 좌표로 재생 |
| DIRECTION-TIMELINE | 후보 P2 | 작가 관찰과 인물·효과·전환 통합 시간 계약 | 반복/동시/순차와 취소를 한 시간표로 편집하고 기존 진입 의미·파일 왕복·Ren’Py 재생 보존 |
| DEVICE-A11Y-PRESENTATION | 미검증 P2 | 학교 PC/Chromebook/Android, 보조 기술 환경 | 실제 기기와 키보드/스크린리더에서 긴 한국어 연출 UI와 확인형 전환을 조작한 증거 |

## 의도적 제외

- 음원 추가·음원 생성·효과음 검색은 이번 목표에서 제외한다.
- Ren'Py ATL/Python 코드를 작가가 직접 입력하는 기능은 제공하지 않는다.
- 화면 회전, 3D perspective, arbitrary camera script, shader-like 효과, per-story Ren'Py package는 현재 제품 요구와 학교 기기 위험에 비해 범위가 크므로 제외한다.
- 별도 Web Player 또는 DOM Stage renderer로 Ren'Py 재생을 대체하지 않는다.

## 실행 범위 확정 (2026-10-10)

최초 효과 지속 시간은 엔진에 고정되어 있었다. 선택적 durationMs·Core 기본값·Ren’Py 적용·workbook6 migration을 구현했다. 카드 순서·명시적 순차 시작·취소, 분위기 강도·확인 전환 문구, 좌우 인물 전체 강조·투명도를 제공한다. 인물 대기ATL pause와 이어지는 효과 시계 초기화 결함도 수정했다. 효과 복제/전체삭제 버튼은 중복 조작을 줄이기 위해 추가하지 않는다. 표정 variant·동적 배경pan/zoom·통합 인물/효과 타임라인은 후속 목표다. [계약](non-audio-direction-contract.md), [검증](non-audio-direction-validation.md).

## 완료 판정

[최종 검증](non-audio-direction-validation.md)의 실제 외부 파일/네이티브/13개 UI 회귀와1113개 단위 검사 결과로 우선 제작 기능을 완료 판정한다. 최초 실패와 독립 리뷰의 취소 문제 수정은 삭제하지 않는다. 전체 Ren’Py 기능, 서버/릴리스/실기기와 표정·시점 이동·통합 타임라인의 완료 판정으로 확장하지 않는다.

## Ren’Py 조사 근거

[공식 ATL/Transform](https://www.renpy.org/doc/html/transforms.html), [이미지 표시·camera](https://www.renpy.org/doc/html/displaying_images.html), [전환](https://www.renpy.org/doc/html/transitions.html)을 비교하고 실제 구현은 고정8.5.3 소스/빌드에서 확인했다. 공식 최신 문서에 기능이 있다는 사실과 현재 편집기에서 저작/재생된다는 증거는 구분한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
