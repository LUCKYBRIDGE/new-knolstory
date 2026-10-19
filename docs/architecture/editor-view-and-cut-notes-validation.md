# 글 편집 보기 왕복·컷 작업 정보 연결

2026-10-11. [승인 도안 개편](approved-ui-development-plan.md)과 [legacy UX 계승 계획](legacy-editor-ux-improvement-plan.md)의 UX-VIEWS/UX-CUT-NOTES를 구현한다. 기본 글·장면 중심과 하나의 추가 도구를 유지한다. 같은 실행 중 사용자가 구 story-maker 책장 색을 선호한다고 지정해 서재 마감도 고정 baseline의 `warm` 값으로 변경했다.

## 변경과 계약

현재 컷 편집/이 장 대본을 글 영역 바로 위의 작은 선택으로 묶었다. 설정 메뉴에 같은 버튼을 중복하지 않는다. 현재 컷·같은 원고를 유지하고 동기 저장이 실패하면 전환하지 않는다. 한글 조합 중에는 두 버튼을 비활성화한다. `editor-view-switch.tsx`는 작품/컷/보기별 커서·스크롤을 메모리에 보관하며 초기 진입에서 입력 초점을 강제로 잡지 않는다. 보기 전환 후에만 복귀할 필드를 열고 초점을 복원한다. 실패 후 키보드 재시도의 최신 선택 위치도 다시 기록한다.

`story-cut-notes.tsx`는 작업 제목·목적·감정·연출 메모를 기본 접힌 ‘글·컷 상세’에 연결한다. 컷 inspector와 장 대본의 현재 컷이 같은 기존 필드를 수정한다. 긴 작업 제목 입력 때문에 접기 제목 높이가 바뀌지 않는다. 메모는 읽기 화면의 대사가 아니며 연출 설정을 실행하지 않는다고 명시한다. 기존 primitive 문자열·ID·Flow·StageComposition·소리와 자유 배치를 유지한다. 기본 대사 입력과 메모 입력의 높이를 분리하고 필드 의미로 grid 행을 지정해 여백을 일괄 늘리지 않는다.

기존 StoryLine의 `workingTitle/purposeNote/emotionNote/directionNote`와 기존 workbook 컷 열을 그대로 사용한다. StoryDocument7/archive2/workbook7/JSONB payload1은 유지하며 새 저작 버전이나 schema 필드를 만들지 않는다. Core의 해석과 단일 Ren’Py presenter는 유지한다. Workbook/JSONB 검사 통과는 실제 서버/DB나 이번 실행의 새 Google 원격 편집 증거와 구분한다.

## 이번 검사

- [RED](evidence/editor-view-notes/red.log): 글 영역 근처의 보기 전환이 없는 상태에서 실패.
- [기본 승인 UI와 왕복](evidence/editor-view-notes/ui-final.log): 11개 통과. 원고 중심·도구 하나·네 점수/선택 조합·키보드 가림과 커서 복귀 포함.
- [최종 회귀](evidence/editor-view-notes/regression-final.log): 10개 통과/1개 native 프로젝트 전용 skip. PC/태블릿/휴대폰 양 방향 왕복, 긴 작업 제목의 입력 경계, 조합 중 이동 금지, 저장 실패 후 키보드 재시도, 메모 저장·파일 반출·재반입·native 읽기→편집 복귀, 기존 대본·자료·복제/이동/삭제/복구 검사.
- [왕복·전체 필드 단위](evidence/editor-view-notes/unit-final.log): 14개 통과. 실제 전체 작품의 메모 patch 후 원고·기타 필드 보존, archive/workbook/Excel/JSONB 전체 equality. 원고 보존 및 전체 저작 schema 회귀 포함.
- [전체 coverage](evidence/editor-view-notes/coverage.log), [타입](evidence/editor-view-notes/typecheck-final.log), [lint](evidence/editor-view-notes/lint.log), [빌드](evidence/editor-view-notes/build.log).
- [최종 정적 빌드](evidence/editor-view-notes/static-final.log): native 준비 응답을 확인한 뒤 왕복/메모 화면을 캡처하고 기존 서재와 사용자 지정 색/창문 간격을 재검사한다.

첫 회귀는 새 메모 textarea로 모호해진 검사 locator, 기존 접힌 화자 관리 입구를 열지 않은 검사, 자동 저장의 늦은 오류 메시지가 전환 오류 문구를 바꾼 경우를 드러냈다. 실제 current 글 selector, 현재 펼침 동선, 저장 상태·보기 유지·재시도 후 커서 검사로 고쳤다. [최초 UI](evidence/editor-view-notes/ui.log), [최초 회귀](evidence/editor-view-notes/regression.log)를 보존하며 실패 수를 성공으로 합산하지 않는다. 리뷰의 실패 후 pointer capture 잔류는 실제 수정하고 키보드 재시도 검사를 추가했다. 동시에 실행돼 중단한 리뷰어 E2E는 증거에 포함하지 않는다.

## 책장 색의 최신 결정

고정 `story-maker@18da4fc`의 `app/components/StoryDiscovery.tsx:116`은 `finish: warm`을 선택한다. `app/globals.css:13595-13604`의 꿀빛 오크 gradient와 shelf 음영, `13683-13690`의 기둥 마감을 현재 CSS Module에 적용했다. 목재 구조·책과 표지·화분·창문 폭+24–48px 벽 공간은 유지한다. 이전 월넛 기록은 당시 증거이며 최신 사용자 결정이 마감 색을 대체한다.

## 후속

최종 정적 빌드13개 통과. 전체 단위128파일/1147개 통과·기존1개 skip, statements93.47%/branches91.15%/functions96.77%/lines98.66%. Coverage는 기존 설정의 TypeScript 소스/라이브러리 범위이며 React 화면 동작은 위 실제 E2E로 별도 검사한다. [최신 책장 색](evidence/editor-view-notes/legacy-honey-oak.png), [PC 컷 메모](evidence/editor-view-notes/cut-notes-1440.png), [휴대폰 컷 메모](evidence/editor-view-notes/cut-notes-390.png). 캡처는 실제 native 준비 응답 뒤 수행했으며 도안 이미지를 제품 화면으로 대체하지 않았다.

전달 자기 점검: 정확성4(현재 코드·전체 계약 검사·native 준비 및 파일 왕복), 완결성4(보기/메모와 최신 색 변경 완료·전체 목표의 남은 항목 별도), 명료성4(실행 연출과 메모 구분), 실행 가능성4(현재 편집기 연결·복귀/실패 재시도), 간결성4(기존 필드·계획 재사용), 평균4.0. 다음 작업은 남은 경로/배치/메모 연결을 같은 승인 기본 작업면 안에서 검증하는 것이다.

작은 갈래 맥락, 다른 컷의 배치 가져오기, 관련 창작 메모 연결, 갈래 작성 왕복은 기존 [계승 계획](legacy-editor-ux-improvement-plan.md)의 상태·우선순위·의존성·완료 조건으로 남긴다. 전체 승인 이미지의 기능/시각 일치와 삼성 실기기 검증을 이 일부 구현으로 완료 처리하지 않는다.


## 2026-10-11 기본 글쓰기 작업면 보완

사용자 피드백에 따라 대본 보기/연결 분석의 상시 노출을 접힌 ‘장 전체 글·갈래 보기’으로 옮겼다. 기본 도구는 글·배경·인물이며 선택지·연출·컷 목록·소리는 ‘추가 편집’에서 해당 영역을 연다. 메뉴는 선택/Escape/초점 이탈 시 닫고, 조정 영역은 현재 글 앞에 표시한다. 이전·다음 컷 카드의 중복 상세 입구를 제거했다. 창작 메모는 관련 메모가 없는 컷에서도 접근하며 다른 메모를 펼쳐 참고할 수 있다. 현재 글은 같은 작업면에 남는다. 배경 표시와 세부 인물 배치는 목적이 명시된 선택 영역이다.

조작 크기는 DESIGN의 새 역할별 기준을 따르며 원고 크기를 함께 축소하지 않는다. 원고·ID·Flow·StageComposition·자유 배치·저장 형식은 바꾸지 않았다. 이 변경은 기능 삭제가 아니라 기본 작업의 우선순위와 노출 위치 변경이다. 기존 테스트는 새 사용자 동선에 맞춰 선택 도구를 명시적으로 연다.

[RED](evidence/writing-focus/red.log)는 기존 상시 대본 버튼으로 실패했다. [첫 글쓰기 네 화면](evidence/writing-focus/ui.log), [타입](evidence/writing-focus/typecheck.log), [빌드](evidence/writing-focus/build.log) 통과. 최종 정적 회귀는 [실행 로그](evidence/writing-focus/static.log)에 기록한다. 삼성 실기기·가상 키보드/외장 키보드 전체 및 사용자 테스트는 별도이며 브라우저 viewport로 완료를 주장하지 않는다.


창작 메모 관리 입구는 관련 메모가 없을 때도 기존 메모 편집 영역으로 바로 이동한다. 이동 전에 저장하며, 빈 메모 목록에서도 현재 컷 복귀 요청을 유지한다. 메모 영역에 초점을 두고 현재 컷 메모를 추가한 뒤 같은 원고로 돌아오는 동작을 별도 검증한다. 인물 이동 손잡이는 배경·인물 편집일 때만, 편집 점수 확인은 선택지 작업일 때만 제공한다. 편집의 글 복사/재확인 입구는 현재 textarea로 통합했고 읽기 화면의 접근 가능한 텍스트 인터페이스는 유지한다.

후속: UI-OPTIONAL-REVIEW 부분 P1. 의존성은 현행 선택지/점수·연출·소리 계약이며, 완료 조건은 기본 작업에서 필요 없는 중복 입구를 줄이고 각 조정을 목적에 맞는 한 영역에서 실제 편집·미리보기·취소·저장 검증하는 것이다. UI-SAMSUNG-DEVICE 미검증 P2는 실제 기기·Samsung 키보드가 의존성이며 조합/가림/회전/외장 키보드·터치 검증 기록이 완료 조건이다.


명칭은 현재 컷 쓰기·장 전체 글 고치기·현재 컷 연결 살펴보기·보기 설정·글쓰기 화면으로 돌아가기로 구체화했다. 휴대폰의 미리보기 재생/비율 조작은 장면 아래로 배치해 접근을 유지한다. 메모 참고·생성·수정·복귀와 원고 변경은 같은 기존 계약을 사용한다. [메모 4화면 확인](evidence/writing-focus/static-last.log)의 최초 4개 및 빈 메모 생성/복귀는 통과했다. 해당 실행의 휴대폰 글씨 기대값 실패는 이후 역할별 PC12px/터치13px 검사로 교정했으며 실패 로그는 보존한다.


최종 범위 결과: [기본 글쓰기·상단·컷 이동 10개](evidence/writing-focus/chrome-writing-final.log) 통과. [대본/컷 메모·연결 도구 회귀](evidence/writing-focus/verified-final.log)는 관련 11개를 포함해 통과했으나 당시 휴대폰 viewport 시작 위치243.55px가240px 기준을 넘어 상단 검사1개가 실패했다. 재생/비율 줄을 장면 아래로 옮긴 뒤 위 10개에서 해당 검사를 통과했다. [창작 메모 4화면](evidence/writing-focus/static-last.log)은 메모 수정·복귀·원고 불변·파일 내보내기·재열기와 native 준비를 통과했다. 각 실패 로그는 삭제하지 않는다.

[인접 원고·메모 15개 단위](evidence/writing-focus/unit.log), [타입6 workspace](evidence/writing-focus/typecheck-last.log), [빌드](evidence/writing-focus/build-final.log), 문서 링크 검사 통과. lint 오류0이며 기존 native 저장 썸네일의 img 권고가 남는다. 최종 접힌 두 입구를 나란히 정리한 화면은 [마지막 글쓰기 검증](evidence/writing-focus/writing-last.log)에 별도 기록한다. 이전 커버리지/실기기 결과를 새 변경 결과로 재사용하지 않는다.

자기 점검: 정확성4(저장/메모/원고 및 native 복귀 회귀), 완결성4(기본 글쓰기 정리·목적별 추가 편집 완료, 전체 추가 기능 UX 검토 후속), 명료성4(실제 작업을 명명하고 중복 입구 감소), 실행 가능성4(메모가 없을 때 생성·같은 컷 복귀 포함), 간결성4(기본 접힘·역할별 크기). 평균4.0. 다음 개선은 목적별 추가 기능의 중첩/중복 정리와 실제 삼성 기기 검증이다.

마지막 나란한 입구 조정 이후 [글쓰기 5개](evidence/writing-focus/writing-last.log) 통과. 실제 native 준비 후 [PC 화면](evidence/writing-focus/writing-1440.png)과 [휴대폰 화면](evidence/writing-focus/writing-390.png)을 보존했다. [최종 lint](evidence/writing-focus/lint-clean.log) 오류0·기존 img 권고1, [문서](evidence/writing-focus/docs.log) 링크 오류0. 사용자 확인용 로컬 editor 서버의 응답200을 확인했다.


## 2026-10-11 작품 메뉴·목적별 설정 통합

WorkspaceManagement의 중복 ‘작품 준비’/‘작품 관리’를 ‘작품’ 메뉴로 통합했다. 새 작품/다른 작품 선택/숏스토리 이동은 기존 서재에서 제공한다. 작품 정보·표지와 이야기 기획을 직접 열며 파일/저장/외부 양식/복구를 같은 메뉴 안에 배치했다. 복구 기록을 popup 밖에 따로 펼쳐 상단 높이를 늘리지 않는다.

StoryPreparation은 ‘작품 설정’으로 명명하고 한 항목만 보인다. 작품 정보·표지/기획/창작 메모/점수 선택은 탐색 상태이며 원고 저장 계약은 바뀌지 않는다. memo navigation request의 optional section을 활용해 원래 작품/현재 컷·설정 선택을 보존하고 보호 사본에서 작품 identity만 remap한다. 메모 진입은 기존 정확한 메모 초점·같은 컷 복귀를 유지한다. 표지 취소에도 목적 선택을 보존한다. 설정 진입/복귀의 저장 실패와 IME를 보호하며 일반 서재 진입은 이전 editor request를 비운다. 원고/Asset ID/Flow/StageComposition·자유 배치는 그대로다.

[RED](evidence/work-actions/red.log)는 기존 준비 버튼으로 실패했다. [첫 정적 회귀](evidence/work-actions/ui.log)는 기존 관련22개가 통과하고 새4개는 숨겨진 editor의 같은 제목 aria-label까지 함께 검색해 실패했다. 설정 region으로 locator를 좁혔으며 사용자 입력 컨트롤을 숨겨 테스트를 맞추지 않았다. [최종 실행](evidence/work-actions/ui-final.log), [단위14개](evidence/work-actions/unit.log), [타입](evidence/work-actions/typecheck-final.log), [빌드](evidence/work-actions/build-final.log), [lint](evidence/work-actions/lint.log)에 현재 증거를 보존한다.

전체70개 E2E 파일의 이전 준비/all-fields/작품 선택 직접 조작 가정은 목적 선택·서재 진입으로 순차 갱신해야 한다. 상태 부분 P1, 의존성 현재 메뉴/서재/API·저작 계약, 완료 조건은 새 사용자 동선으로 전체 회귀를 실행하고 남은 실패를 분류/수정하는 것이다. 현재 집중 회귀를 전체70파일 완료로 표현하지 않는다. 삼성 실기기/스크린리더는 기존 미검증 목표를 유지한다.


