# 대본·화자·이미지·컷 복제 후속 검증 — 2026-10-14

현행 compact UI와 미커밋 작업을 유지해 `legacy-authoring-workspace.spec.ts`를 이행했다. Excel ChatGPT 추가 기능 연결은 사용자 결정으로 제외한다. 등록 미디어 전용 선택, 기존 private 보존,530개 공용 소리/23개 별칭과 장면별 on-demand 전달을 유지한다.

## 구현과 데이터 보호

| 항목 | 판단 | 처리·완료 조건 |
|---|---|---|
| 장 전체 글·컷별 글·화자 상세·등록 이미지 검색 | 구현됨, 옛 검사 경로 이행 완료 P1 | 실제 서재 생성, 접힌 글 도구/추가 편집/인물 배치/상세 검색으로 이동하고 글·이미지·취소·파일/reload 전체 비교 |
| 컷 복제의 원래 Flow 보존 | 확인된 결함 수정·검증 완료 P1 | 일반 새 컷 삽입이 원래 goto/엔딩을 새 컷으로 옮기는 동작을 복제에 적용했던 결함 수정. 복제·다른 장 이동 후에도 원래 컷의 대사·설정·goto·점수 route·엔딩 유지 |
| 복제본 자기 참조 | 구현·검증 완료 P1 | 복제본 내부에서 원래 컷을 가리킨 도착/route/선택지 대상·효과/음악/환경음 종료·갈래 조건을 새 컷과 실제 새 선택지 ID로 연결. 선택지 ID 충돌 시 생성된 suffix까지 보존 |
| 외부 참조·원래 문서 | 보존 | 다른 컷 대상/종료/조건과 원래 컷들·기획·메모·Asset ID·Stage·연속 글쓰기 위치를 자동 치환하지 않음. 구조 변경에 필요한 컷 order와 작품 updatedAt만 변경 |

복제는 새 저작 행위다. 기존 저장 작품의 이미 만들어진 복제본을 자동 재연결하는 migration이 아니며 schema8/workbook8/archive2/API1/JSONB1을 바꾸지 않는다. effect/SFX cue ID는 기존 복제 동작대로 보존한다. 이어지는 효과의 같은 cue ID는 현행 Core의 교체 의미를 유지하며 새 전역 식별 규칙을 도입하지 않는다. 잘못된 자기 선택 참조는 누락하거나 대상 추정하지 않고 오류로 거부한다. 일반 ‘새 컷 추가’의 원래 삽입 의미는 변경하지 않는다.

## 회귀와 실제 파일

검사에서 제거된 도구를 복원하지 않았다. 현재 장·컷 이동 select, 실제 summary와 글/배치/추가 도구를 사용한다. 이미지 취소 시 전체 project, 실제 선택 이미지 ID, 즐겨찾기·같은 인물·장/최근 이미지·검색 조건, 대본 전환·화자·저장/reload를 유지한다. 파일 가져오기로 작품 준비에 도착하면 현재 컷 쓰기로 명시적으로 돌아온다.

native 검사는 실제 선택지 두 개/엔딩 두 개를 만들고 첫 엔딩을 복제·다른 장 이동한다. 원래 엔딩의 Flow를 전체 비교한 뒤 파일을 내보내고 다시 가져와 저장/reload한다. Ren’Py가 보고한 실제 선택지 좌표에서 각 선택을 클릭하고 Core path/종료·같은 iframe·읽은 컷 편집 복귀·전체 내보낸 project를 확인한다. Web 대체 재생기를 쓰지 않는다.

새 단위 검사는 goto/명시적 종료/조건 route/엔딩 복제·이동, 자기/외부 참조, 무변경 입력과 선택 매핑 실패를 검증한다. [Flow RED](evidence/manuscript-current-2026-10-14/duplicate-red.log)는 실제3결함 실패와 잘못 만든 빈 점수 조건 fixture1실패를 포함한다. fixture를 유효한 점수 조건으로 고친 뒤 제품을 수정했다. [자기 참조 RED](evidence/manuscript-current-2026-10-14/reference-red.log)는 수정 전2실패다. [이행 전 UI RED](evidence/manuscript-current-2026-10-14/red.log)와 원래 검사 사본도 보관한다.

## 현재 결과와 한계

[최종 전체 coverage 실행](evidence/manuscript-current-2026-10-14/coverage-final.log)은155파일1263통과/2skip이다. statements93.89%, branches91.33%, functions96.70%, lines98.72%를 기록했다. 앞선154파일1262통과/2skip과 별도 [복제 실제 형식 왕복1검사](evidence/manuscript-current-2026-10-14/format-roundtrip.log) 후 모든 현재 검사를 다시 실행했다. 그 개별 성공을 최종 수에 더하지 않는다. 복제 형식 검사는 원래 대표 작품과 모든 기존 컷을 보존한 복제본 전체 archive/workbook/XLSX/JSONB 일치를 확인한다. 실제 외부 Excel 앱 편집을 뜻하지 않는다.

[최종 host](evidence/manuscript-current-2026-10-14/host-final.log)는4통과/1native 전용 제외다. [최종 native](evidence/manuscript-current-2026-10-14/native-final.log)는1통과/4host 전용 제외다. [타입](evidence/manuscript-current-2026-10-14/typecheck.log)·[최종 Web 빌드/음원 gate](evidence/manuscript-current-2026-10-14/build-final.log)가 통과했다. [인접 대본/종료 범위 회귀](evidence/manuscript-current-2026-10-14/adjacent-host.log)는7통과다. 대본 나누기/합치기·잘못된 커서 입력·파일/reload/전체 한국어 원고와 가로 넘침을1440×1000,1024×768,768×1024,390×844,844×390에서 확인했고 별도 연출 종료 범위2개에는 실제 native 범위 종료를 포함한다. native runtime 코드를 변경하거나 ZIP을 재생성하지 않았다. 독립 읽기 전용 검토에서 원래 Flow 보존과 자기 참조/외부 참조 규칙에 정확성 결함을 발견하지 않았다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UX-REGRESSION-NAV 나머지 | 부분 이행 P1 | 현행 compact 동선·등록 미디어·저장 guard | 남은 검사를 실제 동선으로 이행하고 전체 collection 실행 결과와 제외를 기록. 이번5검사 또는 앞선 부분 통과를 전체 성공으로 합산하지 않음 |
| UI-OPTIONAL-REVIEW | 부분 구현/후속 P1 | 최신 UX 계획·이미 구현된 갈래/종료/되돌림 | 제작에 필요한 남은 조정을 실제 편집·취소·파일·native와 대조해 구현/부분/누락/제외 판정 |
| 삼성 입력·물리 키보드 | 물리 검증 미완료 P1 | 실제 기기·키보드 | 긴 한국어/조합·가림·저장·재열기·읽기 복귀의 기기별 실측; viewport/합성 composition과 구분 |
| 최초 Chrome 앱 오류 | 조사 중 P1 | 실제 재현·이벤트/trace | 최초 원인 또는 환경/검사 오류를 증거로 구분; 후속 native 성공만으로 해결 처리하지 않음 |
| 실제 외부 앱·배포 | 새 검증 미실행 | 연결/배포 환경·범위 승인 | 로컬 codec·이전 외부 artifact와 새 실행 구분. Excel ChatGPT 연결은 의도적 제외이며 완료 gate가 아님 |
