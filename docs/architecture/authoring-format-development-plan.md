# 뉴놀스토리 편집·교환·서버 저장 계약 개발 계획

기준일: 2026-10-09, 최종 판정: 2026-10-10. 상태: **현재 저작 형식 목표 완료 — 공식 파일·한글 Excel/Google 양식·실제 외부 앱 왕복·재열기/재생/인쇄 검증**.

## 목적과 우선순위

현재 뉴놀스토리의 모든 저작 요소를 공식 작품 파일·Excel·Google 시트에서 실제 편집하고, 가져오기·저장·재열기·재생까지 보존한다. 이 계약을 향후 서버 API·PostgreSQL 저장·학급 과제와 제출에서도 재사용한다. 로그인/학급 기능의 구현은 이번 형식 작업 이후 단계이며, 서버 저장에 필요한 데이터 경계와 계약은 이번에 함께 설계·검증한다.

사용자 확정 범위:

- 최우선은 뉴놀스토리 자체의 완성된 편집 파일·Excel·Google 시트 양식이다.
- 기존 story-maker 파일·구형 Excel·구형 시트와의 호환은 이번 목표에서 제외한다.
- 현재 Next에서 작성한 작품과 사용자 콘텐츠는 보존한다. 변경이 필요하면 명시적인 변환을 제공한다.
- 상세 요구·단계·검증은 이 문서에서 관리하고, 목표 프롬프트는 이 문서를 참조하는 짧은 실행 지시로 유지한다.

## 현재 근거와 미완성

[STATUS](../../STATUS.md), [기존 구현 감사](legacy-parity-implementation.md), [형식 검증](vn-workflow-verification.md), [서버 방향 ADR](../decisions/0011-legacy-freeze-and-forward-port.md)을 읽고 실제 소스와 대조한다. 이전 완료 수치를 이번 형식의 전수 완료 증거로 사용하지 않는다.

현재 Next의 StoryDocument v5를 기준으로 공식 파일 v2와 전체 저작 요소의 다중 탭 편집 양식을 구현했다. 기존 Next 표1/TSV는 제한된 이전 경로로 보존하며, 새 양식은 숨겨진 원고 payload에 의존하지 않고 실제 셀에서 문서를 조립한다. ExcelJS 왕복 외에 실제 Microsoft Excel 앱과 native Google 시트에서 변경·저장·반출한 두 종류의 작품을 다시 읽고, 변경하지 않은 모든 저작 필드와 음원 bytes를 비교했다. 한글 안내·선택 값·연결 메모·자산 참고와 작품별 음원 정보를 보완한 뒤 영향 회귀, 실제 Ren’Py 재생과 A4 인쇄를 확인했다.
### jsonb와 기존 서버의 참고 근거

고정 `story-maker@18da4fc`에서 확인한 사항:

- `server/migrations/001_foundation.sql`: `private_projects.document jsonb`, 소유자·작품 종류·클라이언트 작품 ID·version·byte_size와 목록 인덱스.
- `server/migrations/004_assignments_submissions.sql`: 과제 `starter jsonb`, 제출 `document jsonb`, 제출별 version 및 UPDATE 방지 trigger.
- `server/migrations/003_classrooms.sql`: 사용자/학급/학급 구성원은 별도 관계형 테이블이며, 작업 재시도 결과에 `jsonb` 사용.
- `server/src/documents.ts`: 버전 있는 저장 payload를 검증하고, 정규화 과정에서 원본 정보가 손실되지 않도록 검증한 입력을 보존.

이것은 기존 구현의 근거이며 기존 파일/DB를 가져오겠다는 결정은 아니다. Next `server/`는 현재 README만 있고 새 DB는 구축되지 않았다.

## 하나의 저작 모델, 목적별 표현

