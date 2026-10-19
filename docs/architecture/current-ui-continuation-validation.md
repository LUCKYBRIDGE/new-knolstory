# 승인된 편집·읽기 UI 이어가기 검증 — 2026-10-13

기준은 [인수인계](next-session-goal-2026-10-13.md), [승인 계획](approved-ui-development-plan.md), [계승 계획](legacy-editor-ux-improvement-plan.md), [현재 디자인](../../DESIGN.md)이다. 기존 미커밋 작업을 보존하고 로컬에서 이어갔다. 구 저장소·원격 브랜치·커밋·push·배포를 변경하지 않았다.

## 실제 변경과 보존 조건

`non-audio-direction-ui.spec.ts`의 사라진 컷 목록/중첩 appearance/읽기 복귀를 현재 장·컷 선택 → 추가 편집 → 연출 목적 선택과 읽기 메뉴 → 이 컷 편집하기로 이관했다. `if(visible)`로 핵심 절차를 생략하지 않는다. 대상 reset·반대쪽/직접 위치 보존·잘못된 투명도/초 입력·목록 순서·마지막 취소·명시적 순차 시작·반복·적용 범위·파일 왕복·reload·동일 native iframe 복귀를 유지한다. 반복 간격은 기본2.4초와 다른2.6초로 저장하고2600ms를 정확히 비교한다. 전체 프로젝트 비교에서 의도적으로 바꾼 현재 컷 presentation, 가져오기의 독립 작품ID, 실제 편집의 수정 시각만 별도로 다루며 다른 필드는 정확히 일치해야 한다.

기존 실제 Excel·Google 편집 반출물의 재반입과 확인 전환 회귀도 현재 목적 선택/작품 메뉴로 이관했다. 이번 실행이 외부 앱의 새 편집·권리 승인이라는 뜻은 아니다. 실제 native 렌더 완료, 확인 버튼 바깥 클릭의 대기 유지와 실제 확인 후 해제, 같은 컷 복귀를 검사한다.

## 편집 방문 경로

`WorkContext.editingPath`는 기기 workspace의 작품별 UI 상태다. StoryDocument·Flow·StageComposition·RuntimeScene·독자 playback.path와 별개다. 사용자가 성공적으로 선택한 컷만 최근32회 기록하고, 합류·반복의 직접 방문을 보존한다. 특정 방문으로 복귀하면 그 뒤 방문을 잘라낸다. 읽기 advance/rewind/편집 복귀로 방문을 추가하지 않는다.

기본 화면을 늘리지 않고 기존 현재 컷 연결 대화상자 안에 접힌 ‘내 편집 이동 경로’와 이전 편집 컷 복귀를 둔다. 저장·한글 조합 guard가 통과해야 목적 컷과 방문 상태를 함께 적용한다. 실패하면 원고/현재 컷/방문 상태를 유지하며 대화상자도 닫지 않는다. 예전 workspace는 추가 필드 없이 읽고, 잘못된 타입·삭제된 컷 ID는 파생 방문만 정리한다. 작품을 바꾸거나 새 파일을 가져오면 해당 작품의 경로를 사용하며 다른 작품의 같은 컷ID와 혼합하지 않는다.

공식 `.knolstory`·Excel/Google workbook·JSONB에는 편집 방문 상태를 넣지 않는다. 기존 저작·읽기 계약의 버전은 그대로다. 상세 계약은 [저장 계약](authoring-storage-contract.md)과 [연결 맥락](editor-flow-context-validation.md)에 연결한다.

## 이번 실행 기록

