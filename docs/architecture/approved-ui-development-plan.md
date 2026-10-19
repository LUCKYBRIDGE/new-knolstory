# 승인 도안 기반 편집·읽기 개편 실행 계획

2026-10-11. 사용자가 준비된 도안으로 실제 개발을 시작하도록 요청했으며, 통과하지 않은 비교안 대신 승인된 최종안을 사용하도록 지정했다. 이 계획은 [문서 관리](documentation-governance.md)에 따라 개편 범위와 검증을 소유한다. 현재 상태는 [STATUS](../../STATUS.md), UX는 [DESIGN](../../DESIGN.md)이다.

## 구현 입력 고정

[승인 기준 manifest](evidence/approved-ui/approved-manifest.json)는 실제 PNG를 독립 사본으로 보관하고 SHA-256을 고정한다. 이전 도안 생성기가 이 사본을 덮어쓰지 않는다. 편집 기준은 사용자가 최종 선택을 위임한 [최종 편집안](editor-redesign-final.md)과 [선택지·점수안](editor-choice-score-design.md), 읽기는 사용자가 하단 배치와 순서를 직접 승인한 [읽기안](reading-interface-design.md)이다. 개별 파생 이미지마다 사용자의 명시적 승인이 있었다고 주장하지 않는다. 사용자의 최신 수정이 이전 이미지보다 우선한다.

A/B/C 비교안, v3 gallery, 폐기된 키보드 그림은 구현 입력에서 제외한다. 삼성 키보드는 기준 제조사이지 확정 높이가 아니다. 실제 visualViewport/입력초점/가림 영역에 대응하며 고정 OS 높이를 사용하지 않는다.

## 구현·검증 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-REFERENCE | 완료 P1 | 사용자 최종 방향·하단·순서 결정 | 승인 기준 사본/hash, 제외안·미확정값 명시 |
| UI-EDITOR | 구현·범위 검증 완료 P1 | 기존 저장 guard·원고·Stage/Flow | 글·화자 주 입력, 앞뒤 컷 글과 쉬운 이동, 추가 도구 하나만 열림, PC/태블릿/휴대폰 실제 편집·저장·재열기 |
| UI-CHOICE | 구현·네 조합 검증 완료 P1 | 현행 score/Flow 계약 | 문구·도착·결과·조건 같은 카드, 네 독립 조합, 점수·선택지 자동 생성 없음 |
| UI-READER | 구현·범위 검증 완료 P1 | 현행 playback·슬롯 저장 | 확정된 순서/폰 접힘, 실제 빠른 슬롯·확인·취소, 자동의 native ack/전환/선택/메뉴/탭 중단, 저장 실패 보호 |
| UI-NATIVE | 구현·native 4화면 검증 완료 P1 | Core 보기 전용 dock·토큰·Ren’Py | 승인된 종이색 글 상자/화자 pill, 바와 native textbox 정렬, 편집/읽기 같은 presenter·자산, actor/crop/원고 보존 |
| UI-KEYBOARD | 가림 대응 구현 / 실기기 미검증 | visualViewport·IME·입력초점 | 가림 때 입력·컷 맥락 유지, 원고 좌표/viewport 의미 보존, 동일 iframe; 삼성 실기기 결과 별도 |
| UI-ROUNDTRIP | 파일/재열기 및 계약 회귀 완료 P1 | 위 UI 변경·현행 archive/workbook/JSONB | 실제 작품 편집→저장→파일 왕복→재열기→읽기→편집 복귀, 미수정 문서 의미 보존 |

## 범위와 책임

StoryDocument → Runtime Core → RuntimeScene → 단일 Ren’Py를 유지한다. 도안 HTML은 제품 Stage로 사용하지 않는다. Web은 메뉴와 편집 입력, Core는 경로·점수·배치 해석, Ren’Py는 native 글·장면·연출을 담당한다. UI 접힘·보기 옵션·읽기 기록은 작품 파일에 새 저작 항목으로 넣지 않는다. 기존 Asset ID·Flow·StageComposition·자유 배치와 원본/사본 보호를 유지한다.

읽기 quick 슬롯은 수동9번과 별개다. 이전 저장은 명시적으로 변환하고 손상/미래 형식은 원본을 덮지 않는다. 자동 넘기기는 자동 저장과 다르며 현재 native scene ack/전환/오디오 준비 뒤 시작한다. 메뉴·선택·확인·탭 숨김·실패에서는 멈추고 stale timer를 실행하지 않는다.

## 후속 계약 목표

