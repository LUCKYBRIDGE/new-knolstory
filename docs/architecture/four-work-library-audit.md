# 네 작품 중심 서재와 전체 기능 비교 감사

기준일: 2026-10-09. 이 문서는 사용자가 제공한 `goal-objective.md`의 5번 범위를 중심으로 현재 `new-knolstory`와 고정 레거시 `story-maker@18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`, 그리고 사용자가 기억하는 과거 서재 `story-maker@906885d`를 대조한 초기 감사다. 코드 수정은 하지 않았고, 현재 작업 트리의 미커밋 변경도 실제 현재 상태로 읽되 따로 표시한다.

## 조사 범위

- 프로젝트 기준 문서: `AGENTS.md`, `STATUS.md`, `README.md`, `DESIGN.md`, `docs/architecture/development-blueprint.md`, ADR 0002/0005/0007/0008/0009/0010/0011/0014/0015.
- 완료/검증 문서: `representative-story-verification.md`, `legacy-authoring-workspace.md`, `responsive-audio-authoring.md`, `vn-workflow-verification.md`, `local-library-and-preparation.md`, `book-entry-and-cover.md`, `existing-story-enhancement.md`, `library-book-design-parity.md`, `reproducible-test-environment.md`.
- 현재 소스: `apps/web/components/story-workspace.tsx`, `local-bookshelf.tsx`, `library-book-focus.tsx`, `book-introduction.tsx`, `book-start.tsx`, `workspace-management.tsx`, `apps/web/app/shortstory/shortstory-workspace.tsx`, `apps/web/lib/*`, `packages/compatibility/src/*`, `packages/runtime-core/src/*`, `server/README.md`, 관련 E2E/unit tests.
- 레거시 소스: `StoryStudio.tsx`, `StoryDiscovery.tsx`, `story-library-editions.ts`, ShortStory v1/v2 library files, authoring/player/storage/server components. `906885d`는 `StoryDiscovery.tsx`/`globals.css` 중심의 compact focus-stage shelf commit이고, `18da4fc`는 이후 원작/놀스토리/숏스토리 판본 구분이 들어간 baseline이다.
- PR 상태: `codex/book-entry-cover`는 로컬 `9170572`이고 PR #1은 draft/open, merge state clean, 최신 두 CI check가 success다. 로컬 작업 트리에는 다른 작업자가 만든 것으로 보이는 미커밋 변경과 untracked 파일이 많다. 이 감사 파일 외의 변경은 되돌리거나 수정하지 않았다.

## 레거시 서재 구조 비교

`906885d`의 `StoryDiscovery`는 `baseBooks` 네 권을 직접 정의하고, `shelfLayout`을 5x2, 3x3, 2x3 수준으로 잡아 책 선택 뒤 focus overlay에서 행동을 드러내는 구조다. 이 커밋의 핵심은 "네 작품 중심 서재"와 "책 선택 뒤 action"이다. 단, 그 시점에는 `SelectedBook`의 base item이 원작/놀스토리/숏스토리 판본을 직접 품지 않았고, ShortStory는 별도 short book 목록으로 취급됐다.

`18da4fc`의 `StoryDiscovery`는 `availableLibraryEditions(theme)`를 통해 `original | knolstory | shortstory` 판본을 정의한다. `story-library-editions.ts`는 흥부의 v2 shortstory availability를 조건부로 두고 나머지는 세 판본을 열 수 있게 한다. `StoryStudio.tsx`는 `onReadEdition`, `onCopyBase(theme, edition)` 등 판본-aware 동작을 갖고, 계정/학급/과제/제출, ShortStory provider, 공유 HTML, 서버 저장까지 같은 앱 안에 있었다. Next는 이 구조를 전부 복사하지 않고 StoryDocument/Core/Ren'Py 경계에 맞춰 재구성해야 한다.

