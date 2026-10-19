# 글 편집 중 현재 컷 연결 맥락

2026-10-11. [승인 편집](approved-ui-development-plan.md)과 [legacy 계승 계획](legacy-editor-ux-improvement-plan.md)의 UX-CONTEXT를 진행한다. 현재 장·컷은 기존 위치 선택을 유지하고, 글 편집 보기 옆에 작은 연결 상태를 둔다. 기본 화면에 전체 흐름 패널을 상시 펼치지 않는다.

## 동작과 의미

`EditorFlowContext`는 기존 Core `analyzeStoryFlow`의 node/edge/reachable/shared를 사용한다. 합류·도달 불가·연결 문제·선택지·엔딩을 짧게 표시한다. 필요할 때 대화상자를 열어 현재 장·컷, 들어오는/나가는 길, 연결 문구·점수 조건 존재·도착 컷의 글과 편집 이동을 확인한다. 종료와 연결 대기를 구분하고 연결 대기/도착 컷 누락은 기존 연결 편집으로 이어진다.

합류·공유 컷은 수정이 연결된 모든 갈래에 반영된다고 알린다. 원고 연결 관계를 독자가 실제로 선택한 읽기 경로로 표현하지 않는다. 여러 incoming 경로를 하나의 유일한 경로로 추정하지 않으며, 앞 갈림길 후보 탐색은 아래 추가 검증 범위로 구현했고, 사용자가 선택한 편집 경로 stack은 별도 후속이다. 각 destination은 장·컷의 한글 위치로 명명하고 내부 ID는 테스트 식별에만 사용한다.

원고·ID·Flow·StageComposition·저작 파일과 저장 버전은 바꾸지 않는다. 단순 입력·자동 저장으로 연결 표시를 펼치거나 높이를 바꾸지 않는다. 사용자가 열 때만 dialog가 나타난다. 한글 조합 중 입구를 비활성화한다. 연결된 컷으로 이동은 기존 `selectCut`의 저장 guard를 사용한다. 닫기/Escape는 입력을 바꾸지 않고 입구로 초점을 돌려준다. 장 대본/현재 컷 두 보기와 추가 도구 하나 원칙을 유지한다.

## 검증

[RED](evidence/editor-flow-context/red.log), [첫 네 화면](evidence/editor-flow-context/ui.log), [최종 정적 빌드](evidence/editor-flow-context/static-final.log):1440/768/390/844에서 글 편집 상태의 합류·조건/도착지 글·닫기 초점·연결 컷 이동·선택지 표시·IME·가로 경계. 별도 도달 불가/연결 대기 fixture는 현재 컷에서 기존 연결 편집으로 이동하고 원고와 대상 위치를 유지한다. 기존 상단/화살표·대본 왕복·컷 메모·native 읽기 복귀 회귀를 함께 실행한다.

[Core 연결/인접 원고 단위](evidence/editor-flow-context/unit.log), [타입](evidence/editor-flow-context/typecheck-final.log), [lint](evidence/editor-flow-context/lint.log), [빌드](evidence/editor-flow-context/build.log). 검사 범위는 브라우저 viewport와 현재 fixture이며 삼성 실기기/스크린리더 완료로 주장하지 않는다.

남은 편집 경로 선택은 저장한 작품을 복제하지 않고 사용자 탐색 상태로 관리해야 한다. 사용자가 선택한 편집 경로 stack과 전체 범위 편집의 남은 항목은 기존 계획의 후속으로 유지한다. 관련 창작 메모는 이후 별도 검증 기록에 연결했다. 현재 연결 입구를 붙인 것으로 전체 승인 도안 목표를 완료하지 않는다.

최종 결과: 정적 빌드16개, 기존 Core/인접 원고 단위12개, TypeScript6 workspace·lint·빌드·문서 링크 검사 통과. 소스 리뷰에서 차단 결함은 없었으며 incoming/outgoing의 반대 컷 선택·모달 초점/Escape·경계·기본 host/stories-runtime 검사 포함을 확인했다. [PC 맥락](evidence/editor-flow-context/context-dialog-1440.png), [휴대폰 맥락](evidence/editor-flow-context/context-dialog-390.png)은 실제 native 준비 후 별도 캡처한다.