2026-10-11 서재의 창문·책장 간격 요구와 고정 legacy의 추가 계승 조사를 반영했다. [편집 UX 계승 계획](legacy-editor-ux-improvement-plan.md)은 현재 구현을 재사용하며 작은 경로 맥락·대본/컷 왕복·기존 컷 메모·배치 가져오기를 우선한다. 승인 기본 작업면과 이 계획의 계약 후속 목표는 유지한다.

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-RANGE | 실제 종료 연결 진행 P1 | cue identity·경로/분기·컷 삭제/이동·다중 효과 충돌 정책 | 정확한 시작/끝 컷을 StoryDocument/Core/파일/workbook/JSONB/native에서 왕복 검증. 현재 following/maintain/stop과 혼동하거나 장식 버튼으로 노출하지 않음 |
| UI-THUMBNAIL | native 연결·범위 검증 P2 | native 캡처·용량·성능·슬롯 보관 | 실제 native 픽셀·320px/40KB·revision 보호·실패 fallback·저장/재열기/불러오기. 실기기 성능 별도. [검증](native-save-thumbnail-validation.md) |
| UI-SAMSUNG-DEVICE | 미검증 P2 | 대상 실제 Android 휴대폰·태블릿 | 표준/분할/플로팅/크기 변경·외장 키보드·가로세로·한글 조합 결과 기록 |

## 검증 기록

이번 변경의 단위/통합/Host/native 결과와 실제 제품 화면은 `evidence/approved-ui/`에 별도로 기록한다. 기존 이미지 생성 성공과 과거 제품 검증을 새 개편 완료 증거로 재사용하지 않는다. 빌드는 runtime:build → build → 검증 순서를 따른다.

현재 실행 결과와 실패/한계는 [개편 검증 기록](approved-ui-validation.md)에 연결한다. 후속 계약·실기기는 별도 완료 조건이며 전체 최종 도안 기능을 일괄 완료로 처리하지 않는다.

2026-10-11 목표 계속 실행: [컷 종료 범위 계약](cut-range-authoring-contract.md)에 문서7/표7·Core 종료·실제 UI 연결을 추가했다. 갈래 한정·시작 이동·효과음 일괄·외부 앱과 전체 회귀까지 남아 있어 전체 도안 구현 목표는 완료하지 않는다.


## 2026-10-11 사용자 중심 노출 우선순위 변경

사용자 결정: 모든 기능을 기본 화면에 제공하는 것보다 글쓰기·메모 참고·앞뒤 컷 맥락을 편하게 만드는 것이 우선이다. 기본은 현재 글과 짧은 인접 원고, 배경·인물이며 장 전체 대본/Flow 분석은 선택 작업이다. 추가 편집은 목적별 입구에서 해당 조정으로 바로 연결하고 중복 입구·상시 설명·불필요한 조작을 줄인다. 기존 기능 보존을 상시 노출 의무로 해석하지 않는다.

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-WRITING-FOCUS | 구현·범위 검증 P1 | 현행 컷 이동/IME/저장, 창작 메모, 기존 inspector | 기본 화면의 대본/분석/추가 도구 접힘, 앞뒤 짧은 글, 메모 참고, 통일된 조작 크기, 실제 글 편집·저장·재열기·파일 왕복·읽기 복귀. [증거 소유](editor-view-and-cut-notes-validation.md) |
| UI-OPTIONAL-REVIEW | 부분 P1 | 기본 글쓰기 및 목적별 추가 도구 | 선택지/점수·연출·소리의 사용 빈도/필요성에 따라 중복·중첩 조작을 추가 점검하고 주요 작업을 바로 조정 가능하게 검증. 전체 Ren’Py 기능 노출은 완료 조건이 아님 |

기존 상세 연출/저장 계약과 실기기 후속 조건은 유지한다. 작은 버튼 변경만으로 전체 승인 도안 목표를 완료하지 않는다.


UX-WORK-ACTIONS: 구현·범위 검증 P1. 작품 메뉴 통합, 목적별 info/planning/memo/score 설정, 같은 컷 복귀와 표지 취소 경로를 구현했다. [행동 분류](editor-redesign-completeness-audit.md)와 [실행 기록](editor-view-and-cut-notes-validation.md)이 근거다. 이전 all-in-one 준비 페이지의 locator/진입 동선을 새 목적 선택에 맞춰 회귀에 반영한다. 장 기본 설정은 기존 컷/장 작업이며 준비 페이지에 있었다고 추정해 복제하지 않는다.


| 후속 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-ENTRY-CREATE | 구현·범위 검증 P1 | 서재 새 작품 생성·현재 newStory·초기 저장/보호 사본 | 제목을 입력한 새 작품에서 필수 준비 단계를 다시 거치지 않고 현재 컷 글쓰기로 진입, 정보/표지/기획은 작품 메뉴로 선택, 생성→입력→저장→서재→재열기 보존 검증 |
| UX-REGRESSION-NAV | 부분 P1 | 제거된 editor 작품 선택/준비/관리 입구와 새 서재·작품 메뉴 | 과거70파일 계획과 현행78개spec의 직접 작품 선택·all-fields 준비 가정 전환과 관련 전체 회귀를 실행하고 실패를 수정/분류. 집중 검증만으로 전체 완료 선언 금지 |


