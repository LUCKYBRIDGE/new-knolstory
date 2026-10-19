# 장 기본 소리의 종료 컷 편집 — 2026-10-14

[컷 범위 계약](cut-range-authoring-contract.md), [등록 자료/외부 범위 준비](range-external-preparation-validation.md), [현재 저작 저장 계약](authoring-storage-contract.md), DESIGN의 필요한 도구만 여는 원칙을 따른다. 사용자 결정으로 Excel ChatGPT 추가 기능 연결은 이번 개발에서 제외하며 이 작업의 선행 조건이 아니다.

## 확인한 문제와 구현

장 기본 배경음·주변 소리의 `endLineId`는 이미 StoryDocument7/workbook7/Core의 실제 방문 해석에 있었다. 하지만 ChapterWriter는 소리 조정에 project/chapter context를 넘기지 않았고 두 종료 컷 입력은 cut scope에서만 보여 줬다. 현재 장 전체 글 보기의 선택적 ‘장 설정 · 말하는 인물과 기본 자료’ → 장 소리 설정에서 재생할 채널을 고르면 해당 채널의 종료 컷을 고를 수 있다. 기본 컷 글쓰기/읽기 화면에 입력을 상시 추가하지 않는다.

시작은 임의의 첫 원고 컷이 아닌 **이 장에 실제로 들어온 컷**이라고 안내한다. 종료 컷을 포함하고 다음 실제 방문 컷에서 해당 소리를 멈춘다. 종료 컷을 우회하면 유지하고 장을 나갔다 다시 진입하면 장 기본 지시를 다시 적용한다. 이는 기존 Core 계약이며 원고/Flow를 바꾸지 않는다. 현재 컷 소리의 시작점 이동과 장 기본 지시의 의미를 혼합하지 않는다.

한글 label은 ‘장 배경음 종료 컷’, ‘장 주변 소리 종료 컷’이며 기존 컷 입력 이름은 유지한다. 채널별 마지막 변경 취소로 종료 선택도 되돌린다. undo scope에 chapter identity를 넣고 existing chapter key로 작품/장 변경을 분리한다. 없는 UI context는 렌더하지 않으며 저장된 종료 참조를 임의 삭제하지 않는다.

Workbook의 종료 열 이름이 ‘종료 컷 ID (컷 소리만)’이라고 잘못 한정하던 것을 ‘종료 컷 ID’로 고치고 메모에 장 실제 진입/종료 포함/다음 방문 의미를 설명한다. stable key `endLineId`, 문서7/archive2/workbook7/JSONB1과 기존 codec·개인 음원 bytes를 유지한다. 기존 외부 앱 산출물 재반입도 따로 비교한다.

## 검증 근거

- [UI RED](evidence/chapter-audio-range-current/red.log): 장 편집에서 실제 시작/종료 입력이 없는 상태를 확인.
- [양식 RED](evidence/chapter-audio-range-current/workbook-red.log): 컷 소리만이라는 잘못된 열 표시를 확인.
- [단위14개](evidence/chapter-audio-range-current/unit-first.log): 장 진입·끝 포함·우회·장 재진입, current worksheet 설명, 범위 전체 문서/XLSX/JSONB 보존. 제외1개는 별도 환경 변수로 외부 검증 입력을 생성하는 작업.
- [첫 UI](evidence/chapter-audio-range-current/ui-first.log)는 native WebAudio가 잠긴 상태에서 다음 진행을 요구해 실패했다. 소리 잠금 거부를 우회하지 않고 edit stage의 실제 클릭으로 native 소리 잠금을 연 뒤 재생했다.
- [actual native](evidence/chapter-audio-range-current/ui-native.log):1440/768/390/844의 두 채널 선택/취소·저장·전체 프로젝트 미수정 필드 비교·reload·파일 왕복·읽기 복귀. 해석된 RuntimeScene뿐 아니라 native `data-music-path`와 `data-ambience-path`가 종료 컷에서 유지되고 다음 컷에서 비어야 한다.
- [기존 계약/외부 산출물](evidence/chapter-audio-range-current/existing-contracts.log): 이전 실제 Excel/Google 산출물과 기존 stage/audio·Core 회귀.

새 음원 취득이나 native 시작 ZIP/engine 변경은 없다. 실제 Excel 앱의 새 셀 편집, 물리 삼성 가상/외장 키보드와 학교 기기·배포까지 증명하지 않는다. Excel 연결은 제외, 파일 계약과 기존 private/Pixabay14·catalog530/별칭23 정책은 유지한다.