작품 메뉴 통합 최종 범위: [현재 컷 복귀·목적 선택·표지 취소·IME/저장 실패·서재 진입6개](evidence/work-actions/native-final.log) 통과. 마지막 캡처는 actual native revision 준비 후 작품 메뉴를 열어 저장한다. [긴 한국어 원고·제목과 대본/설정 왕복5화면](evidence/work-actions/density-final.log) 통과. 앞 실행에서 기획을 별도 선택하지 않아 숨겨진 항목을 채우려던5개 실패는 [원본](evidence/work-actions/verified-last.log)에 보존하고 명시적 항목 선택으로 수정했다.

독립 소스 리뷰 후 returnToEditor origin flag를 분리해 일반 서재 설정에서 항목만 바꿨다고 editor 복귀 요청을 만들지 않는다. [단위14개](evidence/work-actions/unit-last.log), [타입](evidence/work-actions/typecheck-last.log), [빌드](evidence/work-actions/build-last.log), [lint](evidence/work-actions/lint-final.log) 오류0. 메뉴의 폐기된 작품 선택 props도 이후 제거했다. 기존 테스트의 editor 파일 입구는 data-work-menu로 분명히 구분하며 서재의 작품 관리 도구와 혼동하지 않는다. 전체 E2E 원래 work-selector 동선은 여전히 후속 전환/검증 범위다.

자기 점검: 정확성4(원고/설정/메모/보호사본 탐색 상태 분리), 완결성4(목적별 메뉴·현재 컷 복귀 범위 완료, 전체 회귀/실기기 후속), 명료성4(준비/관리 제거·목적별 이름), 실행 가능성4(수정/표지 취소/저장/재열기/파일), 간결성4(기본 상단2입구를1개로 통합). 평균4.0.


## 보기·재생 입구 중복 제거

보기 설정의 재편집/현재 컷 읽기 중복 입구와 글 입력 영역 감추기를 제거했다. 미리보기 비율을 보기 설정으로 모으고, 전체 흐름은 여러 컷·갈래 작업 안으로 옮겼다. inspector 감춤 상태와 제거된 작품 선택 함수/props를 정리해 숨긴 입구의 죽은 상태를 유지하지 않는다. 현재 컷 재생과 처음부터 재생은 같은 switchMode 저장/IME guard를 사용하고 실제 해석은 기존 Core playback이다. 읽기 메뉴의 편집 복귀와 저장/불러오기는 유지한다.

[RED](evidence/view-actions/red.log)는 상시 화면 비율로 실패했다. [타입](evidence/view-actions/typecheck-final.log), [빌드](evidence/view-actions/build.log), [lint](evidence/view-actions/lint.log), [브라우저·native 회귀](evidence/view-actions/ui.log)에 현재 증거를 기록한다. 독립 흐름 도구/재생 접근과 실제 실패 보호를 검사하며 단순 버튼 수만 검증하지 않는다.


2026-10-12 보기 입구 재검증: 화면 비율 블록의 최초 이동이 준비 header를 잘못 대상으로 삼은 것은 소스 리뷰로 발견해 editor 보기 설정 안으로 고쳤다. 새 읽기마다 playbackRun을 갱신해 native/audio session을 새로 시작한다. 첫 실행은 실패 위치 조사 후 중단했고 [재검증23개](evidence/view-actions/ui-final.log)는 통과했다. 재생 진입은 저장 실패 때 편집에 남지만 읽기에서 편집 복귀는 기기 저장 실패 때문에 막지 않는다.

실제 메뉴 캡처는 기존 controls max-width100%가 작은 summary 폭을 상속해 글자가 세로로 쪼개지는 문제를 드러냈다. viewport 경계만으로 가독성을 증명할 수 없으므로 최소 펼침 폭도 검사한다. 작품/보기 popover는 viewport 폭으로 제한하며 작은 화면은 summary 아래 실제 위치를 기준으로 고정 배치한다. 전체 바깥 여백을 늘리는 방식으로 해결하지 않는다. [폭 검증](evidence/view-actions/layout-final.log)은844 가로의 보기 메뉴 왼쪽 경계 실패를 보존한다. 최종 재검증은 다음 실행 결과를 따른다.

[전체 단위 커버리지](evidence/view-actions/coverage.log):136파일,1166통과·1건 제외; statements93.56%/branches91.21%/functions96.63%/lines98.70%. 이는 Vitest configured source의 범위이며 모든 UI/실기기 커버리지를 의미하지 않는다. 실제 삼성 기기·스크린리더와 전체70파일의 이전 직접 작품 선택 가정 전환은 별도 후속이다.


2026-10-12 최종 기능 회귀 [18개](evidence/view-actions/verified.log) 통과: 읽기7개(수동/빠른 기록·불러오기·자동·파일 왕복·native·runtime 준비 실패), 보기5개(네 화면의 비율/전체 흐름/초점/가로 경계·저장/IME), 작품6개(목적 선택/표지 취소/수정/재열기/현재 컷 복귀/서재 origin). 저장 실패 중 서재로 나가기는 보호하지만 편집 복귀는 허용하는 경로도 추가했다. [타입6 workspace](evidence/view-actions/typecheck-last.log), [빌드](evidence/view-actions/build-complete.log), [lint](evidence/view-actions/lint-complete.log) 오류0. 기존 img 권고1건은 별도다.

메뉴 캡처를 보고 파일 가져오기 label만 큰 글씨/44px로 남은 것도 동일한 chrome 토큰으로 맞췄다. 파일 가져오기와 내보내기의 글씨 크기 일치를 검사하는 마지막 [메뉴11개](evidence/view-actions/menu-final.log)는 해당 조정 후 증거다. [작품 메뉴 PC](evidence/work-actions/work-menu-1440.png), [휴대폰](evidence/work-actions/work-menu-390.png), [작품 정보](evidence/work-actions/work-info-1440.png)를 native 준비 후 캡처한다.

자기 점검: 정확성4(읽기/편집 상태·native session·소스 리뷰), 완결성4(작품/보기 중복 입구·폭/한글 범위, 전체 기존 회귀 후속), 명료성4(한 작업의 직접 입구·연관 작업 묶음), 실행 가능성4(IME/저장 실패/복귀·표지 취소), 간결성4(상단 버튼·죽은 상태 감소). 평균4.0. 사용자의 전체 UX 목표는 남은 새 작품 진입과 전문 도구·실기기/전체 회귀 검증을 포함해 계속 진행한다.


## 2026-10-12 새 작품 생성→첫 컷 글쓰기

제목을 입력한 뒤 작품 설정 화면으로 다시 보내던 단계를 제거했다. `newStory`는 기존 workspace를 먼저 저장한 뒤 새 작품 identity를 등록하고 cut/text 편집·동일 native stage를 연다. memo navigation·soundTool·flowMap·previewProfile을 초기화하고 보호된 원고·저작 내용은 바꾸지 않는다. 새 작품은 기존 Core blank project 생성기를 재사용한다. 점수/선택지/메모 자동 생성 없음. 기획/표지는 기존 작품 메뉴에서 선택한다.

[RED](evidence/create-writing/red.log)는 설정 화면에 남아 현재 글 입력이 보이지 않아 실패했다. [첫 정적 실행10개](evidence/create-writing/ui.log) 통과: 네 viewport에서 생성→입력→기기 저장→재열기→서재→동일 작품 편집→파일 보관·ID/원고/빈 점수·메모 검사, 기존 긴 한국어 제목/대본/목적 설정5화면 및 점수 편집1개. [타입](evidence/create-writing/typecheck.log), [빌드](evidence/create-writing/build.log), [lint](evidence/create-writing/lint.log) 증거를 보존한다. [추가 검증](evidence/create-writing/final.log)은 생성 저장 실패의 제목/기존 원고 유지와 창작 메모 전문 회귀를 포함한다.

기존 memo authoring 회귀는 없어진 준비 버튼 대신 작품 메뉴→설정 항목의 창작 메모를 선택하도록 수정했다. 기존 UI에 맞추려고 불필요한 준비 입구를 제품에 복원하지 않는다. 전체 옛 동선 전환은 UX-REGRESSION-NAV의 별도 완료 조건이다. 실제 삼성 키보드·물리기기 검증으로 주장하지 않는다.


추가 [6개 검증](evidence/create-writing/final.log) 통과: 새 작품4화면, 생성 실패 후 폼/원고 유지 및 다시 생성, 창작 메모5viewport·새 context 파일 가져오기. 독립 소스 리뷰에서 진입/저장/상태 초기화 차단 결함 없음. 실제 native 읽기→편집 복귀의 마지막 [5개](evidence/create-writing/native-final.log)는 같은 iframe·현재 컷ID·줄바꿈 원고를 확인한다. 현재 작품 내용을 수정하지 않은 원본 보존과 새 작품 생성은 기존 storage/Core를 사용하며 새 저작 필드나 migration을 만들지 않았다.

자기 점검: 정확성4(저장 전환 guard·원고/ID·native 계약 재사용), 완결성4(새 작품 진입/실패/왕복 완료·전문 도구/전체 회귀 후속), 명료성4(필수 준비 없이 바로 글쓰기), 실행 가능성4(생성/입력/재열기/서재/파일·메모 회귀), 간결성4(불필요한 단계1개 제거·기존 구현 재사용). 평균4.0. 전체 UX 목표는 계속 진행하며 실기기 미검증을 유지한다.


## 2026-10-12 배경·인물·표지 이미지 선택 통합

AssetPickerField의 전체 catalog select와 썸네일 launcher 중복을 제거했다. 그림 선택 창 안에서 기본값/없음도 pending으로 고른 뒤 적용한다. 기본값과 없음은 이미지 ID로 최근 사용에 기록하지 않는다. 장 기본값 빈 문자열은 프로젝트 기본값 이어받기이며, ChapterWriter의3개 입구를 그 의미로 명명했다. 배치 인물의 필수 그림에는 빈 선택을 추가하지 않는다. 표지의 빈 그림은 기존 빈 문자열이며 표지 draft 적용/취소 경계를 유지한다. unknown/이전 자산은 사용자의 결정을 기다리며 자동 교체하지 않는다.

자료실의 세부 필터는 기본 접힘 하나로 묶고 활성 chips/검색 해제를 밖에 유지했다. 기존 조건/같은 인물/즐겨찾기/최근 사용 기능은 유지한다. ‘이미지 이미지 찾기’ 중복 명명을 정리했다. Inspector의 무대 자료 요약→배경 설정 이동은 제거된 select 대신 이미지 입구로 초점을 옮긴다. 기존 ID·Flow·StageComposition·파일/시트/JSONB 형식은 변경하지 않았다.

[RED](evidence/image-selection/red.log)는 중복 배경 combobox가 남아 실패했다. [첫4화면](evidence/image-selection/ui.log), [중간10개](evidence/image-selection/final.log), [최종11개](evidence/image-selection/verified.log)를 기록한다. 검사 내용은 이미지/none/default 적용·취소·Escape·초점, 저장/재열기/파일 ID, sentinel 최근 사용 제외, 인물 빈 선택 없음, 표지 중첩 draft 취소, 장3필드의 프로젝트 상속 의미, 무대 자료 요약의 위치 편집/저장과 동일 native iframe이다. 소스 리뷰에서 발견한 장 빈 값 명칭 불일치를 수정했고 재검토에 차단 결함 없음.

[타입6 workspace](evidence/image-selection/typecheck-complete.log), [빌드](evidence/image-selection/build-complete.log), [lint](evidence/image-selection/lint.log) 증거. 실제 삼성 기기·보조기술 완료를 주장하지 않으며 이전 catalog selectOption 기반 전체 E2E의 전환은 UX-REGRESSION-NAV와 함께 후속으로 유지한다. 최종 캡처는 [PC 자료실](evidence/image-selection/picker-1440.png), [휴대폰 자료실](evidence/image-selection/picker-390.png)이다.

자기 점검: 정확성4(컷/장/표지 빈 의미·pending/최근 사용·소스 리뷰), 완결성4(단일 입구/취소/저장 범위 완료·전체 구동선/실기기 후속), 명료성4(중복 입구/중복 명칭 감소·상속 구분), 실행 가능성4(그림/없음/기본값·무대 자료 이동), 간결성4(직접 검색과 필터 기본 접힘). 평균4.0. 다음은 기존 이미지 직접 select 회귀 동선 전환과 전문 연출 도구의 목적별 묶음 검토다.


최종 [11개](evidence/image-selection/verified.log) 통과 후 actual 휴대폰 캡처에서 공통 editor 버튼 배경이 primary Apply의 흰 글씨와 겹쳐 버튼 문구가 보이지 않는 CSS 충돌을 발견했다. picker footer Apply에 명시적 스타일을 지정하고 글씨/배경 동일색 검사를 추가했다. 이후 [최종6개](evidence/image-selection/ui-final.log)는 네 화면의 취소/기본값/없음/그림/저장·파일·초점·가독성, 필수 인물 이미지/표지 취소, 장3개 상속 입구를 다시 검증한다. [최종 빌드](evidence/image-selection/build-finish.log), [최종 lint](evidence/image-selection/lint-final.log) 오류0·기존 img 권고1, 문서 링크 검사를 기록한다. 캡처를 현재 UI 기능 검증의 대체로 사용하지 않고, 기능 검사만으로 시각적 가독성이 증명됐다고도 하지 않는다.


## 2026-10-12 목적별 연출·독립 변경 취소

StoryDirectionPanel은 한 select에서 실제 연출 목적을 선택한다. 최초에는 이미 저장된 효과/전환/분위기/강조를 우선 표시하고 없으면 전환부터 보여 준다. 선택 항목은 적용 상태도 요약한다. 네 조작 영역은 숨김으로 유지해 종류 전환 때 local draft/undo를 잃지 않으며 작품/컷 identity가 바뀌면 초기화한다. 전환과 분위기는 part 별 입력/undo로 분리하고 다른 presentation 필드는 현재 값을 유지한다. 두 part의 같은 이름 입력이 중복 렌더되지 않게 했다.

인물 동작은 기존 배치 편집으로 이동해 상세 영역을 열고 첫 동작 입력(인물이 없으면 입구)에 초점을 준다. untouched 강조에는 초기화 버튼이 없고, 효과 변경 전에는 취소 버튼이 없으며 효과1개에는 정렬 버튼이 없다. source에 마지막 효과가 없어져도 EffectStartControls의 scoped undo는 남는다. 이동 폼은 필요 없을 때 숨기되 이동/undo 뒤 펼침 상태를 잃지 않게 유지한다. 따라오는 효과가 없는 작품의 종료 조작은 생략하지만 기존 clearFollowingEffects 설정은 접근 가능하고 편집 중 uncheck 때 바로 사라지지 않는다. 중복 설명과 연출 fieldset의 불필요한 위쪽 간격도 줄였다.

StoryDocument/RuntimeScene/native 해석이나 파일/시트/JSONB 버전을 바꾸지 않았다. 모든 입력은 기존 patch/Core를 사용한다. [RED](evidence/direction-purpose/red.log)는 목적 선택 부재로 실패했다. [첫4화면](evidence/direction-purpose/ui.log), [중간6개](evidence/direction-purpose/verified.log), [최종7개](evidence/direction-purpose/complete.log)를 보존한다. 마지막은 네 화면의 목적/필드 가림·전환 독립undo/무의미한 버튼 부재·저장/파일/재열기·actual native 읽기와 동일 iframe 복귀·동작 초점, 탐색만으로 프로젝트에 기본값을 쓰지 않음, 기존 효과 종료/자유 배치 보존, 시작 컷 이동/undo/후속 글·종료 컷 보존을 확인한다.

조건부 unmount가 효과 시작 폼의 펼침 상태를 잃게 만든 점, 기존 종료 체크를 해제할 때 조작이 사라지는 점은 검증 중 발견해 mounted hidden/state latch로 수정했다. 해당 수정 전 [실행](evidence/direction-purpose/final.log), [추가 실행](evidence/direction-purpose/ui-final.log)은 조사 후 중단한 기록이며 전체 통과 주장에 쓰지 않는다. 소스 전용 리뷰에서 마지막 이동 undo/state 보존을 확인했다.