| 표현 | 책임 | 이번에 확정할 계약 |
|---|---|---|
| 도메인 문서 | 콘텐츠의 단일 기준 | 놀스토리/숏스토리 문서, 필드·ID·참조·버전·변환·검증 |
| 공식 작품 파일 | 백업·다른 기기 이동 | 문서와 필요한 첨부의 envelope, format/schema 버전, 크기·무결성 |
| Excel·Google 시트 | 표에서 작성·수정 | 공통 표 모델, 탭/열/행, ID·관계, 직접 편집 범위, 가져오기 적용 규칙 |
| 향후 서버 API | 저장·동기화·제출 | payload 버전, 문서 검증, 자산 참조, 저장 revision·중복 요청 처리 계약 |
| 향후 PostgreSQL | 소유권·관계·문서 보관 | 관계형 메타데이터와 검증된 문서의 jsonb 보관 경계 |

**계획의 설계 방향:** 사용자·학급·가입·과제·제출 관계와 소유권은 관계형 데이터로, 작품 내용은 동일 도메인 문서를 jsonb로 보관하는 방안을 우선 검토한다. 모든 장/컷을 DB 테이블로 다시 해석하거나 Excel 행을 그대로 서버 SSOT로 삼지 않는다. 최종 테이블/인덱스/제약은 서버 단계의 ADR과 migration에서 확정한다.

- 문서 schemaVersion, 교환 formatVersion, API payloadVersion, 저장 revision을 구분한다.
- 작품 내용과 계정/권한·기기 UI 상태·개인 읽기 기록을 구분한다. 어떤 정보가 파일과 서버에 포함되는지 명시한다.
- project ID와 서버 보관 레코드 ID·소유자 ID를 구분하고 사본/가져오기에서도 연결 의미를 보존한다.
- jsonb 자체는 문서 검증이나 접근 권한을 대신하지 않는다. 서버가 공통 검증기를 사용하도록 Web/IndexedDB 의존을 분리한다.
- 사용자 오디오 등의 바이너리는 문서 ID/참조와 저장 bytes의 역할을 나눈다. 파일 첨부와 향후 업로드/다운로드 계약을 대응시켜 다른 기기 복원을 보장한다. 저장 서비스 선택은 미확정이다.
- 제출 시점의 문서 revision·자산 참조를 보존하는 계약을 준비한다. 제출 후 수정/재제출 정책은 임의 확정하지 않는다.
- 서버 저장은 문서를 검증·보관하며 Flow·Stage·연출을 재해석하지 않는다. 놀스토리는 Core→Ren’Py, 숏스토리·인쇄는 Web/CSS다.

## 실행 단계와 종료 조건

### 1. 저작 데이터 전수 조사와 필드 대응표

실제 모델·입력 UI·내보내기/가져오기 코드를 대조한다. 작품 정보/기획, 메모 항목과 연결, 장/컷/화자, Flow·선택지·합류·엔딩, 인물·자산, StageComposition·상속/제거, 동작·구도, 연출·음악/환경음/효과음, 표지 세 면/레이어/자유 배치, 숏스토리 페이지와 표지를 포함한다.

각 필드에 타입·기본값·빈 값 의미·참조·버전, UI 편집, 파일 보존, 표 직접 편집, API/jsonb 대응, 검증 결과를 기록한다. 아직 구현되지 않은 새 제품 기능을 조용히 추가하지 않는다.

종료: 현재 지원 저작 요소에 누락된 대응이 없고, 콘텐츠와 서비스/기기 상태 경계가 명시됨.

### 2. 문서·파일·표·서버 계약 설계

공식 파일 envelope와 필요한 버전/변환을 정의한다. Excel·Google이 같은 표 모델을 사용하도록 한다. 단일 탭 유지 의무는 없으며, 반복 항목·관계에 맞는 탭과 설명·허용 값·예시를 설계한다. 바이너리와 편집용 셀은 분리한다.

종료: 같은 저작 모델을 표현하는 계약이 명시되고, 빈 표에서 작품 작성과 기존 작품의 표 수정이 모두 설계됨. 미확정 서버 운영 정책은 분리됨.

### 3. 실제 편집·가져오기·오류 처리 구현

단계1의 직접 편집 필드를 실제 양식과 importer에 연결한다. 숨겨진 JSON 보존만으로 편집 지원 완료로 처리하지 않는다. 복잡한 구도·표지·연출도 의미 있는 항목/수치로 편집하고, 원시 JSON 입력은 최소화한다.