UX-IMAGE-SELECT: 구현·범위 검증 P1. 의존성 기존 이미지 자료실·Asset ID·컷/장/표지 빈 값 계약. 완료 조건은 중복 catalog select를 제거한 단일 입구에서 그림/기본값/없음·현재/후보 비교·취소·초점·저장/재열기/파일·현재 무대 자료 이동을 실제 검증하는 것이다. 기존 테스트의 직접 selectOption(assetID)는 이미지 선택 창의 사용자 동선으로 옮겨야 한다. 이를 위해 숨겨진 catalog select를 남기지 않는다. 전문 필터·자료실과 직접 선택 동작은 제거하지 않고 기본 노출만 정리한다.


UX-DIRECTION-PURPOSE: 구현·범위 검증 P1. 의존성 기존 StoryPresentation/연출 시작 이동/인물 강조/전환/Core/native 계약. 완료 조건은 한 목적만 보이는 선택, 적용 상태, 기본에 불필요한 버튼 감소, 종류 전환의 원고/ID/Flow/배치 불변과 독립 취소, 실제 연출 입력→저장→파일→재열기→native→편집 복귀, 마지막 효과 시작 이동 후 undo/폼 상태 보존이다. 전체 구동선 검사 전환과 소리/전문 도구는 UI-OPTIONAL-REVIEW·UX-REGRESSION-NAV의 남은 범위다.


UX-SOUND-PURPOSE: 구현·범위 검증 P1. 의존성 기존 StoryAudio/채널·효과음·시작 이동/일괄 작업/Core/native 계약. 완료 조건은 목적 선택에 따른 한 영역, 유지/이어받기 구분, 종류별 변경 취소, 숨긴 미리 듣기 정지, 컷/장 scope guard, 실제 입력·파일·재열기·native 채널/효과음 재생·편집 복귀·시작 이동/일괄 undo 검증이다. 전문 자료 필터는 기본 접힘으로 제공한다.

| 후속 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-PREVIEW-CONTEXT | 구현·범위 검증 P1 | 현재 edit/play 수명·단일iframe·저장/IME guard | 읽기 확인 후 편집으로 돌아왔을 때 같은 컷의 도구 종류·draft/cursor·취소 기록을 보존하고 다른 컷/작품의 기록은 분리. mounted hidden/inert 편집과 scope별 focus/scroll 복원, 읽기 중 등록 selection 차단, 현재 읽기 컷/장 복귀 구현. 정상 blur 검증을 유지하고 전체 회귀·실기기 조건은 별도 |
| UX-SFX-LIST | 구현·범위 검증 P1 | 현재4개 효과음·소리 metadata·미리 듣기 | 여러 효과음이 있을 때 현재 조정하는 항목을 찾기 쉽고 전체4개 상세/미리 듣기를 상시 펼치지 않음. 순서·ID·지연·미리 듣기 멈춤·추가/삭제/undo·파일 보존 검증 |


2026-10-12 재점검: 서재의 포괄 ‘작품 관리’를 ‘책 찾기·추가’로 변경했다. 최신 [목적별 판정과 후속 UX-MENU-PURPOSE/UX-FILE-WORDING](editor-redesign-completeness-audit.md)을 따른다. 제목·표지/기획/메모/점수 기능은 선택적 작업으로 유지하고 ‘준비’ 필수 절차를 복원하지 않는다.


UX-MENU-PURPOSE (2026-10-12): 직접 보이는 설정/파일·저장 구획과 가져오기 전 저장·IME 보호, 파일/공개 시트의 같은 확인창·독립 사본 적용을 구현하고 네 viewport 범위 회귀를 확인했다. 작은 구획/목적 안내 외에 상단 버튼이나 메뉴의 추가 펼침 단계는 늘리지 않는다. 공개 시트의 비동기 결과는 최신 원고 상태를 사용한다. 구형 공개 시트도 공식 파일의 순수 확인·적용 경로에 연결하고, 같은 원래 ID/첨부 확인 전 미저장/실패·최신 원고 보존을 검사했다.


2026-10-12 UX-PREVIEW-CONTEXT: 같은 컷의 편집 목적/검색·펼침·검증 상태/undo/글 선택을 native 읽기 왕복에 유지했다. 읽기 컷이 달라지면 이전 기록을 적용하지 않고 장 전체 보기의 장도 현재 읽기 컷으로 맞춘다. 실행과 실패·소스 리뷰는 [현행 기록](editor-view-and-cut-notes-validation.md)의 최신 절을 따른다. 새 상단 입구나 파일 필드는 추가하지 않는다.


2026-10-12 UX-SFX-LIST: 효과음 비교 목록과 선택 상세, 새 항목 자동 선택·ID 선택·삭제/종류별undo, inactive 미리 듣기 중지, 공유 등록/이름 목록 갱신·필드별 초안 보존을 구현했다. 네 viewport와 파일/native/재열기, 공유 속성 저장·정규화 경계를 범위 검증했다. 순서/Asset ID/기존4개 한도는 바꾸지 않는다. [실행](editor-view-and-cut-notes-validation.md).


