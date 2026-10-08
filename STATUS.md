# STATUS.md

## Repository
- Successor: `LUCKYBRIDGE/new-knolstory`
- Legacy: `LUCKYBRIDGE/story-maker` (feature-frozen, ADR 0011)
- Legacy baseline: `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`
- Blueprint: [`docs/architecture/development-blueprint.md`](docs/architecture/development-blueprint.md) (v1.4)

## Phase
**대표 작품 읽기·편집과 빈 작품 창작 연결 구현 — M2 도메인/호환 이식과 M4–M6 핵심 경로를 연결했다.** 네 작품의 실제 데이터·자산·분기·연출을 Ren'Py로 읽고, 빈 작품에서 새 장·컷과 짧은 분기를 작성해 기기 저장·파일 왕복·Ren'Py 재생까지 진행할 수 있다. 전체 M1–M9/제품 1.0 완료는 아니다.

## 2026-10-08 cabinet material and selection experience

Legacy design documents and fixed/historical oak cabinet implementations informed continuous wood rails/stiles, a recessed drawer panel, handle mounts and molded base. Selection now keeps the room visible behind a large book and wooden pedestal rather than an opaque green card. 2×3 compact pagination remains. [Design/evidence](docs/architecture/library-book-design-parity.md).

## 2026-10-08 narrow shelf correction

Narrow shelves now use 2×3 with six books per page. Viewport-height sizing, a smaller drawer and reduced ornamental footer keep the cabinet near the first viewport. Five viewport sizes preserve drawer access within height+48px; pagination preserves all eight books. 34 relevant unit and 17 design/native checks, types, lint and build passed. [Evidence](docs/architecture/evidence/library-book-design/six-book-compact/verification.json).

## 2026-10-08 final visual correction

The introduction now follows the attached StartScreen: gold double frame, rectangular original posters, two menus and yellow read button. The library uses a small title, classification and collapsed tools while retaining the cabinet, drawer and selection-only books. Five archived Onggojib cover aliases display current art without mutating manuscripts or legacy storage. Ten UI assets restore through the existing setup. 812 TS, 24 Python, 66 host, 16 final design checks including eight actual RenPy entries passed, with types/lint/build/production audit and 1351 hashes. Public legacy media release remains blocked; physical device performance is not claimed. [Final correction evidence](docs/architecture/library-book-design-parity.md).

