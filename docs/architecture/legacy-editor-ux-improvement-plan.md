# 구 놀스토리에서 계승할 편집 경험과 다음 개선

2026-10-11. 사용자 요청은 서재 창문·책장 사이 공간을 바로잡고, 구 놀스토리의 유용한 UI·UX·편집 구성을 살펴 뉴놀스토리의 방향을 정하는 것이다. 기존 [승인 도안 계획](approved-ui-development-plan.md)을 유지하면서 다음 개선의 우선순위를 정한다. 현행 UX는 [DESIGN](../../DESIGN.md), 현재 상태는 [STATUS](../../STATUS.md), 이전 기능 감사는 [legacy parity](legacy-parity-implementation.md)가 소유한다.

## 확인 기준

고정 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`를 `git show`로 읽었다. 아래 경로는 해당 저장소의 기준 버전에 대한 식별자다. 현재 checkout이나 참고안의 그림만으로 실제 구현을 주장하지 않는다.

- `app/components/SceneFocusEditor.tsx:574-713`: 글·인물·배경 탭, 컷 이동, 대사형 입력, 앞뒤 컷 참조, 접힌 컷 관리.
- 같은 파일 `797-836`: 앞 컷 배치와 다른 컷의 배치 가져오기. `847-868`: 미리보기·무대 요약·연결된 창작 메모.
- `app/components/StoryContextStack.tsx:22-124`: 계산된 경로·작은 장/갈래 맥락·전체 흐름 탐색.
- `app/components/StoryFlowEditor.tsx:84-202`: 도착지 요약, 연결 변경, 새 갈래 만들기, 해당 갈래로 이동.
- `app/components/ScriptScreen.tsx:137-150`: 장 대본, 작품 전체 대본, 많은 컷 펼침, 여러 컷 복사.
- `Knolstory_Story_Composition_UIUX_Redesign_Reference_v1.1.md:14-22,108-120,231-240`: SSOT/ID·합류·종료/대기 구분, 현재 작업만 상세히, 입력·자동 저장 중 화면 점프 방지. 이는 구현 코드와 구분한 디자인 근거다.

## 현재 비교와 계승 판정

| 경험 | 판정 / 현재 상태 | 뉴놀스토리의 실제 위치와 판단 |
|---|---|---|
| 현재 글 중심, 앞뒤 컷 참조·이동 | PRESERVE·REFINE / 구현됨 | `story-workspace.tsx`, `story-cut-context.tsx`: 기본 입력과 인접 원고 요약, IME·저장 guard를 유지 |
| 글·배경·인물과 선택적 연출 | REFINE / 구현됨 | `StoryWorkspaceInspector`와 하나의 추가 도구. 기존 승인 도안의 기본 작업면 유지 |
| 대본/컷 두 보기 | PRESERVE·REFINE / 구현됨·발견성 보완 후보 | `chapter-writer.tsx`: 나누기·합치기·복제·이동·삭제·장 자료. 두 보기의 왕복 위치·초점과 입구를 개선 |
| 자료 선택 미리보기·적용/취소·장 자료·즐겨찾기·최근 | PRESERVE·REFINE / 구현됨 | `asset-browser-dialog.tsx`: 기존 선택을 바꾸기 전에 후보 확인. 재구현 대상이 아님 |
| 글을 쓰면서 보는 갈래 맥락 | REFINE / 부분 구현 | 연결 맥락은 현재 선택지 도구에서만 보임. `story-flow-context.tsx`의 해석을 작은 맥락으로 연결할 여지 |
| 다른 컷의 배경·인물 배치 가져오기 | REFINE / 부분 구현 | `story-composition-controls.tsx`는 앞 컷 인물 복사만 제공. 원고·연결·소리·연출까지 일괄 복사하지 않는 명시적 범위 필요 |
| 현재 장면 요약·관련 메모 | REFINE / 부분 구현 | 장면 직접 조작과 메모 준비 화면은 존재. 현재 컷에서 서로 연결된 참조 입구가 약함 |
| 컷 작업 제목·의도·감정·연출 메모 | PRESERVE·REFINE / 입력 UI 누락 | `workingTitle/purposeNote/emotionNote/directionNote`와 workbook 필드는 존재하나 컷 inspector/장 대본에서 직접 입력하지 못함 |
| 새 갈래 생성·도착지로 쓰러 가기 | REFINE / 부분 구현 | 선택 문구·도착 컷·새 장·점수·조건은 구현됨. 연속 작성과 기존 후속 이야기 배치 안내는 보완 후보 |
| 작품 전체 대본·여러 컷 복사 | REFINE / 부분 구현 | [AU-01](legacy-parity-implementation.md)의 기존 목표. 범위 ID remap·외부 연결·취소를 먼저 해결 |
| legacy Web Stage/player·저장소 복사 | REBUILD·RETIRE / 의도적 제외 | 장면은 Runtime Core→단일 Ren’Py. legacy 저장소나 원고를 임의 변경하지 않음 |

## 권장 작업면

기본 화면은 장면과 말하는 인물·대사/해설이다. 작은 현재 장·컷 표시와 인접 원고 이동을 가까이 둔다. **장 대본 / 현재 컷 편집**은 같은 작품·현재 컷을 유지하는 두 보기로 다룬다. 배경·인물, 선택지, 연출, 소리는 필요할 때 하나만 연다. 자료 선택과 파괴적 작업 확인은 대화상자로, 장면 조정은 현재 컷을 보면서 하는 추가 영역으로 연결한다.

갈래 맥락은 긴 상단 패널로 늘리지 않는다. 여러 경로가 있는 공통 컷에 하나의 유일한 경로를 만들어 표시하지 않는다. 사용자가 선택한 편집 경로와 실제 읽기 경로는 구분하며, 저작 파일에 편집 탐색 상태를 저장하지 않는다. 배치 가져오기의 미리보기는 자료 썸네일/설명 또는 기존 Ren’Py를 사용한다.

## 후속 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-CONTEXT | 현재 컷 연결·앞 갈림길 후보·편집 방문 복귀 구현 / 현행 검증 P1 | Core Flow 분석·현재 cut context·승인 도안 | 글 입력 중 공유·도달 불가·선택지/엔딩/연결 대기 맥락·도착지 글/이동. 입력/자동 저장 때 높이 점프 없음. ID·Flow·읽기 경로 불변. 합류·반복의 앞 갈림길 후보/원고/최소 이동과 편집 이동 구현. 사용자가 실제 선택한 방문의 기기별 복귀를 추가; [이번 검증](current-ui-continuation-validation.md), [기존 검증](editor-flow-context-validation.md) |
| UX-VIEWS | 구현·범위 검증 P1 | 장 대본·현재 컷·IME/초점 guard | 작은 두 보기 전환·현재 컷/글·커서 복귀·조합 중 보호·저장 실패 후 재시도 검사. [실행 기록](editor-view-and-cut-notes-validation.md) |
| UX-CUT-NOTES | 구현·범위 검증 P1 | 기존 저작 필드·검증/저장 계약 | 접힌 글·컷 상세의4필드, 네 화면 입력 경계, 파일/표/Excel/JSONB·저장/재열기·native 복귀와 미수정 작품 보존. [실행 기록](editor-view-and-cut-notes-validation.md) |
| UX-STAGING | 구현·범위 검증 P1 | 배경 기본값/없음·StageComposition·복사/취소 계약 | 다른 컷 선택→원본/대상·항목 확인→취소/적용/범위 되돌리기, 원고/Flow/소리 보존, 전체 형식 왕복·native 복귀. [계약·검증](staging-import-contract-and-validation.md) |
| UX-RELATED | 우선 범위 구현·검증 P2 | 기존 기획 메모 링크·자료 해석 | 배경·인물 요약은 배치 도구 안에서 기존 입력으로 연결, 메모는 작은 참조로 제공하고 같은 컷 복귀·중복 저장 없음. [메모 검증](editor-related-memos-validation.md), [자료 요약](scene-resource-summary-validation.md) |
| UX-BRANCH-WRITE | 구현·현재 범위 검증 P2 | 기존 새 갈래 helper·기존 후속 이야기·합류 정책 | 갈래 생성 확인/취소→도착지 글 초점→원 컷 방문 복귀. 종료/대기/합류·기존 다음 원고 보존, save/IME·전체 형식/native; [이번 검증](branch-writing-validation.md) |
| AU-01 | 기존 부분 구현 P2 | 범위 복사·ID remap·외부 연결 | 기존 [완료 조건](legacy-parity-implementation.md) 유지. 단순 여러 컷 복제 버튼으로 완료하지 않음 |

## 서재 간격 수정과 계승 조사 당시의 검증

창문은 `room.webp`의 왼쪽 폭8.2% 안에 있다. 기존 양옆 padding은 창문 폭을 고려하지 않아1200px에서 책장 왼쪽이 창문 경계보다8.4px 안쪽으로 들어왔다. 서재 왼쪽에 창문 폭+24–48px 벽 공간을 예약했다. 오른쪽 여유와 책장 재료·두 행 최소·화분·책/선반 접촉·선택 후 행동은 유지한다. 편집/읽기 CSS에는 적용하지 않는다.

근거: [실패 재현](evidence/library-window/red.log), [회귀](evidence/library-window/e2e.log), [현재 표지 Tab 순서 검사](evidence/library-window/modal-current.log), [최종 빌드 검사](evidence/library-window/final-build-e2e.log), [빌드](evidence/library-window/build.log), [타입](evidence/library-window/typecheck.log), [lint](evidence/library-window/lint.log). 회귀25개 통과/1개 native 프로젝트 전용 skip,1개는 추가된 용어 안내가 첫 Tab 대상인데 과거 닫기 버튼을 기대한 검사였다. 현재 첫 버튼 기준으로 수정 후 통과했다. 최종 빌드에서는 공간·선반 용량·서랍 접근·Tab 동선을 재검사한다. 새 편집 목표들은 이 조사로 구현 완료가 된 것이 아니다.

[PC1200](evidence/library-window/library-1200.png), [태블릿820](evidence/library-window/library-820.png), [휴대폰390](evidence/library-window/library-390.png), [작은 폰320](evidence/library-window/library-320.png), [가로844](evidence/library-window/library-844.png), [PC1500](evidence/library-window/library-1500.png). 브라우저 화면 크기 검사는 삼성 실기기/보조 기술 검증과 구분한다.

최종 실행: 최종 정적 빌드를 별도 loopback 포트3109에서 제공해 공간·용량·서랍·표지/중첩 선택 창의 키보드 검사4개가 모두 통과했다. 사용자의3000 개발 서버를 종료하지 않았다. TypeScript6 workspace·lint·빌드·문서 링크와 변경 diff whitespace 검사 통과. CSS 수정 리뷰에서 차단 결함은 없었고, 실제 책장 폭에 따른 열 수가 유지됨을 확인했다.

자기 점검: 정확성4(고정 baseline 코드와 실제 현재 컴포넌트 대조), 완결성4(간격 구현/검증과 후속 계획, 새 편집 항목은 계획 상태), 명료성4(계승/부분/누락/제외 구분), 실행 가능성4(현재 코드 적용 및 후속 완료 조건), 간결성4(기존 계약·목표 재사용), 평균4.0. 다음 개선은 계획된 편집 동선을 실제 작품에서 구현·검증하는 것이다.

2026-10-13 UX-CONTEXT 후속: 편집 방문 복귀를 구현해 선택한 합류·반복 경로를 기기 상태로 보관한다. 상세 완료 조건과 최신 실행은 [이어가기 검증](current-ui-continuation-validation.md)을 따른다. UX-BRANCH-WRITE/AU-01과 갈래 한정 실행 범위·실기기/최초 Chrome 원인 조사까지 완료한 것은 아니다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