UX-FILE-WORDING (2026-10-12): 구현·범위 검증 P1. 서재/편집/설정의 동일 파일 내보내기, 기기 수동 저장/기록 다운로드/미저장 초안의 구분과 설정의 공유 작품 메뉴를 적용했다. 별도 설정 파일 버튼과 복구 패널은 제거하고 활성 메뉴1개·parked native 유지·출처/메모/컷 복귀·IME/손상 원본 보호를 검사한다. [검증](editor-view-and-cut-notes-validation.md). 관련 기존 E2E의 행동 이름을 새 표현에 맞췄지만 아직 전체 과거 진입 가정의 통과를 주장하지 않는다.


2026-10-12 UX-REGRESSION-NAV 저장·복구: 현재 메뉴/목적별 설정·text-first 초안으로 기존6개를 이행하고 독립 복구 내용/ID와 재개 탭 충돌을 추가 검증했다. [실행](editor-view-and-cut-notes-validation.md)과 [현행 AST inventory](evidence/recovery-navigation/remaining-selectors.json)를 따른다. 현행78spec 중 직접 작품 선택 동작5파일, 작품 준비 버튼 동작2파일이 남으며 absence 검사2개는 제외했다. AST 패턴 수를 전체 UI 전환 완료 증거로 쓰지 않는다.

UX-BFCACHE: 미검증 P2. 의존성 실제 브라우저의 캐시 eligibility/탭 수명과 저장 guard. 완료 조건은 실제 뒤로/앞으로 캐시 복원에서 글/컷/초안과 권한 해제·재획득·외부 수정 거절을 확인하는 것이다. 현재 합성 pagehide/pageshow+Web Locks 검증은 이 전체 조건의 완료가 아니다.


2026-10-12 범위 변경 MEDIA-CATALOG-ONLY: 사용자 결정으로 개인 그림/음원 업로드는 의도적 제외다. 등록 catalog만 picker에서 선택하며 새 작품파일/시트의 외부 bytes/참조는 거부한다. 기존 저장 작품은 손실 없이 보존한다. 과거 사용자 업로드·등록 대기 E2E는 허용 기능을 되살리는 요건이 아니라 새 거부 정책으로 전환할 회귀다. 상태 P1/Web 구현·검증 중, 의존성 catalog/import gate, 완료 조건 UI 업로드 부재와 확인 전 거부/원고 보존·등록 자료의 파일 왕복, 미래 서버는 별도 미구현 gate.

2026-10-12 UX-REGRESSION-NAV 소리 속성: authoring-audio-metadata의 제거된 작품 선택과 개인 첨부 허용 가정을 새 catalog-only 거부3조건으로 전환했다. 이전 기대 소스와 현행 실행은 [검증 기록](editor-view-and-cut-notes-validation.md)에 보존한다. 기존 저수준 metadata/bytes/순서 보존은 유지하며 개인 upload/pending/shared-upload E2E의 남은 전환 및 기존 저장 private cue의 실제 보관함 재열기/export 검증을 후속 완료조건으로 남긴다.

UX-CHOICE-DENSITY (2026-10-12): 구현·범위 검증 P1. 의존성 기존 Flow 선택지2~4 규칙·점수/조건 편집과 작품 메뉴. 완료 조건은 사용할 수 없는 추가/삭제 버튼 부재, 점수 없는 선택지의 문구/도착/추가/삭제·ID/원고/파일/reload 보존, 기존 점수 정의 편집 유지와 네 viewport 가독성이다. 점수/조건을 쓰는 작품의 표현력이나 schema는 줄이지 않는다. [검증](editor-view-and-cut-notes-validation.md).

UX-MANUSCRIPT-FOCUS (2026-10-12): 구현·범위 검증 P1. 의존성 ChapterWriter의 현재 선택/원고 Core split·merge·move·delete 계약. 완료 조건은 한 본문 선택 입구와 명확한 경계, 선택 컷만의 편집 화면 이동, 실행 불가능한 정렬/합치기/마지막 삭제 부재, 한국어·줄바꿈·이모지·cut ID/Flow·배치·메모·파일 왕복 보존과 다섯 viewport 실행이다. [검증](editor-view-and-cut-notes-validation.md).

2026-10-12 UX-REGRESSION-NAV 흐름: 지도 편집·긴작품 후반 검색·native6경로를 현행 서재/판본/목적 도구/파일·읽기 메뉴로 전환하고3개 검사(의도적 projectskip3개 별도)를 통과했다. [실행](editor-view-and-cut-notes-validation.md), [현행80spec AST inventory](evidence/flow-navigation/remaining-selectors.json)가 근거다. 직접 작품 선택은3파일, 준비 버튼 동작2파일이 남으며 전체 회귀/실기기 완료를 주장하지 않는다.