- 기존 RED: [옛 경로](evidence/deep-direction-current/red.log). 현재 PC 첫 이관은 [통과](evidence/deep-direction-current/migration-first.log).
- 보강한 전체 비교의 [첫 실패](evidence/deep-direction-current/migration-all.log)는 합법적인 수정 시각만 달랐다. 수정 시각의 실제 갱신도 확인한 [개발 서버 네 화면 및 격리5개](evidence/deep-direction-current/compact-green.log)가 통과했다.
- 편집 방문 TDD [RED](evidence/editor-navigation-current/red.log), [단위·저장15개](evidence/editor-navigation-current/unit.log). primitive 검증/32회 제한/합류·반복/특정 방문 복귀/삭제ID 정리/작품 분리와 archive·JSONB에 UI 상태 미첨부를 확인한다.
- [정적 빌드](evidence/deep-direction-current/build.log), [서비스 음원 무결성](evidence/deep-direction-current/service-audio.log). 음원530개/별칭23개를 유지하며 재취득/시작ZIP 전면 편입을 하지 않았다.
- 정적 native 회귀·최종 단위 커버리지·타입·리뷰 확정 결과는 아래 최종 판정에 기록한다.

실패 로그는 삭제하지 않는다. 메뉴 nested summary locator, 엄격한 ISO timestamp fixture, 개발 중 새로고침, 정적 서버의 config cwd/중단 후 포트, 접근성 버튼의 pointer 대신 키보드 조작을 각각 테스트/환경 문제로 구분한다. 과거 최초 설치 Chrome 앱 오류의 원인은 아직 확정하지 않았다.

## 현재 분류와 후속 조건

| 항목 | 판정·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 글 중심·앞뒤 컷·작은 문맥·필요시 메모·단일 작품 메뉴 | 구현됨 P1 | 기존 입력/저장/IME·승인 도안 | 현행 기본 동선·긴 한국어·네 viewport 회귀 유지 |
| 목적별 연출·초/대상/시간/순서/반복/취소·인물 reset | 구현됨 P1, 현행 회귀 이관 | StoryPresentation/Core/native | 전체 문서·파일 재열기·native 확인/복귀의 이번 정적 실행 |
| 사용자가 선택한 편집 방문 복귀 | 구현됨·이번 범위 검증 완료 P1 | 기기 WorkContext·현재 컷 이동·저장 guard | 합류/반복/작품별 분리·reload·IME/저장 실패·native 읽기와 분리 |
| 정확한 종료 범위·시작점 이동·효과음 일괄 적용 | 부분 구현 P1 | cue ID·Flow·[범위 계약](cut-range-authoring-contract.md) | 현재 기능 회귀 유지; 갈래 한정 실행/외부 앱 범위 검증은 별도 후속 |
| 선택지만/점수만/둘 다/둘 다 없음 | 구현됨, 현행 회귀 확인 P1 | Flow/점수·단일 설정 소유 | 정의·조건·경로·원고/ID·왕복 및 native 점수 보존 |
| 표정 variant·동적 camera·통합 타임라인 | 누락/후보 P2 | 자산 동일인물 계약·Core viewport/timing·제작 관찰 | [연출 계획](presentation-authoring-development-plan.md)의 개별 완료 조건. 모든 Ren’Py 기능 도입은 목표가 아님 |
| 새 갈래 연속 작성·작품 전체 여러 컷 복사 | 부분/계획 P2 | ID remap·외부 연결·합류 정책 | [계승 계획](legacy-editor-ux-improvement-plan.md)의 기존 완료 조건 유지 |
| 삼성 가상/분할/플로팅·물리 키보드·학교 기기 | 미검증 P2 | 실제 대상 기기·OS/키보드 모드 | 조합/가림/회전/터치/물리 키보드 실측 기록; viewport/합성 composition으로 대체하지 않음 |
| 최초 Chrome 앱 오류 원인 | 조사 중 P1 | 원래 exception 또는 재현·context/trace | 원인 증거/필요한 제품 수정·실제 재현 회귀. 이후 성공은 최초 원인 해결 증거가 아님 |
| 실제 외부 앱 새 편집·서비스/배포 | 이번 실행 미검증·별도 목표 | 외부 세션·서버 정책/환경·권리/릴리스 gates | 새 외부 앱 저장/반출 및 실제 배포 결과를 별도로 기록 |
| 외부 업로드·두 번째 Web Player·작품별 Ren’Py | 의도적 제외 | 현행 사용자 결정·아키텍처 | service 등록 picker만 제공; 기존 저장 private media와 Pixabay14 원음 미첨부 보존 |

