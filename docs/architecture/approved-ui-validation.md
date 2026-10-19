# 승인 도안 기반 개편 검증 기록

2026-10-11. 실행 범위는 [개편 계획](approved-ui-development-plan.md), 기준 이미지는 [고정 manifest](evidence/approved-ui/approved-manifest.json)다. 비교안 A/B/C와 폐기된 키보드 그림을 구현 입력으로 사용하지 않았다. 최신 사용자 결정인 하단 밀착·4px/2px 간격·지난기록/저장/불러오기/자동/빠른 저장/빠른 불러오기 순서를 적용했다.

## 실제 구현

- 현재 글·화자가 기본 입력이며 이전/다음 원고 컷의 글·화자·위치와 이동을 함께 둔다. 원고 순서와 Flow 연결은 구분한다.
- 배경/인물·연출·소리·선택지는 선택한 도구 하나만 열린다. 기존 장 대본·컷 구조·전체 흐름·파일/복구·보기는 접힌 도구로 유지한다.
- 선택지 문구·도착 요약·결과/조건은 같은 카드에 있고, 점수와 선택지의 네 독립 조합을 지원한다. 미사용 기능을 자동 생성하지 않는다.
- 읽기 도구는 실제 Web/Core 저장·경로에 연결됐다. 수동1–9/자동 기록을 유지하고 별개 quick 슬롯을 추가했다. v1→v2는 검증 후 메모리 변환이며 단순 읽기로 기존 bytes를 쓰지 않는다.
- 자동은 실제 native sceneRendered와 전환 완료/오디오 준비 이후 시작한다. 메뉴·확인·선택·연결 대기·엔딩·탭 숨김에서는 멈춘다. 복원/처음부터 이후 꺼진다.
- Runtime Core 보기 전용 dialogueDock이 글 상자 위치/크기만 계산한다. 글 상자·speaker pill은 Ren’Py가 같은 토큰과 기존 NotoSansKR로 렌더한다. Web은 메뉴 overlay만 표시한다. 승인 도안의 Web 폰트를 정확히 그대로 사용했다고 주장하지 않는다.
- visualViewport 가림과 입력 초점으로 무대 투영을 줄이며 논리 구도 callback을 동결한다. 삼성 키보드 높이는 하드코딩하지 않는다.

## 검증 결과와 근거

| 검사 | 결과 | 근거 |
|---|---|---|
| Runtime 빌드 → Web 정적 빌드 | 통과 | [native build](evidence/approved-ui/runtime-build.log), [Web build](evidence/approved-ui/web-build.log) |
| 전체 workspace TypeScript | 통과 | [typecheck](evidence/approved-ui/typecheck.log) |
| 변경 코드 ESLint | 통과 | [lint](evidence/approved-ui/lint.log) |
| domain/Core 회귀 | 653개 통과 | [회귀](evidence/approved-ui/domain-core-regression.log) |
| 저장·자동·native 준비·편집 맥락 helper coverage | statements94.87%, branches92.74%, functions/lines100% | [coverage](evidence/approved-ui/coverage.log). 전체 제품 coverage 수치가 아님 |
| 현재 외부 Excel/Google evidence + JSONB + 점수 계약 회귀 | 11개 통과 | [계약](evidence/approved-ui/contracts.log). 외부 앱을 이번 UI 변경 뒤 직접 다시 편집한 결과는 아님 |
| 새 Host/native E2E | 13개 통과 | [E2E](evidence/approved-ui/e2e-verified.log) |
| 실제 Ren’Py 4개 viewport 캡처·도구 위치·동일 iframe | 통과 | [수치](evidence/approved-ui/native-screens.json), [소스](../../spikes/renpy-web/verify-approved-ui.mjs) |

실제 화면: [PC 편집](evidence/approved-ui/actual/web-editor.png), [PC 읽기](evidence/approved-ui/actual/web-reading.png), [태블릿 편집](evidence/approved-ui/actual/tablet-editor.png), [휴대폰 편집](evidence/approved-ui/actual/phone-editor.png), [휴대폰 읽기 접힘](evidence/approved-ui/actual/phone-reading.png), [휴대폰 읽기 펼침](evidence/approved-ui/actual/phone-tools.png), [휴대폰 가로](evidence/approved-ui/actual/phone-landscape-tools.png).

E2E는 실제 입력·단일 추가 도구·IME 이동 차단·저장 quota 실패·네 점수/선택 조합·manual/quick 기록·불러오기 취소·기록/재열기·전체 문서 미수정 항목 비교·파일 왕복·읽기/편집 복귀·자동 메뉴 중단을 검사한다. 대부분 Host 경계 테스트는 별도 protocol ack harness를 사용하며 제품 렌더러가 아니다. 이름에 native가 있는 검사와 4화면 캡처는 실제 Ren’Py를 사용한다. 두 종류의 증거를 혼동하지 않는다. visualViewport를 모의 축소한 검사는 무대96px 투영·논리 구도 유지·동일 iframe·글 수정 유지/복귀를 확인했으며 삼성 실기기 검증은 아니다. 런타임 준비 실패 시 상단 메뉴로 편집에 복귀하는 검사도 포함한다.