UX-GUIDE-ACTIONS (2026-10-12): 구현·범위 검증 P1. 의존성 현재 작업 버튼/소리 catalog-only 정책/읽기 복귀와 기존 도움말. 기기/작품/기록 파일의 목적별 검색·이전 alias, 외부 업로드 안내 폐기, 실제 읽기 컷 복귀를 설명하고 네 viewport/표지 parent/ShortStory 초안·Esc/focus를 검증했다. [기록](editor-view-and-cut-notes-validation.md). 전체UX-REGRESSION-NAV 완료를 뜻하지 않는다.

2026-10-12 UX-REGRESSION-NAV 서재: local-library의 기획 선택 사항·이전 기기 작품2검사를 현행 text-first/작품 메뉴/화면별 저장 상태로 이행했다. 기존 저장12컷의 전체 project와 외부 audioResources 파일 내보내기 보존을 통과했다. [기록](editor-view-and-cut-notes-validation.md). 남은 같은 파일3검사의 상태는 미이행 P1, 의존성 보호 저장 guard·현재 복구 사본·catalog-only import·native runtime이다. 완료 조건은 손상 raw/복구 export와 중복 사본 독립성 assertion을 보존한 현재 동선 전환, 외부 첨부 신규 import 거부와 등록 자료 rich fixture 왕복, native 작품 전환/읽기 복귀 검증이다.

2026-10-12 서재 후속: host의 손상 초안/복구 및 중복 가져오기2검사까지 이행했다. 수동 저장의 손상 raw 덮어쓰기를 막되 새 초안 글쓰기·파일 내보내기는 유지한다. 관련18개 성공은 전체 실행17개와 메뉴 재열기를 고친 복구 재검사1개로 구분한다. [기록](editor-view-and-cut-notes-validation.md). 같은 파일의 남은1개는 미이행 P1/native 통합, 의존성 현재 목적별 설정·이미지 picker·등록 자료 파일·읽기 메뉴·컷 이동이다. 완료 조건은 기존3작품 내용·표지/기획/메모·파일 왕복·작품별 컷/읽기 위치와 PC/태블릿/휴대폰 native 재생/편집 복귀 assertion을 보존해 현행 동선으로 검증하는 것이다. 전체 UX-REGRESSION-NAV의 다른 파일도 후속에 유지한다.

2026-10-12 native 서재 후속: 같은 파일의 긴 통합1개도 현행 메뉴로 이행해 bundled Chromium과 설치 Chrome에서 실제 선택지/저장/독립 읽기 위치/읽은 컷 편집/파일 왕복을 확인했다. 정보·기획·메모의3 viewport 선택과 기존 원고 전체 비교를 유지했다. 메모 sticky 복귀의 안내 글 겹침과 추가 버튼 stretch를 실제 geometry RED 후 수정했다. [기록](editor-view-and-cut-notes-validation.md). 이 서재 검사 이행은 범위 검증 완료 P1이며 다른 spec의 전체 회귀와 실기기 목표를 대체하지 않는다.

UX-NATIVE-ERROR: 조사 중 P1. 의존성 설치 Chrome154/실제 native 입력·여러 context/읽기 재개와 앱 예외 수집이다. 최초 Chrome 실행에서 읽기 중 앱 오류 화면이 관찰됐지만 수집을 추가한 이후3개 실행에서는 재현되지 않았다. 완료 조건은 최초 현상의 원인 또는 테스트/환경 오류를 구분하는 근거를 확보하고 필요 시 제품 수정·재현 회귀를 실행하는 것이다. 후속 성공만으로 최초 실패를 해결 처리하지 않는다. 별도 renderer로 우회하지 않는다.

2026-10-12 UX-NATIVE-ERROR 후속: 직접 만든 context의 반복별 이벤트/trace 수집을 보강한 Chrome4반복도 최초 오류를 재현하지 않았다. [진단/오류 경계 기록](editor-view-and-cut-notes-validation.md). 렌더 시 project/playback 불일치 및 입력 경합은 source 검토의 가설이며 확정 원인이 아니다. 상태 updater의 별도 되돌림 예외 경로는 아래 목표에서 처리했지만 최초 오류 조사는 유지한다.

UX-READER-REWIND: 구현·범위 검증 P1. 의존성 Core back/score/compile 계약·텍스트 접근 영역·현재 읽기 상태다. 완료 조건은 한 ‘이전 읽은 컷’ 입구와 처음/종료 가용성, 상태 updater 밖의 오류 경계, 실패 시 원고·경로 보존, 정상 선택/점수 되돌림·실제 native 재선택이다. 단위6개와 실제 Chrome 동선을 통과했다. [기록](editor-view-and-cut-notes-validation.md). 관련7spec의13호출을 현재 helper로 이행했으며 그 spec의 다른 구동선과 전체 회귀는 UX-REGRESSION-NAV에 남긴다.