[단위](evidence/direction-purpose/unit.log), [타입6 workspace](evidence/direction-purpose/typecheck-complete.log), [빌드](evidence/direction-purpose/build-complete.log), [lint](evidence/direction-purpose/lint-final.log), [문서](evidence/direction-purpose/docs.log)를 기록한다. 기존 all-fields 연출/전환 직접 조작 E2E는 목적 선택 동선으로 전환해야 하며 이번 집중 검사가 전체 검증은 아니다. 실제 삼성 기기·보조 기술 검사도 미완이다.

자기 점검: 정확성4(독립 필드 취소·원고/배치·Core/native 재사용), 완결성4(목적별 연출 범위·이동undo 확인, 전체 회귀/실기기 후속), 명료성4(연관 조작 묶음/현재 적용 표시), 실행 가능성4(저장/파일/재열기/native/동작 이동), 간결성4(한 목적과 불필요한 버튼·설명 축소). 평균4.0. 다음은 소리 도구의 같은 목적 분류 및 기존 회귀 동선 전환이다.


## 2026-10-12 소리 목적·종류별 취소

StoryAudioControls는 한 selector에서 music/ambience/sounds를 선택하며 각 영역을 hidden으로 유지해 같은 편집 세션의 draft/undo를 보존한다. 유지와 이어받기, 재생·정지는 선택 항목에도 구분한다. onChange는 종류별 undo snapshot을 저장하고 순수 restoreAudioPart는 그 필드만 복구한다. 새 컷/장/작품에서는 component key로 초기화해 다른 범위의 취소를 적용하지 않는다.

AudioPickerField active 변경은 현재 미리 듣기를 멈추며 asset 변경/수명 종료 때도 멈춘다. 세부 종류/속성/출처 필터는 기본 접힘이고 현재 선택·검색·조건 적용 표시는 보인다. 장면 결합 소리의 안내는 실제 ‘이 컷부터 재생’ 입구를 가리킨다. 권리/등록/preview 제한을 제거하거나 새 소리를 확보하지 않았다.

AudioStartControls는 현재 music/ambience를 바로 받아 중복 종류 선택을 제거했다. 지시가 없는 상태에는 이동 form을 노출하지 않지만 undo/message가 있으면 mounted hidden으로 남겨 마지막 지시 이동 후에도 undo를 사용할 수 있다. 이동 취소는 원래 채널을 이름에 표시한다. SoundBatchControls도 원본 효과음이 없으면 조작을 숨기지만 기존undo/message는 유지한다. 외부 시작 이동/일괄 작업은 해당 종류의 일반 undo만 무효화한다. 공통 min-height가 반복 checkbox를 크게 만든 것은 캡처 후18px 표시/label hit-area로 수정했고, 중복 fieldset 제목과 margin을 줄였다.

[단위 RED](evidence/sound-purpose/red.log) 후 [종류별undo 단위3개·helper 한정100%](evidence/sound-purpose/unit-coverage.log) 통과. 처음 [UI](evidence/sound-purpose/ui.log)4개는 파일 JSON에서 생략된 fadeInMs를 own undefined property로 요구해 실패했으며 실제 없음 검사로 교정했다. [중간8개](evidence/sound-purpose/final.log)와 [추가5개](evidence/sound-purpose/verified.log), [필터5개](evidence/sound-purpose/complete.log), [체크표시5개](evidence/sound-purpose/ui-final.log), 마지막 [native/이동/일괄9개](evidence/sound-purpose/native-final.log)를 기록한다.

네 viewport에서 독립 종류 undo/원고 불변/파일Cue·ID·delay200ms/재열기, 실제HTML 미리 듣기 시작→종류 전환으로 멈춤(자연 종료 아님), native unlocked/musicPath/ambiencePath/soundPlayCount, 동일iframe·편집 복귀, 장 변경 후 다른 장 undo가 없음과 이전 장 소리 유지, 연속 소리 시작 이동/후속 글·종료점·undo, 일괄 효과음추가의 독립ID·기존 소리/원고/undo를 검사한다. [타입](evidence/sound-purpose/typecheck-last.log), [빌드](evidence/sound-purpose/build-complete.log), [lint](evidence/sound-purpose/lint-final.log), [문서](evidence/sound-purpose/docs.log) 증거를 보존한다. 독립 소스 전용 리뷰에서 차단 결함 없음.

지금 local undo는 목적을 바꾸는 같은 편집 세션 안에서 보존한다. native 읽기 후 component 재수명에서 같은 도구/undo까지 보존하는 전체조건은 UX-PREVIEW-CONTEXT 후속으로 분리했다. 현재 native검사는 데이터/같은iframe·컷 복귀 증거이며 undo 수명까지 증명하지 않는다. 기존전체 소리 all-fields 회귀도 목적 선택으로 전환해야 한다. 실제 삼성 기기·보조 기술은 미검증이다.

자기 점검: 정확성4(채널 의미·독립undo·실제native+미리듣기), 완결성4(소리목적 범위·파일/재열기·범위guard, 전체preview/다중효과음 후속), 명료성4(선택한 목적/현재 상태·원래undo 채널), 실행 가능성4(현재소리/일괄/시작이동과 실패보호), 간결성4(세부필터·중복 제목·불필요한 비활성 입구 축소). 평균4.0.


## 2026-10-12 메뉴 목적 재확인·등록 중 수정 보호

서재 tools의 ‘작품 관리’를 ‘책 찾기·추가’로 바꾸고 실제 서재 진입에서 새 summary를 검사했다. 이미 구현된 단일 작품 메뉴와 목적별 작품 정보/기획, 표지 취소, 같은 컷 복귀, 저장 실패/IME 보호를 네 viewport에서 다시 실행했다. 필요한 기능/선택적 보조/중복 입구의 판정은 [목적 감사](editor-redesign-completeness-audit.md)의 최신 절을 따른다.

소리 등록 대기 동안 다른 채널을 고치면 시작 시점의 onChange closure가 이후 주변 소리 변경을 지우는 문제를 [RED](evidence/sound-purpose/pending-red.log)로 재현했다. AudioPickerField는 layout 단계에서 최신 callback을 갱신하고 work/kind 변경·unmount 때 등록 scope를 무효화한다. 등록은 원래 작품 자료함에 완료되지만 다른 컷으로 이동한 오래된 선택 callback은 적용하지 않는다. busy 표시는 작업 범위별로 관리하며 이전 요청의 완료가 다른 범위의 새 등록을 해제하지 않는다.

[집중 회귀13개](evidence/sound-purpose/scope-final.log): 목적별 소리5, 등록 대기2, 작품 메뉴6. 실제 native 재생·같은 iframe 복귀·파일/재열기·장별undo·기획 편집/표지 취소·저장 실패·서재 설정 경로를 포함한다. lint의 effect 내 동기 setBusy 오류는 보존된 [첫 검사](evidence/sound-purpose/lint-scope.log) 이후 범위별 busy 상태로 수정했다. 마지막 구현에 대한 [빌드](evidence/sound-purpose/build-scope-final.log), [타입](evidence/sound-purpose/typecheck-scope-final.log), [lint](evidence/sound-purpose/lint-scope-final.log), [등록 대기 최종2개](evidence/sound-purpose/pending-final.log)를 확인했다. 최종 대기 검사는 다른 컷의 값뿐 아니라 자료함 등록을 확인한 뒤 원래 컷을 다시 열어 원래 Asset ID가 유지되는지도 검사한다. 독립 소스 리뷰는 실행 검증과 별도로 진행했고 차단 결함 없음.

캡처: [휴대폰 작품 메뉴](evidence/sound-purpose/work-menu-390.png), [PC 작품 메뉴](evidence/sound-purpose/work-menu-1440.png), [휴대폰 소리 목적](evidence/sound-purpose/sound-purpose-390.png). 넓은 범위 회귀13개는 마지막 busy 내부 구현 변경 전에 실행했으며, 그 변경 뒤 등록 경계2개를 재실행했다. 전체 제품/실제 삼성 기기 완료로 확대하지 않는다.


## 2026-10-12 작품 메뉴 구획·공개 시트 확인 통일

작품 설정/파일·저장의 작은 semantic group을 메뉴 안에 직접 배치했다. 새 상단 버튼·구획 카드·추가 펼침 단계는 없다. 복구는 파일 구획 안의 기존 ‘작품 복구 기록’으로 찾는다. 두 짧은 안내로 기기 저장/이동 가능한 파일, 가져오기 확인 후 독립 작품 열기를 구분한다. StoryWorkspace의 saveBeforeImport가 적용 시 IME/현재 저장을 보호한다. 실패하면 현재 글과 확인창을 유지한다.

첫 [RED5개](evidence/menu-purpose/red.log)는 구획 부재와 저장 실패에도 가져오기가 진행되는 문제를 재현했다. [중간11개](evidence/menu-purpose/ui.log)는 네 화면 구획/파일 저장 guard와 기존 작품 설정6개를 확인했다. 공개 시트 테스트의 첫 [실행](evidence/menu-purpose/final.log)은 repo root에서 package import를 못 찾은 환경 오류이며 relative source import로 수정했다. [다음 실행](evidence/menu-purpose/final-retry.log)은 내보내기 후 닫힌 메뉴를 다시 열지 않고 숨긴 Excel 입구를 누르려다 첫 공개 시트 사례가 timeout했고, 두 번째는 수정 작업을 위해 명시 중단했다. 이 실패를 제품 완료 근거로 쓰지 않는다.

독립 소스 리뷰에서 공개 시트가 같은 작품 ID를 거부/우회하는 점과 loadStoryArchive의 확인 전 IDB 쓰기를 지적했다. 공개 시트도 TSV File을 previewAuthoringFile로 확인하고 validated archive를 같은 pending 확인창에 전달하도록 통일했다. 파일과 시트는 applyPendingArchive 하나에서 독립 ID·첨부 저장·작품 전환을 수행한다. 요청 scope는 확인 전/후에 검사하고 finally도 같은 scope에만 적용한다. StoryTransferPanel은 작품 ID로 keyed되어 새 작품에 이전 busy를 가져가지 않는다.

최종 [집중7개](evidence/menu-purpose/verified.log)는 네 viewport 메뉴/넘침·원고 불변, 파일 확인의 IME/저장 실패/재시도/reload, 공개 시트의 지연 응답/최신 원고 저장/같은 원래 project ID의 독립 복사/기존 작품 저장 유지/재열기/저장 실패 유지, 첨부 오디오가 확인 전 resources store에 없음까지 검사한다. 실제 Google 서비스에 게시하지 않고 로컬 테스트 route로 응답 순서를 제어했다. 실제 외부 Google 편집 증거와 구분한다. [빌드](evidence/menu-purpose/build-complete.log), [타입](evidence/menu-purpose/typecheck-complete.log), [lint](evidence/menu-purpose/lint-verified.log)는 마지막 구현 기준이다.

목적 구획과 보호 사본을 확인했다고 전체 편집 화면 개편을 완료한 것은 아니다. 다음은 파일 작업의 명칭 일관성(UX-FILE-WORDING), 실제 읽기 미리보기 후 도구/초안 복귀(UX-PREVIEW-CONTEXT), 여러 효과음 목록의 간결한 조정(UX-SFX-LIST), 기존 회귀 동선 전환(UX-REGRESSION-NAV)이며 각 조건은 기존 계획에 둔다.

자기 점검: 정확성4(원래 ID 충돌·첨부 쓰기 시점과 실패를 직접 검사), 완결성4(메뉴/확인 경로 범위 완료·전체 UX 후속), 명료성4(설정과 기기/파일 목적 구획), 실행 가능성4(직접 입구·같은 확인/재시도), 간결성4(상단 버튼/추가 toggle 없음). 평균4.0.


마지막 [작품 설정6개](evidence/menu-purpose/settings-final.log)는 위 공개 시트 경로 통일 뒤 네 화면 정보/기획·표지 취소·같은 컷/글 복귀·IME/저장 실패·서재 출발 설정을 재검증했다. 실제 Ren’Py 준비와 동일 편집 컷에 도달한 [휴대폰 메뉴](evidence/menu-purpose/work-menu-390.png)/[PC 메뉴](evidence/menu-purpose/work-menu-1440.png)를 보관했다.

가져오기 확인창 바깥에만 실패 이유가 보이는 UX를 수정했다. 확인창 안의 role=alert에 IME/현재 저장 실패를 표시하고 새 확인과 재시도 때 이전 오류를 정리한다. [마지막 경계3개](evidence/menu-purpose/dialog-final.log)는 해당 확인창 내부 메시지·현재 글/창 유지·재시도/reload와 공개 시트의 확인 전 첨부 미저장을 다시 검사한다. 마지막 [빌드](evidence/menu-purpose/build-dialog.log)/[타입](evidence/menu-purpose/typecheck-dialog.log)/[lint](evidence/menu-purpose/lint-dialog.log)가 근거다. 구획7개+설정6개 뒤 변경은 오류 표시/정리이며 가져오기3개만 재실행했다. 독립 리뷰의 기존 ID/확인 전 쓰기 지적은 수정 후 소스 재검토에서 차단 결함 없음으로 확인했다.

## 2026-10-12 미리 재생 후 편집 작업 복원

읽기 전환에서 data-editor-inputs 전체를 unmount하던 것을 mounted hidden/inert/aria-hidden으로 바꿨다. 같은 컷에서는 추가 도구와 목적별 local undo, 검색·펼침·검증 상태를 보존한다. usePreviewEditorContext는 마지막 입력의 DOM identity/aria-label, 글 선택 범위·입력창 scroll·패널 scroll·페이지 위치를 편집 세션에 기억한다. 작품/컷/원고 보기/도구/소리 구분이 같을 때만 복원하며 현재 panel에 속한 field인지 확인한다. 다른 컷 복귀 때는 현재 컷 글에 초점을 준다. StoryDocument나 local storage에 이 UI snapshot을 추가하지 않는다.

기존 SecondsInput의 blur 검증/정상화는 유지한다. 재생 버튼을 누를 때 정상적으로 적용된 초 값과 검증 실패 후 기존 값/메시지를 보존하며, 무효 초안을 저작값으로 재생하거나 저장하지 않는다. raw 숫자 문자열의 불필요한 끝0까지 영구 보존한다는 계약은 아니다.

숨긴 패널의 HTML 미리 듣기는 layout 단계에서 멈춘다. editingActive를 컷 inspector/장 원고→소리 controls→picker에 전달한다. picker의 interactive 변경은 등록 selection callback을 무효화한다. 등록 bytes는 원래 작품 자료로 보관할 수 있으나 읽기 중/복귀 후 cue를 자동 교체하지 않는다. 완료된 등록은 같은 mounted 작품 목록에 갱신하고 재활성 시도 다시 불러온다. 종류 간 전환의 기존 등록 동작과 미리 듣기 active는 별도로 유지한다.

[RED](evidence/preview-context/red.log)는 같은 컷 복귀 후 선택한 연출 입력 초점이 사라지는 문제를 재현했다. [첫5개](evidence/preview-context/ui.log)는 네 viewport 연출 종류/취소/초점·동일 native iframe·원고 보존과 글 선택/소리 목적 복귀를 확인했다. [경계9개](evidence/preview-context/final.log)는 다른 읽기 컷에 이전 undo/커서 미적용, 실제HTML audio.play→읽기 진입에서 pause(자연 종료 아님), 대기 등록→읽기 중 완료에도 cue 유지·목록 갱신·복귀 후 재선택 가능, 기존 같은 컷 다른 채널 수정/다른 컷 등록 경계를 추가했다.

