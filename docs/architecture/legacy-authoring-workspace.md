# 레거시 저작 UX 재사용 — 장 대본·화자·이미지 자료실

기준일: 2026-10-06. 읽기 전용 참조는 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`다. 현재 레거시 checkout 상태를 기준으로 삼지 않았다. Next의 StoryDocument와 Runtime Core → Ren'Py 구조를 유지하며 저작 흐름을 재사용한다.

## 조사와 분류

| 레거시 기준 경로·동작 | 분류 | Next 적용과 비교 |
|---|---|---|
| `app/StoryStudio.tsx`: 장 대본/선택 컷, chapter summary·화자·자원 목록, 컷 이동 | REFINE | `ChapterWriter`의 ‘이 장 대본’과 ‘현재 컷 꾸미기’ 전환. 제목·개요·장 화자·장 기본 자료와 자원 pool을 직접 편집한다. 같은 현재 컷 ID로 무대와 대본이 연결된다. |
| `app/components/CutNavigation.tsx`: 이전/다음, 대사/해설 추가, Alt+좌우 IME/dialog guard | PRESERVE/REFINE | 단축키 guard를 실제 이식했다. 현재 장의 컷 이동과 typed 추가를 제공하고 복제·순서·장 이동·삭제를 확장했다. |
| `app/components/SceneFocusEditor.tsx`: 현재 이름+장 화자의 unique dropdown, 이름/이미지 별개 안내 | PRESERVE/REFINE | `StorySpeakerControls`의 등록 화자 선택, 장/작품 화자, 기본 이미지 설정. 이름 선택은 배우나 배치를 바꾸지 않는다. 이미지를 무대에 적용하는 버튼과 말하는 actor 선택을 분리했다. |
| `app/components/SceneFocusEditor.tsx`: 친숙한 이미지 명칭, 장에서 고른 자료 우선 | REFINE | `AssetPickerField`, 장의 characterAssetIds/backgroundAssetIds pool과 현재 자산·같은 인물 추천 순서. 썸네일 버튼이 주 진입점이고 이름 select는 호환/보조 선택으로 남긴다. |
| `app/assets/asset-query.ts`: FACETS, facet label, 한국어 동의어, AND/OR, 품질 기준 | PRESERVE 구현/REFINE adapter | `asset-registry/src/asset-query.ts`에 실제 함수/상수 로직을 옮겨 기존 normalized 필드를 Asset.metadata에서 읽는다. 예: ‘놀부 화난’ 다단어·동의어 검색, 조건 내 OR와 조건 사이 AND. 현재 사용한 숨김 자산은 확인용으로 보존한다. |
| `app/assets/asset-ranking.ts`: 현재/같은 인물/장 자료/primary/favorite/recent 가중치 | PRESERVE/REFINE | 가중치 기반 정렬과 최근 사용 순서를 실제 이식했다. 새로운 중복 registry는 만들지 않는다. |
| `app/components/assets/AssetBrowserDialog.tsx`: pending 선택, 현재/미리보기, facets 조건 개수, removable chips, favorite/recent, 취소 | PRESERVE UX/REFINE shell | 두 이미지 비교·적용 대상·같은 인물의 다른 모습·장 자료·모든 조건 해제를 재사용한다. 수동 portal/focus trap은 native dialog의 modal/Escape/focus로 바꿨다. |
| 레거시 DOM StoryStage/Player·효과 렌더 | REBUILD 경계 유지 | 복사하지 않는다. 자산 thumbnail은 탐색만 하고 작품 무대는 동일 Ren'Py iframe이다. |
| 레거시 `storygame*` 저장키 | RETIRE Next 쓰기 | 건드리지 않는다. 즐겨찾기·최근 사용은 `knolstory-asset-preferences-v1`에만 기록한다. |

비교 검증은 위 고정 소스의 JSX·행동·함수와 Next의 실제 UI 동작을 대조한 의미 검증이다. 레거시 서비스 전체를 실행한 픽셀 일치 검증으로 주장하지 않는다. Next의 [대본 desktop](evidence/legacy-authoring/manuscript-desktop.png), [대본 phone](evidence/legacy-authoring/manuscript-phone.png), [자료실 desktop](evidence/legacy-authoring/assets-desktop.png), [자료실 phone](evidence/legacy-authoring/assets-phone.png)을 함께 확인했다.

## 저작과 보존 계약

- 대본은 선택 컷만 상세 입력하고 다른 컷 원문은 줄바꿈 목록으로 보여 준다. 장 제목·개요·화자/기본 이미지를 바꾸어도 명시 StageComposition 컷은 유지된다. 장 기본과 현재 컷에 적용하는 picker label/대상을 구분한다.
- 컷 복제는 글·자산·구도·연출·도착지를 보존하고 choice ID를 새 컷 기준으로 재생성한다. 장 사이 이동은 먼저 해석한 인물·배경을 snapshot해 다른 장 기본값으로 외관이 바뀌지 않게 한다. 컷/장 ID와 분기 도착지는 유지한다.
- 삭제 안내는 들어오는 명시 연결 수와 순서 진행 영향을 표시한다. incoming 명시 연결은 `""` 연결 대기로 바뀌며 마지막 작품 컷은 삭제하지 않는다. 삭제 직후 전체 이전 프로젝트를 되돌릴 수 있다. 이후 다른 작품 내용을 수정하면 이 복원은 종료되며 dialog에서 안내한다. 기기 재실행까지 보장하는 영구 checkpoint 기능은 아니다.
- 화자 등록은 StoryProject.characters의 identity·기본 이미지와 speakerNames/장 목록을 사용한다. 기본 이미지 명시 적용은 선택 쪽 첫 actor의 key·위치·배율·방향·depth를 보존하며 characterKey를 연결한다. 같은 인물의 그림 변형을 바꾸어도 name/identity/다른 배우/flow를 변경하지 않는다.
- ‘나’/화면 밖 목소리, 인물 0명, 중앙·원본 방향과 직접 배율·좌표를 유지한다. 이미지 선택 dialog는 draft만 바꾸고 적용 때 한 번 기록하며 취소/Escape는 project를 바꾸지 않는다.
- 초기 기기 읽기가 끝나기 전 입력을 막아 hydration과 typing이 섞이는 문제를 수정했다. 읽기 실패 후에는 편집과 파일 보관은 가능하고 기존 raw 기기 저장값은 쓰기 중지 상태로 보호된다.

## 인물 읽기 크기 — 추가 사용자 수정

사용자는 키가 작은 사람과 큰 사람의 차이를 매우 완만하게 하고, 글상자가 하반신 일부를 가리는 구도를 원한다고 정정했다. 앞 목표의 ‘발 전체를 글상자 위에 표시’는 현재 기본 정책이 아니다.

- 작은 사람·어린 자라의 과한 기본 축소를 제거하고 `.98`에 투명 canvas 여백 보정(최대 1.15)을 적용한다. 실제 신장을 추정하지 않는다. 일반 어른은 기존 1.0, 동물/소품과 중앙 탑승 복합의 특수 값은 유지한다. 저장된 scaleMultiplier는 그대로 곱한다.
- 기본 visible 발 기준은 558 논리 px로 dialogue top 510 아래에 놓아 하반신 일부를 가린다. 머리 영역은 top 8을 유지한다. [완화된 실제 아이/어른 화면](evidence/legacy-authoring/readable-stature.png)은 직접 지정한 .9 배율까지 유지한 사례다.
- 단위 테스트는 canvas rectangle의 키만 비교하지 않고 alpha painted height의 비율과 머리/하반신 가독성을 검사한다. 무조건 같은 키로 정규화하지 않으며, 이전의 `.62` 아이 축소보다 읽기 크기 차이를 크게 줄였다.

## 완료 기준별 직접 근거

| 기준 | 검증 |
|---|---|
| 고정 레거시 조사·기록·실제 재사용 | 위 분류표와 source citation, query alias/facet/ranking 단위 검사, 이식한 Alt guard. 새 대본/자료실 desktop·phone 실제 화면 비교. |
| 장 대본/현재 컷, 제목·개요·화자·자료, typed 추가·복제·정렬·장 이동·삭제 복원 | `editor-authoring.test.ts`의 불변·경계·flow disconnect 검사와 `legacy-authoring-workspace.spec.ts`의 1280/390 전체 UI 저작. 삭제 취소 무변경, 실제 삭제의 pending과 되돌린 전체 project 동일 검사. |
| 화자 identity/default image/무대 actor 연결과 변형 보존 | 화자 선택 직후 actors=[] 유지, explicit 기본 이미지 적용, same-character variant 교체 후 key/characterKey/position/scale/facing/name 보존, typed 대본의 화자 선택. |
| 썸네일 검색·분류·장 자료·현재·최근·즐겨찾기 | 6개 query tests와 preferences tests, UI search/작품·장소·시간·분위기 facet 조작·조건 reset, 장 자료/즐겨찾기/최근 view, same character·draft cancel·대상/비교 검사. |
| 적용/취소·장 기본/컷 범위와 구도 보존 | current chapter bg·pool 편집과 current actor variant의 다른 적용 대상, 취소 후 전체 project 동일, original/center/.9·분기 연결 유지. 기존 composition-intent E2E로 인물 없음/POV도 검사. |
| 저장·파일·native와 기존 4작품 | 새 대본 작품을 file import/reload 후 두 Ren'Py 선택을 직접 클릭해 독립 엔딩 도달, 같은 iframe·전체 project 동일. 기존 host/native 4작품 회귀로 내용·자산·분기·구도/연출을 검사. |

실기기 IME·성능·온라인 수업 운영·서재/표지/기획/숏스토리 등은 별도 마일스톤이다. 이번 완료를 전체 제품 출시 완료로 확대하지 않는다.

## 실행 결과

- 전체 단위/계약 테스트 **632개 통과**, 대상 TS coverage lines **99.78%**, statements **98.06%**, branches **95.47%**, functions **98.48%**. React UI와 Python 전체 coverage로 확대하지 않는다. 신규 query 7개, 편집 domain 9개, preferences 2개 테스트를 포함한다.
- 전체 host **28개 통과**, runtime 전용 skip 7개. 전체 stories-runtime **11개 통과**, host 전용 skip 13개. 새 통합 desktop/phone 저작과 facet/cancel UI 4개, native 양쪽 엔딩 1개를 포함한다.
- 친숙한 이미지 표시 이름 적용 후 새 host 4개와 native 1개를 재실행했고, 최신 인물 크기 조건의 composition native도 별도로 통과했다. 명시 incoming 연결 1개 삭제→pending→전체 이전 project undo, 장 이동 구도 유지, 같은 인물 variant identity/배치 유지와 file reload를 직접 확인했다.
- 마지막 화면 정리에서는 컷 복제/이동/삭제 조작을 접고, 컷 선택 시 대본 내부 스크롤만 이동해 활성 입력을 보여 준다. 글 입력 중에는 선택 ID가 같아 자동 스크롤하지 않는다. 이 상태에서 새 host 4개/native 1개를 다시 통과했고 실제 native 대본 화면을 저장했다.
- 타입 검사·린트·정적 build·diff 공백 검사 통과. 사용량 제한으로 후속 리뷰/통합 테스트 에이전트가 중단돼 주 작업자가 직접 통합 소스·실제 이미지·테스트를 점검했다. 독립 후속 리뷰 완료로 기록하지 않는다.
- 첫 회귀의 typing/hydration 겹침은 앱 입력 준비 guard로 수정했다. 기존 모바일 테스트의 ‘화자 이름’은 새 화자 등록 입력과 구분해 exact label로 선택했다. 편집 중 소스 HMR이 테스트 상태를 바꾼 실행은 증거로 쓰지 않고, 소스가 고정된 전체 host/native 실행 결과를 사용했다.
