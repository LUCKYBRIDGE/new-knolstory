# 공유 자료 초안·지연 첨부 거부·그림책·배치 회귀 — 2026-10-14

직전 [작품 전환](work-switch-current-regression-validation.md)을 이어 실제102개 구간을 실행했다. 현재 문서8/워크북8/archive2와 등록 자료만 선택하는 정책을 따른다. 기존 private 자료·원본·530음원/23별칭·Pixabay14 장면 결합 제한과 on-demand 전달을 보존한다. Excel ChatGPT 연결과 새 음원 취득/ZIP 전면 편입은 제외한다.

## 기준 결과와 분류

[102개 기준 실행](evidence/remaining-middle-2026-10-14/host.log)은27통과/6실패/4native 전용 제외/65미실행으로 max-failures6에서 종료됐다. 검사 외 오류1개 표기도 보존한다. 실패 원본/context/trace와 before spec을 별도 보관했다. 진행 중 실행을 observation timeout으로 재시작하지 않았다.

통과한 범위는 scene resource5, score authoring1/score narrative host3, effect cue detail4, ShortStory 파일/충돌/읽기5, sound batch2, sound purpose5, staged audio2다. 다른 focused 성공과 합산해 전체388 완료로 부르지 않는다.

| 실패 항목 | 판단 | 현재 이행 |
|---|---|---|
| 공유 효과음 이름 | 새 private 등록 기대는 의도적 제외; 기존 공유 초안 보존 검사는 필요 | 기존 기기 snapshot의 두 cue가 같은 private asset ID를 참조. 공유 이름 refresh·다른 cue dirty name/tags 유지·전체 원고/bytes 보존 |
| 그림책 이미지/Excel | 구현됨·옛 select 경로 | 현재 등록 이미지 dialog와 현행 archive2에서 음원 필드 거부. 원래 삽화/한글/Excel/reopen/overflow 검사 유지 |
| pending private 등록2 | 새 등록 경로는 의도적 제외; 지연된 외부 입력의 현재 상태 보호는 필요 | 지연된 현재8판 private 첨부 file import를 거부하고 컷 이동/소리 목적 전환·전체 저작·IDB 무기록 확인 |
| 배치 가져오기2(같은4viewport spec) | 구현됨·접힌 세부 배치 경로 | 배경·인물→추가 인물·세부 배치의 실제 펼침. 취소/적용/undo/reload/dialog geometry와 원고·전체 배치 보호 |

## 공유 private 자료와 dirty 초안

검사 브라우저에 이전 기기 snapshot과 IDB 자료를 준비한다. 신규 upload/import 허용 경로가 아니다. 같은 Asset ID를 가진 서로 다른 두 cue의 음량·대기·ID·순서를 보존한다. 두 select의 보존 option은 disabled이며 새 private 파일 등록은 없다.

2번 cue에 저장 전 이름/태그를 입력하고,1번에서 다른 공유 이름/태그를 저장한다. 두 목록은 저장된 이름으로 갱신되지만2번의 dirty 초안은 유지해야 한다.2번 저장 뒤1번도 새 baseline을 따라야 한다. reload/export에서 문서 전체가 원래와 같고 resource bytes/base64/ID/원래 이름/출처는 그대로이며 최종 이름/태그만 달라야 한다. legacy key도 보존한다. 단순 버튼·label 변경으로 검사 의미를 대체하지 않았다.

## 지연된 금지 첨부의 경계

옛 비동기 등록 검사는 새 private WAV가 목록에 추가되고 cue에 적용되는 기대였다. 이 행동은 현재 사용자 정책과 충돌하므로 복원하지 않는다. 대신 현재8판 archive의 private 첨부를 실제 작품 파일 input에 넣고 `File.text()`를 지연시킨다. 기다리는 동안 다른 컷 또는 주변 소리 목적에서 실제 편집을 수행한다.

읽기를 해제하면 catalog-only 검증이 확인창 전에 거부한다. 현재 컷/목적·다른 채널·전체 project/resources는 그대로이며 work-metadata에 pending.wav가 기록되지 않는다. 원래 음악의 등록 ID도 유지하고 새 custom option을 노출하지 않는다. 이것은 구 등록 기능 성공 검증이 아니라 **금지된 입력 완료가 현재 저작을 덮지 않는 경계 검증**이다. 기존 private 보존은 앞의 별도 snapshot 검사다.

## 그림책과 배치

ShortStory는 현재 등록 이미지 picker를 사용하며 Web/CSS 삽화와 A4 경계를 유지한다. Excel 반출/재열기 후 같은 Asset ID·한글 글을 확인한다. 현재 `.shortstory`2판에 지원하지 않는 music 필드를 넣으면 경로/항목 오류를 보여주고 기존 그림책 전체를 유지한다. iframe은 없다. 과거 manifest1 envelope 호환을 새 필수 조건으로 만들지 않는다.

배치 가져오기는1440×900/768×1024/390×844/844×390에서 원래 dialog 경계, source선택, 취소, none배치 적용, 다른 컷에서 undo 소멸, 글 수정 후 undo, 재적용·기기 저장/reload·내보내기·같은 iframe/overflow를 유지한다. 취소 시 전체 document와 undo 뒤 변경한 text만 제외한 전체 document 비교를 추가했다. dialog를 일괄 여백 확대하거나 접힌 세부 배치를 기본 화면에 상시 노출하지 않았다.

## 현재 실행과 한계

[첫 focused](evidence/remaining-middle-2026-10-14/focused-first.log)는7통과/1실패다. 그림책 import 뒤 이미 열린 이미지 details를 다시 닫던 검사 실수였다. 현재 펼침 상태를 확인하고 필요한 때 열도록 고쳤다. [그림책 후속](evidence/remaining-middle-2026-10-14/shortstory-second.log)은1통과다. [최종8개 묶음](evidence/remaining-middle-2026-10-14/final.log)은 한 실행에서8개 통과다.

[관련 단위](evidence/remaining-middle-2026-10-14/related-unit.log)는5파일27개 통과다. E2E tsc·관련 ESLint·문서 링크도 통과했다. 제품 UI/Core/runtime/format version은 변경하지 않았고 현재 build를 사용했다. 새 native/fullunit/build/실제 외부 앱·물리 기기·배포 실행으로 주장하지 않는다. 초기 네 SFX 상세의 native 행동 검사는 코드에 유지하며 이 focused8개에 포함됐다고 부르지 않는다. 독립 보조 검토는 사용량 제한으로 종료됐고 parent가 before/current 및 실제 결과를 검토했다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 이행8개 | 구현된 경로/정책 이행·범위 검증 P1 |현재 picker·기기 snapshot·guard·Stage 계약 |공유 dirty draft/bytes·지연 거부·그림책·4viewport 배치 assertion을 보존한 최종8성공 |
| 남은65/full388 | 미실행/이행 P1 |현재 동선·자료 정책·저장/읽기 상태 |남은 구간 실행 후 전체 collection을 별도로 실행하고 실패/제외/보정 분류 |
| UI-OPTIONAL-REVIEW | 부분 P1 |최신 계획·source판정·실제 제작 |필수 제작 기능의 편집/취소/파일/native 근거 및 구현/부분/누락/제외 판정 |
| 삼성/물리입력·최초Chrome | 물리 미검증/조사 P1 |실기기·재현 trace |viewport/키보드 명령·후속 native 성공과 별도 실증 |
| 새 외부 앱/배포 | 미실행 |실제 환경/범위 |local codec·과거 artifact와 새 결과 구분.Excel ChatGPT는 의도적 제외 |
