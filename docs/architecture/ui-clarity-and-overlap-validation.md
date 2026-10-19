# 기능 이름·겹침·잘림 보완

2026-10-11. 사용자는 ‘현재 컷을 글자로 읽기’처럼 기능을 알기 어려운 이름을 바로잡고, 첨부한 이름표/본문 겹침을 비롯한 UI 문제를 일괄 여백 증가 없이 수정하도록 요청했다. 기존 [승인 도안 개편](approved-ui-development-plan.md)의 후속 보완이다. 최신 UX는 [DESIGN](../../DESIGN.md), 용어는 [용어·시간 계약](editor-terminology-and-time.md)이 소유한다.

## 확인한 원인과 수정

첨부 화면은 옹고집 작품의 `speakerName: 시점 전환`, `text: 옹고집의 시점`이다. 원고를 UI 용어로 오인해 바꾸지 않았다. 기존 native 이름표는 fontSize의 고정 비율로 위에 올려 실제 글리프 높이가 큰 경우 본문과 겹쳤다. 실제 NotoSansKR 렌더 높이로 이름표를 측정하고 글 상자 경계 위에 붙였다. 본문 영역과 이름표 영역은 최소8 logical units 이상 분리된다. 이름표 자체가 매우 길면 제한 영역에서 줄바꿈/스크롤하며 본문 공간으로 확장하지 않는다. 이름표와 본문은 화면 흔들림에 같은 transform을 적용한다.

다른 실제 결함도 수정했다.

- 휴대폰 가로 편집의 오래된 고정 grid 행/행 span/order 때문에 도구 줄이 무대의 재생 버튼을 가렸다. 편집 grid의 행 배치와 높이 제약을 정리했다. 여백을 넓히지 않고 요소가 각자의 행을 차지하며 페이지가 실제 내용 높이만큼 스크롤한다.
- compact 편집에서 닫힌 텍스트 보기 기능이 `display:none`으로 사라졌다. 읽기 모드의 시각 숨김과 편집 모드의 펼침 입구를 구분했다.
- 글 편집 영역을 접어도 빈 열이 남는 것을 단일 열로 바꿨다.
- 긴 선택지가 native 화면/글 상자를 침범할 수 있었다. 실제 이름표 위의 가용 높이에서 선택지 영역을 계산하고 해당 영역 안에서 스크롤한다. 본문·긴 이름표도 스크롤바로 추가 내용에 접근한다.
- 작품 메뉴·화면 설정이 함께 열린 상태를 방지하고 바깥 클릭/Escape로 닫는다. 입력 초안을 바꾸지 않으며 열린 dialog의 Escape 동작을 가로채지 않는다. 짧은 화면에서 설정 메뉴만 가용 높이 안에서 스크롤한다.

## 용어 보완

| 이전 이름 | 현재 이름/설명 |
|---|---|
| 현재 컷을 글자로 읽기 | 대사·해설 텍스트 보기 — 장면에 표시된 글을 읽거나 복사 |
| 작품 자료 편집 | 배경·인물 편집 |
| 인물 배치 편집 (무대 제목) | 장면 미리보기 |
| 연출 미리보기 | 이 컷부터 재생 — 실제 연출을 확인한 뒤 이 컷 편집하기로 복귀 |
| 보기·대본 도구 | 화면·대본 설정 |
| 화면 구도 | 미리보기 화면 비율 — 저작 배치를 바꾸는 기능과 구분 |
| 말하는 위치 | 장면 속 화자 — 이름을 표시할 인물 연결 |
| 글과 장면 더 보기 | 이 컷의 글·배경·연결 정보 — 배경은 자산 ID 대신 실제 이름 표시 |
| 점수·사용 조건 | 점수 변화·표시 조건 — 조건 미충족이면 선택지가 화면에 나타나지 않음 |
| 선택 결과 추가 | 점수 변화 추가 |
| 효과 변경 취소 | 마지막 효과 변경 취소 |
| 전환·분위기 변경 취소 | 마지막 전환·분위기 변경 취소 |
| 인물 전체 강조 초기화 | 인물 전체 밝기·투명도 초기화 — 반투명 표현도 복원하고 배치는 유지 |
| 지연 후 | 컷 시작 후 대기 |
| 빈 작품 시작 | 새 작품 생성 |
| 편집 패널 접기/열기 | 글 편집 영역 접기/열기 |

선택지 카드의 중복된 내부 펼침을 제거해 ‘선택 결과·표시 조건’을 한 번 열면 점수 변화/조건을 편집한다. 검색 도움말은 새 이름과 이전 이름의 alias를 연결한다. 원고·화자명·ID·Flow·StageComposition·파일 값은 명칭 변경으로 수정하지 않는다.

## 계약과 검사

StoryDocument/archive/workbook/JSONB 버전과 저작 필드는 유지한다. RuntimeScene도 유지한다. `sceneRendered`에는 선택적 진단 `dialogueRects: {speaker, body}`와 `choicesRect`를 추가했다. 이전 report도 허용하고 새 rect는 runtime-contract에서 검사한다. 별도 Web 장면 렌더러나 StoryDocument 직접 전달은 없다.

근거는 `evidence/ui-clarity/`에 새로 보관하며 이전 승인 개편 검증을 덮어쓰지 않는다.

