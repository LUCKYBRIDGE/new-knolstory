# 집중 편집 화면 — 규칙, 점검, 구현 기록 (2026-11-24 시작)

사용자 결정(2026-11-23~24): 여러 일을 한 화면에서 하는 복합 화면보다, **한 가지 일(글·그림·음향·효과 등)에 집중하는 화면**을 먼저 잘 만든다. 버튼·기능·설명·해설은 과하지 않게 두고, 명확한 디자인·UI/UX 규칙 아래 보기 좋고 통일돼야 한다. 기기별 배치는 캡컷·캔바·파워포인트 편집 화면을 참고한다(폰 → 태블릿 → 컴퓨터로 갈수록 더 많이 보임).

사용자가 더한 조건:
1. 어느 집중 화면이든 장·컷 이동이 보여야 한다. 단, 공간을 많이 차지하지 않는다.
2. 한 화면 안에 같은 일을 하는 단추·기능이 두 번 있지 않는다. 관련되거나 비슷한 기능은 비슷한 자리에 둔다.
3. 과하게 큰 단추·글씨는 두지 않는다(예: ‘닫기’ 글자 단추 대신 작은 ×).
4. 과하게 넉넉한 여백도, 너무 촘촘한 배치도 피한다. 4px 단위까지 세밀하게 맞춘다.

선행 문서: [폰·태블릿 집중 정리](mobile-focus-pass-2026-11-23.md) 2부(편집·읽기 무대 진단).

## 이어서 할 때 (인계 — 마지막 갱신 2026-11-24)
새 세션은 이 절부터 읽는다. 진행할 때마다 이 절과 아래 ‘진행 기록’을 함께 갱신한다.

- **상태**: 2단계 일부 끝·커밋함(bd0516ab·fed9297e·ce9a3b65). 코덱스 작업을 `feat/actor-offscreen-exit`(f076de5d, main 바탕)로 옮겨 이 브랜치에 병합함(2131218c). 병합 뒤 편집기 host e2e 146개·stories-runtime 9개(인물 상대 크기·조작 겹침) 통과. 메인 체크아웃의 코덱스 미커밋 파일은 그대로 두었다(옮긴 것과 같은 내용 — 정리는 사용자 확인 뒤).
- **다음 할 일**: E6(폰 가로 편집 메뉴 두 열), R1(폰 가로 읽기 막대 3개 — 코덱스의 `story-player-menu.tsx` 변경이 합쳐져 이제 진행 가능), E2(폰 무대 띠), 7크기 재측정·전후 표. A2UI는 ‘편집 화면 카탈로그’ 방향으로 적용함(아래 ‘A2UI 카탈로그’) — 다음은 실제 화면 코드를 설계도와 한 곳씩 맞추기.
- **알려진 것**: stories-runtime `catalog-reading-paths`의 선녀와 나무꾼 긴 경로(340~412컷) 4개는 360초 제한을 넘는다. main 바탕 브랜치에서도 혼자 돌려 같은 지점(361/376)에서 넘으므로 이번 변경과 무관하다. 런타임은 `../new-knolstory-codex-port/apps/web/public/runtime`(코덱스 .rpy 포함 새 빌드)에 링크.
- **바뀐 파일**
  - 앱: `apps/web/components/story-cut-context.tsx`(위 막대 장·컷 칸), `story-workspace.tsx`(화살표 자리 `cutStepsHost` → 편집 화면 `cutStepTarget`), `story-editing-workbench.tsx`(화살표 그리기, 중복 이동 제거, 현재 컷 글, 함께 보기 칩), `story-editing-workbench.module.css`·`story-workspace.module.css`·`editor-work-tabs.module.css`(각 파일 끝의 ‘Focus screens (2026-11-24)’ 블록), `workspace-management.tsx`·`story-player-menu.tsx`(+css)(닫기 ×).
  - 규칙: `DESIGN.md` 맨 앞 ‘집중 편집 화면 규칙’.
  - 검사: 새 `tests/e2e/focus-editing-screens.spec.ts`(playwright.config host에 등록), 측정 도구 `tests/e2e/mobile-focus-audit.ts`(`auditDensity` 추가), 갱신한 기존 검사 `editor-view-notes`, `phone-editor-tasks`, `editor-chrome-navigation`, `editing-workbench`, `editor-range-overview`, `task-editor-current-cut`.