## 확정한 단위·빌드 결과

[최종 전체 단위/커버리지](evidence/deep-direction-current/coverage-final.log):147파일,1209통과·1건 제외. 제외된1건은 `GENERATE_DIRECTION_ARTIFACTS=1`일 때만 과거 외부 편집 입력파일을 다시 쓰는 artifact 생성 작업이며 실제 회귀 조건을 빼서 통과시킨 것이 아니다. 이번 실행에서는 이미 있는 원본/외부 앱 증거를 덮지 않는다. 구성된 packages 및 Web lib 범위의 statements93.71%/branches91.19%/functions96.66%/lines98.70%이며 React/native/물리 기기 전체 커버리지로 확대하지 않는다.

초기4실패는 audio530 편입 전 catalog/provider/category 수치를 기대한 검사였다. [보정5개](evidence/deep-direction-current/baseline-checks.log)는 기존61 목록과47 CC0/14 Pixabay 권리·hash를 유지한 채 새 total/category와 역사적21 CC0 subset을 대조한다. 모델·원음 bytes를 수정하지 않았다. `AuthoringArchive` 타입은 knolstory 분기를 먼저 확인하고 attachments에 접근하도록 테스트만 수정했다. [타입6 workspace](evidence/deep-direction-current/typecheck-final.log), [lint](evidence/deep-direction-current/lint.log), [문서 링크](evidence/deep-direction-current/docs-final.log)가 통과했다. lint는 기존 artifact/다른 코드의 warning14개·error0개이며 warning까지0이라고 주장하지 않는다.

[정적 native13개](evidence/deep-direction-current/static-native-final.log)가 모두 통과했다. 네 viewport의 합류/반복/reload/읽기 분리와 저장 실패·IME·작품 분리5개, 비음원 편집/파일/취소5개, 이전 실제 Excel/Google 수정본2개, 실제 확인 전환1개다. 그 뒤 방문별 목록 선택·스크린샷과 관련75개 회귀를 추가 검증한다. 앞의13개 성공은 이 추가 실행을 대신하지 않는다.

[빌드 동일성](evidence/deep-direction-current/build-identity.json): public/out의 game.zip과 bridge 해시/bytes가 일치한다. 시작ZIP은37,641,800bytes이며 신규 staged 음원을 넣지 않았다. [기존 실제 외부 편집 산출물 계약14개](evidence/deep-direction-current/external-artifact-contracts.log)도 통과했다. 실제 외부 앱을 이번에 새로 조작한 검증과 구분한다.

## 관련 회귀에서 추가 이행한 동선

확대 실행75개는67통과·프로젝트별 제외3개·실패5개였다. [첫 실행](evidence/deep-direction-current/affected-regression.log)을 보존한다. 컷 종료 범위2개의 옛 추가 도구 접근, 제거된 사용자 음원 등록 가정, 자동 저장과 읽기 진입 실패 알림 문구 경합은 [이관 재검사](evidence/deep-direction-current/failures-migrated.log)에서4개 통과했다. 핵심 조건을 빼거나 업로드를 되살리지 않았다.

컷 종료 범위는 변경한 효과 배열/소리 채널과 수정 시각만 별도 처리하고 현재 컷의 다른 필드까지 전체 비교한다. 파일 재반입/reload와 종료 컷까지 두 cue 유지·다음 컷에서 해당 cue만 종료하는 native 검사를 유지한다. 개인 upload 대기 검사는 현재 정책의 업로드 부재·등록 cue 미리 듣기 중지·native 읽기/편집 복귀·ID 보존으로 대체했다. 기존 private bytes 보존은 공통 codec/저장 회귀에 계속 남는다.

