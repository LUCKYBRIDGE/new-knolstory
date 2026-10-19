# CC0 공용 음원 편입 검증 — 2026-10-13

실행 범위: 현재 로컬 소스와 순차 `runtime:build → build`의 정적 Web/Ren’Py. 소스는 [편입 계획](cc0-library-integration-plan.md)의 고정 Release이며, 원본·권리·추천표와 실제 runtime derivative를 구분한다.

## 데이터·계약

- 패키지 크기/SHA/CRC/안전 경로, source490/runtime490 및39 출처 evidence 확인. [다운로드 기록](evidence/cc0-staging-integration/download-verification.json), [패키지 검증](evidence/cc0-staging-integration/package-verification.log).
- 기존61 approval 행은 snapshot과 완전 동일. 기존 sourceSHA61 검증, exact중복21 및 fulldecode530 비교의 추가PCM중복0. 출처·파일명20, 제작자·파일명1, 같은 팩의 다른 번호/유사 용도는 자동 통합하지 않음. [비교](evidence/cc0-staging-integration/source-description-comparison.json).
- 추가469+별칭23 전체를 archive/JSONB/editable workbook/실제 XLSX codec으로 왕복하며 전체 문서와 한국어·시간·false/0 값 보존, 공용 audioResources는 빈 배열. Excel/Google 앱 직접 편집 실행과 다름. [왕복](evidence/cc0-staging-integration/roundtrip-final.log).
- 관련 registry/transport/client/선택/왕복/bridge23 tests 통과. [unit](evidence/cc0-staging-integration/unit-final-confirmed.log). 새 client delivery/selection 두 파일 scoped coverage: lines/statements/functions100%, branches82%; 앱 전체 coverage 주장이 아님. [coverage](evidence/cc0-staging-integration/coverage-final.log).
- native cache4 tests: 확인된 파일·현재 재생 보호·축출, 참조 밖/탈출/hash/signature/중복/budget/심볼릭 링크/버전 충돌 거부. version충돌 사전 검사 RED가 실제 부분 설치 결함을 드러내 수정. [RED](evidence/cc0-staging-integration/native-cache-red.log), [GREEN](evidence/cc0-staging-integration/native-cache-green.log).
- source/권리/ZIP gate 및1896파일 provenance gate 통과. [서비스](evidence/cc0-staging-integration/service-gate-final.log), [provenance](evidence/cc0-staging-integration/provenance-final.log).

## 브라우저 검증과 수정

첫 실행은 reload 준비 직후5초 assertion 실패. 대기 조건을30초로 고쳐 file/reopen은 통과했다. host에서는 native 음원 요청을 하지 않는 것이 정상이라 host>0 request assertion을 수정했다. 이어 실제 native에서 `fetch`를 인스턴스 method처럼 호출한 Illegal invocation을 발견했다. global fetch를 wrapper로 호출하도록 수정했다. [실제 오류](evidence/cc0-staging-integration/native-fetch-error.json). 모의 단위 테스트가 실제 브라우저를 대신하지 않음을 확인한 사례다.

최종 host/browser 검증은 선택·저장·파일 내보내기·가져오기·재열기·출처 이름 검색·기존 forest canonical 선택을 통과했다. native 검증은 가장 큰 새 배경음 MP3(8,199,260 bytes)와 주변 소리 OGG(7,151,533 bytes), 효과음 OGG 세 파일만 요청했다. Ren’Py의 unlock·세 채널 시작·음악 시간 진행을 확인한 뒤 읽기 메뉴의 `이 컷 편집하기`로 원래 컷에 복귀했다. 전체 작품 데이터와 미수정 원고·다른 컷을 파일 왕복·재열기·재반출에서 비교했다. 최종 host2+native1 통과, 검색 중복 native1 제외. [최종 실행](evidence/cc0-staging-integration/e2e-final-reviewed.log), [native 상태](evidence/cc0-staging-integration/native-audio-state.json), [실제 화면](evidence/cc0-staging-integration/native-shared-channels.png).

중간의 canvas 클릭 대기는 SDK 입력 overlay 뒤 canvas locator 문제였으며 실제 입력 위치의 pointer 클릭으로 수정했다. 음악 position은 주기적 DOM 시계가 아니라 장면 보고값이므로 초기0 보고를 계속 읽는 중간 assertion은 실패했다. 최종 검증은 viewport 갱신 후 새 native 보고에서 시간 증가를 확인하며 이 조건을 삭제하지 않는다. [이전 진행 확인](evidence/cc0-staging-integration/e2e-final-playback.log). 원본 실패 로그를 성공 결과로 바꾸거나 여러 실행의 숫자를 합산하지 않는다.

최종 순차 빌드는 Ren’Py runtime build와 Next static build를 통과했다. [runtime](evidence/cc0-staging-integration/runtime-build-final.log), [web](evidence/cc0-staging-integration/web-build-verified.log). 원본 실패·중간 수정 로그는 보존하며 숫자를 합산하지 않는다. 전문 청취, 물리 삼성 Android, 이번 새 수동 Excel/Google 앱, 원격 배포 완료를 주장하지 않는다.

scripts37 tests와 문서 링크 검사0오류, diff whitespace 검사도 통과했다. [scripts](evidence/cc0-staging-integration/scripts-final.log), [lint](evidence/cc0-staging-integration/lint-final.log). 공유 ZIP은37,641,800 bytes이며 새469개를 startup package에 넣지 않았다. 이 결과는 로컬 음원 편입의 완료 범위이며 전체 편집 목표/제품 출시 완료가 아니다.