[기존 회귀15개](evidence/preview-context/regression.log)는 연출5/소리5/보기5이며 실제 native/file/reload/같은iframe 복귀·IME/저장 실패·연출 기본값 자동 쓰기 방지·장별undo를 확인했다. 이는 뒤의 writer 장 복귀/scope 확장 전 빌드 결과다. 독립 소스 검토에서 장 전체 보기로 읽다가 장 경계를 넘을 때 writerChapterId가 이전 장에 남는 결함을 발견해 편집 복귀 시 현재 읽기 컷의 장으로 맞췄다. 복원 scope를 도구/보기까지 확장하고 현재 panel 포함 검사도 보강했다. 소스 재검토에서 해당 범위 추가 차단 결함 없음. preset reviewer의 사용량 제한 실패는 기본 agent의 소스 검토로 대체했으며 리뷰를 실행 테스트로 주장하지 않는다.

마지막 빌드 [집중 실행](evidence/preview-context/complete.log)은 10개 통과/장 경계1개 locator 실패다. 실제 현재 장과 컷은 기대와 같았지만 테스트가 현재 컷 아래의 대사·목적·감정·메모 textarea4개를 하나로 요구해 strict mode로 실패했다. 원고 textarea의 실제 aria-label로 좁힌 뒤 [장 경계 최종1개](evidence/preview-context/writer-final.log)를 통과했다. 결과적으로 같은 최종 빌드의 집중11개 조건을 확인했다. 초275ms 입력/범위99초 실패/기존 값과 오류 유지·검색/펼침·복귀 초점·파일의 정수275ms, 읽기 중 장 경계 이동 후 current cut/chapter/본문/초점을 포함한다. [마지막 빌드](evidence/preview-context/build-complete.log)/[타입](evidence/preview-context/typecheck-complete.log)/[lint](evidence/preview-context/lint-last.log)/[단위6개](evidence/preview-context/unit.log)/[문서](evidence/preview-context/docs-final.log)를 기록한다. 이 범위에 대해 whole-product coverage나 실제 삼성 키보드 검증 완료를 주장하지 않는다.

자기 점검: 정확성4(실제 native/동일iframe·변경된 컷/장·등록 경계·정수 시간 저장 확인), 완결성4(같은 컷 미리보기 맥락 범위 완료·전체 회귀와 실기기 후속), 명료성4(복귀 동작 유지와 정상 blur 계약 구분), 실행 가능성4(기존 읽기/편집 버튼 그대로 이용), 간결성4(새 상단 버튼 없이 반복 조작 축소). 평균4.0. 다음은 여러 효과음에서 현재 항목만 조정하는 UX-SFX-LIST와 파일 작업 표현의 UX-FILE-WORDING이다.

## 2026-10-12 효과음 목록·선택 상세와 공유 자료 초안

SoundCueList가 기존 전체 효과음4개의 picker/음량/시간/삭제 반복을 작은 비교 목록과 선택한 상세로 바꾼다. 목록은 canonical 자료 이름·컷 시작/장 진입 후 초·음량을 보여 주고 긴 한글은 줄바꿈한다. ID로 선택하며 추가는 새 cue를 바로 선택한다. 다른 상세는 mounted hidden이고 AudioPickerField active는 선택 항목에만 적용해 실제 미리 듣기를 멈춘다. 기존 search/필터·입력 상태는 보존한다. 삭제는 선택 상세에서 수행하고 종류별 undo는 원래 배열을 복원한다. 선택은 저작 배열을 재정렬하지 않으며 현재4개 한도와 ID/Asset ID/지연/음량·native 의미를 바꾸지 않는다. max4에는 비활성 추가 버튼 대신 안내를 둔다.

[첫 RED](evidence/sfx-list/red.log)는 두 효과음 상세가 동시에 보이는 기존 동작을 재현했다. [첫4화면](evidence/sfx-list/ui.log)은 선택/대기 시간·미리 듣기 pause(자연 종료 아님)·검색 유지·추가/삭제/undo·파일의4개 unique ID/배열 순서/[200,400,0,0]ms·reload·실제 native sound play4회 이상/같은iframe 복귀·재반출 동일 cues를 확인했다. [휴대폰](evidence/sfx-list/sfx-list-390.png)/[PC](evidence/sfx-list/sfx-list-1440.png) 캡처에서 목록 하나와 선택 상세, 버튼 경계·줄바꿈을 확인했다.

소스 전용 독립 리뷰에서 이미 mounted된 다른 picker가 새 등록/공유 이름을 못 반영하는 점을 지적했다. 같은 workId의 local resource-change 알림으로 업로드/속성/출처 저장 뒤 picker 목록을 갱신하고 active 전환에도 읽는다. alive/request guard로 오래된 읽기가 새 상태를 이기지 못하게 한다. 목록의 사용자 자료 이름은 picker의 같은 resolved asset에서 공급한다. 서비스 제공 제외 cue는 ID를 유지하며 제외 이름을 표시하고, 제한 소리에 별도 미리 듣기/다운로드 경로를 추가하지 않는다.

공유 속성 갱신은 baseline과 local draft를 필드별로 비교해 수정하지 않은 필드만 새 값으로 맞춘다. 다른 항목의 저장 전 이름/태그/빈 출처는 유지한다. [helper RED](evidence/sfx-list/metadata-red.log) 후 [첫 단위2개](evidence/sfx-list/metadata-unit.log)가 이를 확인했다. 두 번째 소스 검토에서 저장 시 trim/태그 정리된 값이 계속 dirty로 남아 후속 외부 속성을 덮는 문제가 지적됐다. [추가 RED](evidence/sfx-list/metadata-save-red.log) 후 성공 시 submitted snapshot과 아직 같은 필드만 canonical 값으로 정리하고, 저장 대기 중 타이핑한 필드는 유지한다. parent asset refresh가 도착하기 전에는 old props baseline을 유지해 성공값이 잠깐 이전 값으로 돌아가지 않게 한다. [helper4개](evidence/sfx-list/metadata-final-unit.log)는 helper 한정 statement/branch/function/line100%이며 전체 앱 coverage가 아니다.

공유 저장 수정의 첫 [타입 검사](evidence/sfx-list/typecheck-final.log)는 validateAudioMetadata 반환의 optional 타입을 다루지 못해 실패했고 명시 guard를 추가했다. [재검사](evidence/sfx-list/typecheck-complete.log)와 [lint](evidence/sfx-list/lint-verified.log) 통과. 이 변경은 Web UI state/refresh 절차이며 StoryDocument7/archive2/workbook7/JSONB·RuntimeScene/native 계약 변경이나 음원 확보를 포함하지 않는다.

[공유 수정 후12개](evidence/sfx-list/complete.log)는 목록4화면/등록재사용·공유 이름1/일괄2/소리 목적5를 확인했다. 마지막 정규화 acknowledgement 변경 전의 빌드 결과이며 최종 수치로 대체하지 않는다. [마지막 공유·미리보기4개](evidence/sfx-list/shared-final.log)는 공백 있는 이름/쉼표 태그를 저장한 뒤 다른 cue의 새 태그가 pristine 필드에 갱신되고 다른 cue의 저장 전 이름/태그는 유지됨, 등록자료를 다른 mounted cue에서 재사용, reload의 두 목록 이름, 소리 목적/글 커서 미리보기 복귀와 읽기 중 등록 완료/정수 시간·검증 상태 보존을 확인했다. [마지막 빌드](evidence/sfx-list/build-complete.log)/[타입](evidence/sfx-list/typecheck-last.log)/[lint](evidence/sfx-list/lint-last.log)가 근거다. 최종 소스 리뷰에서 공유 갱신·정규화 saved/dirty 분리의 추가 차단 결함 없음.

[최종7개](evidence/sfx-list/verified.log)는 마지막 빌드에서 네 화면 목록/독립 상세·HTML preview pause·삭제/undo·파일/reload/native4회/같은iframe 복귀·재반출 동일 배열, 공유 등록·정규화 이름/태그와 저장 전 초안, 기존 다른 채널 수정/컷 이동의 등록 경계를 모두 다시 통과했다. 마지막 캡처는 위 휴대폰/PC 링크에 갱신했다. 독립 소스 리뷰의 두 지적은 실제 수정·집중 테스트 후 재검토로 확인했다. 실제 삼성 키보드·화면낭독기와 전체 기존 회귀를 완료한 것으로 확장하지 않는다.

자기 점검: 정확성4(원래 cue 배열/native/file·공유 saved/dirty 구분 확인), 완결성4(목록 범위와 네 화면/실제 재생 완료·전체 UX/실기기 별도), 명료성4(이름/초/음량 비교와 선택 상세), 실행 가능성4(등록 재사용·삭제undo·원고 보존), 간결성4(4개 전체 상세를 한 상세로 축소·max 비활성 버튼 제거). 평균4.0. 다음은 파일 작업의 용어·목적 일관성과 기존 회귀 동선 전환이다.

## 2026-10-12 파일 행동 명칭·설정의 공유 작품 메뉴

서재의 ‘파일로 보관’을 편집/설정과 같은 ‘작품 파일 내보내기’로, 수동 원고 저장을 ‘기기에 저장’, 이전 기록 다운로드를 ‘기록 파일 내보내기’로 맞췄다. 저장 권한이 없는 탭에서 현재 작업을 보관하는 입구는 ‘현재 초안 파일 내보내기’로 구분한다. 독자 슬롯의 저장/빠른 저장은 다른 재생 기록 기능이므로 승인된 이름/배치를 유지한다.

설정 화면의 별도 내보내기·수동 저장·전역 복구를 제거하고 편집과 같은 WorkspaceManagement를 사용한다. workHeader는 활성 editor/prepare에만 렌더해 메뉴 하나를 유지하며 parked editor/native subtree는 남긴다. 메뉴에서 설정 종류를 바꾸면 controlled section이 즉시 반영되고 project-bound memo/원래 cut/편집 출처를 유지한다. 설정의 composing을 공유 메뉴에 전달해 서재/설정/가져오기 이동을 보호하고 editFromFlow/복구 적용은 변경 전에 조합을 검사한다. 복구 생성의 저장 조건과 보호 사본 열기의 조건을 restoreDisabled로 분리해 손상 workspace의 원본 보호 경로를 유지한다.

[RED](evidence/file-actions/red.log)는 기기 저장의 목적 이름이 없는 상태를 확인했다. 첫 [실행](evidence/file-actions/ui.log)은 공유 메뉴 통합 후 첫 fixture의 기록/export 대기 중 명시 중단했고, 해당 실행은 완료 증거가 아니다. checkpoint 한도 이하의 실제 새 작품을 UI로 작성하는 검증으로 바꾸고, 기록 export 뒤 메뉴가 닫히는 실제 동작에 맞춰 다시 열어 Esc/focus를 검사했다. 중단된 실행을 checkpoint 용량 결함으로 판정하지 않는다.

[집중7개](evidence/file-actions/final.log)는 PC/tablet/phone portrait/landscape의 활성 메뉴1개·기획 입력·기기 저장·기록 다운로드·원래 컷/글·동일iframe 복귀·작품 파일/기록의 lines/chapters 동일·reload, 서재 원작 판본의 동일 명칭 export, 준비 입력 IME 시 menu/recovery/linked memo 차단·해제 후 복귀, 손상 workspace의 raw byte 유지/독립 복구 사본/명시 재시작과 원본 백업·reload를 확인했다. 별도 source review의 연결 메모/복구 IME 지적은 guard를 추가한 뒤 재검토에서 추가 차단 결함 없음으로 확인했다.

[기존13개](evidence/file-actions/regression.log)는 작품 설정6개와 메뉴/가져오기7개이며 네 화면 정보/기획·표지 취소·같은 컷·IME/저장 실패·서재 출발 origin 보존·파일/공개 시트 독립 확인/첨부 미저장·최신 원고/reload를 다시 통과했다. 마지막 오류 문구 보완 뒤 [경계2개](evidence/file-actions/guards-final.log)는 설정에서 저장 실패 때 현재 메모와 설정을 유지하고 이유를 안내한 뒤 저장 복구 시 같은 컷 복귀, IME 보호와 손상 원본 복구를 재확인했다. [마지막 레이아웃4개](evidence/file-actions/layout-final.log)는 공유 설정 메뉴의 실제 viewport 경계와 전체 파일 흐름을 마지막 빌드에서 다시 통과했다.

[설정 휴대폰 메뉴](evidence/file-actions/settings-file-menu-390.png)/[설정PC 메뉴](evidence/file-actions/settings-file-menu-1440.png), [편집 휴대폰 메뉴](evidence/file-actions/file-menu-390.png)를 보관한다. [마지막 빌드](evidence/file-actions/build-last.log)/[타입](evidence/file-actions/typecheck-last.log)/[변경 전체 lint](evidence/file-actions/lint-all-changed.log)가 근거다. authoring/mobile/storage/library 과거 회귀의 바뀐 버튼 이름과 library helper를 새 명칭에 맞췄지만 구형 준비/all-fields/작품 선택 가정의 전체 실행은 아직 UX-REGRESSION-NAV 범위다. 전체 회귀나 실제 삼성 기기/보조 기술 완료로 확대하지 않는다.

원고·StoryDocument7/archive2/workbook7/JSONB·Asset ID·Flow/StageComposition·native 계약은 바꾸지 않았다. 입력한 기획과 복구·파일 경로를 실제 실행했으며 버튼 명칭/분석 문서만으로 완료 처리하지 않았다.

자기 점검: 정확성4(동일 파일/기록·원고/컷/iframe·손상 raw와 복구 검사), 완결성4(공유 메뉴/파일 행동 범위 완료·전체 회귀/실기기 남음), 명료성4(기기/작품 파일/기록/초안 구분), 실행 가능성4(설정↔편집·메모/IME·저장 실패 재시도), 간결성4(설정의 독립 파일 버튼/복구 상시 노출 제거). 평균4.0. 다음은 UX-REGRESSION-NAV의 현재 동선 전환과 남은 화면별 점검이다.

## 2026-10-12 저장·복구 회귀의 현재 동선 전환

storage-recovery의 새 작품→준비 자동 진입, 모든 설정 입력 동시 노출, 편집의 제목 입력/작품 선택, 직접 장 전체 글 버튼 가정을 현재 UI로 전환했다. 새 작품의 글쓰기 진입을 먼저 확인하고 필요한 info/planning만 명시적으로 연다. 복구와 export는 접힌 작품 메뉴에서 수행한다. 다른 탭은 설정 진입 전 저장 guard를 우회하지 않고 기본 대사/해설에 미저장 초안을 쓴다. 이전 판의 보존/복구 조건은 줄이지 않았다.

[기존 동선 실패](evidence/recovery-navigation/baseline.log)는 새 작품 직후 preparation-save-status를 찾는 구형 가정을 확인했다. [이행6개](evidence/recovery-navigation/migrated.log)는 다음을 모두 통과했다: 이전 원고 독립 사본/최신 원고 함께 보존→reload→파일 export/import 새 browser context, 두 번째 탭 수동 저장 거절·원래 workspace byte 유지·초안 파일 내용·권한 해제 후 reload/새 저장, 손상 raw byte와 명시 원본 backup/복구 사본/reload, 삭제 실패의 정확한 workspace와 이전 삭제 작품/현재 원고 동시 보존, pagehide/pageshow의 Web Lock 해제/재획득과 실제 저장, 1000컷 초과 전체 선녀 작품의 checkpoint 용량 경고에도 컷 삭제→완전한 project equality undo/reload.

재개된 오래된 탭의 추가 충돌 사례를 도입한 [첫7개 실행](evidence/recovery-navigation/verified.log)은 기존6개 통과/추가1개 실패였다. 두 번째 탭의 실제 저장과 close 이후 flush를 기준점으로 삼지 않은 테스트 가정이 있었다. 저장된 본문을 직접 poll하도록 강화한 [다음 실행](evidence/recovery-navigation/ownership-final.log)은 원고 내용은 같고 savedAt과 각 works의 직렬화 시점만 다른 raw를 비교해 실패했다. 별도 확인에서 양쪽 project는 동일하고 새 본문도 같았다. 닫기의 정상 pagehide flush가 끝나고 실제 Web Lock이 해제된 이후의 raw를 기준으로 수정했다. 이전 두 실패를 오래된 원고 덮어쓰기 제품 결함으로 주장하지 않는다.

