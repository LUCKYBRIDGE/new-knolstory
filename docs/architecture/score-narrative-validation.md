# 점수·조건 줄거리 검증 기록

2026-10-10. 현재 점수 저작 기능의 검증 기록이다. 이전 저작 형식 완료 기록과 manifest는 당시 범위로 보존한다. 현재 source/evidence 해시는 [점수 검증 manifest](evidence/score-narrative/final-manifest.json)에 기록한다. 현재 계약은 [점수 저작 계약](score-narrative-contract.md), 변경 범위는 [ADR0017](../decisions/0017-story-score-authoring.md), 후속 목표는 [개발 계획](score-narrative-development-plan.md)이 소유한다.

## 구현과 검증 범위

StoryDocument schema6, archive2, workbook3, JSONB snapshot은 동일한 점수 항목·선택 효과·조건·조건 경로를 보존한다. Runtime Core가 선택 기록으로 점수를 계산하고 조건을 해석한다. Ren’Py에는 확정된 장면과 사용 가능한 선택지만 전달한다. 숏스토리와 인쇄의 Web/CSS 경계는 유지한다.

작가가 항목 이름·설명·시작 값을 정의하고 선택 결과를 더하기/값 설정으로 작성한다. 비교 조건은 전체/하나라도 만족으로 편집하며 조건 경로는 순서대로 검사하고 기본 경로를 유지한다. 정수 범위·중복 ID·연결 참조·알 수 없는 필드 검증은 공통 경계에서 적용한다.

현재 schema의 놀스토리335개/숏스토리95개 scalar field path가 유효 fixture corpus에서 모두 포함된다. 이는 모든 구조의 필드 보존 검사이며 모든 가능한 enum 조합이나 모든 작품을 전수 검사했다는 뜻은 아니다. [필드 대응](evidence/score-narrative/all-fields-coverage.json), [실행 로그](evidence/score-narrative/field-coverage.log).

## 실제 외부 앱

[기본 작품 파일](evidence/score-narrative/score-story.knolstory)과 [Excel 양식](evidence/score-narrative/score-story.xlsx)은 실제 자산 참조를 사용한 여섯 컷, 합류 장면, 신뢰/욕심 항목, 세 결말의 검증 작품이다. 원작 문구나 기본 작품을 자동 변경하지 않는다.

Mac Microsoft Excel 화면에서 41개 탭(39개 콘텐츠+2개 안내)이 열린 것을 확인하고 점수 항목 D3 설명, 선택 점수 F3의 증가 값2→3, 점수 조건 H4의 신뢰 기준4→5를 직접 수정·저장했다. [Excel 수정본](evidence/score-narrative/score-excel-edited.xlsx)을 다시 가져와 세 변경 외 모든 데이터가 같은지 비교했다.

