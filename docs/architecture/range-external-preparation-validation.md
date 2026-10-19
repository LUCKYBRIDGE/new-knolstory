# 컷 범위 외부 편집 준비와 등록 자료 안내 — 2026-10-13

[컷 범위 계약](cut-range-authoring-contract.md), [저장/형식 계약](authoring-storage-contract.md), [이어가기](current-ui-continuation-validation.md)가 기준이다. 실제 외부 앱의 셀 수정·저장·반출 검증은 준비 파일·단위 왕복과 구분한다.

## 현재까지 확인한 범위

대표 별주부 작품의 전체 원고/배치/Flow를 유지하면서 첫 컷의 반복 효과와 배경음에 명시적인 종료 컷을 넣어 공식 `.knolstory`와 workbook7/XLSX 입력을 만들었다. 효과/배경음의 종료 컷을 둘째 컷에서 셋째 컷으로 바꾸는 두 셀과 원본/기대 ID를 [편집 지시](evidence/range-external-current/catalog-only/edit-instructions.json)에 기록했다. 이 파일은 외부 편집 입력이며 실제 Excel/Google 편집 증거가 아니다.

현재 입력: [공식 파일](evidence/range-external-current/catalog-only/range-source.knolstory), [Excel 입력](evidence/range-external-current/catalog-only/range-excel-input.xlsx), [Google 입력](evidence/range-external-current/catalog-only/range-google-input.xlsx). 이미 Excel에 열었던 이전 입력을 덮지 않고 안내 수정판을 별도 폴더에 보관했다. 생성 당시와 편집 이후의 소스를 혼합하지 않는다.

[준비 검사](evidence/authoring-current/range-catalog-preparation.log)2개는 끝컷 두 값만 바뀐 전체 작품, workbook/XLSX/JSONB 왕복, 실제 생성 파일의 한글 시트·숨겨진 필드 key·셀 주소/원본ID를 확인한다. 실제 두 앱의 쓰기·저장·재반입 완료를 뜻하지 않는다. `PREPARE_RANGE_EXTERNAL=1 PREPARE_RANGE_CATALOG=1 pnpm exec vitest run packages/compatibility/tests/range-external-preparation.test.ts`는 검증용 파일 생성 명령이다.

## 실제 Excel 환경 확인

Microsoft Excel에 이전 rabbit 편집 파일이 열려 있음을 확인한 뒤, 이번 `range-excel-input.xlsx`를 로컬에서 열었다. 현재 workbook은42개 시트이고 title/grid/ribbon이 확인된다. 홈 추가 기능 popup은 로드 후 Microsoft AppSource 링크만 보여 주고 ChatGPT 항목은 없다. 현재 이 환경에서 연결 추가 기능 설치·pane·로그인·등록 gates는 통과하지 않았다. 연결 도구 조회를 앞선 setup 대신 사용하지 않았고 새 셀을 UI로 수정해 우회하지 않았다. 두 Excel 파일은 저장/수정하지 않았다.

현재 적용한 Excel Live Control 절차는 연결 확인 후 native workbook 도구로 읽기/쓰기를 수행하도록 요구한다. 추가 기능 최종 설치·로그인/계정 선택은 사용자가 준비해야 한다. 목표 전체를 정지하지 않고 이 외부 편집 gate를 대기 상태로 두며 로컬 구현/회귀는 진행한다. 도구/확장 설치가 안 된 상태를 프로젝트 exporter 빌드 불가로 표현하지 않는다.

## 양식의 실제 안내 결함 수정

Excel에서 열린 기존 양식의 ‘작품 자료 고르기’와 자료 참고 셀 메모에는 사용자 음원을 앱에서 먼저 추가하라는 옛 안내가 있었다. 이는 현재 service 등록 자료 전용 정책과 충돌한다. canonical `workbookGuideRows`와 XLSX 참고 셀 메모를 바꿔 등록된 그림/음원 ID만 선택하고 외부 업로드를 제공하지 않는다고 설명한다. 기존 저장 작품의 첨부 원본·미사용 첨부·metadata/순서는 파일 보관에서 그대로 보존하고, 외부 원본을 담은 새 웹 가져오기는 적용하지 않음을 명시한다.

도메인 필드·표 key·archive/workbook 버전·private bytes·상호 호환 codec은 바꾸지 않는다. 기존 private 파일을 읽는 순수 codec과 새 Web import gate의 책임을 구분한다. ShortStory에도 등록 그림 선택 안내를 적용하지만 게임 소리/점수를 추가하지 않는다.

[RED](evidence/authoring-current/guide-red.log) 후 [안내/전체 형식11개](evidence/authoring-current/guide-green.log)가 통과했고, [기존 실제 Excel/Google 편집 산출물16개](evidence/authoring-current/existing-external-artifacts.log)도 정확한 원고/배치/음원 bytes와 왕복을 유지했다. 후자는 이전 산출물의 현재 codec 회귀이며 이번 새 범위 외부 편집을 대신하지 않는다.