네 선택지/점수 조합은 없는 조건부 바로가기 대신 작품 메뉴를 사용하고 설정에서 현재 컷으로 돌아온다. 한 browser context에 큰 작품8개를 연속 가져오던 검사가 실제 localStorage quota에 도달한 [실패](evidence/deep-direction-current/four-combinations-final.log)를 보존했다. 같은 원본과 네 조합을 각각 독립 browser context의 테스트로 나누어, 각 조합에서 전체 파일/reload/native 복귀 조건을 그대로 수행한다. 저장 quota 거부와 원고 유지 조건은 별도 실패 저장 회귀를 유지한다.

새 editingPath effect dependency 경고는 경로 memoization과 정확한 dependency로 수정했다. [변경 파일 최종 lint](evidence/deep-direction-current/changed-lint-final.log)와 [마지막 타입6 workspace](evidence/deep-direction-current/typecheck-last.log)가 통과했다. [최종 빌드](evidence/deep-direction-current/build-final.log)의 runtime/host를 기준으로 후속 검사를 진행했다.

## 최종 정적 빌드 판정

[최종 통합 실행](evidence/deep-direction-current/verified-final-build.log)은 **52개 모두 통과, 실패·제외0개**다. 승인 편집16개(선택지/점수 네 조합 포함), 승인 읽기7개, 컷 종료 범위2개, 편집 방문5개, compact 비음원5개, 기존 실제 외부 반출물2개, 확인 전환1개, 미리보기 context9개, 보기/실패 저장5개를 하나의 최종 정적 빌드에서 실행했다. 첫 확대75개의67통과/3제외/5실패를52개와 합산해 전체 프로젝트 성공이라고 주장하지 않는다. 그 실행의 다른 방향/점수/IME/Flow/글중심/자료 정책 결과는 당시 scoped 근거로 보존한다.

편집 방문 목표는 구현·이 범위 검증 완료 P1이다. 네 viewport에서 합류·반복·reload·읽기 advance/복귀의 독립성·목록의 특정 방문 직접 선택·저장 실패/한글 조합·같은 cut ID를 가진 작품별 분리를 확인했다. [휴대폰 방문 목록](evidence/deep-direction-current/editing-path-phone.png), [PC 방문 목록](evidence/deep-direction-current/editing-path-desktop.png), [실제 휴대폰 읽기](evidence/deep-direction-current/reader-phone-native.png)를 별도 보존했다. 화면을 직접 확인해 내용 줄바꿈/모달 scroll과 접힌 기본 입구를 확인했다. 물리 터치/삼성 keyboard·screenreader 인증의 근거로 확대하지 않는다.

독립 리뷰는 현재 path/context/guard/보호사본/삭제/형식 미첨부에서 P1/P2 지적이 없었고 focused15개 및 당시 viewport5개를 확인했다. 마지막 memoized 경로와 테스트 이행은 [lint](evidence/deep-direction-current/last-lint.log), [타입](evidence/deep-direction-current/typecheck-last.log), [단위25개](evidence/deep-direction-current/final-path-unit.log), 위 최종52개로 별도 확인했다. [현재 source/artifact manifest](evidence/deep-direction-current/final-manifest.json)는 해당 소스·로그·빌드 해시를 기록하며 이전 manifest를 덮지 않는다.

자체 점검(`agent-self-evaluation`): 정확성4(실제 정적/native/파일 일치, 물리 기기는 제외), 완결성4(우선 연출 회귀·제작 방문 복귀·관련52개 완료, 전체 다른 spec과 갈래 한정/실기기 후속), 명료성4(첫 실패/현재 성공과 local/native/external artifact 구분), 실행 가능성4(현재 UI·저장/복구 guard·기존 구조의 다음 조건), 간결성4(상태 소유와 링크 유지, 긴 검증 기록은 별도). 평균4.0. 개선 우선순위는 실제 학교/삼성 입력, 기존 전체 현행회귀의 남은 이행, 갈래 한정/외부 앱 범위 및 최초 Chrome 오류 원인 증거다. 새 카메라/표정/통합 타임라인은 현재 계약·관찰 의존성을 먼저 해결한다.