헤더 기반 해석 또는 동등한 안전한 구조 검사를 구현한다. 열/행 이동·추가·삭제, ID/참조 변경, 중복/누락, 알 수 없는 필드/버전, 손상 payload/첨부, 한글/이모지/줄바꿈/앞자리0/수식 위험 문구, 셀/파일 한도와 큰 작품을 처리한다. 지원하지 않는 사용자 데이터를 무시하지 않는다.

가져오기 전 적용 요약을 제공하고 탭·행·항목별 오류를 안내한다. 실패 시 현재 작품을 유지하며 일부 적용이나 자산만 남은 상태를 방지한다. 내장 원본과 개인 작품을 덮지 않는다.

종료: 빈 공식 양식과 내보낸 양식에서 실제 저작·수정·가져오기·재편집이 동작하고, 구조 오류가 데이터 유실 없이 처리됨.

### 4. 왕복과 실제 외부 앱 검증

추가 요소를 함께 사용하는 놀스토리·숏스토리와 긴 실제 작품의 사본을 준비한다. 의도한 변경과 변경하지 않은 필드의 보존을 각각 비교한다.

| 경로 | 확인할 결과 |
|---|---|
| Web→작품 파일→별도 브라우저 | 전체 내용/첨부 일치·편집·저장/reload·실제 재생 |
| Web→xlsx→실제 Excel 편집/재저장→Web | 셀 수정 반영·전체 미수정 필드 보존·파일 재열기/재생 |
| Web→실제 Google 시트 편집/반출→Web | 실제 서비스의 문자열/긴 셀/관계 보존·재열기/재생 |
| 빈 공식 표→작품 작성→Web | 새 장/컷/분기/자료 등의 생성·편집·저장·재생 |
| 잘못된 표/첨부→재시도 | 구체적 오류·현재 원고 보존·수정 후 성공 |
| 서버용 문서 직렬화/복원 계약 | 동일 도메인 문서·revision/자산 참조 보존, 브라우저 의존 없는 검증 |

외부 앱·계정이 없으면 해당 검증을 미완료로 남기고 다른 구현·검증은 진행한다. mock 응답은 실제 외부 서비스 검증이 아니다. 원본을 보호한 별도 검증 자료를 사용하며 접근 권한이나 외부 수정 승인이 필요한 경우 실제 실행 전에 해결한다.

종료: 필드별 단위/통합/브라우저 검사, PC/태블릿/폰의 가져오기·오류·복귀·재열기, 실제 외부 앱 기록이 갖춰짐. DB 연결 검증은 서버 구축 전까지 준비된 계약과 구분함.

### 5. 공식 양식·명세·검증 기록 확정

버전 있는 공식 양식, 사용자 안내, 필드 대응표, 계약 명세와 검증 결과를 기존 docs 구조에 보관한다. STATUS·DESIGN 및 관련 ADR/비교 기록을 갱신한다. 단계별 산출물을 이 계획에서 링크하고 계획·구현·검증완료 상태를 구분한다.

종료: 다른 개발자와 사용자가 같은 양식을 재현할 수 있고, 서버/DB 단계가 이 계약을 재사용할 수 있음. 남은 항목은 상태·우선순위·의존성·완료 조건으로 기록됨.

## 이번 범위와 다음 단계

이번: 편집 파일/표 완성, 공통 도메인 검증과 향후 API/jsonb 저장 계약 준비, 실제 왕복 검증.

후속: 실제 서버/DB 배치, 로그인·권한·학급·과제·제출·공유 구현과 운영/백업 검증. 인증 제공자·가입/승인·게시·보관 정책은 소유자 결정 전 확정하지 않는다. 기존 DB/파일 이전과 구형 양식 어댑터는 이번 작업에 포함하지 않는다.


## 실행 결과 — 2026-10-09