현재 Next의 미커밋 소스는 `BUILTIN_WORKS`와 `groupBuiltinWorks()`로 여덟 실제 문서 ID를 네 화면상 책으로 묶는다. `BUILTIN_WORKS`는 표시 제목이 아니라 실제 원작 document ID와 놀스토리 document ID로 매칭한다. `LocalBookshelf`는 기본 섹션을 `기본 작품`으로 바꾸고, `LibraryBookFocus`는 원작 읽기/놀스토리 읽기/숏스토리 읽기/편집하기를 책 선택 뒤에 노출한다. ShortStory도 `/shortstory/?work=<id>&mode=read` query를 읽어 네 작품 원본 그림책을 여는 경로가 연결됐다. 이 방향은 목표 2의 핵심과 맞지만, 아직 대부분 미커밋 상태라 PR 기준 완료 주장은 최종 테스트와 review packet에 의존한다.

## 영역별 감사

| 영역 | 현재 분류 | 레거시/현재 근거 | 사용자 영향 | 완료 조건 |
|---|---|---|---|---|
| 첫 방문 소개, 재방문 서재, 서재 복귀 | 구현됨 | `StoryWorkspace`가 `loadLandingVisit`, `resolveEntryView`, `markLandingVisited`로 home/library/reload/direct editor를 결정한다. `BookIntroduction`과 `BookStart`가 별도 surface다. 문서 검증은 `book-entry-and-cover.md`, `library-book-design-parity.md`. | 처음 접속과 돌아온 접속의 의미가 분리되어 있고, 읽기/편집 뒤 서재로 복귀 가능하다. | 네 기본 책의 첫 방문 소개 -> 서재 -> 책 focus -> read -> 서재 복귀를 최신 미커밋 상태에서 다시 E2E로 확인. |
| 기본 서재의 네 작품 묶음 | 구현됨, 최종 검증 대기 | 미커밋 `apps/web/lib/builtin-works.ts`가 네 stable work ID와 8개 document ID를 정의하고 `groupBuiltinWorks()`로 묶는다. `LocalBookshelf`는 grouped works를 사용한다. `apps/web/lib/builtin-works.test.ts`와 `tests/e2e/four-work-library.spec.ts`가 추가되어 있다. | 서재는 네 권 중심 구조로 수렴했고 원작/놀스토리 ID도 제목 추측이 아니라 실제 문서 ID로 보존된다. | 해당 파일들을 commit 대상에 포함하고, 최종 test run 결과와 browser evidence를 root review packet에 붙인다. |
| 판본 선택: 원작/놀스토리/숏스토리/편집 | 구현됨, 최종 검증 대기 | `LibraryBookFocus`가 원작 읽기, 놀스토리 읽기, 숏스토리 읽기 링크, 바탕 판본 select, 편집하기를 제공한다. 원작/놀스토리는 `onOpen(key,'start')`로 실제 문서 key를 전달한다. 숏스토리는 `/shortstory/?work=<id>&mode=read`로 들어가며, ShortStory workspace가 query를 읽어 fixed original pack을 연다. | 사용자는 한 책 안에서 세 읽기 판본과 편집 사본 진입을 구분해서 고를 수 있다. | 네 작품 각각에서 원작/놀스토리/Ren'Py 첫 컷 진입, `/shortstory?work=...` 실제 그림책 진입, 판본별 resume 분리를 최종 확인. |
| 기본 작품 편집은 내 사본 | 구현됨, 최종 검증 대기 | `openLibraryWork()`는 fixture에 `edit|prepare|cover` intent가 오면 `copyPersonalWork()`로 새 `new:<id>` 사본을 만든다. `protectAuthoring()`은 기본 작품을 읽다가 편집/준비로 전환할 때도 사본 생성으로 보호한다. `four-work-runtime.spec.ts`가 원작 읽기 후 현재 컷 고쳐쓰기가 원본을 보존하는지 검사한다. | 기본 원고 보존 요구와 맞고, 읽기 중 "편집으로" 전환도 원본을 바꾸지 않는다. | runtime E2E pass와 evidence JSON/screenshot을 최종 완료 근거로 둔다. |
| 내 작품/가져온 작품 관리, 사본, 삭제/복구 | 구현됨, 최종 검증 대기 | `StoryWorkspace`에 `duplicatePersonalWork`, `deletePersonalWork`, `restorePersonalWork`가 있고, `PersonalLibraryTools`와 `personal-library.ts`가 삭제한 개인작품과 context를 복구한다. `LibraryBookFocus`는 own/imported에 사본 만들기/삭제 버튼을 노출한다. `personal-library.test.ts`가 import duplicate, copy identity, delete recovery context를 검사한다. | 기본 작품은 삭제되지 않고, 개인/가져온 작품은 사본·삭제·복구 흐름을 갖는다. | unit/E2E 결과로 사본, 삭제 확인, reload 후 복구, 기본 작품 삭제 불가, imported duplicate 독립성을 확인. |
| 작품 정보, 기획, 메모 | 구현됨 | `StoryPreparation`과 `story-preparation.ts`가 cover/info/planning/memo를 다루고 `local-library-and-preparation.md`에서 전체/장/컷 메모와 위치 이동 검증을 기록했다. | 사용자가 내 사본의 기획과 메모를 작성하고 컷으로 돌아갈 수 있다. | 네 작품 사본에서 준비 -> 메모 -> 컷 이동 -> 저장/reload 확인. |
| 대본, 장, 컷, 선택지, 분기, 합류, 엔딩, 현재 컷 고쳐쓰기 | 구현됨 | `StoryWorkspace`, `ChapterWriter`, `StoryFlowMap`, `StoryFlowContext`, runtime-core `authoring`, `editor-authoring`, `flow-analysis` 경로. `representative-story-verification.md`, `legacy-authoring-workspace.md`, `vn-workflow-verification.md`가 중첩 분기/합류/삭제 undo/native 재생을 기록한다. | 핵심 놀스토리 저작 경로는 레거시 의미를 보존하면서 Ren'Py로 연결된다. | 최신 서재 그룹 변경 후에도 기존 authoring/native 회귀가 통과하는지 확인. |
| 자산 검색, 분류, 즐겨찾기, 최근 사용, 화자/인물/구도 | 구현됨 | `asset-browser-dialog.tsx`, `asset-preferences.ts`, asset-registry query/ranking, `story-speaker-controls.tsx`, `story-composition-controls.tsx`. 문서 `legacy-authoring-workspace.md`가 레거시 asset query/facet/ranking 이식과 speaker identity 분리를 기록한다. | 현재 컷 꾸미기와 자료 선택 UX가 실제 자산과 연결된다. | 네 작품 사본에서 자산 변경/취소/저장/파일 왕복 확인. |
| 연출, 음악, 효과음 | 구현됨, 외부 생성 연동은 후속 | `responsive-audio-authoring.md`와 `existing-story-enhancement.md`가 chapter/cut audio, ambience, effects, user WAV/MP3/OGG, audioResources archive, Ren'Py playback을 기록한다. `audio-resources.ts`와 해당 tests에 5MB/file, 20MB aggregate 계약이 있다. | 내 작품과 기본 작품 강화본에서 음악/효과음 재생은 가능하다. ElevenLabs/Suno 등 생성 서비스 직접 통합은 현재 제품 기능이 아니다. | 최신 branch에서 관련 audio/native smoke를 재실행하고, 외부 생성물은 권리/출처 확인 전 product integration으로 주장하지 않기. |
| 자동 저장, 실패 복구, 파일 보관, 가져오기, 중복 보호 | 구현됨/부분 구현 | `workspace-storage.ts`는 `knolstory-next-workspace-v1`, contexts, preflight, raw 보호를 제공한다. `story-archive`/`portableStory`가 `.knolstory` archive를 담당한다. `acceptImported()`는 personal duplicate와 builtin identity를 보호한다. 개인작품 삭제 복구는 미커밋. | 일반 KnolStory 파일 왕복은 검증되어 있고, 새 개인작품 관리 강화는 추가 검증이 필요하다. | 같은 project ID import, builtin file import, corrupted storage, deleted recovery를 최신 UI로 검증. |
| 원작/놀스토리 읽기 기록과 이동 | 구현됨 | `player-saves.ts`는 `knolstory-player-v1`에 project ID별 slot과 playback fingerprint를 저장한다. `StoryWorkspace.resumeFor()`는 context playback과 player auto slot을 판본 key별로 조회한다. | 판본별 `project.id`가 유지되면 읽기 기록이 섞이지 않는다. | grouped shelf에서 원작/놀스토리 둘 다 읽고 각각 resume 버튼/slot이 분리되는지 확인. |
| 숏스토리 읽기 기록과 이동 | 구현됨, 최종 검증 대기 | `shortstory-originals.ts`는 `story-maker@18da4fc`의 네 fixed pack을 v1 `ShortStoryProject`로 projection한다. `ShortStoryWorkspace`는 `?work=<id>&mode=read`를 읽어 원본을 열고, `shortstory-library.ts`의 `knolstory-shortstory-library-v1`/positions/deleted/duplicate handling을 실제 UI에 연결한다. old single key는 backup 후 migration한다. | 네 작품 원본 그림책 읽기, 작품별 위치, 내 사본, 여러 그림책 보관, 삭제/복구, 파일 가져오기가 한 workspace 안에서 연결됐다. | `four-work-shortstory.spec.ts`, `shortstory-library.test.ts`, `packages/compatibility/tests/shortstory-library.test.ts` pass와 print/evidence를 최종 근거로 둔다. |
| Excel, Google 시트, 인쇄 | 구현됨, 제한 명시 필요 | KnolStory는 `StoryTransferPanel`과 `compatibility/story-table.ts`, `excel.ts`로 Next table xlsx/tsv/public Google TSV import를 제공한다. ShortStory는 `.shortstory`, Excel, TSV, public Google sheet, `window.print()`와 `data-shortstory-print` A4 article surface를 제공한다. 구형 8탭/4탭과 ShortStory future v2 file은 명시적으로 거부한다. | Next 형식의 왕복과 A4 인쇄는 가능하다. 계정 Google 쓰기, 구형 sheet 자동 변환, v2 activity document import는 현재 범위가 아니다. | 최신 UI에서 `.xlsx`, TSV, public Google TSV, ShortStory print를 검증하고, 범위 밖 항목은 user-facing 문구와 audit에 유지. |
| 공유 | 의도적 부분/후속 | ADR 0009는 offline HTML export를 retire하고 온라인 공유 링크로 전환한다. Server/online publication은 M8/M9 후속이다. | 사용자는 현재 파일 보관으로 이동해야 하며 공개 공유 링크는 아직 제품 완료가 아니다. | 서버/publication 정책 확정 후 공유 링크를 구현하고 권한/미디어 release gate를 통과. |
| 키보드, 초점, 동작 줄이기, 접근 가능한 텍스트 | 부분 구현 | `LibraryBookFocus` traps dialog tab and arrow navigation, `StoryWorkspace` mirrors reduced motion and keeps accessible player controls, ADR 0015 requires DOM semantic layer. 문서들은 keyboard/focus checks를 기록한다. 실제 screen-reader 사용자 검증은 별도. | 키보드와 reduced motion은 기본 지원되지만 NVDA/ChromeVox/TalkBack 실사용 검증은 완료 아님. | 대표 읽기/선택/서재/ShortStory에 대해 keyboard-only와 최소 screen-reader smoke를 따로 기록. |
| PC, 태블릿, 휴대폰 가로/세로 | 구현됨, 실기기 제외 | 다수 문서가 1280/1024/390/844/320 viewport와 Chrome/Chromium 검증을 기록한다. `reproducible-test-environment.md`는 실제 Windows/Chromebook/Android 물리기기 검증을 제외한다. | responsive browser viewport는 검증됐지만 학교 실기기 성능/IME/audio는 남았다. | 학교 Windows PC, Chromebook, Android tablet/phone에서 실제 입력/성능/소리 QA. |
| 계정, 온라인 저장, 학급, 과제, 제출, 공개 권한 | 누락/후속 서버 | 현재 `server/README.md`는 backend ownership만 선언한다. ADR 0011은 서버 재사용 추천안을 proposed로 두고, STATUS도 소유자 확정 전 서버 결정을 미확정으로 둔다. 레거시에는 `StudentSpace`, `TeacherAssignments`, `SubmissionReader`, `OnlineStoragePanel`, `server/src/documents.ts` 등이 있었다. | 로컬 읽기/편집/보관은 되지만 교실 운영 제품은 아직 아니다. | M8 서버 계약, auth/roles/classes/assignments/submissions/publication API, ownership validation, E2E로 별도 완료. |
| 오프라인 HTML export, 두 번째 Web story player, legacy storage 자동 이전 | 의도적 폐기/제한 | ADR 0009/0010/0014와 AGENTS guardrail이 금지한다. Story playback은 Runtime Core -> Ren'Py, ShortStory만 Web/CSS 예외다. | 기존 HTML export 기대가 있다면 제품 방향과 다르다. 파일 이동은 `.knolstory`/`.shortstory`를 사용한다. | 복원하지 않는다. 공유 링크/파일 백업 경로로 사용자 안내와 검증을 유지. |