## 검사 중 수정한 결함

- 전역 button 최소44px가 compact 바에 적용되던 문제를 명시적28px로 수정했다. 폰은 사용자 최신 조밀 배치 결정이 이전44px 행 방향보다 우선한다.
- 읽기 때 남은 작품 header가 하단 좌표를 밀던 문제를 제거했다.
- 도구 펼침의 dock 위치 변경이 revision을 올리지 않아 native에 전달되지 않던 문제를 수정했다.
- speaker pill이 본문 높이를 소비해 둘째 줄이 잘리던 문제를 floating label과 충분한 body viewport로 수정했다.
- 본문만 수정해도 `inheritActors:false`가 생기던 것을 RED3검사 후 수정했다. 글·소리·연출·Flow 편집이 무대 기본값을 새로 기록하지 않으며 기존 명시적 배치 편집은 유지한다. [회귀](evidence/approved-ui/preservation-fix.log).
- 번들 폰트에 없는 아래 화살표 글리프는 토큰에서 생성한 SVG로 바꿨다.

초기 실패 로그는 남겼으며 최신 통과 로그와 구분한다. 동시 Playwright 실행 중 trace 정리 ENOENT가 발생한 별도 리뷰 실행은 제품 성공 증거로 사용하지 않는다. 최종 순차 검증은 trace off로 수행했다.

## 완료로 주장하지 않는 항목

삼성 실기기 입력기·태블릿 분할/플로팅/외장 키보드, 스크린리더/모든 접근성·성능, 전체 과거 Host 회귀, 임의 장·컷 범위 연출/소리 계약, 저장 썸네일 캡처, 배포/온라인 서비스는 이번 개편 완료 범위가 아니다. 같은 논리 viewport에서 actor/background 불변은 Core 검사로 확인했지만 다른 편집/읽기 표시 크기의 화면이 픽셀 단위로 일치한다고 주장하지 않는다. 후속 목표의 의존성/완료 조건은 계획에서 관리한다.


## 2026-10-11 선택지의 미사용 점수 조작 정리

점수 없는 선택지에 반복 표시되던 결과/조건 입구를 숨겼다. 작품 점수 또는 기존 선택지 effects/condition이 있으면 해당 조작을 보여 준다. 점수 정의도 기존 routes도 없는 goto에는 점수 진행 조작을 숨긴다. 기존 저작 데이터는 수정/삭제/정규화하지 않는다. 프로젝트 점수 설정의 입구는 유지해 사용자가 필요할 때 명시적으로 점수를 추가할 수 있다. 단순히 선택지를 만드는 것으로 점수가 생기지 않는다.

[RED](evidence/optional-score-tools/red.log)는 점수 없는 선택지의 조작 입구가2개 남아 실패했다. 이후 [E2E13개](evidence/optional-score-tools/ui.log) 통과: 3화면 단일 추가 도구, IME/저장 실패 이동 보호, 점수·선택지4조합, 새 점수 추가→선택지 점수 변화→파일 내보내기→재열기, 기존 점수 편집/정수 검증, 4화면 글쓰기 및 메모 생성/복귀. 시뮬레이션 키보드 가림은 논리 장면·동일 iframe 유지도 확인한다. 실제 삼성 기기 검증은 아니다.

[별도 native 캡처](evidence/optional-score-tools/capture.log)1개 통과 후 [점수 없는 PC 선택지](evidence/optional-score-tools/choice-score-false-1280.png), [점수 있는 PC 선택지](evidence/optional-score-tools/choice-score-true-1280.png), [점수 없는 휴대폰](evidence/optional-score-tools/choice-score-false-390.png), [점수 있는 휴대폰](evidence/optional-score-tools/choice-score-true-390.png)을 보존했다. [타입](evidence/optional-score-tools/typecheck.log), [빌드](evidence/optional-score-tools/build-final.log), [lint](evidence/optional-score-tools/lint.log) 오류0. 독립 소스 전용 리뷰에서 차단 결함 없음. 공개 Google 시트·Excel 외부 편집·JSONB 계약을 변경하거나 새로 검증한 것으로 주장하지 않는다.

자기 점검: 정확성4(명시적 점수 생성·저작 데이터 보존), 완결성4(선택지의 미사용 점수 입구 정리·상단 전체 행동 분류 후속), 명료성4(문구/도착을 우선), 실행 가능성4(새 점수/결과 저장·파일·재열기), 간결성4(불필요한 반복 입구 제거). 평균4.0.