UX-SCORE-ROUTES: 구현·범위 검증 P1. 의존성 Core의 조건 우선순위/orderedLines와 domain 장·컷 표기, 현재 작품 메뉴·파일/시트 왕복이다. 완료 조건은 실행 가능한 방향만 노출, 이동 시 ID/조건/대상 보존, 같은 대사의 다른 장 구분, 선택 결과·진행 조건의 편집/파일/Excel/reload 및 읽기 점수·조건 분기/되돌림이다. 현재 score-narrative7개 성공은 전체 실행6개와 갈래 표기 기대를 바로잡은 대상 재검사1개로 구분한다. [기록](editor-view-and-cut-notes-validation.md). 옛 Excel/Google 편집 증거 파일을 이번에 외부 앱에서 새로 편집한 것으로 주장하지 않는다.

2026-10-12 오류 우선 분석: 사용자의 현재 질문에 따라 확정 제품 결함, 검사 가정/설정 오류, 재현되지 않은 최초 Chrome 오류를 구분한다. 빌드와 확인된 저작/읽기 동선은 계속 검증할 수 있다. UX-NATIVE-ERROR의 원인 판정과 전체 목표 완료는 보류하며 성공한 다른 검사를 최초 오류 해결의 근거로 쓰지 않는다. 새 기능 확장보다 이미 수정한 동작의 검증과 원인 구분에 집중한다.

2026-10-13 UX-NATIVE-ERROR 후속: 테스트 전용 선택적 caught-exception 포착과 합성 probe 검증을 추가했다. 읽기 진입 전부터 수집한 실제 Chrome 통합도 최초 현상을 재현하지 않았다. [진단 검증](editor-view-and-cut-notes-validation.md)의 범위와 제한을 따른다. 상태는 조사 중 P1, 완료 조건은 기존 원인 판정/필요한 수정·회귀 조건을 유지한다.

UX-GLOBAL-SCORE-SETTINGS: 구현·범위 검증 P1. 의존성은 작품 메뉴의 목적별 설정과 선택지 편집 복귀 맥락이다. 전역 `ProjectScoreEditor`의 소유 화면을 작품 설정의 ‘이야기 점수’로 단일화하고 작품 메뉴에서 직접 접근한다. 선택지 편집에는 선택별 점수 변화·표시 조건과 점수 설정으로 가는 짧은 이동만 남겼다. 점수 생성 뒤 원래 컷/선택지 도구/입력 맥락으로 돌아오며 기존 점수 ID·조건·Flow와 파일 왕복을 보존한다. [검증 기록](editor-view-and-cut-notes-validation.md)을 따른다. 전체 회귀/실기기와 최초 Chrome 오류 원인 판정은 별도 목표에 남는다.

2026-10-13 UX-GLOBAL-SCORE-SETTINGS 최종 후속: 단일 점수 정의 소유 화면과 목적별 작품 메뉴, 원래 컷·도구 복귀를 구현·범위 검증했다. [최종 기록](editor-view-and-cut-notes-validation.md)의14개 회귀와 scoped coverage가 근거다. 원고 전체 보존·점수 없는 선택지·파일/reload와 native 점수4동선을 확인했으며 schema/Core/Ren’Py 계약은 바꾸지 않았다. 다른 설정·추가 편집의 밀도와 전체 UX 완료는 별도 후속에 남긴다.

UX-TOOL-NAVIGATION: 구현·범위 검증 P1. 의존성 기본/추가 편집 상태·한글 조합 감지·내부 인물 배치 이동·native 미리보기 복귀다. 완료 조건은 기본 줄의 같은 글 복귀 중복 제거, 멀리 있는 추가 도구 닫기 유지, 편집 영역 전체의 한글 입력 보호와 완료 후 재시도, 네 viewport에서 원고 전체·재열기 및 native 도구/취소·커서 복귀 보존이다. StoryDocument나 저장 계약을 바꾸지 않는다. [현재 검증](editor-view-and-cut-notes-validation.md). 모바일 기존 spec의 제거 버튼 호출은 글 버튼으로 이행하며 전체 old 동선의 통과를 주장하지 않는다. UI-OPTIONAL-REVIEW의 다른 추가 편집 밀도/중첩 조작과 전체 UX 목표는 유지한다.

2026-10-13 UX-TOOL-NAVIGATION 검증: 변경 전 대사/선택 문구 RED와 후속 안내 RED를 보존했다. 관련19개 통과 후 안내만의 선택적 해제·현재 native 장면 캡처를 보강한 최종 빌드7개도 통과했다. [증거](editor-view-and-cut-notes-validation.md). 물리 삼성 입력과 전체 회귀는 UX-REGRESSION-NAV의 별도 한계로 남긴다.

UX-APPEARANCE-CONTEXT: 구현·범위 검증 P1. 의존성 Core의 현재 StageComposition, 기존 side presentation, 등록 이미지 picker 및 native per-actor 표현이다. 완료 조건은 인물 없음/한쪽/양쪽/저장된 빈 쪽을 구분한 조정, 배치로 직접 이동 후 실제 등록 이미지 적용, 열기만으로 원고/기존 설정 미변경, 편집·파일/reload와 native 전체 그룹 적용, 직접 배치·legacy 위치/방향·반대쪽 보존이다. 조사 중 확인된 첫 인물만의 appearance 적용 결함도 같은 계약에서 수정한다. schema와 새 자산은 추가하지 않는다. [검증 소유](editor-view-and-cut-notes-validation.md). 다른 추가 기능의 밀도/중첩과 실기기·전체 회귀 후속은 유지한다.