## 실제 실행 경로 요약

현재 첫 진입은 `StoryWorkspace`가 localStorage의 `knolstory-next-workspace-v1`, `knolstory-landing-visit-v1`, navigation type, `?view=editor`를 읽어 `home | library | editor | prepare | book | cover`를 고른다. `home`은 `BookIntroduction`, `library`는 `LocalBookshelf`, 선택 dialog는 `LibraryBookFocus`, book start는 `BookStart`, 실제 읽기는 같은 parked editor shell의 persistent `/runtime/index.html` iframe으로 이어진다.

기본 작품 데이터는 `representativeStories` 네 놀스토리 fixture와 `classicStories` 네 원작 fixture에서 온다. 현재 미커밋 grouping은 이 여덟 문서의 `project.id`를 기준으로 네 shelf book을 만든다. 원작/놀스토리 버튼은 실제 edition key를 전달하므로 Ren'Py 읽기 경로는 유지된다. 편집/준비/표지 편집 intent는 기본 작품이면 `copyPersonalWork()`로 새 `new:<uuid>` 사본을 만든 뒤 진행한다.

ShortStory는 Web/CSS 예외 경로지만 네 작품 서재와 연결됐다. `/shortstory`는 `ShortStoryWorkspace`가 `?work=<id>&mode=read`를 읽어 fixed original pack을 열고, `knolstory-shortstory-library-v1`에 개인 그림책과 읽기 위치를 저장한다. 원본 읽기는 library `books`를 늘리지 않고 positions만 기록하며, `mode=edit` 또는 "내 사본으로 쓰기"는 원본을 복사해 개인 그림책으로 보관한다. `.shortstory`/Excel/TSV/public Google TSV/A4 print도 같은 workspace에서 처리된다.