| 항목 | 현재 상태와 근거 |
|---|---|
| 필드 조사·검증 경계 | 구현. [필드 전수 목록](authoring-format-field-inventory.md)과 TypeScript 모델에서 생성한 스키마를 사용한다. `node scripts/generate-authoring-schema.mjs --check`로 드리프트를 검사한다. |
| 공식 파일·첨부·JSONB snapshot | 구현. [저장 계약](authoring-storage-contract.md)의 v2 archive, 현재 Next 읽기 adapter, 오디오 signature/hash, 순수 직렬화/복원을 제공한다. 실제 DB 연결은 후속이다. |
| 편집 양식·Excel IO | 구현. 놀스토리35개/숏스토리7개 편집 탭과 ‘사용 안내’·‘자산 참고’를 생성한다. [v2 양식 명세](authoring-workbook-v2.md)의 공통 typed 모델로 내보내기/가져오기/빈 양식을 처리한다. |
| Web 가져오기·보존 | 구현. 전체 검증→요약 확인→취소/내 사본 적용→저장/reload를 연결한다. 내장 원본이나 기존 작품 ID가 충돌하면 작품 ID만 새로 발급하고 제목·장·컷·자산·내용을 보존한다. |
| 필드 전체 왕복 | 검증. 놀스토리318개·숏스토리95개 scalar field path와 union 구조를 사용하는 fixture의 archive/workbook/xlsx/JSONB 및 모든 컷 Core 컴파일을 비교한다. 모든 enum 값·실기기 검증의 전수 완료를 뜻하지 않는다. |
| 실제 Google 시트 | 검증. 별도 native Google 시트 두 개에서 실제 셀 변경·xlsx 반출 후 전체 미수정 데이터/오디오 bytes 일치를 확인했다. [반출 검사](evidence/authoring-format/google-native-import.log), [그림책 검사](evidence/authoring-format/google-short-import.log). 기존 사용자 파일/공유 권한은 수정하지 않았다. |
| 실제 Microsoft Excel | 검증. 활성화된 Excel 앱에서 놀스토리 본문·인물 좌표와 숏스토리 본문을 수정하고 저장했다. [story 반출 파일](evidence/authoring-format/story-excel-edited.xlsx), [short 반출 파일](evidence/authoring-format/shortstory-excel-edited.xlsx)를 재반입해 의도한 변경 외 모든 필드와 음원 bytes 일치를 2/2 확인했다. [실행 로그](evidence/authoring-format/excel-native-roundtrip.log). 추가 기능 연결을 통한 시험으로 기록하지 않는다. |
| 반응형 Web 양식 | 검사 통과. PC/태블릿/폰 가로·세로, 빈 양식, 손상 헤더/수식, 취소 원고 보존, Google 반출 재열기, 숏스토리 표지/본문/정보의9개 검사. [로그](evidence/authoring-format/formats-host.log). 브라우저 viewport 검사는 실기기 검사와 구분한다. |
| 단위·계약·통합 coverage | 현재1,007개 통과. statements93.33%/branches90.58%/functions96.47%/lines98.60%. [coverage 로그](evidence/authoring-format/final-coverage.log). 이후 소스 변경 시 다시 판정한다. |
| 최종 회귀·native 재생 | 전체 host130pass/28skip/3fail 후, 초기 준비/정적 runtime 문제를 분리하고 최종 정적 빌드의 영향26pass/1skip으로 세 실패를 재검사했다. 이후 한글 양식9pass, 음원/사본/표지10pass/3skip, 최종 외부 파일 적용/재열기/인쇄9pass, 실제 Ren’Py6pass를 확인했다. 전체 최초 실행을 단일 green 실행으로 표기하지 않는다. |

구현 중 검토에서 공식 파일25MB와 Web의 이전20MB 제한 충돌을25MB로 통일했다. Google 반출의 빈 후행 열은 허용하되 작성된 알 수 없는 열/셀은 거부한다. 현재 Next plain v5 파일에서 명시적인 StageComposition과 중복된 좌우 Asset ID가 달랐던 경우에는 읽기 adapter가 StageComposition에서 파생 ID만 다시 계산한다. 새 공식 v2의 저작 값 손실 검사는 계속 엄격하게 유지한다.

