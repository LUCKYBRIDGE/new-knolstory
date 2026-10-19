# 나머지 현재 편집 회귀·한글/기존 자료/휴대폰 — 2026-10-14

직전 [현재 형식 우선 실행](full-current-regression-validation.md)을 이어 현재 static build에서221검사를 실행했다. 새 음원 취득/ZIP 재생성/외부 업로드·Excel ChatGPT 연결은 제외하며 기존530개/23별칭·private 보존·Pixabay14 장면 결합 정책을 유지한다. 현재 형식이 기준이며 필요한 과거 내용만 명시적으로 현재8판 사본으로 옮긴다.

## 실제 기준과 실패 분류

[기준 실행](evidence/remaining-current-2026-10-14/host.log)은70통과/6실패/6프로젝트 제외/139미실행으로 max-failures6에서 종료됐다. 검사 외 오류1개 표기도 그대로 보존한다. 이전129개 성공이나 새 focused 성공을 합산해 full384 성공으로 주장하지 않는다. 실패 원본/trace/context는 baseline-artifacts와 before source 사본에 남겼다. Korean 두 검사를 마친 뒤 해당 spec을 이행했으며, 출처·메모·mobile도 각각 baseline 실패 후 이행했다. 이후 미실행 구간을 최신 spec 결과로 추정하지 않는다.

| 항목 | 판단 | 현행 처리 |
|---|---|---|
| 한글 Excel/Google2 | 신규 private 첨부 기대는 의도적 제외·필요한 내용 변환 | 원본 거부·기존 작품 전체 불변, 현행8판 registered 사본의 한글 narration·전체 document/파일/reload |
| 기존 출처 자료 | 보존 기능 구현됨·옛 업로드 동선 | 실제 이전 기기 snapshot의 원본 bytes/ID/권리 기록 편집·저장/export/reload·다른 이전 기기 snapshot 보존. 신규 file attachment는 별도 거부 |
| 창작 메모 | 구현됨·접힌 메뉴 옛 경로 | 실제 작품 메뉴 export. 같은 이름 필드/이름 변경/순서/삭제 undo/검색·필터/5viewport를 유지하고 fresh import 전체 project 비교 추가 |
| 휴대폰 글·배치·파일·두 갈래 | 구현됨·옛 생성/select/읽기 동선 | 실제 서재 생성·등록 썸네일·현재 컷 select·추가 도구·파일 준비에서 글 복귀·native choice rect·현재 읽기 메뉴 |
| Pixabay3채널 | 정책/재생 구현됨·소리 목적 동선 | music/ambience/SFX별 실제 목적과 접힌 찾기, 조건 출처/원음 미첨부, CC0 preview 후 원래 cue 음량 명시 복원, native 정확 경로/once counters 유지 |

## 기존 private 기록과 현재 변환

출처 검사는 기존 기기의 synthetic WAV와 schema7 snapshot/IDB 두 store를 격리된 브라우저에 준비한다. 새 업로드 입구가 아니다. 실제 현재 UI에서 출처/라이선스/생성 요금제/출처 표시/재배포/상업 이용 조건을 저장하며 원고 전체, source bytes/base64/해시 기반 custom ID와 export/reload를 비교한다. 새 브라우저의 private file import는 확인창 이전에 거부되고 그 브라우저의 기존 작품은 바뀌지 않는다. 실제 내보낸 project/resources로 다른 **이전 기기 snapshot**을 준비해 같은 bytes·기록·legacy key 보존을 확인한다. 이를 신규 기기로의 허용된 private 파일 가져오기 성공이라고 부르지 않는다. synthetic 권리 기록을 실제 법적 권리 승인으로 주장하지 않는다.

한글 파일2개는 codec에서 현재 schema8/workbook8로 변환하고 private source ID만 registered forest/chime으로 바꾼 명시적 검사 사본이다. 원본 SHA/bytes/object·나머지 전체 content는 보존한다. 공통 fixture로 기존4개 변환의 코드를 공유하며 일반 unit 실행은 증거를 쓰지 않는다. Korean 생성은 별도 `KNOL_WRITE_KOREAN_COPIES=1`과 새 evidence directory를 사용한다. [codec6검사](evidence/remaining-current-2026-10-14/korean-codecs.log), [full-unit 전 해시](evidence/remaining-current-2026-10-14/copied-inputs-before-unit.json), [후 일치 확인](evidence/remaining-current-2026-10-14/copied-inputs-after-unit.json). 실제 외부 앱에서 새로 편집한 결과는 아니다.

## 휴대폰 geometry와 입력 범위

[최초 이행](evidence/remaining-current-2026-10-14/migrated-first.log)은4통과/2실패/1native 제외다. stage.bottom=-63.95는 글을 보기 위해 스크롤한 좁은 현재 편집 문서에서 발생했다. [두 번째](evidence/remaining-current-2026-10-14/migrated-second.log)의 editor parent.y=-329.45도 전체 문서 상단을 viewport에 고정한다는 옛 가정이었다. 현재 승인안의 장면→앞 컷→글→다음 컷과 좁은 가로/세로의 scroll 문서 구조를 따른다.