자기 점검: 정확성4(Core 해석·actual fixture·native 회귀), 완결성4(직접 연결 맥락/편집 연결 완료·상위 경로 stack 별도), 명료성4(공유/대기/종료·독자 경로 구분), 실행 가능성4(입력 상태에서 대상 글 확인/이동), 간결성4(작은 입구와 필요시 dialog), 평균4.0. 다음은 관련 메모와 상위 경로 탐색을 같은 승인 작업면에 연결하는 것이다.


## 앞 갈림길 후보 탐색 보완

2026-10-11. Core `findUpstreamBranches`는 현재 컷에서 연결된 incoming을 역방향으로 탐색한다. 방문한 컷은 다시 방문하지 않아 반복 경로에서도 종료하며, 현재 컷 자체와 연결 대기·누락·종료 edge는 후보에서 제외한다. 선택지 또는 조건 분기인 앞 컷만 가까운 순서로 보여 준다. 각 갈래의 거리는 현재 컷까지 가능한 최소 이동 횟수다. 합류한 두 갈래를 모두 보존하고 점수 조건 존재만 표시한다. 독자 점수를 평가하거나 실제 선택 경로를 확정하지 않는다.

연결 맥락 dialog 안의 ‘이 컷으로 이어질 수 있는 앞 갈림길’은 기본 접힘이다. 펼치면 장·컷, 원고 글, 갈래 문구와 최소 이동 횟수를 확인하고 ‘이 갈림길 편집’으로 이동한다. 이동은 기존 저장/조합 guard를 재사용한다. 원고·ID·파일 형식은 그대로다. 상단에 새 상시 패널을 추가하지 않는다.

검증: [RED](evidence/upstream-branches/red.log) 후 [Core 연결·갈림길 13개](evidence/upstream-branches/unit-final.log) 통과. 중첩 선택지·합류 양쪽·반복·현재 컷 제외·조건 분기를 검증했다. [정적 빌드 E2E 10개](evidence/upstream-branches/static-final.log)는 1440/768/390/844에서 후보 펼침·갈래 글·갈림길로 편집 이동·닫기 초점·IME 보호, 기존 상단 밀도·앞뒤 화살표 및 연결 대기 복구를 확인했다. [타입 6 workspace](evidence/upstream-branches/typecheck-final.log), [lint](evidence/upstream-branches/lint.log), [빌드](evidence/upstream-branches/build.log) 통과. [전체 단위 커버리지](evidence/upstream-branches/coverage.log): 136파일, 1165통과·1건 제외, statements93.56%/branches91.21%/functions96.63%/lines98.70%. 마지막 조건 분기 테스트 추가는 위 Core 13개 실행으로 별도 확인했다. 소스 전용 리뷰에서 차단 결함 없음. 실제 삼성 기기·스크린리더 검증은 포함하지 않는다.

후속 P1: 사용자가 선택한 편집 경로 stack. 상태 미구현, 의존성 기존 컷 이동/저장 guard와 다중 경로 모델, 완료 조건은 합류/반복에서 사용자가 고른 탐색 경로를 작품 내용과 분리해 유지하고 이전 경로 복귀·재열기·읽기 경로 불변을 검증하는 것이다. 후보 탐색 완료를 전체 경로 편집 완료로 처리하지 않는다.

자기 점검: 정확성4(역탐색·조건·순환 및 소스 리뷰), 완결성4(후보 탐색 완료·선택 경로 stack 후속), 명료성4(가능 경로/실제 독자 경로 구분), 실행 가능성4(갈림길 원고 확인·편집 이동), 간결성4(기본 접힘). 평균4.0. 개선 우선순위는 실제 기기 검증, 선택 경로 복귀 순이다.

## 2026-10-13 선택한 편집 방문 복귀

위의 선택 경로 stack 후속을 기기 workspace의 작품별 방문 배열로 구현했다. 합류·반복에서 사용자가 실제 선택한 컷만 기록하며 연결이나 읽기 경로를 추정하지 않는다. 기존 dialog 안의 접힌 방문 목록/이전 컷 복귀,32회 제한·primitive 검증·삭제ID 정리, reload·작품별 복귀와 저장/IME 원자성은 [이번 실행과 계약](current-ui-continuation-validation.md)이 소유한다. 이 목표의 구현 상태와 전체 회귀/실기기 상태를 구분한다. 과거 후보 탐색 검증은 당시 기록으로 보존한다.