## 남은 판정과 후속 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| FMT-QA: 최종 형식 회귀·재생·기록 | 완료·P0 (2026-10-10) | 현재 구현과 실제 외부 앱 반출 파일 | 영향 host 및 최종 회귀, 외부 편집 작품의 Ren’Py 두 엔딩, 숏스토리/인쇄 확인 결과를 기록하고 실패를 해소. 최종 소스·형식·증거 hash 및 STATUS 판정 일치. |
| SV-CONTRACT: 실제 API/PostgreSQL 저장 | 진행·P1: 독립 Docker/PostgreSQL·소유자 작품 API 및 두 제작 모드의 Web 저장/읽기/충돌/정확한 재시도 구현·검증. [현재 후보의 실제 연결](authoring-storage-contract.md#계정-경계의-로컬-api-후보-연결-2026-10-16). 실제 Kakao는 [2026-10-17 최종 도메인 근거](evidence/production-cutover-2026-10-17/checkpoint.json)로 당시 완료 범위를 유지. 실제 Google 연결·온라인 삭제/복구·실물 기기 전환은 잔여 | [확정 인증/호스팅 ADR0023](../decisions/0023-mac-mini-docker-and-linked-login.md), 삭제/복구·보관 결정과 실제 제공자/기기 환경 | 공통 validator API/migration·projection·revision/멱등성/권한의 기존 유효 검증 유지. 남은 삭제/복구·실제 환경 검증을 이행하며 부분 구현을 전체 완료로 바꾸지 않음. |
| SV-CLASS: 로그인·학급·과제·제출 | 계정 기반 구현·로컬 검증, 학급/과제/제출은 미구현·P1 | 교사/학급 승인·제출/재제출·보관·공유 정책 결정 | 권한 있는 사용자 동선과 제출 시점 문서/자산 고정, 접근 거부·재시도·백업 복구까지 검증. 미확정 정책은 소유자 결정 전 구현으로 고정하지 않음. |
| QA-DEVICE: 실제 기기·보조 기술 | 미검증·P2 | 실제 PC/태블릿/폰과 보조 기술 환경 | 실제 기기에서 외부 편집 파일 가져오기·오류·편집·저장·복귀와 키보드/스크린리더를 확인. 현재 viewport 결과와 분리 기록. |

현재 형식 목표는 **완료**로 판정했다. 요구별 근거는 [완료 감사](authoring-format-completion-audit.md), 현재 소스와 증거 파일 hash는 [최종 manifest](evidence/authoring-format/final-manifest.json)에 기록한다. 실제 API/PostgreSQL 및 실기기·보조 기술 검증은 아래 후속 목표로 남기며 완료 범위에 포함하지 않는다. 후속 실행 프롬프트는 이 문서의 목표 ID와 완료 조건을 참조하는 짧은 지시로 유지한다.

## 한글 편의성과 전체 연결 최종 보완

한글 열 제목·선택 값·드롭다운과 열별 적용/참조 메모, 숨겨진 내부 키, 사용 안내·자산 참고를 제공한다. 실제 Excel·Google에서 한글 ‘해설’과 본문을 바꾼 뒤 전체 문서/첨부를 동일하게 복원했다. 음원 bytes는 같은 ID로 공유하되 작품별 이름·종류·출처·순서를 분리하고, provenance 부재·미사용 첨부·사본의 메타데이터를 보존한다. JSON 중복 key와 PostgreSQL jsonb 문자 제약도 저장 전에 검증한다. 긴 작품의 XLSX를 이중 해석하지 않고 검증 중 상태를 표시한다.

[현재 한글 양식](authoring-workbook-v2.md), [실제 외부 앱 한글 재반입](evidence/authoring-format/korean-native-roundtrip.log), [원작 보호·음원 메타데이터 실제 IDB 검사](evidence/authoring-format/audio-metadata-final.log), [전체 코드 검사](evidence/authoring-format/final-coverage.log).

2026-10-14 갈래 실행 조건: 문서8/양식8 cue 조건·기존 형식 migration·원본 JSONB fingerprint·일반 열을 구현하고 로컬 범위를 검증했다. [계약](branch-scope-authoring-contract.md), [실행/남은 조건](branch-scope-validation.md). Excel ChatGPT 추가 기능은 제외하고 새 외부 앱 편집과 파일 codec 회귀를 구분한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