UX-REGRESSION-NAV 연출 후속 P1: `non-audio-direction-ui.spec.ts`는 옛 준비/전체 도구/appearance summary/읽기 이름을 사용한다. 의존성 현행 목적별 설정·연출 selector·inline 조정·읽기 메뉴다. 완료 조건은 기존 여러 효과/시작/반복/취소/자유 배치·전체 파일·재열기·읽기 복귀 assertion을 유지한 현행 동선 전환이다. 새 조정을 옛 중첩 UI로 되돌리는 방식으로 검사를 통과시키지 않는다. 최초 Chrome 오류와 실기기/전체 회귀는 기존 상태를 유지한다.

## 2026-10-13 현재 로컬판 이어가기

UX-REGRESSION-NAV 연출 후속은 compact 목적 선택/inline 인물/읽기 메뉴로 이관했다. 시간·순서·반복·취소·대상 reset·오류 입력·전체 문서/배치·파일/reload/native 복귀를 유지한다. UX-CONTEXT의 사용자 선택 편집 방문 복귀도 기기 UI 상태로 구현했다. [이번 분류·실행](current-ui-continuation-validation.md)이 최신 근거다. 후속에는 전체 현행 spec 이행, 갈래 한정 범위/실제 외부 앱 범위, 삼성/학교 기기·보조 기술, 최초 Chrome 오류 원인, 배포·서버의 개별 완료 조건을 유지한다. 과거 성공 수를 이번 전체 성공으로 합산하지 않는다.

UX-BRANCH-WRITE (2026-10-13): 미연결 선택지의 새 갈래 확인/취소·저장 실패/retry와 빈 글 직접 진입, 실제 origin 방문 복귀를 구현했다. [실행](branch-writing-validation.md)의 전체 원고/배치·파일/표/JSONB/native 범위와 실기기/외부 앱 한계를 따른다. 갈래 한정 연출 실행과 전체 기존 회귀 이행은 별도 후속이다.

2026-10-14 범위 결정: 사용자 요청으로 Excel 추가 기능을 통한 ChatGPT 설치/로그인/연결 및 live 수정 검증은 이번 개발에서 제외한다. 파일/workbook/Google/JSONB 저작 계약과 기존 작품 보존을 유지하며 로컬 구현·실제 Ren’Py/파일 회귀를 계속한다. 연결 준비는 local completion gate가 아니다. 새 실제 외부 앱 편집 결과와 로컬 양식/기존 외부 반출물 검증은 계속 구분한다. [현재 기록](range-external-preparation-validation.md).

UI-CHAPTER-RANGE (2026-10-14): 기존 문서/Core에 있던 장 기본 소리 종료점을 장 편집/취소에 연결하고 잘못된 컷 한정 양식 안내를 수정했다. [이번 실제 범위 검증](chapter-audio-range-validation.md)을 따르며 기존 끝 포함·우회·재진입·파일/원고 보존 의미를 유지한다. Excel ChatGPT 연결은 제외, 갈래 한정 범위와 실기기/새 외부 앱 실행은 별도 후속이다.

UI-RANGE-BRANCH (2026-10-14): 구현·로컬 범위 검증 P1. 의존성 정확한 선택지 ID·Core choiceHistory·문서8/표8 migration·cue별 취소/파일 보호다. 완료 조건은 같은 도착 컷의 선택별 효과/배경음/주변 소리/효과음, 재진입/재선택/되돌림, 원고/배치 전체·파일/양식/JSONB·native 복귀 및 삭제/오류 guard다. [계약](branch-scope-authoring-contract.md), [실행](branch-scope-validation.md). 물리 기기·최초 Chrome 원인·전체 기존 회귀·새 외부 앱/배포는 별도 gate를 유지한다.

UX-REGRESSION-NAV (2026-10-14 최신): host 기준74통과/4확인된 옛 경로를 보존하고 private/공용 소리·장 identity·인물 구도를 현재 동선으로 이행했다. 최종host8/native5는 해당 범위이며 전체 collection384 성공이 아니다. [이번 분류/증거/잔여 조건](current-regression-migration-validation.md)을 따른다. 다음 P1은 남은 현재 collection과 native spec 이행이다. 의존성 현재 메뉴/자료 선택·저장/읽기 상태이며 완료 조건은 기존 core assertions와 전체 내용/파일/실제 읽기 복귀를 보존한 current 실행이다. 실기기/새 외부 앱/배포는 별도 gate, Excel ChatGPT 연결은 제외한다.