[최종2개](evidence/recovery-navigation/ownership-verified.log)는 추가 충돌과 강화한 이전 원고 복구를 통과했다. 잠시 권한을 놓은 동안 다른 탭이 고친 원고를 재개 탭의 수동 저장이 덮지 못함을 정확한 raw 비교로 확인하고, 재개 탭의 옛 초안 export와 reload의 새 본문도 확인했다. 복구 사본의 새로운 project ID/원래 lines·chapters, 현재 원고의 최신 planning.premise까지 검증했다. 기존6개 중 나머지5개는 변경 없이 위 실행에서 통과했으며 새7개를 한 번에 모두 실행했다고 합산하지 않는다.

[저장 guard/자동 저장 단위7개](evidence/recovery-navigation/unit.log)와 [lint](evidence/recovery-navigation/lint-final.log)를 기록한다. lint는 repo root의 React version auto-detect warning1이며 오류는 없다. 제품 코드/저장 계약/디자인은 이번 검증 전환에서 바꾸지 않았으므로 앱 빌드를 재실행한 것으로 주장하지 않는다. 사용한 static 앱은 앞 절의 마지막 file-actions build와 동일하다. 실제 browser BFCache 복원을 실행한 것이 아니라 합성 lifecycle 이벤트+실제 Web Locks 검사이며 실제 캐시/삼성 기기 검증과 구분한다.

[남은 selector inventory](evidence/recovery-navigation/remaining-selectors.json)는 현행78개 spec의 TypeScript AST를 조사했다. 제거된 직접 작품 선택 동작은5개 파일, 작품 준비 버튼 동작은2개 파일에 남아 있다. 제거됐음을 검사하는 정상 absence assertion2개는 제외했다. 이 숫자는 그 밖의 all-fields/소리 목적/접힌 도구 가정이 없음을 증명하지 않는다. 전체 UX-REGRESSION-NAV는 계속 부분 상태다.

자기 점검: 정확성4(실제 저장 raw/파일/독립ID/내용·lock 검사), 완결성4(저장·복구 범위7개 조건·전체78spec/실제 캐시 남음), 명료성4(구형 테스트 가정과 제품 결함/정상 flush 구분), 실행 가능성4(현재 메뉴/설정/기본 글쓰기 경로 사용), 간결성4(앱에 호환 버튼·추가 패널을 되살리지 않고 검증 전환). 평균4.0. 다음은 직접 작품 선택이 남은 원고/분기/음원 metadata 회귀의 현재 서재/메뉴 동선 전환이다.

## 2026-10-12 사용자 외부 미디어 업로드 폐기

최신 사용자 결정으로 ‘개인 자료 등록’의 이전 저작 UX 범위를 의도적으로 폐기했다. AudioPickerField에서 registerAudioFile 호출/파일 input/용량 안내를 제거하고 catalog 선택만 제공한다. 현재 기존 private ID는 disabled 항목으로 보존하며 원고/저장소를 삭제하지 않는다. 이미지 UI에는 외부 파일 input이 없고 기존 catalog picker를 유지했다. 새 archive/Excel/CSV/TSV/public sheet import는 외부 첨부와 참조를 저장 이전에 거부한다. ShortStory의 기존 엄격한 registry validator에 더해 파일 gate를 적용했다. direct loadStoryArchive에도 gate를 연결했다.

[RED](evidence/catalog-only/red.log) 후 [단위](evidence/catalog-only/unit-final.log), [타입](evidence/catalog-only/typecheck-final.log)/[lint](evidence/catalog-only/lint.log)를 확인했다. 이전 pending-upload/shared-custom등록 E2E는 이제 현행 제품 동작에 대한 기대가 아니며 자동 복원하지 않는다. 해당 회귀는 catalog-only denial/기존 보관내용 보존 검사로 전환하는 UX-REGRESSION-NAV의 변경 범위다. 서버/공개 게시 gate는 미구현 서버 후속으로 유지한다.

최종 [단위4개](evidence/catalog-only/unit-complete.log)는 등록 음원 허용/임의 URL 문구 보존, 미사용 외부 첨부 거부, 개인 소리/외부 그림 거부, unused chapter 미등록 그림 거부를 확인했다. [최초 UI](evidence/catalog-only/ui.log)는 외부 첨부 fixture에서 그림 guard가 먼저 거부한 실제 메시지를 음원 첨부 단일 문구로 요구해 실패했다. 외부 거부라는 정책 조건으로 수정한 [최종 UI](evidence/catalog-only/final.log)는 편집 파일 등록 부재·개인 소리 선택 없음·그림 업로드 없음·외부 작품 확인창/적용 거절과 원고 보존, catalog 작품 export/reimport/reload를 통과했다. [최종 빌드](evidence/catalog-only/build-complete.log)/[타입](evidence/catalog-only/typecheck-complete.log)/[lint](evidence/catalog-only/lint-final.log)를 보관한다. 이 집중 정책 gate가 과거 개인 업로드 E2E 전체 전환이나 미래 서버 구현 완료를 뜻하지 않는다.

## 2026-10-12 catalog 참조 검사의 대상·종류 보강

처음 catalog-only gate는 이름 패턴으로 전체 객체를 순회했다. 등록되지 않은 character.defaultImageId를 놓치고, 데이터 안의 메모 필드 이름을 미디어로 잘못 해석할 수 있었다. [추가 RED](evidence/catalog-only/references-red.log)로 이를 재현하고 명시적인 media-owned 필드 검사로 바꿨다. project.stageDefaults, characters.defaultImageId, chapters/lines의 기본 그림·장 자료 배열·배치 인물·audio cues, cover 기본 그림과 cover.design의 image 요소를 검사한다. background/character 종류도 확인한다. 빈 값과 기존 이미지 없음 token은 유지하며 메모·기획·표지 text는 순회하지 않는다. 외부 attachments는 미사용이어도 이전과 같이 거부한다.

[최종 단위7개](evidence/catalog-only/references-unit-complete.log)는 등록 참조/주소 문구 허용, 외부 첨부/소리/그림 거부, unused 장 자료 거부, 인물 기본 그림/잘못된 종류 거부, memo 내부 같은 이름 필드 보존, 실제 catalog의 장/배치/설계 표지 허용과 미등록 actor/back-cover 거부를 확인했다. [UI 재검증](evidence/catalog-only/references-ui.log)은 업로드/선택 제한·가져오기 거부/원고 유지·등록 작품의 파일 왕복/재열기를 통과했다. [빌드](evidence/catalog-only/references-build-final.log)/[타입](evidence/catalog-only/references-types-final.log)/[lint](evidence/catalog-only/references-lint-final.log)를 보관한다. 이 정책 변경은 기존 저장소의 원고/ID를 자동 변경하지 않는다.

## 2026-10-12 소리 속성 회귀의 catalog-only 정책 전환

authoring-audio-metadata의 이전 개인 첨부 import 허용3개는 최신 사용자 결정과 충돌한다. [이전 소스](evidence/audio-policy-navigation/prior-custom-import-spec.txt)를 역사 증거로 보존하고, 같은 출처 변경/출처 없음/미사용 첨부3개를 새 거부 정책 검증으로 전환했다. 등록된 현재 작품을 실제 export하여 baseline으로 쓰고, 유효한 기존 private audio fixture를 첨부한 가져오기를 시도한다. 확인창 부재·외부 첨부 오류·본문과 전체project 불변·첨부 목록 불변·IDB resources 개수 불변·reload/reexport 불변을 검사한다. unknown image가 먼저 실패하는 fixture가 아니라 등록된 실제 원고에 외부 첨부만 넣어 음원 gate를 직접 검증했다.

[최종4개](evidence/audio-policy-navigation/ui.log)는 이3개와 catalog picker/import/file 왕복1개를 통과했다. [기존 저장/portability 단위14개](evidence/audio-policy-navigation/preserved-storage-unit.log)는 같은 ID의 작품별 metadata/출처 부재·첨부 순서·미사용 첨부·사본 bytes 보존·잘못된 파일/hash/속성 거부의 기존 codec 조건을 유지한다. 이 저수준 보존 계약은 사용자 새 업로드 허용이 아니다. [lint](evidence/audio-policy-navigation/lint.log)는 root React-version detect warning만 있으며 오류는 없다. 이번 변경은 테스트 동선·정책 기대 변경이며 앱 코드나 디자인/파일 schema를 바꾸지 않았다. 사용한 앱은 앞 catalog reference 마지막 빌드다.

남은 개인 파일 upload/pending/shared-upload 회귀와 실제 보관함에 남은 private cue의 end-to-end 보존 검증은 별도 UX-REGRESSION-NAV 후속으로 유지한다. 아직 전수 테스트를 초록으로 만들었다고 주장하지 않는다. 개인 파일 등록 버튼을 테스트 호환을 위해 되살리지 않는다.

자기 점검: 정확성4(전체project/export/본문/IDB count·reload 검증), 완결성4(출처/미사용3조건·catalog1 통과, 이전 private stored UI 후속), 명료성4(허용→거부 요구 변경과 codec 보존 구분), 실행 가능성4(현재 메뉴의 실제 import/export 사용), 간결성4(폐기 UI 복원 없이 현재 정책에 맞는 검사). 평균4.0.

## 2026-10-12 선택지 개수·점수의 선택적 조작

선택지2개의 삭제와4개의 추가처럼 실행할 수 없는 버튼을 조건부로 표시하지 않는다. 2~4개 제한 안내는 짧게 제공하고3개 이상 삭제/3개 이하 추가는 직접 유지한다. 점수 정의의 접힌 입구는 choice/goto 또는 project scores가 있을 때 제공하고 점수 없는 linear/ending에서는 생략한다. 기존 choice.effects/condition이 있으면 definitions가 없어도 해당 수정 경로는 유지한다. 옵션 label/target handler의 spread와 배열 filter/append는 기존 option ID·조건/효과를 보존한다.

[RED](evidence/choice-density/red.log)는 삭제할 수 없는2개 버튼의 노출을 재현했다. [첫 타입](evidence/choice-density/types.log)/[첫 빌드](evidence/choice-density/build.log)는 callback 내부 line.flow narrowing이 없어서 실패했고 명시 type guard로 수정했다. [수정 빌드](evidence/choice-density/build-final.log)/[타입](evidence/choice-density/types-final.log)/[lint](evidence/choice-density/lint-complete.log)가 근거다. [중간 실행](evidence/choice-density/final.log)은 네 viewport choice-only 조건이 통과했고, 기존 score test가 설정 파일 export의 접힌 메뉴를 안 여는 과거 가정을 수정한 뒤 명시 중단했다. 이 중단 실행을 전체 통과로 주장하지 않는다.

새 검사에서는 choice2→3→4→3→2 편집과 max/min 버튼 부재·문구/도착 컷/점수 자동 주입 없음·원고·export/reload·viewport 넘침, 남는 두 옵션의 original 생성 ID를 확인한다. 기존 score-authoring은 설정의 공유 작품 메뉴를 먼저 여는 현재 동선으로 갱신했다. 사용자정의 점수 이름·설명·시작 값/잘못된 소수 거절·파일/reload와 네 화면의 기존 내용 검사를 유지한다. 이번 변경은 UI 가림 조건이며 Flow/score/schema나 Runtime Core/Ren’Py 해석을 바꾸지 않는다.

[최종5개](evidence/choice-density/verified.log)는 choice-only4화면과 기존 score-authoring1개를 통과했다. 남는 두 옵션 ID가 `${cut.id}-choice-1/2`인 상태를 추가해 문구/대상/추가/삭제가 원래 ID를 바꾸지 않음을 확인했다. 점수 검사1개는 같은 실행 안에서1280/820/390/844 화면을 바꾸며 사용자 정의 이름/설명/시작 정수값·잘못된 소수 거절·파일/reload를 확인한다. source 전용 독립 검토에서 해당 가림 조건/기존 Flow 필드 보존의 차단 결함 없음.

캡처 시 렌더 준비 화면을 실제 장면으로 오해하지 않도록 현재 scene revision과 native rendered revision의 ack를 기다린 [레이아웃 최종4개](evidence/choice-density/native-layout.log)를 통과했다. [휴대폰 선택지](evidence/choice-density/choice-only-390.png)/[PC 선택지](evidence/choice-density/choice-only-1440.png)를 보관한다. 변경한 source는 같은 마지막 build이며 이후 변경은 ID assertion/캡처 준비 확인·score 테스트의 menu 진입뿐이다. 전체 Flow/native 분기 동등성·실제 삼성 기기까지 이4개로 확대하지 않는다.

자기 점검: 정확성4(최소/최대 동작과 Flow옵션ID·파일/reload 보존), 완결성4(점수없는4화면/기존점수1경로·전체갈래 회귀후속), 명료성4(사용가능한추가/삭제와점수context), 실행가능성4(직접문구/도착입력·원래점수저장), 간결성4(무의미한비활성버튼제거·새패널없음). 평균4.0. 다음은 남은원고/갈래회귀와catalog-only로대체할이전업로드검사다.

## 2026-10-12 장 전체 원고의 선택·기능 밀도

장 전체 보기의 컷 번호 선택 버튼을 정보 strong으로 바꾸고 inactive 본문 button 하나로 선택하게 했다. 본문에 실제 테두리와 ‘N컷 글 고치기’ accessible name을 제공한다. ‘이 컷 꾸미기’는 실제 목표인 ‘이 컷 편집 화면 열기’로 표시하고 현재 선택 컷에만 노출한다. 컷마다 같은 버튼을 반복하지 않는다. 첫/마지막 컷의 실행 불가능한 위/아래 이동·합치기와 마지막1컷 삭제를 숨긴다. 직접 이전/다음 이동과 keyboard shortcuts, Core split/merge의 보수적 조건은 변경하지 않았다.

원고 회귀의 새 작품을 editor 작품 메뉴에서 생성/장전체 direct 버튼 가정을 현재 서재→새작품→접힌 원고 보기로 전환했다. 파일 가져오기 후 설정 화면으로 열리는 정상 경로에서도 현재 활성 저장 status를 검사한다. [첫 실행](evidence/manuscript-focus/red.log)은 변경 전 동선 검사를 명시 중단했다. 초기 빌드가 이 첫 실행과 겹친 사실 때문에 해당 실행을 RED/제품 결과 증거로 사용하지 않는다. 이후 static server/시험을 종료하고 새 빌드가 완료된 뒤 순서대로 실행했다. [첫 수정 실행](evidence/manuscript-focus/ui.log)은 export/reimport 후 설정의 status를 editor status로 요구해 첫2개 실패 후 명시 중단했고, 현재 활성 두 status를 확인하는 helper로 수정했다.

[첫5개](evidence/manuscript-focus/verified.log)는1440x1000/1024x768/768x1024/390x844/844x390에서 커서9위치의 한국어+줄바꿈+이모지 원고 split→export/reload→merge의 완전 본문·원래cutID 보존, cursor0 분할 거절/원고 project 불변, 독립 파일 reimport/reload의 기존 project 의미 보존과 넘침 부재를 확인했다. source전용 검토는 UI 이동·삭제 guard에 차단 결함 없음이며 옛 ‘이 컷 꾸미기’ caller와 selected 번호button suffix assertion을 지적했다. editor-density의 이름을 갱신하고 duplicate assertion은 /^1컷 · 해설/로 강화했다. 전체 옛 editor-density 동선이 완료된 것으로 주장하지 않는다.

