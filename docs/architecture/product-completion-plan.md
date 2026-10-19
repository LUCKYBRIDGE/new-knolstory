# 제품 완성 실행 계획

전체 목표는 [제품 완성 목표](product-completion-goal-2026-10-15.md), 제품 상태는 [STATUS](../../STATUS.md)가 소유한다. 이 파일만 **단계 간 큐·작업 의존성·다음 행동·재개 지점·미결 질문**을 관리한다. 기능별 세부 체크리스트/검증 결과는 기존 문서에 둔다. 날짜별 후속 계획을 새로 만들거나 같은 상태표를 복제하지 않는다.

## 재개 지점

마지막 확인: 2026-10-20. 세션 전환 시 이 절을 교체하고 실제 파일·프로세스·결과를 대조한다.

| 항목 | 현재 재개 정보 |
|---|---|
| 현재 작업 | 로컬 저장/한글 입력/인물 도구/손상·충돌 복구 완료 근거 유지. 진행12 파일 오류 한국어·개인 경로 비노출 및 세션 연결 보존 [근거](evidence/local-file-errors-2026-10-20/checkpoint.json), 진행13 오래된 Google 연결 응답 차단 [근거](evidence/account-link-stale-2026-10-20/checkpoint.json), 온라인 오류 용어 [근거](evidence/online-error-language-2026-10-20/checkpoint.json), 진행14 기본 글의 임시 보관 불가 상태 초안/파일 보존 [근거](evidence/basic-draft-recovery-2026-10-20/checkpoint.json). 사용자 요청으로 현재 개발 소스와 인수인계를 GitHub main에 반영 중. 운영 배포/실물기기 완료 아님. |
| 종료된 로컬 checkpoint | PC-01 host389 종료:352통과/37native 전용 제외, source/보호artifact 변경0. 필수 native 동선 이행은 [실행별 결과](evidence/native-resume-2026-10-15/native-result.json). PC-02 네 제작 모드 대조와 점수 전용 native 빈 셀 보완. 물리 기기·출시 전체 완료 아님 |
| 우선 읽을 증거 | [로컬 작품 파일 현재 checkpoint](evidence/local-work-files-2026-10-18/checkpoint.json), [저장 계약](authoring-storage-contract.md#로컬-작업파일-우선--2026-10-18), [온라인 휴지통 후속](evidence/online-trash-2026-10-18/checkpoint.json). 원고/최대 화면/접근성의 기존 근거는 해당 소유 문서에서 재사용. |
| 다음 행동 | 사용자 요청으로 현재 소스/계획/검증 기록을 공개 GitHub main에 반영하고 원격 SHA/CI를 확인한다. 게시 제외한 비공개 자료·인증·진단 원본은 로컬 보존, 다른 컴퓨터의 복원은 README 기준. 이후 현재 입력/복구/계정의 남은 실패 경로와 필수 기기 검증을 이어간다. PC-05 학급/제출/공유는 Q-01/02, 보관/영구삭제는 Q-03, 실제 Google은 Q-05에 의존한다. 전체 목표와 완료 증거를 보존하고 정상 검사를 불필요하게 반복하지 않는다. |
| Docker 상태 | Next production db/api/ingress running at final origin https://story.knolquiz.com; loopback15501 only. Default production-compose start now preserves final origin; story-next GET/HEAD redirects308. Legacy five running containers unchanged. |
| 중요한 수정 | 최초 적용001 변경을 checksum이 거부했다. journal hash와 일치하는001 복원, blob trigger는002 전진 migration. DB/journal 초기화하지 않음. rollback 실패client는 release(true) 폐기. 과거 실패 로그 유지 |
| 미검증 범위 | Google OAuth·온라인 휴지통의 운영/실기기 검증·장기 오프라인·물리기기·스크린리더·최초Chrome154 원인·새외부앱·공개 배포·외부/전체 운영 백업복원. 로컬 저장/순수 계정/DB 검사를 이 완료로 확대하지 않음 |
| 결정 | 카카오 가입/로그인, 이후 Google 연결 및 연결 후 Google 로그인, 현재 Mac mini Docker는 확정. 교사/학급 승인·공유/공개·보관 기간만 미결. 확정 내용을 다시 질문하지 않음 |
| 보존 | 미커밋 원고·Asset ID·Flow·StageComposition·private자료·과거evidence 보존. 보호artifact483개 hash 일치는 당시 체크포인트 근거. 계정 Web 변경 당시 Runtime은 변경하지 않았으며, 이후 PC-06 native 키보드 변경을 포함한 후보는 [새 정적 복원](evidence/static-restore-keyboard-2026-10-17/checkpoint.json)으로 따로 확인. 외부 공개/기존운영전환 승인 아님. 이번 원고 연결은 [보존 대조](evidence/reader-eight-integrated-2026-10-18/preservation-after.json)로 기존 fixture/evidence/runtime 변경·누락0 확인. |

## 작업 큐

상태 어휘는 `준비`, `진행`, `대기(정확한 의존성)`, `완료(근거)`, `의도적 제외`를 사용한다. 기능의 구현/부분/누락 판정은 STATUS 및 기능 감사에 둔다. 완료 행은 증거 링크로 압축해 유지하고 다시 준비 상태로 바꾸려면 변경 영향/회귀 근거를 적는다. 동시에 실행하는 변경 작업은 소유 파일/공유 자원 충돌을 확인해 제한한다.

| ID·우선순위 | 작업 상태 | 의존성 | 세부 소유 문서 | 완료 조건과 다음 진행 |
|---|---|---|---|---|
| PC-11 P1 | 부분 완료(여섯 화면·viewport 맞춤·작품별 세션 설정 로컬 검증; 실제 사용성/장문·일부 상세 UX 남음) | 기존 원고·범위 계약/SSOT·실제 환경 | [최신 설계](../../DESIGN.md#편집-작업-영역--2026-10-19-후속-설계), [viewport 검증](evidence/editing-viewport-2026-10-19/checkpoint.json) | 직접 편집·함께 보기·개별 개방·휴대폰1:4:1/가로 native·화면 안 맞춤/내부 스크롤·IME 합성/커서·파일 보존 확인. 반복 방향 전환/실제 기기·전체 UX 감사와 조건부 글/장면 계약은 별도 |
| PC-10 P1 | 완료(현재 로컬 파일 저장/재열기·개발 인수인계 범위; 전체 제품 완료 아님) | 현재 archive2/원고 보존/명시 파일 권한 | [저장 계약](authoring-storage-contract.md#로컬-작업파일-우선--2026-10-18), [검증](evidence/local-work-files-2026-10-18/checkpoint.json) | 두 모드 새 환경 실제 파일 왕복·집중 보호 검사와 실제 Mac ShortStory 저장/재저장 확인. 파일 연결은 세션 한정이며 reload 후 명시 선택. 다음 PC-04 결합 검증 |
| PC-09 P1 | 로컬 구현·8판본 원고 연결/집중 검증 완료; 대기(실제 화면 검토·기기/출시 환경) | 사용자 종합 승인 완료; 남은 실제 환경/운영 범위 | [읽기 개편안](reading-interface-design.md), [현재 원고/실제 검증](evidence/reader-eight-integrated-2026-10-18/checkpoint.json) | 기존 R1–R5 디자인/native 근거 유지. 원작·놀스토리8판본 원고 교정 연결 완료. 남은 기기/접근성·행렬은 실제 환경에서 이행; R6운영 별도. 이전 원고·저장·유효 증거와 전체 제품 큐 보존 |
| PC-01 P1 | 완료(현재 로컬 후보 회귀 checkpoint; host352/37 native 전용 제외 및 직접 native 근거) | 현재 build·자료 정책·UI | [현재 파일/읽기](reader-file-current-regression-validation.md), [UX 계획](approved-ui-development-plan.md) | 현재 host/native 회귀의 실패 이행·실제 창작/읽기 보존, 최종 동일 후보의 전체 결과. 완료→PC-02/04, 정책 확인은 미리 준비 |
| PC-02 P1 | 완료(현 P1 로컬 제작 대조·점수 전용 native 빈 셀 보완; 물리/출시 별도) | 필수 제작별 실제 흐름 | [기능별 감사](editor-redesign-completeness-audit.md) | 선택/점수4경우·연출/소리/범위·파일·취소/오류·재열기·native 복귀를 구현/부분/누락/제외 판정. 필수 누락을 구현하고 증거 연결→로컬 안정화 종료 |
| PC-03 P1 | 대기(기존 Q-01~04 답 및 Google 실제 제공자 환경) | 기존 ADR/사용자 결정 확인 | [STATUS 미확정 정책](../../STATUS.md), [형식/서비스 계획](authoring-format-development-plan.md) | 확정 답변을 정식 소유 문서에 기록해 관련 구현만 해제. 카카오/연결Google/맥미니Docker/도메인은 재질문하지 않음 |
| PC-04 P1 | 부분 구현 checkpoint 유지·휴지통 로컬구현·실제 결합 검증 완료·대기(보관 결정, 실제 제공자/기기 환경) | Q-03/05와 실제 환경 | [구조](knolstory-final-architecture.md), [현재 계정 API/Web](authoring-storage-contract.md#계정-경계의-로컬-api-후보-연결-2026-10-16), [형식 계획](authoring-format-development-plan.md) | Docker/PostgreSQL·OIDC/세션HTTP·소유자create/list/read/update·두제작모드Web저장/읽기/충돌/재시도는 기존 근거 유지. 현재 휴지통 결합 근거 재사용; 보관·장기offline/실기기전환을 해당 의존성 해제 후 이행→PC-05 |
| PC-05 P1 | 대기(PC-04 및 관련 정책) | 역할/학급/제출/공개 범위 | [Blueprint M8](development-blueprint.md), [구조](knolstory-final-architecture.md) | 실제 학급/과제/제출 snapshot/재제출·공유/취소·권한 거부/실패 복구 및 같은 Ren’Py 뷰어를 검증→PC-07 |
| PC-06 P1 | 진행(Web/좁은 화면·실제 Mac Chrome400% native 선택/초점 보완 완료; 목표 실기기·스크린리더 등 대기) | 목표 기기·보조 기술·측정/권리 환경 | [기기 ADR](../decisions/0013-target-devices-and-performance-budget.md), [환경](reproducible-test-environment.md), [현재 실제 확대](evidence/chrome-native-zoom-2026-10-18/checkpoint.json), [음원 권리](audio-service-rights.md) | 실제 Mac의400% native·키보드 근거 유지. Windows/Chromebook/Android/스크린리더/청취·성능·배포 권리 남은 범위는 실제 환경에서 확인→PC-07 |
| PC-07 P1 | 대기(PC-04/05/06의 출시 범위 및 승인; 로컬 논리 DB 및 정적 runtime 복원 준비 확인) | 출시 후보·운영 설정·실제 환경 | [Blueprint M9/완성 정의](development-blueprint.md), [환경](reproducible-test-environment.md) | 동일 후보 통합 검사·실제 DB/자산 백업/복원·운영/롤백 준비·승인된 실제 도메인 검증→제품 전체 완료 감사 |
| PC-08 P2 | 후보 | 실제 제작 필요·자산/해석 계약 | [비음원 계획](presentation-authoring-development-plan.md) | 표정/카메라/통합 timeline의 필요성을 판단. 필요 없으면 제외 근거, 승격되면 기존 계획에 조건/범위 명시. P1의 대체 목표로 진행하지 않음 |

## 2026-10-17 필수 gate·의존성 대조

이 표는 전체 완료 감사가 아니라 다음 작업 선택을 위한 대조다. 로컬 통과를 외부/운영 gate로 승격하지 않는다.

| 전체 요구/Blueprint 경계 | 현재 근거와 남은 의존성 |
|---|---|
| 단계A·M2~M7 저작/이동/재생 | PC-01/02의 종료 checkpoint와 기능별 원고/파일/native 증거 유지. 이후 입력 변경은 PC-06 집중 근거로 연결. 모든 후속 변경을 포함한 최초 출시 통합 결과는 아직 아님 |
| 단계B 계정·소유권 | 실제 Docker/PostgreSQL·합성 제공자 서명/HTTP·Web 계정 경계 근거 유지. 실제 Kakao는 [최종 도메인 검증](evidence/production-cutover-2026-10-17/checkpoint.json)으로 완료한 당시 범위를 유지하며 다시 설정/검증하지 않는다. Google 연결·로그인 실제 왕복만 Q-05 환경에 의존 |
| 단계B 온라인 업로드/삭제/복구 | 소유자 create/list/read/update·revision/멱등·충돌/재시도 및 계정 경계 근거 있음. 온라인 휴지통/같은 작품 복구 의미는 Q-04 확정, 실제 로컬 Web/API/DB 결합은 [현재 근거](evidence/online-trash-combined-2026-10-20/checkpoint.json)로 완료. 보관은 Q-03, 실제 기기 전환/장기 offline은 실제 환경 필요 |
| 단계B·M8 학급/과제/제출/공유 | 역할·참여 Q-01, 제출/공개/링크 범위 Q-02에 의존. snapshot/권한/취소/뷰어 실제 서비스는 미완료이며 mock으로 대체하지 않음 |
| 단계B/C 운영 관찰 | 요청 ID·고정 schema·비밀 정보 배제 로그를 새로 구현/실제 로컬 Docker 확인. 외부 수집·보관/계정 감사 정책까지 승인된 것은 아님 |
| 단계C·M5/1.0 기기/성능/보조 기술 | host DOM·keyboard·native 입력 및 실제 Mac Chrome200/400% 서재/책/대본 근거 있음. 이후 [실제400% native 읽기/선택](evidence/chrome-native-zoom-2026-10-18/checkpoint.json)과 BODY 초점 이탈 수정도 확인. Windows/Chromebook/Android 실물·IME·청취·스크린리더·기기 성능은 미검증 |
| 단계C 음원/권리 | 현재 등록/전달/ZIP 조건 근거 유지. 실제 목표 기기 청취·loop/음량 및 공개 후보의 전달/권리 gate 별도 |
| 단계C·M9 백업/복원 | 실제 논리 DB 및 새 정적 후보 독립 복원 근거 있음. 외부 보관/암호화·role/secret·전체 운영 장애/복구는 환경/운영 결정 필요 |
| 단계C·M9 도메인 출시/최종 통합 | story.knolquiz.com은 확정. 서비스/기기/권리/운영 gate와 완성된 후보 승인 후 실제 배포·서비스 확인 필요. 현 로컬 구현은 공개 배포 승인 아님 |

## 미결 질문과 결정

질문을 새로 만들기 전에 AGENTS/STATUS/관련 ADR과 사용자 답을 확인한다. 이 목록에는 **아직 답이 필요한 결정**만 ID·영향받는 PC ID·추천/선택지·질문 여부를 적는다. 결정되면 정식 정책/ADR 링크로 대체하고 같은 질문을 반복하지 않는다.

PC-03은 ADR0011의 서버 추천안과 [저장 계약](authoring-storage-contract.md)을 대조했다. 아래 세 묶음을 2026-10-15 현재 채팅에서 질문했으며 답변 전까지 미확정이다. 답변이 필요한 구현만 대기하고 PC-01은 계속한다.

| ID·영향 | 질문한 결정과 추천 | 상태 |
|---|---|---|
| Q-01 · PC-04/05 | 로그인은 [ADR0023](../decisions/0023-mac-mini-docker-and-linked-login.md)으로 확정: 카카오 가입·로그인, 계정에 Google 연결 후 동일 계정 Google 로그인. 교사/학급 승인만 미결 | 로그인 확정; 2026-10-16 교사/학급 승인 세 선택지 질문 후 답변 대기 |
| Q-02 · PC-04/05 | 개인 원본 작성자 전용·교사는 제출 고정본 열람·재제출 새 고정본·기본 비공개와 공유 취소. 로그인/학급 공유 또는 비로그인 링크, 학생 공개 교사 승인 여부 | 비로그인 읽기의 뜻 설명 후 2026-10-16 공유 범위를 다시 선택 질문 · 답변 대기 |
| Q-03 · PC-04/07 | 현재 Mac mini Docker 호스팅은 [ADR0023](../decisions/0023-mac-mini-docker-and-linked-login.md)으로 확정. 삭제 작품·제출·탈퇴 계정·백업 보관 기간만 별도 확정 | 호스팅 확정; 보관 기간 미결(2026-10-16 복구함 무기한/30/90일 선택 질문) |
| Q-05 · PC-04/07 | Google 실제 제공자 설정 및 연결/연결 후 로그인 왕복 환경 | 승인된 Google 연결 정책은 유지. 실제 Google 환경은 후속. 기존 Kakao 앱/최종 도메인 callback 및 실제 로그인은 아래 완료 근거로 분리하며 재질문하지 않음. |

확정한 Q-04: 2026-10-18 사용자 선택으로 기기 원고 유지·온라인 휴지통·같은 작품 ID/이력 복구를 채택했다. [계약과 구현](authoring-storage-contract.md#휴지통-구현집중-검증). 보관/자동 영구삭제는 Q-03으로 분리한다.

완료된 제공자 결정/검증: 기존 Kakao 앱 재사용과 최종 도메인 callback 등록은 이행했다. 2026-10-17 [실제 도메인 checkpoint](evidence/production-cutover-2026-10-17/checkpoint.json)는 카카오 로그인·로그아웃·재로그인, 온라인 작품 조회/독립 사본 열기 및 native 재생의 당시 범위를 증명한다. 현재 미배포 로컬 후보의 전체 출시·Google·학급/공유·실물 다중 기기 완료로 확대하지 않는다.

독립 서버·클라이언트 project ID와 서버 record ID 분리·revision/멱등 키를 작품 파일 밖에서 처리·제출 시 문서/자산 고정 가능·공통 검증 경계는 기존 계약이다. 추천 로그인 제공자/운영 환경/보관 기간은 승인된 사실로 해석하지 않는다. 이미 확정된 제외는 Excel ChatGPT 연결, 모든 옛 파일 양식 지원, 새 외부 미디어 업로드, 별도 영구 Web story player다.

## 실행·검증 기록의 최소 단위

작업 ID별 기존 검증 문서에는 다음을 짧게 남긴다. 여기에는 결과를 복제하지 않고 해당 근거 링크만 연결한다.

- 변경 범위와 관련 source/계약·입력·빌드 식별자, 실행 환경. 미커밋 변경은 관련 파일 hash나 diff 기준으로 식별한다.
- 실행 명령/선택 범위·실제 결과·실패/제외·증거 경로. 전체와 focused, 모의와 실제 native/외부 앱/기기를 구분한다.
- 다음 행동 또는 완료. 재실행이 필요하면 **무엇이 바뀌었거나 어떤 증거가 부족한지** 적는다.

유효한 검증은 변경 영향으로 판단한다. 무관한 문서 수정이나 세션 전환으로 runtime/build 검사를 다시 시작하지 않는다. 동일 코드에서도 환경 의존·간헐 실패·실기기 재현 등 구체적 이유가 있으면 반복 검사가 필요하다. 최종 통합/출시 검증은 해당 후보 전체 요구를 확인하는 별도 조건이다.

## 문서 갱신 규칙

- 이 파일: 다음 행동/의존성/재개 상태가 바뀌면 해당 셀/절을 수정한다. 완료한 실행 일지를 끝없이 덧붙이지 않는다.
- 목표 파일: 사용자 범위·보존/제외·최종 완료 조건이 바뀔 때 수정한다. 현재 PID/검사 수/실행 중 문장은 넣지 않는다.
- STATUS: 제품의 구현 상태/중요한 열린 문제 변화만 요약하고 이 계획 또는 세부 소유 문서로 연결한다.
- 계약/DESIGN/세부 계획: 실제 의미/디자인/구현 선택의 변화가 있을 때 해당 소유 문서를 수정한다.
- 증거: 실행별 보관 후 불변. 큰 stdout/이미지/원문을 계획 파일에 복사하지 않는다. 오래된 기록은 필요할 때만 열며, 현재 파일 링크를 과거 manifest에 소급 반영하지 않는다.

세션 종료 보고는 완료 PC ID·증거·남은 PC ID·다음 한 행동·필요 결정만 간결히 적는다. 제품 전체 감사는 PC-07 종료 시 목표/Blueprint 요구별로 수행한다. 미결 요구·증거 부족·필수 승인/환경이 있으면 그 범위를 명시하고 전체 완료로 처리하지 않는다.
