# 현재 전체 회귀·필요한 과거 내용 변환 — 2026-10-14

현재 미커밋 작업과 직전 빌드를 보존해 full host 회귀를 다시 시작했다. 사용자 최신 결정은 **모든 옛 파일 양식 지원이 아니라 현재 뉴놀스토리에 맞추고 필요한 옛 내용만 현재 형식으로 고치는 것**이다. [ADR0016](../decisions/0016-authoring-format-contract-and-scope.md)과 현재 문서8/워크북8/archive2를 따른다. Excel ChatGPT 연결은 제외한다.

## 기준 실행과 확인된 실패

[기준 로그](evidence/full-current-2026-10-14/host-baseline.log)는384개 중129통과/6실패/3프로젝트 제외/246미실행이다. max-failures6으로 종료됐다. 검사 외 오류1개 표기도 기록됐지만 별도 원인 메시지는 로그에서 확인되지 않았다. HTTP BrokenPipe 기록과 최초 Chrome 앱 오류의 원인은 구분하며 이 실행으로 원인을 확정하지 않는다. 초기 실패 context/trace와 검사 원본은 baseline-artifacts에 보존한다.

| 항목 | 판단 | 현행 처리 |
|---|---|---|
| 컷/장 소리의 초 입력 | 기능 구현됨·검사 동선 부분 이행 | 추가 편집→소리 목적→배경음/효과음 선택, 정확한1/100/230ms·빈 입력 오류·전체 원고와 파일/reload 보존 |
| 과거 실제 Excel/Google seconds 파일 | 옛 artifact에 private 첨부 포함·신규 첨부 거부는 의도적 정책 | 원본 거부/기존 작품 불변과 필요한 내용을 현재8판 등록 사본에 옮긴 뒤0.45/0.23/0.1초 및 전체 내용 일치 확인 |
| 과거 실제 Excel 전체 저작 파일 | 같은 신규 private 제한 | 첨부 원본을 보존하고 거부 검사. 등록 사본의 글·45%배치·전체 문서·archive 재열기 확인 |
| 원작 읽기의 제목 | 구현됨·옛 큰 heading 가정 | 현재 작은 작품·장·컷 맥락에서 원작 제목 확인 |
| 읽기→서재 | 구현됨·옛 상시 버튼 가정 | 읽기 메뉴→서재 확인→현재 위치 보관, 원래 책 그룹 복귀 |

## 필요한 내용의 명시적 현재 변환

codec integration은 역사적4파일을 읽어 현행8판으로 검사하고 원본 SHA-256·원본 archive를 기록한다. 새 검사용 사본은 private resource의 종류에 따라 cue의 assetId만 명시적으로 공용 forest/chime으로 교체하고 bytes 첨부를 제거한다. 장/컷의 music·ambience·sounds 외 모든 내용과 source object를 그대로 보존한다. current workbook export→import 전체 일치를 먼저 확인하고 새 evidence 하위에 저장한다. 과거 파일을 수정하거나 사용자의 작품에 자동 적용하는 제품 migration이 아니다.

실제 기존 private 저장 보존은 앞선 [현재 회귀 기록](current-regression-migration-validation.md)·[속성/native 검증](evidence/current-regression-2026-10-14/final-manifest.json)의 별도 기기 snapshot 범위다. 현재 새 브라우저에서 신규 첨부를 허용하는 경로로 바꾸지 않는다. 변환 사본은 이번에 실제 Excel/Google 앱에서 편집한 결과가 아니다.

## 현재 실행

[변환 codec](evidence/full-current-2026-10-14/copy-codecs.log)은3통과다. 첫 E2E 재실행은 검사 loader의 JSON import attribute 문제로 수집 전에 종료됐다. codec을 Vitest에서 검증/생성하고 Playwright는 원본 hash 및 생성 artifact만 읽도록 수정했다. 두 번째는 검사 작성 중 컷 음악의 기본 이어받기와 장 음악을 혼동한1개 및 배치 버튼보다 세부 배치를 먼저 찾은2개 실패다. 핵심 assertion을 삭제하지 않고 실제 현재 동선에 맞춰 수정한다. 세 번째 재실행에서 기본 음량의 잘못된 검사 기대와 reload 후 접힌 장 설정을 고쳤고, 네 번째는15통과/내보내기 저장 시각 비교1실패였다. 저작 내용과 resource 전체 비교는 유지하며 저장 시각만 별도 metadata로 구분했다.

[최종 host16개](evidence/full-current-2026-10-14/host-final.log)는 한 실행에서16통과다. [실제 native 프로젝트](evidence/full-current-2026-10-14/native-final.log)는11통과이며 원작/놀스토리8판본 및 원작 읽기의 실제 rendered revision/장면 캡처9경로와 서재 선택/ShortStory2검사를 구분한다. 앞선 실패 실행의 성공 수를 최종 성공에 더하지 않는다. [Google 전체 저작/그림책](evidence/full-current-2026-10-14/google-final.log)의 같은 private 가정도 추가 이행했고 별도 실행2통과다.

등록 사본을 만드는4개 codec 검사는 명시적인 `KNOL_WRITE_CURRENT_COPIES=1` 실행에서만 증거를 생성한다. 보통의 단위 검사 실행은 역사적 입력과 사본의 왕복을 검증하며 증거 사본을 다시 쓰지 않는다. [최종 full coverage](evidence/full-current-2026-10-14/coverage-final.log)는156파일1267통과/2skip이며 statements93.89%/branches91.33%/functions96.70%/lines98.72%다. 타입6패키지와 관련 ESLint가 통과했다. 이번 변경은 검사/변환 증거/문서이며 제품 UI나 schema/Core/native 변경은 없다. 새 빌드·외부 앱 편집을 실행한 것으로 주장하지 않는다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 이번6실패/같은 책 판본 전체 | 현행 이행·범위 검증 완료 P1 | current selector·registered copy·read confirmation | 기존 확인·전체 내용·파일/reload를 유지한host16와 별도 native11 성공. 추가 Google2검사는 별도 로그 |
| full host 나머지246 | 미실행 P1 | 위 확인된 실패 수정·동일 static build | 전체 현재 collection 실행 및 모든 실패 수정/정책 제외 기록 |
| UI-OPTIONAL-REVIEW | 부분 P1 | 현재 소리/연출/선택/점수 UI 및 실제 제작 | 중복·중첩·기능 누락을 현재 동선과 실제 저장/파일/native로 확인하고 구현 |
| 기기·최초 Chrome 원인·새 외부 앱·배포 | 별도 미검증/조사 | 해당 실제 환경·재현 증거 | local codec/host 또는 후속 성공을 각 물리/외부/원인 완료로 대체하지 않음 |