마지막 source는 선택한 컷1개만 편집 화면 열기로 보이도록 보강했다. 검사는 visible excerpt의 border와 이동 입구1개를 직접 확인하고, 파일 왕복 후 현재 컷 쓰기→원고 보기로 실제 재진입해 본문을 확인한 다음 캡처한다. source리뷰와 달리 actual native읽기 gate는 이 split/merge 회귀가 증명하지 않으므로 별도 preview 회귀와 구분한다.

[마지막5개](evidence/manuscript-focus/complete.log)는 다섯 viewport 전체에서 선택 컷 편집입구1개/본문border/duplicate 번호button 부재·split/merge/오류project불변/원래cutID·독립fileimport/reload/재진입본문을 통과했다. [추가3개](evidence/manuscript-focus/guards-final.log)는1440원고 테스트에서 컷 정리 details를 실제로 펼친 뒤 위로 불가/아래로 가능을 직접 검사하고, 기존1440연출previewundo 및 장 경계를 넘은 원고보기 복귀를 다시 통과했다. 최종 소스 리뷰에서도 선택한 컷만의 opener는 다른 컷본문 선택을 유지하므로 새 차단 결함 없음으로 확인했다.

[Core단위16개](evidence/manuscript-focus/unit.log)는 Unicode grapheme과split/merge·연결/배치/메모/연출 보호 조건을 유지한다. [빌드](evidence/manuscript-focus/build-final.log)/[타입](evidence/manuscript-focus/types-final.log)/[lint](evidence/manuscript-focus/lint-complete.log)를 기록한다. 캡처 파일 이름은 실제PNG 가로·세로를 기준으로 정정했으며 viewport라벨만으로 장치를 추정하지 않는다. 실제 기기 키보드와 전체 원고/Flow 회귀는 별도남은조건이다.

자기 점검: 정확성4(본문원형/컷ID·Core보존·직접가림guard·preview복귀), 완결성4(5view 원고편집 범위완료·전체회귀/실기기별도), 명료성4(본문선택과컷화면이동분리), 실행가능성4(현재서재/접힌writer·기존작업유지), 간결성4(반복번호/모든컷opener·no-op버튼축소). 평균4.0. 다음은 실제작품 원고/갈래전수동선 및 외부미디어금지에따른남은회귀전환이다.

[휴대폰 최종1개](evidence/manuscript-focus/phone-final.log)는390x844에서 같은 전체 흐름을 재실행하고 원고 편집의 전체 페이지를 [실제 캡처](evidence/manuscript-focus/manuscript-phone-full.png)로 보관했다. 이 screenshot은 원고UI이며 native 화면준비/픽셀 일치의 완료근거로 쓰지 않는다.

## 2026-10-12 흐름 지도·중첩 갈래의 현재 동선 검증

flow-authoring의 제거된 작품 선택과 숨긴 cut-list/강제 details-open/이미지 select 가정을 현재 서재→판본 선택→보호 사본 편집, 위치 select, 추가 편집→선택지/컷 목록, 등록 그림 선택 dialog, 접힌 장 전체 글·갈래 보기→전체 흐름으로 전환했다. 처음 선택한 배경/인물이 새 컷에 이어지는 것을8개 cut의 실제 Asset ID 비교로 확인한다. 새 작품의8개 컷·중첩 선택·합류·두 ending·연결하지 않은 장을 실제 UI에서 작성하며 테스트용 별도 player나 자동 project 주입을 만들지 않는다.

[긴 작품1개](evidence/flow-navigation/large.log)는 전체 선녀 작품의 뒤쪽 긴 본문을 검색해서 초기 장 페이지 밖의 실제 target을 찾고 열었다. 현재 본문과 위치 ID를 확인하고 navigation 전후 전체 exported project equality로 원고/ID/Flow/StageComposition 보존을 검증했다. [중첩 편집1개](evidence/flow-navigation/nested.log)는 지도 분기/합류/ending·미연결/도달 불가 진단→도착 수정·제거→원고/chapter/cut/그림 참조 불변·파일/reimport/reload를 통과했다. desktop/phone map과 Esc 후 opener focus도 유지한다.

Native 선택 클릭은 iframe 안의 실제 화면을 사용하며 실제 runtime evidence choicesRect와 fit scale/offset으로 좌표를 계산한다. 짧은2개 선택문구 fixture의 row center offset을 쓰며 여러 줄/스크롤 선택지의 일반 히트테스트 증거로 확대하지 않는다. 읽기 다시 시작은 보기설정의 첫 읽기 및 reader 메뉴의 확인창, 지난기록은 현재 승인 이름을 사용한다. ‘다음으로’는 semantic 보조 제어에 focus/Enter로 실행하며 native 선택은 실제 재생 화면을 클릭한다. 숨긴 cut-list의 aria-current는 상태 확인용으로 읽을 뿐 click 경로로 사용하지 않는다.

[Native1개](evidence/flow-navigation/native.log)는3갈래×2ending=6경로의 실제 native choice→중첩/합류→ending과 지난기록 닫기 후 경로 불변, 동일 iframe marker를 확인했다. [최종3개](evidence/flow-navigation/complete.log)는 host 편집·긴작품2개와 native6경로1개를 같은 최신 소스에서 모두 통과했다. 서로 다른 project용3개는 의도적skip이며 성공으로 합산하지 않는다. 최종 native는 ending 뒤 렌더ack를 기다리고, 마지막 읽기 cut으로 편집복귀·본문/위치·재반출의 독립 imported project 보존·동일iframe을 추가 확인한다. [지도 휴대폰](evidence/flow-navigation/flow-map-phone.png)/[native](evidence/flow-navigation/flow-native.png)를 보관한다.

[점수Flow authoring 단위3개](evidence/flow-navigation/unit.log)와 [lint](evidence/flow-navigation/lint-final.log)를 확인했다. lint는 root React-version detect warning만 있다. 제품 code/schema/native package를 바꾸지 않은 동선 검증 변경으로 새 앱 빌드를 주장하지 않는다. source 전용 독립 검토에서 기존 중요 assertion의 축소/차단결함 없음. 이미지/음원 외부 업로드 금지 정책은 유지한다.

[남은 AST inventory](evidence/flow-navigation/remaining-selectors.json)는 현행80개spec을 조사했으며 직접 작품 선택 동작은 authoring/stories/stories-runtime3파일, 작품 준비 버튼 동작은 editor-term-guide/local-library2파일에 남아 있다. 버튼 제거를 검사하는 정상 absence assertion2개는 제외했다. 다른 all-fields/숨긴도구/이전upload 가정이 없다는 뜻은 아니며 전체UX-REGRESSION-NAV는 부분상태다.

자기 점검: 정확성4(전체project/8cut자료·실제native6경로/iframe), 완결성4(흐름회귀3개 완료·전체80spec/실기기남음), 명료성4(실제editor경로와status확인구분), 실행가능성4(현재서재/메뉴/목적/파일/읽기왕복), 간결성4(호환목적으로구버튼복구하지않고동선전환). 평균4.0. 다음은 남은 작품 전환/읽기검증과 이전upload 기대를 catalog-only로 전환하는 작업이다.

## 2026-10-12 용어 안내의 현재 행동·정책 일치

도움말의 오래된 외부 직접녹음 추가 예시를 service 등록 소리 선택/업로드 불가로 수정했다. 파일로 저장/가져오기 혼합 항목은 실제 버튼인 작품 파일 내보내기/가져오기, 기기에 저장, 기록 파일 내보내기로 나누고 옛 지금 저장/파일로 보관을 alias로 유지한다. 이 컷부터 재생의 ‘같은 컷에 돌아옴’은 actual 읽고 있던 컷 편집과 같은 컷 작업상태 유지로 고쳤다. 도움말에 새 기능을 약속하거나 schema/원고를 바꾸지 않는다.

[RED](evidence/guide-current-actions/red.log)는 새 행동 이름과 catalog-only 예시의 부재를 재현했다. [단위3개](evidence/guide-current-actions/unit.log)는 옛alias/분류/빈검색과 새 파일행동·등록소리·실제복귀 설명을 확인한다. editor-term-guide의 제거된 준비 버튼은 작품 메뉴→작품 정보·표지 경로로 전환했다. [UI2개](evidence/guide-current-actions/ui.log)는 첫case 안의1280/820/390/844 화면과 parent cover context에서 환경음/분류/시간/실제저장/외부업로드불가 검색·키보드trap·Esc/입구focus·제목초안/표지dialog보존, ShortStory 본문초안 보존을 통과했다. [빌드](evidence/guide-current-actions/build.log)/[타입](evidence/guide-current-actions/types.log)/[lint](evidence/guide-current-actions/lint.log)를 보관한다. 실제삼성기기/화면낭독기전수 검증이 아니다.

자기 점검: 정확성4(실제버튼·정책·읽기복귀·원고초안 확인), 완결성4(도움말2흐름/4view·전체회귀후속), 명료성4(기기/작품/기록 대상과 이전alias), 실행가능성4(메뉴의 실제설정진입·검색·focus), 간결성4(기본화면 새버튼 없이 기존안내 수정). 평균4.0. 다음은 남은서재/작품전환동선과catalog-only 회귀전환이다.

독립 소스 검토에서 설명/실제행동의 차단모순 없음. 추가로 경계Tab이 단순히 dialog안에 머무르는지를 넘어서 닫기ShiftTab→검색초기화, 검색초기화Tab→닫기로 이동함을 직접 assert했다. 외부업로드불가 문구와 기록파일alias도 단위에 고정한 [최종UI2개](evidence/guide-current-actions/final.log)/[단위3개](evidence/guide-current-actions/unit-final.log)/[lint](evidence/guide-current-actions/lint-final.log)를 통과했다. source변경 후 build와 같으며 이 마지막 보강은 테스트만 변경해 빌드를 중복 실행하지 않았다.

### 서비스 등록 자료만 사용 — 현행 화면 재확인 (2026-10-12)

사용자의 외부 그림·음원 업로드 금지 결정을 현행 코드와 실행 중인 Web 화면에서 다시 확인했다. 제품 구현은 기존 catalog-only 정책을 유지하며 이번 재확인은 새 기능이나 배포 완료 주장이 아니다.

- `pnpm exec vitest run apps/web/lib/catalog-only-authoring.test.ts`: 7개 통과. 등록 ID/종류, 미사용 첨부·자료 참조, 인물 기본값·배치·표지와 원고/메모 문자열 구분을 확인했다.
- `pnpm exec vitest run apps/web/lib/story-file-preview.test.ts`: 2개 통과. 파일 preview의 기존 검증을 재확인했다.
- `pnpm exec playwright test tests/e2e/catalog-only.spec.ts --project=host --workers=1`: 1개 통과. 그림/소리 업로드 입력 부재, 외부 첨부 거부·확인창 부재·본문 보존, 등록 자료 작품의 파일 왕복과 재열기를 확인했다.
- `pnpm exec playwright test tests/e2e/authoring-audio-metadata.spec.ts --project=host --workers=1`: 3개 통과. 출처 변경/누락/미사용 외부 첨부 거부 뒤 전체 project·기존 audioResources·IDB 자료 수와 재열기 보존을 확인했다.

실제 서버는 여전히 미구현이다. 서버 입력에도 같은 등록 자료 검사를 적용하는 완료 조건과 기존 저장 private 작품의 추가 회귀는 MEDIA-CATALOG-ONLY 후속 목표로 유지한다. 이번 실행은 Excel/Google 앱의 직접 조작이나 실기기 검증을 새로 수행한 것이 아니다.

### 서재에서 글쓰기·기존 저장 작품 보존 (2026-10-12)

`local-library.spec.ts`의 기본 기획 선택 사항과 기존 기기 작품 검사2개를 현행 서재·작품 메뉴로 전환했다. 이전 검사는 서재에도 편집기 `save-status`가 있다고 가정해 모두 실패했다. 활성 화면의 저장 상태를 기다리고 새 작품은 현재 컷에 바로 글을 쓰며, 기획은 작품 메뉴→작품 정보·표지→설정 항목으로 확인한다. 설정에서 같은 컷으로 돌아가는 동선과 재열기 뒤 컷 ID/대사 유지도 검사한다. 제거된 준비 버튼이나 숨겨진 컷 목록을 테스트를 위해 복원하지 않는다.

`pnpm exec playwright test tests/e2e/local-library.spec.ts --project=host --workers=1 --grep 'blank planning optional|previous device workspace'`는 2개 통과했다. 기존12컷 작품을 새 파일 가져오기가 아닌 이전 기기 보관함으로 열어 전체 project 및 외부 audioResources의 export equality와 `storygame-original` 키 보존을 확인했다. 이는 외부 첨부가 포함된 새 파일 허용을 뜻하지 않는다. `pnpm exec vitest run apps/web/lib/workspace-storage.test.ts` 7개와 해당 spec ESLint 오류0을 확인했다. lint의 root React version detect warning은 남는다.

이 파일의 긴 native 통합 검사와 손상 보관함에서 생성/중복 import 검사는 이번 실행 범위가 아니다. 손상 저장을 덮어쓰는 생성을 허용하지 않도록 현재 guard와 복구 기록의 독립 사본 경로에 맞춰 이행하고, 외부 첨부 fixture의 새 가져오기 허용 가정을 catalog-only 정책으로 전환해야 한다. 기존 손상 원본·복구 파일 보존 assertion을 단순 삭제하지 않는다.

자기 점검: 정확성4(실제 현행 동선·전체 원고/첨부 equality), 완결성3(서재2흐름 완료·같은 파일의 나머지3검사 이행 필요), 명료성4(새 가져오기 거부와 기존 저장 보존 구분), 실행 가능성4(작품 생성/기획 복귀/재열기 확인), 간결성4(제품 버튼 복원 없이 테스트 동선 이행). 후속 검사는 UX-REGRESSION-NAV에 유지한다.

### 손상 보관함의 안전한 초안·복구와 중복 사본 (2026-10-12)

후속 검사에서 자동 저장 중지 상태에도 `newStory`의 수동 `persistWorkspace`가 손상 raw를 덮어쓸 수 있음을 발견했다. `persistWorkspace`에 정상 hydration 조건을 추가했다. 손상 상태의 새 초안 생성은 writer 소유권만 확인하고 메모리에 유지하므로 글쓰기와 파일 내보내기를 보존한다. 복구 기록의 export/독립 사본 열기도 유지하며 원본 재저장은 명시적 원본 보존 후 복구 경로에 한정한다. 서재에서는 전역 복구 영역의 경고를 반복하는 대신 실제 작업 오류를 알림에 표시한다.

`local-library`의 나머지 host2검사를 현재 동선으로 이행했다. 복구 검사는 새 초안 export/차단된 설정 이동 뒤 글·raw 보존, 기록 파일의 전체 project equality, 복구 사본의 새 ID·원고/장/기획/메모와 수정 소개 export, 손상 raw/legacy key/기록 raw 보존을 확인한다. 중복 import 검사는 역사적 외부 첨부 파일을 수정하지 않고 등록 소리2개로 명시적으로 대체한 테스트 사본을 사용한다. 기존12컷·Flow·배치·기획·메모를 그대로 유지하고 두 가져오기 ID의 독립성·모든 기존 작품·재열기를 확인한다. 이전 기기 private 작품 보존 검사는 역사적 파일을 그대로 사용한다.

[현재 빌드 회귀](evidence/library-current-actions/final.log)는17개 통과/1개 실패/1개 project skip이다. 실패는 기록 파일 export가 작품 메뉴를 닫는데 검사에서 사본 열기 전에 메뉴를 다시 열지 않은 동선 오류였다. 메뉴와 복구 기록의 실제 펼침 상태를 확인한 [수정 복구 검사](evidence/library-current-actions/recovery-verified.log)1개가 같은 제품 빌드에서 통과했다. 따라서 관련18개 검사의 성공 근거는 두 실행으로 구분하며 처음 실행 전체를 통과로 부르지 않는다. skip1개는 아직 이행하지 않은 긴 native 통합 검사다. [중간 빌드 검사](evidence/library-current-actions/intermediate.log)는 초안 생성을 막았던 중간 구현의 결과이며 최종 제품 검증으로 쓰지 않는다.

