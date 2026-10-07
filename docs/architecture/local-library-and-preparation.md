# 로컬 서재와 작품 준비

## 구현 범위

현재 Next의 StoryDocument v5, cover/planning/creativeMemos, 이미지 자료실, 기기 저장과 .knolstory 음원 첨부를 재사용한다. `/`의 첫 진입은 로컬 서재다. 내 작품·가져온 작품·기본 예제를 구분하고 제목·소개·표지 썸네일·지은이·최근 수정 시점을 표시한다. 새 작품과 파일 가져오기는 준비 화면으로 연결된다. 기획을 비워도 ‘이 장 대본 쓰기’로 바로 이동할 수 있다.

기본 표지는 기존 theme/layout/backgroundId/characterId와 작가/부제/작가의 말을 사용한다. 서재 그림은 관리용 썸네일이며 게임 시작 표지나 이야기 렌더러가 아니다. 기본 표지 변경은 cover.design/composition/presetId와 기존 장·컷·자산·직접 배치·분기·연출·음원을 보존한다. 기존 고급 디자인은 현재 기본 썸네일과 픽셀 일치하는 것으로 주장하지 않는다.

기획은 핵심 아이디어·주인공·목표·갈등·시작·전개·마무리를 우선 제공하고 기존 나머지 필드는 ‘기획 더 적기’에서 접근한다. 창작 메모는 전체 작품/장/컷과 기존 다중 링크·필드를 보존하며 연결 위치 버튼에서 현재 컷 편집으로 이동한다. 사용자가 연결을 명시적으로 바꾸면 한 위치로 바뀐다는 안내를 제공한다. 편집에서 ‘작품 준비’로 메모를 다시 확인할 수 있다.

## 저장과 위치 계약

`knolstory-next-workspace-v1`의 기존 document/works/storyId/lineId/mode/playback 필드를 유지하고 선택적 workspaceVersion2, view와 작품별 contexts를 추가했다. 이전 기기 저장은 읽고, 원본 StoryProject 전체를 그대로 보관한다. 이전 형식은 현재 작품 위치만 존재하므로 다른 작품의 위치를 만들어냈다고 주장하지 않는다. 새로운 작품별 위치는 편집 컷·대본/꾸미기·활성 도구·대본 장·구도 보기와 읽은 path/choiceHistory를 따로 보관한다. 준비 화면·서재·편집의 새로고침도 해당 view를 복원한다.

손상되거나 미래 버전의 저장을 읽으면 원본 raw를 덮지 않고 자동/수동 기기 저장을 중지한다. 파일로 보관하는 복구 작업은 가능하다. 레거시 `storygame*`와 IDB `nolstory-workspace-v1`은 쓰지 않는다. 동일 project.id를 서재에서 다시 가져오면 원본을 덮지 않고 이미 있는 작품을 열도록 안내한다. 기존 직접 편집 호환 경로 `?view=editor`는 예전 편집/왕복 회귀의 진입점으로 유지하며, 그 경로의 동일 파일 재가져오기 동작도 기존대로 유지한다.

기본 예제 카드의 편집/준비는 새 project.id의 내 사본을 만든다. 읽기 슬롯은 그 새 작품과 원작의 id로 분리된다. 서재에서 이어읽기는 마지막 읽기 경로를, 편집하기는 마지막 편집 위치를 연다. 준비 메타데이터만 변경해도 읽기 저장이 변경 경고를 만들던 fingerprint는 재생 내용 중심 playback-v2로 개선했다. 기존 fingerprint도 현재 내용과 일치하면 읽고, 실제 대본/분기/구도/음원이 바뀐 저장은 기존 호환 확인을 유지한다.

Ren’Py는 처음 편집/읽기를 열 때 시작하고, 서재·준비로 돌아갈 때도 같은 iframe을 유지한다. 처음에는 display:none으로 보관해 실제 엔진의 GL2 resize가 0으로 나누는 오류를 재현했다. 수정 후에는 양수 크기의 무대를 화면 밖에 보관하고 visibility/inert/aria-hidden으로 표시·입력·접근성 탐색을 차단한다. 서재·준비에서는 edit scene으로 오디오를 멈추고 별도 renderer를 만들지 않는다.

## 재사용 분류와 발견한 문제