## Completed
- Successor repository created; legacy baseline fixed.
- Web + Runtime Core + Ren'Py Web target architecture defined (ADR 0001–0008).
- 2026-10-06 gap review: ADR 0009–0015, Blueprint v1.4, DESIGN.md device/overlay/accessibility rules, compatibility matrix expansion, Ren'Py spike plan, forward-port log.
- 2026-10-06 responsive editor: pnpm/Turborepo/Next 정적 앱, runtime-core 좌표 변환, 초기 runtime-contract guard, 실제 Ren'Py 8.5.3 Web presenter 연결. 최소 내부 높이 256px 문제를 고정 1280×720 iframe + CSS contain 변환으로 해결.
- 로컬 typecheck/lint/build, unit/bridge 32개, host E2E 3개, 실제 runtime DPR 1/1.5/2 E2E 3개 통과. 상세 범위와 미검증 항목: [spike 결과](docs/architecture/renpy-web-spike-results.md).
- 2026-10-06 대표 작품 목표: 원고 4개 2,635컷, 공통 실제 자산 421개, StoryDocument v1–v5 호환, canonical layout, native 선택/연출, 편집·기기 저장·import/export·이어읽기 연결. 583 unit/contract tests와 host/native 브라우저 검증 통과. [완료 근거와 후속 범위](docs/architecture/representative-story-verification.md).
- 2026-10-06 빈 작품 창작: 새 작품·장·컷 작성, 컷 순서 이동, 제목 수정, 2–4 선택지와 새 장 연결, 명시적 엔딩, 자동 저장·수동 저장 재시도 연결. 3컷 작품을 실제 자산으로 작성하고 reload·파일 왕복 및 실제 Ren'Py의 두 갈래 엔딩으로 검증했다. 590 unit/contract tests 통과. [검증 범위](docs/architecture/representative-story-verification.md#빈-작품-창작-추가-검증).
- 2026-10-06 전체 흐름: 장·컷·선택지·합류·엔딩·연결 대기 지도, 현재/공유 컷 안내, 미연결·도달 불가 진단과 편집 이동, 긴 작품 검색 연결. 중첩 분기·합류 작품의 저장·파일 왕복과 실제 Ren'Py 6경로 검증. 600 unit/contract tests, host 21개, native 6개 통과. [완료 기준별 근거](docs/architecture/representative-story-verification.md#전체-흐름과-중첩-분기-추가-검증).
- 2026-10-06 작은 화면 핵심 편집: 무대 + 활성 글/자산/선택지/연출/컷 도구, 작품 관리 접기, 가로 화면 무대/입력 분리. 터치 390px에서 실제 자산 분기 작성·저장·파일 왕복·native 두 엔딩, 회전/패널/키보드/긴 한국어 보존 검증. 전체 host 22개/native 7개 및 600 unit/contract tests 통과. [검증 범위](docs/architecture/representative-story-verification.md#작은-화면-핵심-편집-추가-검증).
- 2026-10-06 기본 배치/연출: 자동 좌우 중심 간격 확대(실제 자산 196 논리 px 증가), 수동·중앙 배치/크기 보존. 연출 미리보기·효과 강도/시점/지연·동작 줄이기, 같은 컷 재시작과 확인 전환 갱신 문제 수정. 실제 Ren'Py 7효과/2look/3전환 및 새 작품 배치/재생 검증. 607 unit/contract tests, host 23개 통과. [변경 전후 및 근거](docs/architecture/representative-story-verification.md#기본-인물-배치와-연출-표현-추가-검증).

## Owner decisions (2026-10-06)
- Ren'Py Web 단일 렌더러: **무조건 확정** (spike는 방식 확인용, go/no-go 아님)
- 숏스토리: 포함, Web 렌더 + 인쇄 유지 (Ren'Py 대상 아님)
- 오프라인 HTML 내보내기: 폐기 → 온라인 공유 링크
- 출시: `story.knolquiz.com`에서 새 서비스 최초 출시. 기존 운영 사용자·DB의 무중단 승계와 로컬 자동 이전은 필수 조건이 아니다. 기존 작품은 파일 가져오기 경로를 제공한다.
- 레거시: 기능 동결, 치명적 수정만, forward-port
- 대상 기기: 학교 Windows PC, 크롬북, 안드로이드 태블릿 (편집 주 환경) / 안드로이드 스마트폰 (플레이 + 핵심 편집). Chrome 우선, Safari / iPad·iPhone은 현 단계 범위 밖.
- Excel/Google 시트: Next 형식에 맞춰 지원. 기존 8탭/4탭 형식 유지 의무 없음; 구형 읽기 어댑터 범위는 후속 검토.
- 최종 서비스 도메인: `https://story.knolquiz.com`.
- 도구: pnpm + Turborepo + Next.js 정적 + Vitest/Playwright, Node 22
- 로컬 경로: 주/보조 두 작업 경로 사용 (ADR 0012에 기록)

## Follow-up decisions and investigation
- **서버 추천안 (소유자 확정 아님):** 새 전용 PostgreSQL DB + Node.js API로 독립 개발. 기존 인증·권한·학급·제출 코드를 검토해 재사용하고 `app/` 직접 참조는 `story-domain` / `compatibility`로 옮긴다. 같은 DB·API의 강제 승계는 없다 (ADR 0011).
- **기존 개발·시험 자료:** 필요할 때 작품 파일로 가져온다. 기존 origin 전수 조사나 DB 이전은 최초 출시의 필수 조건이 아니다.
- **구형 Excel/시트 읽기 범위:** M2/M8에서 비용과 자료 확인. Next 표 형식이 우선.
- **Bridge·성능:** ADR 0014의 세부안과 ADR 0013 수치는 M1b 측정 후 확정.
- **편집 화면 반응형 방향:** 초기1280×720 probe 이후, 현재 이야기는 실제 표시 영역의 비율을 Runtime Core가 계산하고 같은 Ren'Py 인스턴스에서 가상 화면 크기를 갱신한다. 세로 편집은 무대와 활성 입력을 스크롤로 접근하고 가로 편집은 나누며 가로 읽기는 전체 폭을 사용한다. [구도·오디오 규칙](docs/architecture/responsive-audio-authoring.md).

## Active task

2026-10-08 서재 디자인 소유자 정정 반영: 판본별 카드책장을 하나의 연속 책장/하단서랍으로 통합하고 책밑의 모든 실행버튼·제목을 제거했다. 실제 가로공간5×2/4×2/3×3/2×4, 책바닥=선반상단, 상판화분·흐린전경·방바닥선을 복원했다. 책선택 집중창에서만 읽기/편집/준비를 제공한다. 전체host65/최종디자인14/native8/805tests 및1346media 검증. [정정결과](docs/architecture/evidence/library-book-design/cabinet-correction/verification.json).

2026-10-08 소개·서재·책 디자인 계승 완료: 고정 story-maker의 포스터형 첫 진입·실제 방/선반·큰 책·집중 창·양장본 마감과 직접 표지 편집을 현재 Next 저장/파일/Ren’Py에 맞춰 이식했다. 분류·검색·선반 페이지·탭 복원, 기본/세 면 실물 프리셋과 44px pointer/keyboard 조작·초안 undo/redo/취소/적용을 연결했다. 803 tests, 정적host59 및 최종관련18,8작품 native/Chrome와 편집된흥부227/225경로·전체파일일치,타입·린트·build·1344media검증 통과. 소유자가 기존프로젝트 저작권과 재사용허가를 직접 확인했다. 상세 분류·파일·화면·한계: [디자인 계승](docs/architecture/library-book-design-parity.md). 실물기기 성능과 서비스배포는 별도다.

2026-10-08 다른 컴퓨터용 테스트 환경 후속: 설치·권한 있는 레거시 복원·고정 SDK/Web/폰트 해시 검증·공유runtime·정적build와 Chromium 준비를 자동화하고, static preview에서 기존 책/표지/파일/native 검사를 실행한다. 정적 검사에서 발견한 소개 재방문 직후 reload의100ms 저장 경합을 pagehide 저장으로 수정했다. 준비/복구/작품 이동과 실행 근거는 [재현 테스트 환경](docs/architecture/reproducible-test-environment.md)에 기록한다. 실제 다른 하드웨어·학교 Windows/Chromebook/Android 및 공개출시 권리 승인은 포함하지 않는다.

2026-10-08 책 소개·서재·표지 제작·게임 시작 연결 완료: 최초 접속 책 소개/재접속 서재, 새로고침 작업 위치 복원과 소개 재방문, 기존8책의 표지→actual Ren’Py 읽기를 연결했다. 기본8디자인·자유배치·앞표지/책등/뒤표지 layer·글꼴/그림/띠지 및 제목 초안/적용/취소/되돌림을 동일 cover 모델로 썸네일·미리보기·시작에 표시한다. 원작/놀스토리 표지 파일 전체왕복과 원고보존, 편집된 흥부두경로227/225컷·슬롯/기록/편집복귀, ChromePC/가로/세로 터치/키보드/넘침, 숏스토리 및 전체host50/native22/DPR3/792 tests·타입·린트·build·productionaudit 통과. 미확인레거시 그림은 공개Git에서 제외하고 권한있는기기의 고정421파일 복원명령을 제공한다. 개발braces 경고와 실기기/공개출시권리 제한 유지. [검증·문제·파일·화면](docs/architecture/book-entry-and-cover.md).

2026-10-08 기존 원작·놀스토리 연출/음향 보강: 새 이야기를 만들지 않고 고정 원문8작품2970컷/242장을 보존해126개 장면 그룹·131컷 참조(전수 native 실행/102효과음 시작 및 revision 중복 방지 검증), 원본 합성22음원, native Fade/Dissolve/ATL과 독립 환경음 채널을 연결했다. 원작335컷 전체와 놀스토리 각 두 경로 총2102컷 진입을 실제 Chrome Ren’Py에서 읽고 슬롯·기록·파일 일치를 확인했다.761 tests, statement93.53%/line98.13%, 전체host44/native19/DPR3와 최종 관련host3/native5, 타입·린트·빌드 통과. 미디어1337파일 출처/해시 전수 기록과 파일 왕복을 검증했다. 기존 미디어의 권리 증빙 부족으로 무료 공개 배포는 차단 상태이며, 청취 취향/실기기 성능 승인도 주장하지 않는다. [적용·검증·권리 제한](docs/architecture/existing-story-enhancement.md).

2026-10-07 로컬 서재·작품 준비 목표 완료: 내 작품/가져온 작품/기본 예제 카드, 정보·기본 표지·기획·전체/장/컷 메모와 연결 이동, 작품별 편집 위치·읽기 경로, 예제 내 사본·중복 가져오기 원본 보호를 기존 StoryDocument/파일/저장 구조로 연결했다. 실제 Chrome의 UI 작품2개+가져온 실제 자산12컷 작품으로 새로고침·파일 왕복·별도 context 복원·Ren’Py 슬롯/서재/이어읽기와 PC/태블릿/휴대폰 화면을 검증했다. 숨긴 영속 런타임 크기0 문제와 준비정보 때문에 읽기 슬롯이 변경 경고를 내던 문제를 수정했다. 720 unit/contract/integration, host43/native19, DPR3 및 타입·린트·빌드 통과. [보존 계약·파일·화면·A–F 근거](docs/architecture/local-library-and-preparation.md). 고급 표지·게임 시작 표지·온라인 서비스와 실기기 성능은 별도 목표다.

2026-10-07 창작·파일 보관·게임 읽기 UX 목표 완료: 현재 구현 감사로 읽기 전용 무대/메뉴, 자동 갈래 장 번호, 현재 컷의 입출 연결/수정, 장 내부 컷 이동, 친숙한 인물 표시 이름, 준비/오류 복귀와 PC·휴대폰 가로/세로 잘림을 정리했다. 빈 작품 UI에서 작성한 12컷 실제 자산/음원 작품을 새로고침 후 파일로 보관하고 별도 Chrome context에서 양쪽 Ren’Py 갈래·합류/엔딩·슬롯·기록·재시작·편집 후 재읽기로 검증했다. 선택 후 회전/fullscreen도 전체 경로와 동일 iframe을 보존한다. 707 unit/contract/integration, host39/native18, DPR3/Python7 및 타입·린트·빌드 검증 통과. [문제 전후·작품·A–F 감사](docs/architecture/vn-workflow-verification.md#2026-10-07-창작--파일-보관--게임-읽기-ux-감사). 실기기 성능은 별도 목표다.

2026-10-07 게임 저작/읽기 확장 목표 완료: 세로 주화자 단독, 분기 장/컷 번호,9슬롯과 지난 기록, 대상/반복/지속 연출,Next Excel/Google TSV와 숏스토리를 연결했다.703개 unit/contract/integration, host34/native17 및 타입/린트/빌드 검증 통과. [완료 기준과 실제 예제](docs/architecture/vn-workflow-verification.md).

2026-10-07 표시 영역 구도·연출·오디오 목표 완료: 실제 표시 영역과16:9/9:20/20:9 미리보기, 배경 중심/채우기, 완만한 실루엣 크기와 하반신 가림, 인물 등장·퇴장·이동/초기화, 장·컷 음악/효과음과 사용자 파일 보관을 연결했다. 실제 게임 입력 전 오디오·연출을 기다리고, 확인형 전환은 같은 진입의 revision 변경으로 다시 잠그지 않으며 엔딩에서 효과음을 반복하지 않는다. 672 unit/contract/integration, host30/native14, DPR3 E2E 및 native presenter/effect/audio/motion 검증 통과. [완료 기준별 근거와 가져올 수 있는 예제](docs/architecture/responsive-audio-authoring.md).

2026-10-06 레거시 저작 UX 재사용 목표 완료: 이 장 대본/현재 컷 꾸미기, 장 설정·자료 pool, 화자 등록·기본 이미지·actor 연결, 썸네일 검색/분류/즐겨찾기/최근/같은 인물, typed 컷 추가·복제·장 이동·삭제 안내/undo 연결. 레거시 고정 소스의 query/ranking·키보드 guard·speaker dropdown·browser draft UX 실제 이식. 추가 인물 크기 수정은 완만한 기본 크기와 글상자의 일부 하반신 가림으로 반영. 632 unit/contract, host 28개/native 11개 통과. [비교·재사용과 완료 기준별 근거](docs/architecture/legacy-authoring-workspace.md).

2026-10-06 컷 구도 목표 완료: 기존 체격/편집 배율 유지, 인물 표시(장 기본/직접/없음), 앞 컷 복사, 추가/제거, 중앙/원본 방향, ‘나’의 글상자만 있는 컷 연결. 작은 인물의 글상자 가림은 크기를 변경하지 않고 표시 기준선을 조정했다. 614 unit/contract tests, host 24개/native 10개 통과. [근거](docs/architecture/representative-story-verification.md#체격과-컷-구도-추가-검증).
네 대표 작품 편집, 빈 작품 창작, 전체 흐름 탐색과 중첩 분기·합류를 저장·파일 보관·실제 Ren'Py 재생까지 연결했다. 다음 목표는 모바일 표현과 실기기 QA, 표지·기획·메모 등 창작 UX, final contract/CI 및 온라인 서비스다. ADR 0013의 기기 성능 수치와 ADR 0014의 제품 계약 전체는 여전히 미확정이다.

## Next
1. **M1a** 나머지 패키지 골격·의존 방향 검사·런타임 CI 완성 (ADR 0012)
2. **M1b** 실제 자산·입력/로드/메모리 측정과 실기기 검증으로 S1–S12 마무리 (`docs/architecture/renpy-web-spike-plan.md`)
3. **M6/M7 후속** 실제 Android 입력/성능 및 사람의 연출·오디오 청취 QA. 책 소개·서재·고급 세 면 표지·책 시작·기획/메모와 로컬 재현 환경은 완료 범위이며 다시 구현하지 않는다. 공개 미디어 권리 승인은 별도다.

## Guardrail
Do not begin by copying the current Web Player or converting stories to `.rpy`.