[최종 Web 빌드](evidence/library-current-actions/build.log)는 서비스 음원 hash 검사와 TypeScript를 포함해 통과했다. 저장·guard·복구 기록 단위22개가 통과했다. 기본 작품의1000컷 이상 삭제/되돌리기, 여러 탭 소유권·재개 충돌, 한 작품 메뉴/한글 입력 보호와1440/768/390/844 화면도 위 회귀 범위에 포함된다. 실제 BFCache·삼성 실기기·전체 E2E 완료를 주장하지 않는다.

자기 점검: 정확성4(손상 raw 실제 동일성과 두 export/독립 ID), 완결성4(서재 host4개·관련 저장/메뉴 회귀18개 완료, 긴 native 검사 후속), 명료성4(저장 중지와 초안 편집·기록/작품 파일 목적 구분), 실행 가능성4(저장 guard와 현재 메뉴 실제 연결), 간결성4(새 패널 없이 중복 안내 제거). 전체 UX 목표는 유지한다.

### 세 작품의 현재 메뉴·파일·native 읽기 왕복과 메모 겹침 (2026-10-12)

긴 `local-library` 검사를 현재 text-first/목적별 설정/이미지 선택창/실제 읽기 메뉴로 이행했다. 두 작품을 UI로 생성하고 기존12컷의 등록 소리 사본을 가져와 표지·기획·세 메모의 장/컷 연결을 편집한다. 다른 작품으로 이동하거나 재열어도 편집 컷을 유지하고, 별도 브라우저 context로 파일을 가져와 전체 project와 audioResources를 비교한다. 기존 역사적 private 음원 파일은 수정하지 않는다. 실제 native 선택지 둘째 길→직접 저장→서재→재열기→이어읽기→해당 컷 편집→대사 변경→native 재생, 두 작품의 독립 읽기 위치, 살아 있는 renderer의 서재 보관 크기/동일 instance, 숏스토리 진입을 확인한다. 복귀 컷을 검사에서 강제로 고르지 않고 실제 복귀 ID를 assert한다.

첫 [이행 실행](evidence/library-native-current/first.log)은 동일 대사가 읽기 정보와 숨겨 보존한 입력에 함께 있어 selector가 둘을 찾은 오류로 실패했다. 읽기 영역으로 한정한 [다음 실행](evidence/library-native-current/verified.log)은 접힌 서재 도구를 열지 않고 숏스토리 링크를 찾은 동선 오류였다. 기능 제거/상시 링크 복원 대신 실제 도구를 여는 동선으로 수정했다.

캡처 검토에서 스크롤 중 작은 sticky 복귀 버튼이 메모 안내 글을 덮음을 발견했다. [PC/폰 RED](evidence/library-native-current/memo-red.log)2개가 실제 직사각형 겹침을 재현했다. 복귀를 설정 제목 행으로 모으고 sticky를 제거했으며 항목 추가 form만 아래 정렬해 버튼이 라벨까지 늘어나는 것을 고쳤다. 새 패널/일괄 큰 여백/자료 변경 없이 해결한다.

[최종 실행](evidence/library-native-current/final.log)은 host6개(기존 서재4개+메모 geometry2개)와 native1개가 통과했다. project별 scope를 나눠 같은 spec을 두 project에 실행했으므로 서로의 검사 skip7개가 별도로 있다. 준비 화면의 정보/기획/메모 선택 및 넘침을1280/1024/390 화면에서 확인했다. [폰 메모](evidence/library-native-current/preparation-phone-memos.png), [태블릿 기획](evidence/library-native-current/preparation-tablet-planning.png), [서재](evidence/library-native-current/library-desktop.png), [실제 native](evidence/library-native-current/imported-native-reading.png), 작품 파일3개와 실행 요약은 같은 새 evidence 폴더에 보존한다. native 읽기 진행은 데스크톱 viewport이며 실기기나 세 기기의 native 진행 전체 검증으로 확대하지 않는다.

설치 Google Chrome154 추가 [첫 실행](evidence/library-native-current/chrome-verified.log)은 읽기 중 다음 버튼 부재와 앱 오류 화면이 관찰돼 실패했다. 당시 예외 수집이 없어 원인은 확정하지 못했다. 각 page의 pageerror/console 수집을 추가한 [재검사](evidence/library-native-current/chrome-errors.log)1개와 [반복 검사](evidence/library-native-current/chrome-repeat.log)2개는 모두 통과했다. [실행 요약](evidence/library-native-current/run-summary.json)은 실제 chrome channel/version을 기록한다. 마지막 [오류 수집](evidence/library-native-current/browser-errors.json)에는 favicon404만 있으며 앱 pageerror는 없다. 최초 실패를 해결했다고 주장하지 않고 UX-NATIVE-ERROR의 조사 근거로 남긴다.

[Web 빌드](evidence/library-native-current/build.log)는 서비스 음원 hash 검사·TypeScript를 포함해 통과했고 준비/용어 단위15개가 통과했다. 변경 TypeScript ESLint 오류0(root React detect warning 별도), 문서 링크 검사와 diff check를 확인한다. 단일 Core→Ren’Py 재생과 기존 StoryDocument/Flow/StageComposition/자유 배치 계약은 변경하지 않았다.

자기 점검: 정확성4(세 작품 전체 파일 equality·실제 native 선택/저장/이어읽기/자동 컷 복귀), 완결성3(현재 통합 검증 완료·Chrome 최초 오류 원인과 전체 회귀/실기기 남음), 명료성4(하나의 목적 설정/읽기 메뉴·scope별 성공/실패 구분), 실행 가능성4(실제 현재 자료 선택·메모 연결과 화면 겹침 수정), 간결성4(복귀 한 입구와 입력 행 정렬만 변경). 전체 목표는 계속한다.

### 읽기 되돌림의 오류 경계와 실제 키보드 입구 (2026-10-12)

독립 소스 검토에서 `backPlayback`을 React 상태 updater 안에서 호출하는 경로를 확인했다. 잘못된 이전 컷/장면에서 발생하는 예외를 일반 작업 안내로 처리할 수 없었다. 새 Web `rewindReader`는 Core의 back 및 장면 compile을 먼저 수행하고 성공한 상태만 반영한다. 실패는 현재 원고/읽기 경로를 보존하며 ‘이전 읽기 위치를 열지 못했어요…지난기록에서 위치를 고르거나 처음부터 읽어 주세요’로 안내한다. Core의 경로/선택/점수 해석은 그대로 사용한다. 이 결함 종류가 최초 Chrome 오류의 원인이라고 단정하지 않는다.

기존 ‘이전으로’는 읽기에서 `display:none`인 navigation에 있어 실제 키보드 동선에서 찾을 수 없었다. 해당 숨은 중복 버튼을 제거하고 기존 텍스트 접근 영역에 ‘이전 읽은 컷’ 하나를 연결했다. 처음 컷은 생략하고 유효한 종료 경로는 마지막 컷을 다시 열며, 메뉴 처리 중에는 비활성이다. 전환 중 되돌림 허용은 유지한다. 정상 화면의 읽기 바에 새 상시 조작을 추가하지 않는다.

[RED](evidence/library-native-current/rewind-red.log)는 새 오류 경계가 없는 상태였다. [단위6개·coverage](evidence/library-native-current/rewind-coverage.log)는 정상 읽기/종료된 경로/선택과 점수 되돌림, 이전 컷 누락·사용할 수 없는 이전 배경·빈 경로의 실패를 확인한다. 원고와 원래 state equality를 유지하며 새 helper의 statements/branches/functions/lines만100%다. 전체 앱 coverage로 확대하지 않는다. 후속 독립 source review는 이 경계와 키보드 입구에 제품 차단 결함이 없음을 확인했다.

오류 수집은 테스트가 직접 만든 main/fresh context 모두에 연결하고 반복별 JSONL·trace를 기록한다. [첫 진단 실행](evidence/library-native-current/diagnostic-repeat.log)의4실패는 이미 시작된 자동 trace에 수동 start를 중복 호출한 검사 설정 오류이며 앱을 읽은 실패가 아니다. 진단 config에서 자동 trace를 끈 [수정 반복](evidence/library-native-current/diagnostic-corrected.log)4개는 설치 Chrome154에서 통과했다. 예외/console/request 실패/주요 navigation과 다음 입력 단계를 수집했으며 최초 앱 오류는 재현되지 않았다. trace는 런타임 bytes와 기존 그림을 포함하므로 이 evidence 폴더의 trace ZIP만 Git 제외하고 로컬에 보존한다.

[최종 빌드](evidence/library-native-current/rewind-build-final.log) 후 [설치 Chrome 현재 동선](evidence/library-native-current/rewind-final/verified.log)은 host6개+native1개 통과, project scope skip7개다. 실제 native 선택 후 키보드 ‘이전 읽은 컷’→선택지 복귀→native 재선택을 기존 세 작품/파일/저장/이어읽기/편집 복귀 검사에 추가했다. 이 실행의 event JSONL과 local trace는 `rewind-final`에 별도로 보존해 수정 전 진단 자료를 덮어쓰지 않는다.

source review가 찾은7개 기존 spec의 ‘이전으로’13호출은 `reader-actions.previousReadCut`의 현재 키보드 동선으로 이행했다. 다른 오래된 메뉴/자료 가정은 남아 있으며 그7개 spec 전체를 이번 실행에서 통과했다고 주장하지 않는다. 변경 TypeScript ESLint/diff 및 문서 링크를 확인한다. 최초 Chrome 앱 오류는 여전히 UX-NATIVE-ERROR 조사 항목이고, 렌더 시 project/playback 관계의 원인 여부도 확정하지 않았다.

자기 점검: 정확성4(Core 검증 전 상태 반영 차단·선택/점수/원본 보존), 완결성3(되돌림 정상/실패·실제 native 완료, 최초 오류 원인/전체7spec 미검증), 명료성4(이전 읽은 컷이라는 경로 의미·실제 복구 행동 안내), 실행 가능성4(숨은 동작을 키보드 영역에 연결), 간결성4(일반 바 추가 없이 한 동작/오류 경계). 전체 UX 목표를 유지한다.

### 현재 오류 구분과 점수 조건 편집 동선 (2026-10-12)

사용자의 ‘현재 목표를 이어갈 수 없는 상황인가’ 질문에 대해 빌드/저작/읽기를 전부 막는 상태가 아님을 확인했다. 최초 Chrome 앱 오류는 원인 미확정으로 유지한다. 아래 구분은 그 문제를 다른 검사의 성공으로 해결 처리하지 않기 위한 것이다.

| 구분 | 근거와 상태 | 다음 행동 |
|---|---|---|
| 확정된 제품 동작 결함 | 되돌림의 throwing state updater는 앞 절의 오류 경계/실제 읽기 동선으로 보강했다. 점수 조건의 불가능한 이동 노출과 장 정보 누락은 아래 RED로 재현·수정했다 | 해당 수정의 검증 완료; 다른 화면/전체 회귀는 계속한다 |
| 검사 가정·설정 오류 | 제거된 옛 입구, 숨긴 접근 영역의 mouse click, trace 중복 start, 장의 갈래 표기 누락은 각각 실제 현재 동선/설정에 맞춰 고쳤다 | 기존 원고 보존 assertion을 유지하며 구동선을 이행한다 |
| 재현·원인 미확정 | 최초 설치 Chrome 읽기 중 앱 오류. 이후 context별 진단에는 pageerror/crash가 없고 console favicon404와 닫는 navigation의 ERR_ABORTED만 있다 | UX-NATIVE-ERROR를 유지하고 최초 예외/원인 근거를 확보한다. 전체 완료 판정은 보류한다 |

점수 편집은 추가 편집→선택지 편집을 명시적으로 열며 기본 글쓰기의 진행 필드는 숨겨 둔다. 첫 조건 위로/마지막 조건 아래로의 [RED](evidence/score-current-navigation/red.log), 다른 장의 같은 대사를 구분하지 못한 [대상 RED](evidence/score-current-navigation/target-red.log)를 확인했다. ScoreRouteEditor에서 가능한 방향만 렌더하고 전체 route 객체의 순서를 immutable map으로 교환한다. 도착 컷은 Core orderedLines/domain cutLabel을 사용해 장·갈래·컷·짧은 글로 표시한다. 순서가 첫 만족 조건을 결정하는 해석은 바꾸지 않는다.

score-narrative의 모든6기존 검사를 현재 작품 메뉴·선택 도구·장/컷 이동·읽기 메뉴·키보드 텍스트 접근으로 이행하고 반복 대사 대상 검사1개를 추가했다. 편집 검사는 두 조건의 아래/위 이동으로 원래 순서 복원, 선택 효과 set3/진행 임계5만 바꾼 전체 project equality, 파일 독립 재import/reload와 UI Excel 내보내기/reimport equality를 확인한다. 잘못된 점수 참조 거부도 전체 원고의 export/reload equality를 유지한다.

[현재 실행](evidence/score-current-navigation/verified.log)은6개 통과/1개 실패/project skip7개다. 실패는 복제한 장이 원래 branchLabel ‘갈래’를 보존했는데 검사에서 ‘2장’만 기대한 오류였다. 실제 ‘2장갈래’를 기대한 [수정 재검사](evidence/score-current-navigation/target-verified.log)1개가 같은 빌드에서 통과했다. 따라서 관련7개 성공은 두 실행의 근거로 구분한다. 장/갈래/컷/조건 ID를 검사 성공을 위해 제거하지 않았다.

읽기4개는 설치 Chrome의 PC/폰 원본 및 기존 실제 Excel/Google 편집 증거 파일을 가져와 키보드 선택→Core 점수 누적→Ren’Py 출력→reload→조건 엔딩→재시작→표시 조건으로 선택지 숨김→되돌림/점수0→재선택 엔딩을 확인했다. 실제 외부 앱을 이번에 다시 조작한 결과는 아니다. [Core 단위12개](evidence/score-current-navigation/unit.log), [Web 빌드](evidence/score-current-navigation/build.log)와 변경 TypeScript lint를 확인했다. 준비·현재 원고·Asset ID·Flow·자유 배치는 UI 표시 변경으로 재작성하지 않는다.

자기 점검: 정확성4(전체 project/ID·조건/대상·파일/Excel equality), 완결성4(현재7검사·4읽기 완료, 최초 오류/전체 회귀 별도), 명료성4(실행 가능한 순서와 장·갈래·컷 구분/오류 유형 구분), 실행 가능성4(현재 메뉴/키보드/Ren’Py 실제 동선), 간결성4(새 패널 없이 버튼 노출과 대상 표시 개선). 전체 UX 목표는 유지한다.

후속 독립 source review에서 제품 차단 결함은 없었으나, 아래→위로 원래 순서만 복원한 마지막 비교로는 두 이동이 모두 no-op인 회귀를 잡지 못함을 지적했다. 첫 아래 이동 직후 실제 작품 파일을 내보내 전체 goto flow를 원래 route 객체의 뒤집힌 순서와 비교하고, 그 후 위 이동/값 편집/파일·Excel 왕복을 계속하도록 보강했다. 같은 앱 빌드의 [순서 보존 재검사](evidence/score-current-navigation/order-verified.log)1개가 통과했다. 이는 검사만 보강한 결과이며 새로운 제품 빌드나 최초 Chrome 오류의 원인 해결을 뜻하지 않는다.

### 최초 Chrome 오류의 포착 범위 보강 (2026-10-13)