- **검사 상태(2026-11-24 중간)**: 실패하던 8개 파일(keyboard-writing-focus, focus-editing-screens, phone-editor-tasks, editing-workbench, task-editor-current-cut, editor-chrome-navigation, editor-view-notes, editor-range-overview) 모두 통과. 고친 점: 키보드가 열려도 위 막대를 `‹ 1장 · n컷 ›` 한 줄로 남김, 장·컷 select를 누르는 높이 44px로, 작업 탭 높이(태블릿 36·폰 32)를 위 막대의 44px 규칙보다 강하게, 320px에서 설정은 아이콘만·화살표 36px(누르는 영역 유지)로 위 줄 한 줄. lint 오류(ref를 props로 넘김) 고침. `unified-storage-tools` 1개는 바탕 브랜치에서도 실패(무관). 다음: 편집기 관련 전체 검사 다시.
- **다음 할 일(순서)**
  1. (끝남) 위 검사들 통과. 명령: `cd ../new-knolstory-mobile-focus && KNOL_TEST_PORT=3170 npx playwright test tests/e2e/<파일> --project=host --workers=4 --reporter=line`(zsh에서 파일 목록 변수는 `${=FILES}`).
  2. (끝남 — host 24파일 통과, stories-runtime control-reachability 3개 통과) 편집기 관련 host 검사 전체 다시(`editing-workbench, editor-*, keyboard-writing-focus, phone-editor-tasks, task-editor-current-cut, large-manuscript, long-manuscript-workbench, work-menu-purpose, responsive-editor, menu-readability, accessibility-reader, focus-editing-screens, mobile-focus`) + stories-runtime `control-reachability`.
  3. (끝남) 수정 후 캡처·측정(7크기 × 7화면) → `docs/architecture/evidence/focus-editing-2026-11-24/`(그림은 gitignore, json만 커밋), 이 문서에 전후 표.
  4. (끝남, d7bf6d6a feat · 17206a03 docs) 커밋(한국어 Conventional Commits + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`): feat(web) / test(e2e) / docs 나눠서. 푸시·배포는 사용자 요청 때만.
  5. **지금 할 일 — 2단계**: 남은 4px 밖 간격 정리(측정의 offGrid), 태블릿 ‘연결된 이미지 없음 · 해설’ 상시 문구(E5), 각 화면 도구 3~5개·더보기 정리, DESIGN.md ‘휴대폰 화면의 기능 기준’ 표의 편집 행을 새 규칙에 맞게 고치기.
- **환경 메모**: 이 worktree는 `apps/web/public`의 생성물(runtime 링크, 오디오, 미리보기)을 `../new-knolstory-library-polish`에서 `rsync -a --ignore-existing`으로 채워 둠. 실제 기본 작품으로 화면을 찍는 캡처 검사는 scratchpad의 `stagecap/editor.spec.ts`(임시, 커밋 안 함) — 필요하면 `tests/e2e/mobile-focus-capture.spec.ts` 방식으로 다시 만든다.

## 작업 위치
- worktree `../new-knolstory-mobile-focus`, 브랜치 `feat/focus-editing-screens`(바탕 `feat/mobile-focus-classroom-settings` a821f187 → `feat/library-shelf-polish` → origin/main 6e4b104a).
- 코덱스의 무대·연출 작업은 메인 체크아웃에 **커밋 전 상태**(브랜치 `codex/trusted-client-rate-20261103`, 바탕 556d1b1d = origin/main보다 221커밋 뒤)로 남아 있다. 편집 화면 UI 변경은 `story-editing-workbench.tsx` 약 53줄, `story-player-menu.tsx` 8줄, `story-workspace.tsx` 2줄로 작아서, 이 브랜치는 main 바탕으로 진행하고 코덱스 작업을 main에 옮길 때 작은 병합으로 맞춘다. 메인 체크아웃 파일은 건드리지 않는다.

## 진행 기록
- 2026-11-24 시작: 브랜치 생성, 이 문서 작성. 다음: 지금 편집 화면 6개를 7개 크기에서 캡처·측정.
- 수정 전 측정: 7개 편집 화면 × 7개 크기(`tests/e2e/mobile-focus-audit.ts`의 `auditDensity` 추가 — 조작 수, 상시 문구, 같은 이름 조작, 4px 밖 간격, 4px보다 붙은 조작, 큰 단추). 결과는 scratchpad `editor-before/all.json`(→ 커밋 때 evidence로 옮김).
- 찾은 것: 위 막대의 장·컷 고르기와 별도로 화면마다 `편집할 장` 줄, 폰의 `‹ 이전 컷 1/15 다음 컷 ›` 줄, 쓰기 화면 무대 위 ‹ ›, `← 쓰기로`(쓰기 탭과 같음)가 겹친다. 폰에서는 작업 화면 바꾸기가 설정 메뉴 안(2~3번 누름). 상시 문구 ‘원고 순서대로 보여 줘요…’, ‘나머지는 참고용으로만…’, 함께 보기가 큰 상자로 늘 펼쳐짐. 간격 3·5·6·7·10px가 섞여 있음.
- 구현 1(진행 중): 위 막대 장·컷 칸 `‹ 1장 · 3컷 ▾ ›`(36px, 누르는 영역 44px) — `story-cut-context.tsx`, 화살표는 편집 화면이 위 막대 자리에 그림(`cutStepTarget` 포털, 쓰기 화면은 글상자 초점 유지). 무대 위 ‹ ›·폰 이동 줄·`← 쓰기로`·폰 `편집할 장` 제거. 함께 보기는 작은 칩. 폰에서 작업 탭을 위 막대 둘째 줄로. 폰 쓰기 화면의 일반 이전/다음 카드 숨김(갈림길·다음 컷 만들기·끝 안내는 유지).
- 사용자 추가 조건(작업 중): 어느 집중 화면이든 현재 컷의 글이 보여야 한다 → 배경·인물·음향·연출 목록 화면의 컷 카드 머리 아래에 글 세 줄(`data-cut-text`), 음향·연출 함께 화면의 상세 칸 위에도 `n컷 · 화자 글`. 글은 늘 보이므로 함께 보기의 ‘글’ 칩은 뺐다.
- DESIGN.md 맨 앞에 ‘집중 편집 화면 규칙’ 절(뼈대, 장·컷 이동, 현재 컷 글, 중복, 글·설명, 4px 크기·간격, 기기별).
- 닫기 단추 3곳(읽기 메뉴, 읽기 판 머리, 편집 메뉴)을 작은 ×(보이는 32px, 누르는 44px, 읽는 이름 유지)로.
- 기존 검사 갱신: `editor-view-notes`(← 쓰기로 → 편집화면 고르기), `phone-editor-tasks`(폰 이동 줄 → 위 막대 ‹ ›, 폰 편집할 장 숨김). 편집기 관련 host 검사 16파일 실행 중.

## 2단계 (2026-11-24 오후)
- **E5**: 쓰기 화면 화자 줄의 `연결된 이미지 없음 · 해설` 상시 문구를 없앴다. 화자에 연결된 그림이 있을 때만 작은 칩(그림 + 이름)으로 보인다. 칸 자리는 비워 두어 종류·재생 위치가 흔들리지 않는다.
- **E4(태블릿 세로 쓰기)**: 맨 위 `이야기의 시작이에요.` 줄을 없애 무대가 한 줄만큼 커졌다(첫 컷이 아닐 때의 이전 컷 단추, 갈래가 끊긴 ‘이어지는 컷이 없어요’ 경고는 그대로). `+ 이 컷 뒤에 새 컷 넣기`는 다음 컷 옆에 단추 높이(44px)로, `+ 여기서 이야기 나누기`(또는 갈래·선택지 고치기)·`이야기 지도 보기`·`이 장의 컷 목록`·`메모·연결 요약`·`그림책 구상`은 `컷 더보기` 하나 안으로 옮겼다. 넓은 화면(나란히 배치)과 폰은 그대로.
- **4px 간격**: `story-editing-workbench.module.css`·`editor-work-tabs.module.css`의 gap·padding·margin 값 2·3·5·6·7·9·10·11·14·15·18·22px를 4·8·12·16·24 단계로 맞췄다(78곳).
- **코덱스 작업 옮기기**: 코덱스 작업은 main보다 221커밋 뒤에서 시작해 9개 파일이 충돌했다. 풀이 원칙: main의 말투(해요체)·새 구조를 지키고 코덱스가 더한 기능만 얹는다. `stage-view.ts`는 main의 ‘배치 검토(placementReview)를 거친 그림은 다시 줄이지 않는다’를 먼저 두고 그 뒤에 코덱스의 예전 그림 키 보정을 둔다. 코덱스의 인물 등록 검사 기준 목록은 11-12 기준이라, 그 뒤 main에 검토를 거쳐 들어온 40개(넓은 그림책 장면 포함)를 기준에 더해 ‘앞으로 새로 넣거나 바꾸는 그림’만 검사하게 했다.

## A2UI 카탈로그 (2026-11-24)
사용자 결정: A2UI(구글 공개 사양)를 개발에 적용하되, AI 기능이 아직 없으므로 **집중 편집 화면의 카탈로그**로 쓴다. 화면과 개발 에이전트가 이 카탈로그의 컴포넌트로만 UI를 짠다.
- 조사: [google/A2UI](https://github.com/google/A2UI)(`a2ui-project/a2ui`로 옮겨 가는 중), v0.9 공개(2026-04, [소개](https://developers.googleblog.com/a2ui-v0-9-generative-ui/)), v1.0 후보. UI를 JSON 데이터(평평한 컴포넌트 목록 + id 참조 + 데이터 모델 JSON Pointer 연결)로 보내고, 클라이언트는 미리 정한 [카탈로그](https://a2ui.org/concepts/catalogs/)(컴포넌트마다 JSON Schema, `catalogId`, `instructions`)로만 그린다. 공식 React 렌더러 `@a2ui/react`(0.16, zod 필요)는 아직 0.x라 들이지 않고, 메시지·카탈로그 형식만 v0.9에 맞췄다 — 나중에 AI 기능이 생기면 같은 카탈로그를 그대로 넘길 수 있다.
- 만든 것: `packages/ui`(`@knolstory/ui`) — 카탈로그 JSON(15개 컴포넌트), 메시지 적용·검사기 `surface.ts`, 여섯 화면 설계도 `screens/*.json`. `apps/web/components/a2ui/focus-surface.tsx` — 컴포넌트마다 렌더러 하나(4px·32–36px·44px 누르는 영역). 개발용 `/a2ui-catalog`(배포 빌드에서는 404). 절차는 [A2UI 카탈로그 스킬](../../.agents/skills/a2ui-focus-catalog/SKILL.md).
- 규칙을 어떻게 막나: 자유 글 컴포넌트가 없다(문장은 `Notice` 빈 상태·오류·되돌릴 수 없는 일만). `ToolGroup` 4개까지, 간격 4·8·12·16·24만, 닫기는 아이콘, `CutCard`는 태블릿·컴퓨터만, `allowedParents`로 자리 고정. 스키마로 못 쓰는 것은 검사기가: 주 단추 하나, 같은 동작이 겹치는 기기에서 두 번(`one-way`), 작업 탭이 그 화면을 고름.
- 한계: 설계도는 지금 화면의 뼈대와 대표 도구를 적은 것이고, 실제 편집 화면 코드는 아직 이 렌더러로 그리지 않는다. 다음 단계는 화면 하나(예: 배경)를 설계도와 맞추고 실제 화면의 조작 목록을 설계도와 비교하는 검사를 더하는 것.

## 1단계 결과 (2026-11-24)
측정: 선녀와 나무꾼 놀스토리판 편집, 인물·음향·연출 편집을 켠 상태. 근거 `evidence/focus-editing-2026-11-24/{before,after}-audit.json`, 캡처(로컬, gitignore) `before/`·`after/`·`compare-*.png`.
열: 조작 수(폰은 작업 탭이 새로 보여 늘어남) · 상시 문구 · 4px 밖 간격 종류 · 4px보다 붙은 조작 쌍 · 44px 미만 조작 · 장·컷 칸 위치·높이.
폰 가로(844×390·667×375)는 쓰기 화면만 확인용으로 열리므로 모든 화면 값이 같다.

| 화면 | 크기 | 조작 | 상시 문구 | 4px 밖 간격 | 붙은 조작 | 44px 미만 | 장·컷 칸 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| audio | 1024x768 | 28 → 22 | 3 → 1 | 30 → 20 | 8 → 5 | 2 → 0 | 6px·36px |
| audio | 320x700 | 12 → 14 | 2 → 1 | 18 → 14 | 4 → 2 | 2 → 0 | 6px·36px |
| audio | 360x720 | 12 → 14 | 2 → 1 | 18 → 15 | 4 → 1 | 2 → 0 | 6px·36px |
| audio | 390x844 | 12 → 14 | 2 → 1 | 18 → 15 | 4 → 2 | 2 → 0 | 6px·36px |
| audio | 667x375 | 9 → 6 | 0 → 0 | 9 → 8 | 5 → 2 | 2 → 0 | 6px·36px |
| audio | 768x1024 | 31 → 25 | 3 → 1 | 31 → 21 | 7 → 5 | 2 → 0 | 6px·36px |
| audio | 844x390 | 9 → 6 | 0 → 0 | 9 → 8 | 1 → 0 | 2 → 0 | 6px·36px |
| audio-direction | 1024x768 | 48 → 47 | 3 → 2 | 25 → 23 | 30 → 27 | 2 → 0 | 6px·36px |
| audio-direction | 320x700 | 12 → 14 | 3 → 2 | 18 → 15 | 3 → 2 | 2 → 0 | 6px·36px |
| audio-direction | 360x720 | 12 → 14 | 3 → 2 | 18 → 16 | 3 → 1 | 2 → 0 | 6px·36px |
| audio-direction | 390x844 | 12 → 14 | 3 → 2 | 18 → 16 | 4 → 2 | 2 → 0 | 6px·36px |
| audio-direction | 667x375 | 9 → 6 | 0 → 0 | 9 → 8 | 5 → 2 | 2 → 0 | 6px·36px |
| audio-direction | 768x1024 | 50 → 49 | 3 → 2 | 25 → 23 | 30 → 27 | 2 → 0 | 6px·36px |
| audio-direction | 844x390 | 9 → 6 | 0 → 0 | 9 → 8 | 1 → 0 | 2 → 0 | 6px·36px |
| background | 1024x768 | 28 → 22 | 1 → 0 | 29 → 20 | 11 → 6 | 2 → 0 | 6px·36px |
| background | 320x700 | 13 → 15 | 0 → 0 | 19 → 16 | 5 → 2 | 2 → 0 | 6px·36px |
| background | 360x720 | 13 → 15 | 0 → 0 | 19 → 17 | 5 → 1 | 2 → 0 | 6px·36px |
| background | 390x844 | 13 → 15 | 0 → 0 | 19 → 17 | 4 → 2 | 2 → 0 | 6px·36px |
| background | 667x375 | 9 → 6 | 0 → 0 | 9 → 8 | 5 → 2 | 2 → 0 | 6px·36px |
| background | 768x1024 | 32 → 26 | 1 → 0 | 30 → 21 | 11 → 7 | 2 → 0 | 6px·36px |
| background | 844x390 | 9 → 6 | 0 → 0 | 9 → 8 | 1 → 0 | 2 → 0 | 6px·36px |
| basic | 1024x768 | 36 → 35 | 1 → 2 | 30 → 33 | 15 → 9 | 2 → 0 | 6px·36px |
| basic | 320x700 | 13 → 17 | 0 → 1 | 22 → 21 | 6 → 2 | 2 → 0 | 6px·36px |
| basic | 360x720 | 13 → 17 | 1 → 1 | 26 → 22 | 6 → 1 | 2 → 0 | 6px·36px |
| basic | 390x844 | 13 → 17 | 2 → 2 | 26 → 21 | 7 → 2 | 2 → 0 | 6px·36px |
| basic | 667x375 | 9 → 6 | 3 → 2 | 13 → 12 | 5 → 2 | 2 → 0 | 6px·36px |
| basic | 768x1024 | 24 → 23 | 1 → 1 | 33 → 32 | 10 → 10 | 3 → 1 | 6px·36px |
| basic | 844x390 | 9 → 6 | 3 → 3 | 13 → 12 | 1 → 0 | 2 → 0 | 6px·36px |
| characters | 1024x768 | 34 → 28 | 1 → 0 | 30 → 21 | 10 → 6 | 2 → 0 | 6px·36px |
| characters | 320x700 | 19 → 19 | 0 → 0 | 22 → 20 | 10 → 5 | 2 → 0 | 6px·36px |
| characters | 360x720 | 19 → 19 | 0 → 0 | 22 → 21 | 10 → 4 | 2 → 0 | 6px·36px |
| characters | 390x844 | 20 → 22 | 0 → 0 | 22 → 21 | 8 → 4 | 2 → 0 | 6px·36px |
| characters | 667x375 | 12 → 9 | 0 → 0 | 10 → 9 | 6 → 3 | 2 → 0 | 6px·36px |
| characters | 768x1024 | 37 → 31 | 1 → 0 | 30 → 21 | 6 → 6 | 2 → 0 | 6px·36px |
| characters | 844x390 | 12 → 9 | 0 → 0 | 9 → 8 | 2 → 0 | 2 → 0 | 6px·36px |
| direction | 1024x768 | 28 → 22 | 2 → 0 | 30 → 20 | 8 → 5 | 2 → 0 | 6px·36px |
| direction | 320x700 | 12 → 14 | 1 → 0 | 18 → 14 | 4 → 2 | 2 → 0 | 6px·36px |
| direction | 360x720 | 12 → 14 | 1 → 0 | 18 → 15 | 4 → 1 | 2 → 0 | 6px·36px |
| direction | 390x844 | 12 → 14 | 1 → 0 | 18 → 15 | 4 → 2 | 2 → 0 | 6px·36px |
| direction | 667x375 | 9 → 6 | 0 → 0 | 9 → 8 | 5 → 2 | 2 → 0 | 6px·36px |
| direction | 768x1024 | 31 → 25 | 2 → 0 | 31 → 21 | 7 → 5 | 2 → 0 | 6px·36px |
| direction | 844x390 | 9 → 6 | 0 → 0 | 9 → 8 | 1 → 0 | 2 → 0 | 6px·36px |
| text | 1024x768 | 26 → 22 | 1 → 0 | 28 → 20 | 9 → 5 | 2 → 0 | 6px·36px |
| text | 320x700 | 20 → 20 | 1 → 0 | 24 → 16 | 9 → 3 | 2 → 0 | 6px·36px |
| text | 360x720 | 20 → 20 | 1 → 0 | 24 → 17 | 9 → 2 | 2 → 0 | 6px·36px |
| text | 390x844 | 22 → 22 | 1 → 0 | 26 → 19 | 8 → 4 | 2 → 0 | 6px·36px |
| text | 667x375 | 9 → 6 | 0 → 0 | 9 → 8 | 5 → 2 | 2 → 0 | 6px·36px |
| text | 768x1024 | 29 → 25 | 1 → 0 | 29 → 21 | 8 → 5 | 2 → 0 | 6px·36px |
| text | 844x390 | 9 → 6 | 0 → 0 | 9 → 8 | 1 → 0 | 2 → 0 | 6px·36px |

남은 것(2단계): 4px 밖 간격이 아직 15~30종(무대·인물 편집 칸·음향 칸 안쪽 오래된 규칙), 목록 화면의 ‘이 컷 선택’·‘이 컷부터 재생’이 컷마다 반복(컷마다 대상이 다르므로 중복은 아니지만 한 줄로 줄일 여지), 태블릿 쓰기 화면 아래 ‘+ 이 컷 뒤에 새 컷 넣기’·‘+ 여기서 이야기 나누기’가 103px 높이(크기 규칙 밖), 태블릿 ‘연결된 이미지 없음 · 해설’ 상시 문구, 각 화면 도구 3~5개·더보기 정리.