## 우선순위와 의존성

1. P0 완료 조건: 네 작품 grouping 파일과 tests를 포함한 현재 미커밋 단위를 root가 최종 diff로 확정하고, 4권 shelf + 원작/놀스토리/숏스토리 action + 판본별 resume/file/export test 결과를 기록한다.
2. P0 완료 조건: ShortStory four originals, v1 projection, multi-book library, old single key migration, unsupported v2 rejection, storage failure blocking, A4 print 결과를 `four-work-shortstory.spec.ts`와 unit tests로 확정한다.
3. P1 완료 조건: 각 작품에서 원작 읽기, 놀스토리 읽기, 숏스토리 읽기, 읽다 편집하기 보호 사본, 준비/표지 사본, 서재 복귀를 한 번씩 확인하고 저장 위치가 섞이지 않는지 검사한다.
4. P1 완료 조건: 개인작품 관리 회귀로 사본 만들기, 삭제 확인, reload 후 복구, 기본 작품 삭제 불가, imported duplicate 독립성을 통과시킨다.
5. P1 완료 조건: Excel/Google/print smoke는 Next table과 ShortStory table/print의 현재 지원 범위에서 확인한다. 구형 8탭/4탭, 계정 Google writeback, ShortStory v2 activity import는 이번 기능 완료 조건에 넣지 않는다.
6. P2 완료 조건: keyboard/focus/reduced-motion은 자동·browser smoke로 재확인하고, screen-reader와 학교 대상 물리기기 QA는 별도 release gate로 둔다.
7. P2/M8 완료 조건: 계정·학급·과제·제출·공유는 서버 계약, auth policy, publication policy, media rights approval이 정해진 뒤 별도 milestone에서 완료한다.