[Google 시트 검증 작품](https://docs.google.com/spreadsheets/d/1Q7Lnb7arGZKfNgb_YRZg79eco6Q2Xx2ruUODavmd_nc/edit)은 같은 workbook을 native 시트로 가져오고 동일 위치의 설명·증가 값·조건 기준을 수정했다. XLSX로 다운로드한 [Google 수정본](evidence/score-narrative/score-google-edited.xlsx)도 미수정 필드 전체 비교와 JSONB snapshot 복원을 통과했다. 공유 권한을 변경하지 않았다. [외부 왕복 검사](evidence/score-narrative/external.log).

## 자동화 결과

- 전체 unit/integration: 95개 파일, 1,049개 테스트 통과. Coverage statements93.42%, branches90.87%, functions96.72%, lines98.64%. [로그](evidence/score-narrative/coverage-final.log).
- 빌드·타입 검사·ESLint 통과. ESLint 경고0. [빌드](evidence/score-narrative/build.log), [타입](evidence/score-narrative/typecheck-final.log), [lint](evidence/score-narrative/lint-final.log).
- 점수 host E2E: 3개 통과, native 전용4개는 host에서 제외. 사용자 항목 생성, PC/태블릿/휴대폰 세로·가로 viewport, 소수 입력 거부, 효과/조건 수정·저장·내보내기·재열기, 잘못된 점수 참조 반입 거부와 현재 작품 보존·정상 파일 재반입을 확인했다. [로그](evidence/score-narrative/host-final.log).
- 실제 Ren’Py Web E2E: 4개 통과, host 전용2개 제외. 기본 파일PC1280/휴대폰390 및 실제 Excel/Google 수정본PC1280에서 선택→누적→합류→새로고침 복원→조건 엔딩을 확인했다. 신뢰 부족 시 선택지가 숨겨지고 다른 선택은 다른 엔딩으로 간다. 뒤로 돌아가 선택을 바꾸어 세 번째 결말까지 진행했다. 종료 후 뒤로 가면 이후 욕심 증가 효과가 제거된다. [로그](evidence/score-narrative/native-complete.log).
- 기존 형식/원고/저장 회귀 host E2E16개 통과: Excel4개 viewport 반입·취소·재열기, 빈 공식 양식, 원고 나누기·합치기5개 viewport, 이전 원고 사본, 다른 탭 충돌, 손상 보관함 복구, 삭제 실패 보호, 창 복귀와 긴 원고 컷 삭제·되돌리기를 확인했다. [회귀 로그](evidence/score-narrative/regression-host.log).
- Core 검사는 같은 컷으로 가는 서로 다른 선택, 반복 경로, 마지막 선택 후 종료, 재시작·기록 이동, 조건이 전부 거짓인 대기, 점수 범위 초과, 조작/누락된 복원 기록, 오래된 연결을 검증한다. 실제 외부 수정본의 합계는5, 기본 파일은4로 확인한다.
- 마지막 읽기 전용 리뷰에서 추가 확인된 사용자 영향 결함은 없었다. 앞선 리뷰에서 확인한 구버전 malformed 배열 탐지와 비교 연산자 배열 강제 변환은 RED→GREEN 경계 테스트로 수정했다. [실패 증거](evidence/score-narrative/boundaries-red.log), [수정 검증](evidence/score-narrative/boundaries-green.log).

첫 native 실행에서는 의미 없는 canvas DOM 텍스트 단언과 휴대폰 점수 details 숨김 문제가 있었다. 텍스트 단언은 접근성 읽기 영역으로 옮기고 점수 메뉴는 compact에서도 노출하도록 수정했다. 초기 실패 로그는 보존하고 최종 재검증은 별도 로그로 남겼다. 제외된 테스트는 다른 프로젝트에서 실행하도록 구분한 것이며 성공 건수에 포함하지 않는다.

## 검증 한계

여기서 휴대폰/태블릿은 브라우저 viewport 검증이다. 물리적 Windows PC·Chromebook·Android, 스크린리더 및 실제 PostgreSQL 서버 검증은 완료하지 않았다. JSONB snapshot 계약·해시·복원 검사는 서버 배포나 DB 트랜잭션 검증을 대신하지 않는다. Boolean 소지품/플래그, 중첩 조건 그룹, 작가별 최소/최대 점수 범위 등은 현재 정수 점수 모델과 별도의 선택적 확장이다. 학생 성적·학급 정책은 결정하지 않았다.

## 전달 점검

`agent-self-evaluation`의 다섯 축으로 결과를 점검했다. 정확성4: 외부 파일 전체 비교와 Core/native 검증이 있으나 모든 조건 조합 전수 검사는 아니다. 완결성4: 요청한 점수 저작·표·파일·복원을 연결했고 실제 기기 검증은 별도 남았다. 명료성4: 작가용 예제와 버전별 책임을 제공하지만 ID 연결은 안내를 읽어야 한다. 실행 가능성4: 앱 편집과 재반입 가능한 실제 양식을 제공하며 서비스 배포는 별도다. 간결성4: 상태·계약·검증 기록을 구분했으나 다중 탭 양식은 학습 안내가 필요하다. 평균4.0. 다음 개선은 실기기 검증, 작가 사용 관찰에 따른 입력 안내 개선, 필요가 확인된 고급 조건을 순서대로 다룬다. 사용자에게는 구현 결과와 사용하는 위치, 증거, 남은 범위를 먼저 전달한다.
