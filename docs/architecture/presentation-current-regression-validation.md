# 현행 연출 미리보기·구도·native 복원 회귀 — 2026-10-14

[직전 현재 회귀](remaining-current-regression-validation.md)를 이어 현재139개 구간을 시작했다. 현행 문서8와 등록 자료만 사용하고 기존 미커밋 source/private/Pixabay·530음원23별칭·on-demand 전달을 유지한다. 모든 옛 형식 지원은 목표가 아니며 필요한 옛 저작 내용만 현재 형식으로 보존/변환한다. Excel ChatGPT 연결은 제외한다.

## 기준과 이행

[기준 로그](evidence/tail-current-2026-10-14/host.log)의 첫 presentation-polish 검사는 접힌 컷 목록의 flashback 버튼을 직접 누르다가 실패했다. 이후 preview-context9개는 통과했다. 확인된 실패를 먼저 이행/검증하기 위해139 실행을 **의도적으로 SIGINT 중단**했다. 완료 report가 없는 중단 실행이며 관찰된9통과/1실패/2project 제외와 진행 중 reading-surface1개를 전체 성공/완료로 해석하지 않는다. 수집 순서상 나머지126개는 미실행 구간이다. 중단 뒤 남은 검사 서버3110의 orphan PID를 확인하고 해당 owned server만 종료했다. user dev3000을 변경하지 않았다.

presentation-polish의 기존 원고 fixture와 before spec을 evidence에 보존했다. current `createStoryDocument`로 schema8/canonical Stage 기준을 잡고 현재 장·컷 select, 실제 heading, 추가 편집→연출→effects/look, 배경·인물→세부 배치, 보기 설정→동작 줄이기, 읽기 메뉴→이 컷 편집/재시작 확인을 사용한다. 옛 중첩 UI·큰 제목 입력·상시 버튼을 복원하지 않는다. 파일 가져오기는 독립 work ID를 만들므로 전체 content 비교에서 work ID/updatedAt만 구분한다.

## 보존한 검증

| 항목 | 현행 검증 |
|---|---|
| 편집 미리보기 | 실제 flashback 컷 재생→읽기 메뉴→같은 컷 복귀, 원고 전체/Stage 미변경; shake 강도/시작/0.8초 저작과 저장/export, 동작 줄이기 |
| native 자동 구도 | PC1280×900·세로390×844·가로844×390. viewport 모양으로 native 비율을 추정하지 않고 실제 보기 설정의 desktop/portrait/landscape 선택. actor handle 수·넓은 중앙 간격·Stage 내부 위치 유지 |
| 자유 배치 | 실제 stage 폭5% drag로 가로50→55 확인, 직접50 복원. single/fouractor count·overflow·같은 iframe·전체 exported content 보존 |
| 분위기 픽셀 | neutral과 flashback/fractured-reality의 실제 Ren’Py scenery 차이>1. 기존 sample/quantization·1px 이동 보정 방식과 threshold 유지 |
| 되돌림/재시작 | 같은 초점 상태의 neutral baseline과 back/restart 복원 차이<0.25. keyboard semantic 다음/이전 명령은 실제 focus/Enter 경로이고 capture 직전 같은 읽기 메뉴 focus로 접근 텍스트 overlay를 닫음 |
| 선택→엔딩 | native choicesRect와 scene scale/padding에서 실제 첫 선택 클릭. Core ending-a 도착을 명시 확인한 뒤 rendered ack와 다음/종료. 실제 reader restart 확인과 기본 장면 복원·전체 작품 불변 |

기존 pixel helper는 장면 scenery 영역의 sampled 차이 검사다. 이를 전체 RGBA 완전 일치 검사라고 주장하지 않는다. native UI·Core·문서·runtime source를 바꾸지 않았다. native 비율 선택은 기기 UI 상태이며 StoryDocument에 넣지 않는다.

## 실행 경계

첫 focused host는 중단 후 orphan port 점유로 수집 전에 실패했다. owned3110 서버를 종료한 뒤 [host 후속](evidence/tail-current-2026-10-14/polish-host-second.log)은1통과/2native 전용 제외다. 첫 native는 추가한 비율 label을 잘못 써서 의도적으로 중단했다. 현재 정확한 `미리보기 화면 비율`로 수정했다. [native 두 번째](evidence/tail-current-2026-10-14/polish-native-second.log)는2실패/1host 제외: 편집 배치 도구가 아닌 글 상태에서 handles를 기대했고 선택 직후 이전 rendered ack로 다음 명령을 너무 일찍 보냈다. 실제 배치 도구와 ending-a 도착/읽는 중 상태 확인으로 수정했다. [native 세 번째](evidence/tail-current-2026-10-14/polish-native-third.log)는2통과/1host 제외다.

[neutral 전/후 캡처를 포함한 최종 host/native 묶음](evidence/tail-current-2026-10-14/polish-final.log)은3통과/3반대 프로젝트 제외다(host1/native2). [관련 단위](evidence/tail-current-2026-10-14/related-unit.log)는5파일499개 통과다. E2E tsc·ESLint와 문서 링크도 통과했다. 변경은 spec/문서이며 새 product Web/runtime build나 전체 unit 실행을 주장하지 않는다. 다른 범위의 지난157파일1269 성공 수를 이번 실행의 수로 쓰지 않는다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| presentation-polish 현재 동선 | 이행·범위 검증 P1 | 현재 문서/도구·같은native | 원래 Stage/자유배치/pixel/복원/fullcontent 기준 유지한 host/native 최종 성공 |
| reading-surface와 나머지126 | 이행/미실행 P1 | 현재 reader menu·flow context·library | 실제 남은 구간 실행, 옛 locator 이행과 제품 결함 분류·수정, full collection 별도 실행 |
| UI-OPTIONAL-REVIEW | 부분 P1 | 현재 주요제작 동선/source 분류 | 필수 기능의 실제 사용·취소·파일/native 증거 및 필요성 판정; 모든 기능 상시노출/모든Ren’Py 도입 아님 |
| 삼성/물리 키보드·최초Chrome | 물리 미검증/조사 P1 | 실제 기기/재현 trace | viewport·키보드 명령·후속 native 성공을 물리/최초원인 해결로 대체하지 않음 |
| 새 외부 앱/배포 | 미실행 | 실제 환경·범위 | local codec/과거artifact와 새 결과 구분. Excel ChatGPT 연결은 의도적 제외 |