## 남은 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-RANGE-EXTERNAL | 입력 준비 완료·별도 실제 외부 앱 검증 후속 P1; Excel ChatGPT 연결은 제외 | 연결을 요구하지 않는 실제 외부 편집/저장·반출 환경 | 필요할 때 명시한 끝컷 두 값 수정·저장/반출→현재 Web importer/reload→끝컷 포함/다음컷 종료의 native, 모든 미수정 문서·배치/파일/JSONB 보존; 로컬 개발의 연결 대기 조건으로 쓰지 않음 |
| MEDIA-WORKBOOK-GUIDE | 구현·단위 범위 검증 P1 | 현재 service-only 선택/import gate·shared codec | 생성 안내가 외부 등록을 유도하지 않고 private 기존 보존/신규 가져오기 조건을 정확히 표시 |
| UI-RANGE-BRANCH | 미구현 P1 | cue identity·실제 선택 경로·합류/반복 계약 | 특정 갈래 적용의 저작/UI/전체 형식/Core/native 조건 |
| UX-REGRESSION-NAV | 기존 저작 회귀 이행 중 P1 | 현재 library/cut/tool/file/native/저장 guard | 기본 새 작품·원고/이미지/선택지·구조·원작/내 작품 재열기·손상 raw/초안/export를 현재 동선으로 검증 |

실제 삼성 기기·키보드/보조 기술·서비스/배포와 과거 최초 Chrome 오류 원인은 이번 환경 확인과 안내 수정으로 해결 처리하지 않는다.

## 2026-10-14 사용자 범위 변경

사용자가 “엑셀 추가기능을 통한 챗지피티 연결은 제하고 개발 작업”을 요청했다. Excel ChatGPT 추가 기능 설치·로그인·연결과 그 연결을 통한 live 수정 검증은 **이번 개발 범위에서 의도적 제외**다. 위 환경 확인은 당시의 기록으로 유지하며 연결 준비 요청은 종료한다. 로컬 개발/빌드/파일 왕복·Core/Ren’Py 검증의 선행 조건으로 연결을 요구하지 않는다.

Excel 파일·workbook7·Google 반출물·JSONB 계약과 기존 private 보존은 유지한다. 실제 외부 앱의 새 셀 수정·저장·반출은 로컬 codec 검증으로 대신 완료하지 않으며, 필요할 때 별도 실행 조건으로 관리한다. 등록 자료 안내 수정과 준비 파일/정확한 두 값 전체 비교는 현재 개발 범위의 작업이다. 이 결정으로 외부 업로드·미승인 음원·원본 ZIP 전면 편입을 허용하지 않는다.

## 기본 저작 회귀의 현재 이행

`tests/e2e/authoring.spec.ts`의 옛 직접 작품 선택/상시 image select/기본 펼친 도구 경로를 실제 서재의 보호 사본·등록 이미지 picker·현재 컷 선택·추가 도구·단일 작품 메뉴로 이관했다. 빈 작품 만들기, 한국어 원고, 모든 컷의 실제 배경/인물 선택, 두 갈래/엔딩·stable choice ID, 새 장 확인과 글 진입, 컷 추가/정렬/삭제, 기존 개인 작품 재열기, 파일 전체 왕복/reload, 수동 저장 retry를 유지한다.

손상 저장에서는 raw 원본·현재 초안/export·가져오기 확인창이 보존되어야 하고, 적용은 현재 원고 저장 실패로 중지한다. 이전 unsafe import 허용 예상은 현재 보존 계약에 맞춰 거부/취소/재export로 이행했다. 서재로 돌아가기와 파일 적용을 동일한 저장 조건으로 오해하지 않는다. Native 검사는 Ren’Py가 보고한 실제 choices rect를 클릭해 두 선택을 각각 독립 엔딩까지 진행하고, 실제 이미지 색상 변화·동일 iframe·읽기 복귀·전체 프로젝트 일치를 확인한다.

[최종 빌드의 두 프로젝트 실행](evidence/authoring-current/final-build-e2e.log)은 host4개와 native1개 모두 통과했으며 반대 프로젝트용5개 제외를 별도로 기록한다. [이관 설명](evidence/authoring-current/migration-notes.md), [첫 RED](evidence/authoring-current/red.log)를 유지한다. 제품 UI를 옛 구조로 되돌리거나 기본 저작/native assertions를 삭제하지 않았다. 새 장 소리 종료 입력은 이후의 [현재 검증](chapter-audio-range-validation.md)으로 별도 확인한다.

2026-10-14 새 장 소리 종료 입력/양식의 정확한 범위 안내는 [장 범위 검증](chapter-audio-range-validation.md)으로 연결했다. 이전 ‘컷 소리만’ 안내를 고치되 원고/field key/버전은 유지한다. Excel 연결 제외 결정은 그대로다.