- [native geometry](evidence/ui-clarity/native-geometry.log): 실제 `.rpy`의 순수 배치 함수 검사. 긴 이름표와 선택지의 영역 분리.
- [단위/계약](evidence/ui-clarity/unit-final.log): 새 optional report 및 기존 저장/준비/편집 helper 회귀.
- [빌드](evidence/ui-clarity/runtime-build.log), [Web 빌드](evidence/ui-clarity/web-build.log), [타입](evidence/ui-clarity/typecheck-final.log), [lint](evidence/ui-clarity/lint-final.log).
- [실제 UI/native E2E](evidence/ui-clarity/e2e-final.log): 기존 승인 흐름과 이번 보완. PC1440, 태블릿768, 휴대폰390/가로844에서 실제 옹고집 원고·긴 이름·본문 분리와 실제 글자 표시 픽셀, 열려 있는 입력/버튼의 겹침, 긴 선택지 스크롤, 메뉴/자료 선택 창의 화면 경계와 닫기·적용 접근 검사.

접힌 details 내부 요소는 보이지 않는 검사 대상이므로 `checkVisibility`로 제외하며 실제 보이는 컨트롤을 검사한다. 의도적으로 두 줄 요약한 앞뒤 컷은 전체 글을 펼칠 수 있고, 이미지 미리보기의 crop은 텍스트/컨트롤 잘림과 구분한다. 삼성 실기기·모든 OS/접근성·모든 작품/주변 서비스 화면이 무결하다는 주장은 하지 않는다. 재현된 문제와 주요 동선의 해당 화면 크기 검증 범위다.

검사 중 pinned Ren’Py의 `scrollbars` 복합 viewport가 이 구성에서 글을 표시하지 않는 문제도 확인했다. 크기가 정해진 viewport와 독립적인 adjustment/vbar를 연결해 수정했으며, 이름표와 본문 모두 실제 글자가 렌더링되는 픽셀을 검사한다. 좌표 report 성공만으로 표시 완료를 주장하지 않는다. 수정 전의 실패 캡처·로그는 당시 기록으로 남긴다.

## 최종 실행 결과

후속 최종 빌드 검사18개가 모두 통과했다. [최종 빌드 E2E](evidence/ui-clarity/current-final.log), [Web 빌드](evidence/ui-clarity/current-build.log). 메뉴 외부 클릭도 실제 열린 DOM 상태를 기준으로 닫도록 맞췄으며, 해당 경로까지 포함한 반복 검사는 [최종 메뉴 검사](evidence/ui-clarity/menu-race-final.log)에 기록한다. 리뷰에서 제안한 종료 컷의 문서 순서 필터는 적용하지 않았다. Flow는 이전 컷으로 돌아갈 수 있어 문서 순서가 재생 순서가 아니며, 현재 컷을 포함해 끝내는 범위도 유효하다. 종료 컷 우회 시 유지된다는 설명을 명시하고 경로 한정 범위는 기존 후속 목표로 유지한다.

전달 자기 점검: 정확성4(실제 native 좌표·글자 픽셀·빌드 E2E), 완결성4(주요 편집 동선4화면 검사, 실기기/주변 서비스 전체 검증은 남음), 명료성4(대상·실행 결과·범위 명시), 실행 가능성4(현재 코드 적용과 원고 재열기), 간결성4(현행 문서 연결과 증거 분리), 평균4.0. 후속 개선은 삼성 실기기/보조 기술 검사와 새 기능을 추가할 때 같은 경계·클릭 회귀를 유지하는 것이다.

종료 컷 입력 재점검: 종료 범위가 설정된 효과는 접힌 요약에도 ‘종료 컷까지 유지’라고 표시한다. 종료 컷 지정 없음은 ‘종료 컷 지정 안 함 · 계속 유지’로 설명한다. 시작 컷·종료 컷·분기 예외를 같은 영역에 묶고 grid 한 행을 사용한다. min-width와 select 폭을 제한하며 전체 여백을 늘리지 않는다. 연출 안내도 실제 버튼 이름 ‘배경·인물 편집’과 일치하도록 수정했다.

추가 검사는 종료 범위 입력의 태블릿768·휴대폰390·가로844 경계, 컷 이동 후 이전 컷의 효과 취소가 적용되지 않는 동작, 저장·파일 내보내기·재열기, 실제 Ren’Py의 종료 컷 포함 및 다음 컷의 해당 효과만 종료를 포함한다. 숨겨진 iframe body의 visibility를 런타임 준비 조건으로 사용한 검사 오류는 attached 확인과 sceneRendered 응답 확인으로 교정했다. [현재 실행 로그](evidence/ui-clarity/current-follow-up.log), [타입](evidence/ui-clarity/current-typecheck.log), [lint](evidence/ui-clarity/current-lint.log).

현재 추가18개 검사 중17개가 통과하고 휴대폰 작품 관리 메뉴의 Escape 닫기가1개 실패했다. native details의 toggle 이벤트가 React 상태보다 먼저 보일 수 있어, Escape는 실제 열린 details를 읽고 DOM과 상태를 함께 닫도록 고쳤다. 해당 메뉴·이미지 선택 검사만 PC1440·휴대폰390·가로844에서 각각3회 반복해9개 모두 통과했다. [반복 검증](evidence/ui-clarity/menu-race-fixed.log). 첫 실패 로그도 보존한다.

최종 빌드 기준 E2E25개, TypeScript 전체6 workspace, 변경 코드 lint, 단위/계약26개, native 배치 함수2개가 통과했다. E2E의 native 이름표 검사에는 실제 글자 표시 픽셀 확인을 포함한다. [수정된 실제 화면](evidence/ui-clarity/viewpoint-fixed.png), [좌표와 글자 픽셀](evidence/ui-clarity/viewpoint-fixed-geometry.json), [재현 캡처 소스](../../spikes/renpy-web/verify-ui-clarity.mjs): 원래 화자 이름·본문 그대로 표시되며 이름표/본문 rect 간격은14 logical units, 본문 영역의 실제 글자 픽셀425개를 확인했다. 이는 문구의 OCR 검사나 모든 기기·모든 작품의 무결성 증명이 아니다.