2026-10-14 UX-REGRESSION-NAV 대본 후속: 대본/화자/등록 이미지/컷 복제·다른 장 이동의 현재 동선을 이행하고 원래 엔딩 Flow 손실 결함을 수정했다. 복제본 자기 참조와 외부 참조 보호는 현행 문서 계약에서 검증하며 새 schema를 만들지 않는다. [현재 검증·목표 상태·의존성·완료 조건](manuscript-authoring-continuation-validation.md). 이 범위는 전체 회귀 및 실기기/Chrome 원인/외부 앱/배포 완료를 대체하지 않는다.

2026-10-14 UX-REGRESSION-NAV 전체 재실행 기준은129통과/6실패/3제외/246미실행이다. 현재 사용자 결정에 따라 모든 옛 양식 지원 대신 필요한 저작 내용을 현행8판으로 변환하고 옛 동선을 현재 UI로 이행한다. [현재 실행·후속 조건](full-current-regression-validation.md). 전체 회귀 성공/물리 기기 검증을 이 기준 실행으로 주장하지 않는다.

2026-10-14 UX-REGRESSION-NAV 나머지:221개 기준70통과/6실패/6제외/139미실행 뒤 한글/기존 출처/메모/휴대폰/Pixabay6동선을 이행했다. UI-OPTIONAL-REVIEW source 점검에서 핵심 제작 경로는 연결됐고 점수 없는 선택 상세 숨김·cue별 조건·필요시 시작 이동/일괄은 현재 정책으로 유지한다. 실제 focused 결과와 남은139/full collection·물리/외부/원인 조건은 [최신 검증](remaining-current-regression-validation.md)을 따른다.

2026-10-14 UX-REGRESSION-NAV 연출 미리보기: current8·컷select·목적별effects/look·세부배치·reader메뉴로 presentation-polish를 이행했다. 실제native역drag/구도/pixel/back/restart와 전체내용 보존을 유지한다. [범위실행·다음126·완료조건](presentation-current-regression-validation.md). 집중성공을fullcollection으로합산하지않는다.

2026-10-14 UX-REGRESSION-NAV 읽기: current reading-surface host5/native4 검증 완료. mock503 실패복귀와실제native하단/접힘/순서를구분하며전체원고보존을확인한다. 새4검사로host388 collection이며나머지121/full388·실기기/외부/최초Chrome 목표는별도로유지한다. [실행·의존성·완료조건](reader-current-regression-validation.md).

2026-10-14 UX-REGRESSION-NAV 작품 전환: stories12개를 현행 서재·보호 사본·파일 메뉴·현재 읽기/semantic되돌림으로 이행하고 전체내용/독립성·재개를 검증했다. 초기probe3개는 실험 화면의 실제 패널 이름만 교정했다. [실행·분류·다음조건](work-switch-current-regression-validation.md). 다음 구간은 실제122 수집이며 이전121 추정과 구분한다. 전체388·물리/외부/최초Chrome 원인 목표는 유지한다.

2026-10-14 UX-REGRESSION-NAV 공유 자료/배치: 기준102개27통과/6실패/4제외/65미실행의6실패를 현재 정책/동선으로 이행했다. 최종8성공은 공유 dirty draft/bytes·지연 거부·그림책·4viewport 배치 범위다. 옛 신규 private 등록 성공은 의도적 제외이며 current forbidden import 보호와 기존 기기 보존으로 검증 의미를 구분한다. [상태·의존성·완료 조건](shared-media-staging-current-validation.md). 남은65/full388은 별도다.

2026-10-14 UX-REGRESSION-NAV 도구 경계:63개 기준14통과/6실패/43미실행을 보존하고 현재 패널/점수 왕복/native 선택/undo/종료 범위를 이행해16개 한 실행을 통과했다. 남은40개 구간과 전체388을 이어간다. UI-OPTIONAL-REVIEW의 숨김 정책을 검사 조건으로 명시한다. 상태·우선순위·의존성·완료 조건은 [현재 검증](ui-clarity-current-regression-validation.md)을 따른다. 전체388/삼성/외부/최초Chrome는 별도다.

2026-10-14 UX-REGRESSION-NAV 파일/읽기: 마지막40개 기준34통과/3실패/3native 전용 제외를 보존했다. 새 첨부 허용의 옛 기대는 의도적 제외이며 기존 기기 private/현재 등록 사본·진행 중 원고와 저장 실패/취소·native 슬롯/지난기록/양 갈래를 이행해host3/native3 성공했다. 전체388은 별도 실행 중이다. 상태·우선순위·의존성·완료 조건은 [최신 검증](reader-file-current-regression-validation.md)을 따른다.

2026-10-14 UI-OPTIONAL-REVIEW 현재 source/실행 대조는 [기존 감사의 최신 판정](editor-redesign-completeness-audit.md)을 따른다. 필수 제작 기능은 구현돼 있고 native-only/전체 회귀가 남은 부분 P1이다. 여덟 판본/점수/창작여정 native 동선의 실제 RED→이행→whole-document/슬롯/갈래/복귀 확인 없이 완료로 올리지 않는다.