넓은 화면의 동시 stage 가시성은 유지한다. 좁은 화면에서는 원래 panel/field 교집합 및 overflow/iframe 검사를 유지하면서 **textarea 전체가 viewport와 실제 parent 교집합 안에 들어오는지** 더 강하게 검사하고, stage와 input을 각각 실제 scroll로 확인한다. stage/input을 가리지 않게 제품 전체 padding을 늘리거나 옛 고정 pane으로 바꾸지 않았다.44px touch target, focus/Tab/Enter/Escape, 원고/화자/선택·순서·저장/파일·독립 사본 전체 비교를 유지한다. 매 viewport의 실제 rect와 scrollY는 editor-geometries.jsonl에 기록한다. [보정 host](evidence/remaining-current-2026-10-14/mobile-host-third.log)는1통과/1native 제외다.

native 검사는 실제 이미지의150개 초과 색상, 같은 iframe, 두 실제 선택/엔딩, 원래Flow와 전체 project, 두 번째 엔딩 컷으로 편집 복귀를 확인한다. 터치는 추정 textbox 위치 대신 Ren’Py가 보고한 choicesRect를 사용한다. 다음 진행은 실제 focus/Enter 경로를 사용하므로 터치 선택과 키보드 명령을 구분한다. 이것은 물리 삼성 키보드 검증이 아니다. 별도 IME 보호는 기존 approved/editor navigation 검사 범위이며 이 mobile spec에 없던 IME 검사를 제거했다고 주장하지 않는다.

## 선택 기능의 현재 판정

독립 읽기 전용 source 검토에서 효과 시간/대상/범위/끝/갈래/순서/반복/취소, 소리3목적/시작 이동/일괄, choice/score 정의·결과·조건과 실제 Core 연결은 구현됨으로 확인했다. source 검토는 browser/native 완료 증거를 대신하지 않는다.

점수가 없으면 빈 선택 결과·조건 상세를 숨기고 선택지 도구의 단일 점수 설정 입구를 사용하는 것은 choice-only 밀도·자동 점수 생성 금지에 맞춘 의도적 조정이다. 서로 다른 cue의 갈래 조건은 별도 저작 참조로 유지한다. 시작 이동/일괄은 필요한 때 목적 이름으로 펼친다. 더 많은 중복 버튼/상시 패널을 추가하지 않는다. expression/camera/timeline은 기존 P2 후보이며 이 검토로 필수 기능이나 전체 Ren’Py 도입으로 확대하지 않는다.

## 최종 실행과 남은 조건

[최종 host](evidence/remaining-current-2026-10-14/host-final.log)는6통과/1native 전용 제외다. [휴대폰 native 최종 보정](evidence/remaining-current-2026-10-14/mobile-native-fourth.log)은1통과/1host 전용 제외다. native 첫 실행의 기존 출처/Pixabay2통과와 별도 휴대폰 성공을 하나의 full-native 성공으로 합산하지 않는다. [세 관련 spec의 최종 native 실행](evidence/remaining-current-2026-10-14/native-final.log)은 한 실행에서3통과/1host 전용 제외다. 실제 휴대폰 두 엔딩과 Pixabay3채널을 포함한다.

native 이행 첫 실패는 읽기 p와 숨은 textarea의 동일 글 중복 locator, 두 번째는 추가한 rendered 호출의 인자 누락이었다. 별도 E2E TypeScript 검사로 호출을 확인했다. 세 번째는 native 두 번째 선택의 고정50 간격이 버튼 사이를 터치한 검사 오류다. 실제 trace screenshot·첫/둘째 tap 좌표와 native script의 선택 frame padding/글자28/vbox10을 확인하고 현재 짧은 두 선택지에 맞게 padding 포함 위치를 사용했다. 제품 presenter·선택 문구·Core 경로를 바꾸지 않았으며 선택 후 실제 path를 두 엔딩 각각 비교하고 screenshot을 남겼다. 미래 긴/여러 선택지 geometry 일반화 증거로 확대하지 않는다.

[최종 full coverage](evidence/remaining-current-2026-10-14/coverage-final.log)는157파일1269통과/2skip이며 statements93.89%/branches91.33%/functions96.70%/lines98.72%다. 타입6패키지와 별도 E2E tsc·관련 ESLint가 통과했다. 이번 제품 UI/Core/native source 변경은 없으며 현재 build를 사용한다.

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 이번6실패의 current 회귀 | 이행·범위 검증 P1 | current picker/문서/기기 snapshot·reader | 원래 assertions와 전체 content·파일·native paths/counters/2endings 유지한 host/native 성공 |
| 나머지139와 full collection | 미실행/이행 P1 | 확인된6실패 수정·same static build | 남은 현재 경로 검증 후 실제 full collection 실행 결과, 제외/실패/수정 보존 |
| UI-OPTIONAL-REVIEW 실제 사용 | source 판정/부분 검증 P1 | 목적별 조정과 기존 focused 결과 | 실제 제작 필요성을 기능/숨김/누락/제외로 대조하고 남은 사용/회귀 증거로 판정 |
| 삼성·물리 키보드·최초 Chrome | 실제 입력 미검증/원인 조사 P1 | 해당 기기와 재현 trace | viewport/합성 키 입력/다른 native 성공과 구분한 물리 입력·원인 판정 |
| 새 외부 앱·배포 | 미실행 | 실제 연결/환경/범위 | local codec·역사적 artifact와 별도 실증. Excel ChatGPT 연결은 의도적 제외 |