## 남은/보류 항목의 단위

- 서버/계정 단위: auth, role, class roster, assignment, submission, public link permission은 `server/README.md` ownership만 있고 제품 구현은 아직 없다. ADR 0011이 proposed라 정책 확정이 선행 의존성이다.
- 공유 단위: offline HTML export는 ADR 0009에서 retire됐으므로 복원 대상이 아니다. 공개 공유는 온라인 publication과 권한 정책 완료 뒤 판단한다.
- 파일/시트 단위: Next xlsx/tsv/public Google TSV와 ShortStory xlsx/tsv/public Google TSV는 현재 범위다. 구형 legacy 8탭/4탭 자동 변환, Google 계정 writeback, ShortStory future v2 activity document import는 명시적 후속/비범위다.
- 인쇄 단위: ShortStory A4 print는 current scope다. KnolStory Ren'Py 장면이나 일반 StoryDocument 전체를 A4 책으로 찍는 기능은 현재 완료 범위가 아니다.
- 권리/미디어 단위: 외부 생성 오디오·이미지의 상업 이용 가능 여부와 공개 배포 승인은 기능 구현과 별도의 release policy gate다.

## 이번 감사의 결론

현재 Next는 원작/놀스토리 Ren'Py 읽기, 기본 작품 보존 사본 편집, 대본/장/컷/선택지/분기/합류/엔딩 저작, 자산/구도/연출/오디오, 파일 왕복, Excel/Google TSV, 표지/서재 디자인의 상당 부분을 이미 구현했다. 이 기능들은 다시 만들 대상이 아니라 최신 grouping 변경 뒤 회귀 검증 대상이다.