`native-diagnostics`에 선택적 CDP 예외 진단을 추가했다. `KNOL_CAPTURE_CAUGHT_EXCEPTIONS=1`일 때 테스트가 만든 Chrome page에만 연결하며 읽기 진입 전부터 동작한다. 일반 pageerror 외에 앱이 잡아서 오류 화면으로 처리한 예외의 설명·호출 위치를 JSONL에 기록하고 즉시 재개한다. runtime/WASM/확장 및 익명 스크립트는 잡음 제외 대상으로 두므로 모든 runtime 예외를 수집한다고 주장하지 않는다. 실제 사용자 탭·저장소나 제품 기능은 변경하지 않았다.

진단 자체의 무동작을 성공으로 오인하지 않도록 이름 있는 합성 caught exception을 발생시키고 포착 여부를 확인한다. 이 `KnolStory caught-exception probe`는 검사기가 의도적으로 발생시킨 예외이며 제품 오류가 아니다. 기록 후 debugger 재개는 finally에서 수행하며 제어/정리 실패도 별도로 기록한다.

읽기 진입 전 수집을 켠 [첫 실행](evidence/library-native-current/caught-preplay/run.log)과 타입/재개 처리를 보강한 [최종 실행](evidence/library-native-current/caught-preplay/final.log)은 각각 실제 Chrome native 통합1개를 통과했다. [최종 이벤트](evidence/library-native-current/caught-preplay/native-events-0.jsonl)에는 합성 예외1개와 진단 확인1개가 있으며 앱 pageerror·crash·debugger 제어/정리 오류는 없다. console 오류2개는 favicon404, requestfailed2개는 이동/종료 시 ERR_ABORTED다. 세 작품의 편집·파일 왕복·native 선택/되돌림/재선택·저장/재개/편집 복귀가 이 검사 범위다. 휴대폰 실기기와 전체 suite를 증명하지 않는다. debugger가 실행 시점에 영향을 줄 수 있으므로 재현되지 않음이 최초 오류 부재를 증명하지 않는다.

최초 Chrome 오류는 여전히 원인 미확정이다. 현재 빌드와 검증 동선이 동작하므로 작업 전체를 중단할 근거는 없지만, 최초 오류의 해결 처리와 전체 UX 목표의 완료 처리는 보류한다. 기존 성공 로그와 이번 진단 성공을 원인 증거로 대체하지 않는다.

### 전역 이야기 점수 설정의 단일 소유와 선택지 복귀 (2026-10-13)

전역 점수 정의는 작품 설정의 ‘이야기 점수’ 한 곳에서만 편집한다. 선택지 편집 안에는 `ProjectScoreEditor`를 중복으로 넣지 않고, 점수 이름·시작 값이 필요할 때 작품 설정으로 이동하는 짧은 버튼만 둔다. 선택지별 점수 변화·표시 조건과 점수 조건 진행은 기존 선택지/진행 편집에 남겨 현재 컷의 연결 맥락에서 바로 조정한다.

작품 메뉴의 설정 그룹은 작품 정보·표지, 이야기 기획, 창작 메모, 이야기 점수를 직접 연다. 점수 설정으로 이동하기 전에 현재 원고를 저장하고, 한글 조합 중에는 이동하지 않는다. 저장 실패는 원시 브라우저 예외만 보이지 않게 “기기 저장에 실패…” 안내로 감싸며 현재 글과 화면을 유지한다. 설정에서 돌아올 때는 memo navigation request의 editor context를 사용해 원래 컷·선택지 도구·장 전체 글 보기 상태·소리 도구 여부를 복원한다. 보호 사본으로 전환될 때는 기존 memo/cut ID와 함께 이 복귀 맥락도 work identity만 remap한다.

[전역 점수 UI 회귀](evidence/global-score-settings/ui.log)는 score-authoring1개와 work-actions7개, 총8개가 통과했다. 범위는 작품 메뉴의 직접 이야기 점수 진입, 사용자 점수 이름/설명/시작 값·소수 거절·파일 export/reload, 네 viewport의 작품 메뉴 복귀, 선택지 편집에서 점수 설정으로 이동 후 같은 선택지 도구 복귀, IME/저장 실패 guard, 서재 출발 설정의 editor return 미생성을 포함한다. [memo navigation 단위](evidence/global-score-settings/unit.log)는3개가 통과해 보호 사본 remap이 editor context를 보존함을 확인했다. [TypeScript](evidence/global-score-settings/typecheck.log)는 Web typecheck 통과다.

이번 변경은 StoryDocument score/Flow schema, Runtime Core 점수 해석, Ren’Py 재생 계약을 바꾸지 않는다. 기존 원고·Asset ID·Flow·StageComposition·자유 배치와 파일 왕복 의미는 유지한다. 전체 E2E, 물리 기기, 최초 Chrome 오류 원인 판정은 별도 상태로 남긴다.

전역 점수 후속 최종 검증: [최종 정적 빌드](evidence/global-score-settings/build-final.log)는 서비스 음원 검사·TypeScript를 포함해 통과했다. [분리된 결과 폴더의 최종 회귀](evidence/global-score-settings/final-aligned-verified.log)는14개 통과/4개 의도적 host scope skip이다. 기본 작품의 선택지 편집에서 점수 생성 후 같은 컷·도구 복귀, 전체 project가 추가 score/updatedAt 외에는 동일한 파일 export, 작품 메뉴 직접 점수 진입과 reload를1440/768/390/844에서 확인했다. 한글 조합 중 이동 제한, 저장 실패 시 설정·입력·컷 유지, 실패 후 재시도 성공 시 오래된 오류 안내 제거도 통과했다. native4개는 PC/폰 및 기존 Excel/Google 편집 artifact의 점수 누적·조건 분기·저장/재개·되돌림·재선택을 확인한다. 외부 Excel/Google 앱을 이번에 새로 조작한 검증으로 확대하지 않는다. [폰 설정](evidence/global-score-settings/global-score-settings-390.png)과 다른 세 크기 캡처를 같은 폴더에 보존했다.

검사 이력은 구분한다. red.log의 없는 설정 입구는 변경 전 재현이다. dev.log는 중간 메뉴 중복, dev-verified.log의 trace ENOENT는 동시 검사 결과 폴더 충돌이다. verified.log는10개 성공/1개 검사 실패이며 접힌 메뉴의 role 검색 옵션을 잘못 쓴 문제였다. final.log는 최종 버튼 이름과 검사 이름 불일치 때문에 중단했고, final-aligned.log는 중단한 검사의 남은 임시 서버가 포트를 점유해 시작 실패했다. 이 임시 서버만 종료한 뒤 final-aligned-verified.log에서 재검증했다. 위 실패/중단을 최종 성공으로 덮어쓰지 않는다.

[단위 coverage](evidence/global-score-settings/coverage.log)는 memo navigation3검사와 해당 remap 함수만100%다. 앱 전체 coverage가 아니다. 점수 정의 편집기는 현재 StoryPreparation 한곳에만 존재한다. 최초 Chrome 오류 원인, 다른 화면의 남은 중복/밀도·전체 회귀·실기기는 기존 후속 목표로 유지한다.

### 편집 도구 중복과 한글 조합 중 이동 보호 (2026-10-13)

기본 도구 줄을 상태 없는 `StoryEditorTools`로 분리하고 편집 상태 소유는 `StoryWorkspace`에 유지했다. 컷 목록에 들어갔을 때 같은 줄의 ‘글로 돌아가기’ 버튼을 제거하고 기존 ‘글’ 입구를 사용한다. 긴 추가 편집 영역 가까이의 ‘글쓰기 화면으로 돌아가기’는 유지한다. 기본/추가 도구·소리·연출에서 인물 배치로 가는 내부 이동은 같은 root guard로 연결한다. 여백·버튼 크기·원고 및 StoryDocument/Flow/StageComposition 계약은 바꾸지 않았다.

[첫 RED](evidence/tool-navigation/red.log)는 대사 조합 중 배경·인물 버튼이 여전히 활성인 결함을 재현했다. [선택지 RED](evidence/tool-navigation/choice-red.log)는 기존 조합 감지가 대사 textarea에만 있어 선택 문구에서 같은 보호가 빠짐을 재현했다. 편집 입력 영역의 composition capture로 대사·선택지·말하는 인물 등으로 감지를 넓혔다. 도구 버튼/영역 가까이의 복귀는 조합 중 disabled, 추가 편집 summary의 실행은 차단하며 Esc로 팝업을 닫는 것은 유지한다. 이미 열린 연출의 내부 이동은 guard에서 상태 변경을 거부한다. 입력을 마치면 같은 문구를 유지하고 다시 이동할 수 있다.

[관련 회귀](evidence/tool-navigation/verified.log)는19개 통과다. 글 중심 기본 화면/한 추가 도구, 선택 점수 작성, 네 viewport의 원고 보존·재열기·중복 복귀 부재, 선택 문구 조합, 내부 배치 이동, 실제 native 미리보기의 연출 도구/취소 및 커서·소리 목적 복귀를 포함한다. 소스 전용 검토에서 조합 안내가 성공 후에도 남는 문제를 확인하고 [안내 RED](evidence/tool-navigation/notice-red.log)로 재현했다. 재시도 성공 시 그 안내만 지우며 다른 저장/가져오기 오류는 유지한다.

[최종 Web 빌드](evidence/tool-navigation/build-final.log)는 서비스 음원 검사·TypeScript 포함 통과, [최종7개](evidence/tool-navigation/final.log)는 수정된 안내와 네 화면 크기의 도구/원고·재열기, 선택 문구 조합 및 실제 native 커서·소리 복귀를 통과했다. 원고 보존 검사는 local storage의 전체 project를 전후 동일 비교한다. [폰](evidence/tool-navigation/tool-navigation-390.png)·[태블릿](evidence/tool-navigation/tool-navigation-768.png)·[PC](evidence/tool-navigation/tool-navigation-1440.png)·[가로](evidence/tool-navigation/tool-navigation-844.png) 캡처는 현재 scene revision의 Ren’Py 재생 확인 뒤 남겼다. 초기19개와 후속7개는 빌드/검증 범위가 다르므로 하나의26개 최종 실행이라고 부르지 않는다.

변경 소스 lint/diff와 문서 링크를 확인했다. 모바일 기존 spec의 제거된 복귀 버튼 호출을 ‘글 편집’으로 이행했으나 그 spec 전체/실기기/실제 삼성 IME를 새로 검증한 것으로 주장하지 않는다. 최초 Chrome 오류와 다른 추가 편집의 중첩·밀도, 전체 회귀는 기존 후속 상태를 유지한다.

### 실제 인물을 기준으로 하는 조정과 그룹 전체 재생 (2026-10-13)

인물 강조·투명도 조정은 현재 canonical StageComposition의 인물과 저장된 side 설정을 기준으로 대상을 표시한다. 인물이 없고 설정도 없는 쪽은 조정 칸을 만들지 않는다. 모두 없으면 ‘인물 배치하기’로 등록 이미지 선택에 연결한다. 저장된 빈 쪽은 0%/false/legacy 위치 필드를 버리지 않고 안내와 수정 경로를 유지한다. 한쪽 조정은 두 번째 빈 열을 남기지 않는다.

검토에서 기존 계약의 ‘인물 전체’와 달리 Core가 첫 인물에만 appearance를 반영함을 확인했다. [수정된 Core RED](evidence/appearance-context/core-red-corrected.log)는 두 번째 인물의 opacity/spectral/emphasis 누락을 재현한다. 새 `mergeActorOverride`는 그쪽 모두에 세 appearance 필드를 적용하고 기존 첫 인물 위치 override와 StageActor 직접 위치·배율·방향 및 original facing을 보존한다. Web은 문서에 side 값을 쓰고 Core가 RuntimeActor로 해석하며 기존 Ren’Py가 재생한다. 문서/schema/RuntimeCommand 형식과 자산은 추가하지 않았다.

[최종 연출 목적 검사](evidence/appearance-context/purposes-final.log)는10개 통과다. 네 viewport의 전환/분위기/효과/인물 목적과 변경 취소, 열기만으로 default 미작성, 빈 컷에서 실제 등록 이미지 배치 후 조정 진입, 한쪽만 있는 컷 및 저장된 빈 쪽의 편집·전체 project 파일 보존·reload, 실제 native 두 왼쪽 인물 0% 적용을 확인한다. [앞선9개](evidence/appearance-context/final.log)는 해당 상태 matrix와 네 viewport의 native 연출 도구/취소 복귀를 포함하며 일부 검사가 중복된다. 하나의19개 전체 실행이라고 합산하지 않는다. [native 두 인물 표시](evidence/appearance-context/native-both-visible.png), [둘 다 숨김](evidence/appearance-context/native-both-hidden.png), [왼쪽 인물 제거](evidence/appearance-context/native-empty-left.png)를 보존했다. 첫 이미지는 제거 장면과 실제로 다르고, 0% 장면의 왼쪽 상단60%×55%는 제거 장면과 채널차8 초과 pixel 비율0.1% 미만으로 일치한다. 이는 재생 화면 확인이며 Core 결과만으로 native 성공을 대신하지 않는다.

[단위25개](evidence/appearance-context/unit-final.log)는 모든 대표 컷/그룹 appearance/위치 reset/portrait speaker 및 편집 필터를 통과했다. [scoped coverage](evidence/appearance-context/coverage.log)는 Web actor-appearance helper와 Core actor-overrides helper의 statement/branch/function/line100%다. 전체 앱 coverage가 아니다. [최종 빌드](evidence/appearance-context/build-verified.log)는 서비스 음원 검사·TypeScript 포함 통과다. source 전용 후속 검토에서 이 범위의 제품 결함은 추가로 발견되지 않았고 옛 `non-audio-direction-ui` 검사 동선은 후속으로 분리했다.

검사 이력: unit-red/ui-red/core-red의 초기 일부 실패는 새 helper 미구현 외에도 검사 import 누락/없는 RuntimeActor.side 가정이 섞여 있다. 실제 Core 결함 재현은 core-red-corrected다. ui-red/ui-red-corrected는 import/fixture 문제로 UI 검증에 도달하지 못했으므로 인물 없음 UI 결함의 실행 재현으로 쓰지 않는다. 기존 항상 두 쪽을 표시하던 소스와 helper 미구현 단위 RED, 수정 후 유효한 fixture의 UI 검증을 구분한다. build.log는 facing original 타입 누락으로 실패했고 그 뒤 verified.log는 이전 정적 빌드를 사용했으므로 최종 근거에서 제외한다. verified-current.log는 새 빌드에서 fixture의 stage/legacy Asset ID projection 불일치와 잘못된 narration speaker 값으로 import가 거부된 결과다. 계약의 patchStageLine으로 fixture를 일관되게 구성하고 narration 값을 바로잡은 verified-fixtures/final/purposes-final이 최종 근거다. 원본 작품이나 유효성 검사를 느슨하게 바꿔 해결하지 않았다.

[PC](evidence/appearance-context/appearance-context-1440.png)·[태블릿](evidence/appearance-context/appearance-context-768.png)·[폰](evidence/appearance-context/appearance-context-390.png)·[가로](evidence/appearance-context/appearance-context-844.png) 캡처는 현재 native revision 확인 후 보존한다. 새 외부 Excel/Google 편집, 실기기, 전체 E2E 및 최초 Chrome 오류 원인 판정을 주장하지 않는다.

2026-10-14 남은 회귀 후속: 기존 private metadata·responsive audio·CC0 facets·chapter identity·composition intent를 실제 현재 purpose/detail/picker/reader 경로로 이행했다. 이전에 허용하던 새 private upload/import를 되살리지 않으며 이미 저장한 데이터와 새 첨부의 검증을 분리한다. [현재 source/실행/미검증 조건](current-regression-migration-validation.md)이 최신 소유 기록이다.