고정 레거시 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`의 `docs/design/library-direct-entry.md`, `app/components/CreativeMemoEditor.tsx`, 관련 표지/메모 모델을 읽기 전용으로 참조했다.

| 동작 | 분류 | 현재 적용 |
|---|---|---|
| 출처를 구분하고 읽기/편집에 직접 진입 | PRESERVE/REFINE | 내 작품·가져온 작품·기본 예제 카드, 별도 시작/이어읽기/준비 |
| 기본 표지·작품 정보와 기획 데이터 | PRESERVE/REFINE | 모델과 자산 ID 그대로, 기본 입력으로 정리, 고급 데이터 보존 |
| 전체/장/컷 메모와 연결 이동 | PRESERVE/REFINE | 다중 필드·링크 보존, 명시적 재연결 안내, 현재 컷 이동 |
| 기존 select의 작품 전환이 첫 컷으로 초기화 | REFINE | 작품별 편집 위치와 읽기 경로 분리 |
| 메타데이터 수정 때문에 읽기 슬롯 경고 | REFINE | 재생 내용 fingerprint와 이전 저장 읽기 호환 |
| 숨긴 iframe 크기 0으로 엔진 실패 | FIX | offscreen 양수 크기, 동일 인스턴스·입력 차단 |
| DOM 이야기 무대 | 재사용하지 않음 | Core→동일 Ren’Py 유지 |

## A–F 근거

`tests/e2e/local-library.spec.ts`는 설치된 Chrome에서 내 작품 두 개를 UI로 만들고 앞 목표의 실제 자산12컷 작품을 파일로 가져온다. 작품 정보·기본 표지·기획·세 범위 메모를 쓰고 연결 컷으로 이동한 뒤 기존 대본에서 두 컷을 작성한다. 세 작품을 서재에서 다시 열고 편집 위치를 확인한다. 새로고침 후 파일을 내보내고 새 browser context에 가져와 project 전체와 음원 bytes를 비교한다. 실제 Ren’Py에서 B갈래/슬롯/서재 복귀/reload/이어읽기/글 수정 후 재읽기, 두 내 작품의 독립 읽기 위치도 확인한다. 숏스토리 진입 뒤 iframe0개를 검사한다.

별도 host 검사는 기획 없이 바로 쓰기, 기존 workspace 작품/선택 컷/음원과 legacy key 보존, 손상된 raw를 그대로 둔 새 작품의 파일 보관을 검사한다. 이전 대본/꾸미기/읽기 전체 회귀도 별도 실행한다.

- [서재 PC](evidence/local-library/library-desktop.png), [태블릿 크기](evidence/local-library/library-tablet.png), [휴대폰](evidence/local-library/library-phone.png)
- [작품 준비 PC](evidence/local-library/preparation-desktop.png), [태블릿 크기](evidence/local-library/preparation-tablet.png), [휴대폰](evidence/local-library/preparation-phone.png)
- [새 작품 · 달빛 편지](evidence/local-library/moonlight-letter.knolstory), [새 작품 · 바다 이야기](evidence/local-library/sea-story.knolstory), [기획·메모가 추가된 실제 분기 작품](evidence/local-library/forest-library.knolstory)
- [가져온 작품 실제 Ren’Py 읽기](evidence/local-library/imported-native-reading.png)

## 한계

Chrome PC/태블릿/휴대폰 viewport 검사다. 실제 Windows·Chromebook·Android 하드웨어·스피커·IME 성능은 별도 목표다. 계정/학급/과제/제출/공유/클라우드와 고급 표지 도구·게임 시작 표지는 추가하지 않는다. 동일 작품 ID의 별도 사본 가져오기는 지원하지 않고 현재 원본 보호를 우선한다. 고급 표지의 데이터 보존과 기본 썸네일 표시를 구분한다. 독립 후속 리뷰가 사용량 제한으로 중단되어 주 작업자가 저장 경계·내용 보존·runtime lifecycle과 검사 결과를 직접 검토했다.

기본 표지 제목은 밝은 그림에서도 읽을 수 있도록 종이색 패널/잉크색 글자로 보정했다. 기본 예제 사본 생성과 동일 ID 파일 재가져오기 원본 보호를 별도 host E2E로 확인한다. 새로 작성한 표지·기획·메모 작품도 별도 브라우저에 가져와 project 전체 동일성을 비교한다. [발견 문제와 전후](evidence/local-library/issues.json)를 보관한다.

## 완료 감사와 검토

A는 실제 UI의 내 작품2개+가져온 작품1개와 예제4개 카드/재진입으로, B는 정보/기본표지/기획/전체·장·컷 메모→연결컷→대본2컷 작성으로 검증한다. C는 내 작품별 편집 컷·읽기 위치와 실제 native B갈래 슬롯/서재/reload/resume로 검증한다. D는 새 달빛 작품과 기존12컷 작품 모두 새로고침 뒤 내보내고 별도 Chrome context에 가져와 project 전체/음원 첨부 동일성을 비교한다. E는1280×900/1024×768/390×844 실화면과 기존 대본·꾸미기·Ren’Py·숏스토리 회귀로 검증한다. F의 검사 집계와 실제 파일·화면·문제/제한을 이 문서와 evidence에 보관한다.

기존 단위 검사·host/native의 직접 editor 경로는 `?view=editor`를 사용한다. 새 사용자 서재 흐름은 query 없는 `/`에서 별도로 실행한다. 기존 회귀를 서재 진입 검증으로 확대해 주장하지 않는다. 병렬 실행의 기본 Playwright output 삭제 때문에 trace ENOENT가 발생한 초기 실행은 통과 근거로 사용하지 않고, 이후 모든 실행은 별도 output 디렉터리로 분리했다.

자체 평가: 정확성4/5(실제 Chrome/native·전체 보존 비교, 독립 리뷰 중단), 완결성4/5(A–F와 기존 회귀 연결, 실기기는 제외), 명확성4/5(모델 재사용·위치/읽기 분리 설명, 기존 직접 진입 유지), 실행 가능성5/5(3개 가져올 파일과 실행 검사), 간결성4/5(기존 구조의 단일 검증 문서). 평균4.2/5. 의미 있는 후속 변경 때 독립 리뷰를 다시 수행하고, 이번 목표의 완료 이후 취향만으로 새 서재/준비 범위를 넓히지 않는다.


## 최종 검사 집계

- `pnpm test:coverage --maxWorkers=1`:39파일 **720개** 통과. lines98.12%, statements93.49%, branches91.10%, functions95.18%.
- 최종 전체 host **43개**, 실제 Ren’Py stories-runtime **19개** 통과. host14/native19 skip은 반대 프로젝트 경로 제외로 해당 프로젝트에서 실행했다. 추가된 예제 사본/중복 파일 보호 host 및 강화된 별도 Chrome 파일 복원1개도 통과했다.
- 실제 runtime DPR1/1.5/2 **3개**, 타입 검사·린트·정적 build·diff 공백 검사 통과.
- [최종 검사 결과](evidence/local-library/verification-results.json), [A–F 완료 감사](evidence/local-library/completion-audit.json), [실제 Chrome 보고](evidence/local-library/run-summary.json).

검사 출력은 각 실행의 별도 output 디렉터리에 분리했으며, 초기 실패/진행 중 HMR/중단 실행은 최종 통과 근거에 포함하지 않는다. 최종 서재·준비 CSS의 작은 제목 대비 수정은 강화된 실제 Chrome 전체 작성/왕복/재생 화면을 다시 실행해 검증했다. Ren’Py presenter나 새 이야기 파일 형식은 수정하지 않았다.

## 첫 접속·재접속 구분에 대한 정정 (2026-10-08)

위 `/`의 서재 진입은 현재 Next 구현을 설명한다. 기존 놀스토리와 동일한 전체 첫 진입 흐름을 완료했다는 뜻은 아니다. 사용자 확인 및 고정18da4fc의 `StoryStudio.tsx`/`story-landing-visit.ts` 확인 결과, 최초 접속은 책 소개 home, 방문 기록이 있는 재접속은 서재 library가 기본이며 이후 저장된 탐색 위치 복원도 있다. Next에는 아직 책 소개 첫 화면과 방문 구분이 없다. 책 소개 home, 서재, 개별 작품의 표지/게임 시작 화면을 서로 구분해 후속 작업에서 연결한다. 방문 기록은 작품 파일과 분리하고 레거시 저장 키는 변경하지 않는다.