## 후속 상태

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| UI-CHAPTER-RANGE | 구현·이번 범위 검증 완료 P1 | 기존 장 audio/Core 방문 계약·ChapterWriter | 장별 끝 선택/취소/파일/reload·실제 시작/끝포함/이후 stop·기존 원고/배치/채널 보존 |
| UI-RANGE-BRANCH | 미구현 P1 | cue identity·선택 경로 조건·합류/반복/파일 계약 | 특정 갈래 적용을 코드 없는 편집·Core/native·전체 형식으로 검증 |
| Excel ChatGPT 연결 | 사용자 결정으로 이번 개발 제외 | 2026-10-14 지시 | 설치/로그인/연결 요구 없이 로컬 개발 진행 |
| 실제 외부 새 편집·기기 | 별도 미검증 | 별도 외부 앱 실행/target device | local/기존산출물/viewport와 분리한 실제 결과 |

## native 입력 경계와 시각 확인

최초 edit 좌표 클릭은 PC에서 통과했지만 휴대폰의 긴 장 설정 scroll에서는 실제 무대 위치와 달라 소리가 잠긴 채였다. 직접 canvas locator는 Ren’Py Web의 실제 입력용 `overlayDiv`에 가려지는 것이 정상이며 해당 실패도 보존했다. 실제 읽기 진입 후 native 잠금 안내가 활성화된 상태에서 입력용 overlay를 클릭하는 [수정 검사](evidence/chapter-audio-range-current/ui-unlock-surface.log)는 네 viewport 모두 통과했다. 잠금 우회/자동재생 정책 해제/엔진 대체를 하지 않았다.

[휴대폰 설정](evidence/chapter-audio-range-current/chapter-range-phone.png), [가로 설정](evidence/chapter-audio-range-current/chapter-range-landscape.png), [PC 설정](evidence/chapter-audio-range-current/chapter-range-desktop.png)을 현재 viewport에서 캡처했다. 종료 입력의 좌우 bounds와 페이지 가로 overflow를 검사하고 실제 한글 시작/끝/우회/재진입 안내를 직접 확인했다. 입력은 선택한 채널 상세에서만 보이며 기본 컷 화면에는 추가하지 않는다.

## 최종 단위·빌드 확인

[단위15개](evidence/chapter-audio-range-current/unit-final.log)는 장 audio를 컷으로 옮기지 않는 전체 문서/workbook/XLSX/JSONB 왕복까지 확인했다. [기존 계약26개](evidence/chapter-audio-range-current/existing-contracts.log)는 이전 실제 Excel/Google 편집 산출물과 stage/audio/Core를 확인했다. [전체 coverage](evidence/chapter-audio-range-current/coverage.log)는149파일/1218통과·별도 artifact 생성2개 제외, statements93.72%/branches91.21%/functions96.67%/lines98.70%다. 외부 입력 생성 작업과 실제 앱 검증을 혼합하지 않는다.

[타입6 workspace](evidence/chapter-audio-range-current/typecheck-final.log), [변경 파일 lint](evidence/chapter-audio-range-current/lint-last.log), [빌드](evidence/chapter-audio-range-current/build.log), [문서 링크](evidence/chapter-audio-range-current/docs-last.log)가 통과했다. 독립 source 리뷰에서 P1/P2 지적은 없었으며 실제 entry/끝 포함/재진입·stable workbook key·기존 private codec 보존을 확인했다. Native 검사 입력 보정은 제품 동작을 변경하지 않았으며 첫 실패 로그들을 보존한다.

[같은 빌드의 관련 회귀](evidence/chapter-audio-range-current/affected-final.log)는20개 실행 중 native16개 통과/반대 host 목적4개 제외다. 소리 시작점2개·기본 저작 native1개·장 범위4개·컷 범위2개·소리 batch2개·소리 목적/undo5개를 확인했다. host 저작 흐름은 [별도 최종 검사](evidence/chapter-audio-range-current/authoring-host-final.log)로 실행한다. 제외4개를 native 성공에 합산하지 않는다. 이전52개/16개 등 다른 phase 성공도 이 실행과 합산해 전체 완료 수치로 쓰지 않는다.

최종 host 저작4개도 통과했고 native 목적1개는 host에서 별도 제외했다. 새/기존 작품의 보존·구조 편집·파일 전체 왕복/재열기·저장 retry·손상 raw/pending import 거부·초안 export를 유지한다. [현재 source와 실행 manifest](evidence/chapter-audio-range-current/final-manifest.json)는 이 phase의 증거를 기록하고 이전 검증 manifest를 덮지 않는다.

자체 점검: 정확성4(실제 native 두 채널/끝 경계와 전체 형식, 실기기 제외), 완결성4(누락된 장 범위 UI와 기존 저작 회귀 해결, 갈래 한정/전체 suite 후속), 명료성4(장 실제 진입·포함/우회/재진입·Excel 연결 제외 표시), 실행 가능성4(현재 optional 장 설정·undo·파일/실제 playback), 간결성4(기본 화면에 새 패널 없이 기존 상세 입력 재사용), 평균4.0. 남은 갈래 적용 범위·실제 기기·전체 회귀와 최초 Chrome 원인 증거는 전체 목표에 유지한다.