가장 큰 미완성은 제품 동작 자체라기보다 최종 확정 절차다. 네 작품 중심 서재 grouping, 판본 action, 기본 작품 보호 사본, ShortStory four originals와 multi-book library는 현재 소스에 구현되어 있다. 다만 많은 파일이 아직 미커밋/검증 중 상태라 PR/CI 완료로 주장하려면 root의 최종 test run, evidence 정리, review packet이 필요하다.

계정·온라인 저장·학급·과제·제출·공개 권한은 서버 단계의 후속 범위다. ADR 0011의 서버안은 아직 추천안이며, STATUS도 실기기/공개출시/미디어 권리 승인을 완료로 보지 않는다. 오프라인 HTML export, 두 번째 Web 놀스토리 player, 레거시 storage 자동 이전은 의도적으로 복원하지 않는 범위다.

## 확인된 후속 목표와 완료 조건

아래는 서버 결정을 임의 확정하거나 버튼을 추가해서 완료로 처리하지 않는 작업 단위다. 이번 P0/P1 로컬 연결의 최종 실행 근거는 [완료 검증](four-work-library-verification.md)과 [숏스토리 형식 범위](four-work-shortstory.md)에 별도로 기록한다. 이 문서 앞부분의 PR/미커밋 상태는 조사 당시 snapshot이며 최신 브랜치/CI는 완료 검증의 GitHub 기록을 따른다.

| ID | 우선순위/현재 상태 | 목표와 사용자 영향 | 선행 의존성 | 완료 조건 |
|---|---|---|---|---|
| SV-01 | P1/M8, 미구현 | 계정·역할·권한. 교사/학생/관리자 작품 접근의 주체를 실제 인증으로 연결 | 소유자의 서버/인증/운영 정책 확정, legacy server 계약 검토 | 인증·세션 만료·역할별 접근·다른 사용자 접근 거부의 API/브라우저 검사 통과 |
| SV-02 | P1/M8, 미구현 | 온라인 작품 저장·동기화·백업·충돌 복구 | SV-01, 서버 StoryDocument 및 ShortStory 계약, 저장 한도 결정 | 로컬 실패/오프라인 재접속·다중 기기 충돌·서버 backup/restore에서 원고/자산/권한 보존 |
| SV-03 | P1/M8, 미구현 | 학급·학생 명부·가입/교사 승인 흐름 | SV-01, 가입/승인 정책 | 교사 생성·학생 가입·승인·탈퇴·다른 학급 자료 접근 거부 E2E |
| SV-04 | P1/M8, 미구현 | 과제·제출·검토/피드백·제출 작품 읽기 | SV-01~03, 제출 revision/수정 허용 정책 | 실제 반의 과제 배포→학생 편집→제출→교사 열람, 사본/제출 원본 분리와 Ren’Py/Web ShortStory 읽기 |
| SV-05 | P1/M8~M9, 미구현 | 공개 공유 링크·게시·취소·공개 권한 | SV-01~02, 게시 정책 및 미디어 release gate | 비공개/공개/취소 링크, 권한 우회 거부, Ren’Py 단일 story renderer, 허용 미디어만 공개 |
| ST-01 | P2, 부분 구현 | 서로 다른 탭의 동시 변경 충돌 안내/보호. 현재는 단일 탭의 최신 상태와 비동기 응답 보존 | 작업 revision/탭 소유권 설계 | 두 탭에서 서로 다른 책 추가·같은 책 편집 시 데이터 유실 없이 충돌을 명시하거나 병합 |
| ST-02 | P2, 부분 구현 | 기기 저장의 과거 revision 체크포인트·되돌리기. 현재는 실패 초안/손상 raw 보존, 컷 삭제 undo, 내 작품 최근 삭제 1권 복구와 ShortStory soft delete | 보관 한도/체크포인트 정책 | 마지막 정상 revision과 새 초안 분리, 실패/손상 후 사용자가 정상본을 선택해 복구하고 현재 문서를 잃지 않음 |
| X-01 | P2/M2~M8, 미구현 | 구형 8탭/4탭 Excel 읽기 어댑터. 현재 Next 표만 지원 | 고정 레거시 실제 파일 fixture와 이식 비용 검토 | 지원하는 old 탭/셀/자산/Flow 의미 전체 왕복 및 지원하지 않는 필드 명시적 거부 |
| X-02 | P2/M8, 미구현 | 숏스토리 v2 학생 활동 문서의 question/answer/art revisions/layout 호환 | v2 작업 형식과 현재 page 모델의 보존 계약 설계 | 실제 v2 학생 파일의 작성 내용 전부 보존·편집·재열기; 정적 pack 투영을 v2 import 성공으로 주장하지 않음 |
| X-03 | P3, 선택적 후속 | Google 계정 연결과 시트 writeback. 현재 공개 TSV 일회성 읽기만 제공 | 소유자 필요성/인증/원격 수정 범위 승인 | 승인한 시트에만 명시적 쓰기, 실패 재시도와 변경 전후 보존, 기존 파일 백업 경로 유지 |
| QA-01 | P1/출시 gate, 미검증 | 학교 Windows/Chromebook/Android 태블릿·폰 실기기 성능/IME/오디오 | 실제 기기와 잠정 ADR 0013 성능 기준 확정 | PC/태블릿·폰 가로/세로에서 동일 작품의 입력·읽기·오디오·메모리/지연 결과와 한계 기록 |
| QA-02 | P1/출시 gate, 부분 구현 | NVDA/ChromeVox/TalkBack 실제 스크린리더 이용 검증 | QA-01 기기, 접근성 의미 계층 | 책 선택·판본·그림책 글·Ren’Py 대사/선택·초점 복귀를 키보드/스크린리더로 끝까지 수행 |
| REL-01 | P1/M9, 차단 유지 | 미확인 그림/외부 미디어의 공개 배포 권리와 최초 서비스 배포 | 출처/라이선스 증빙, SV-05 및 release gate | 허용 manifest, 필요 attribution, 실제 도메인 배포와 공개 권한 검사; GitHub source upload와 서비스 배포를 구분 |

KnolStory 장·컷의 별도 A4/Web Stage 렌더러, 오프라인 HTML 내보내기와 레거시 저장소 자동 이전은 복원 목표가 아니다. 숏스토리 A4, 작품 파일 이동, 향후 권한 있는 온라인 공유로 경계를 유지한다.

## 최종 로컬 판정

초기 감사의 최종 검증 대기 항목은 네 작품·판본·사본·표지·숏스토리·파일·A4·native 실행의 최종 검사로 확인했다. 8원고 bytes는 전부 동일하며, 원작 전체/놀스토리 두 대표 갈래·독립 슬롯·사본 재열기를 실제 Ren’Py로 검사했다. 저장 실패/비동기 응답·SDK hover focus의 결함은 재현 후 수정했다. [검사 범위와 완료 감사](four-work-library-verification.md)를 현재 로컬 완료 근거로 삼고, SV/ST/X/QA/REL 목록은 구현 상태·의존성·종료 조건을 가진 후속 목표로 유지한다. 공개 GitHub delivery/CI는 push 후 별도 확인한다.
